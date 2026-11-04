// What the agent is allowed to do.
//
// `ask_merchant` is a tool on purpose. The model could just write a question
// in prose, but then nothing downstream knows the turn is blocked. Making the
// gap an explicit call means the UI can render it as a question, the order
// cannot be created while one is open, and we can count how often the ear
// failed — which is the measurement this whole project turns on.

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'ask_merchant',
      description:
        'Ask for a detail you are missing. Use this whenever a value you need was not in what you heard — a size, a quantity, a colour, a budget, a commune. Never guess instead.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: "The question, one short sentence, in the merchant's language." },
          missing: { type: 'string', description: 'What is missing, machine-readable: size | quantity | colour | budget | commune | product | other' },
          heard: { type: 'string', description: 'What you DID understand, so the merchant sees you are not starting over.' },
        },
        required: ['question', 'missing'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_choices',
      description:
        'ALWAYS CALL THIS LAST, in every turn where you did not call ask_merchant. Offer two to four concrete next steps as buttons the merchant can tap — a shopkeeper on a phone, often one-handed in a shop, would rather tap than type. Never write your suggestions as prose instead: prose is not tappable. Each choice must be an action you can actually carry out next, phrased the way the merchant would say it.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'One short line above the buttons, in the merchant\'s language.' },
          choices: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'What the button says. Three to six words.' },
                send: { type: 'string', description: 'What gets sent back to you if they tap it. Write it as the merchant would.' },
                kind: { type: 'string', enum: ['primary', 'normal', 'caution'], description: 'caution = it spends money or goes live.' },
              },
              required: ['label', 'send'],
            },
          },
        },
        required: ['choices'],
      },
    },
  },
  /* ── le dropshipping ────────────────────────────────────────────────────
     La moitié du marché n'a pas de produit. En Algérie, la plupart de ceux
     qui ouvrent une boutique en ligne vendent le stock d'un fournisseur :
     ils apportent le client, le fournisseur expédie, et la marge est la
     différence entre deux prix. Sans ces deux outils, l'agent ne sait parler
     qu'à ceux qui ont déjà de la marchandise et une photo. */
  {
    type: 'function',
    function: {
      name: 'browse_catalog',
      description:
        "Show the merchant products they can sell WITHOUT owning any stock. Call this whenever they have nothing to sell yet, ask what they could sell, say they have no product or no photo, or ask about dropshipping. Each result carries the supplier's cost, the recommended selling price and the resulting margin per delivered order, so you can answer \"what do I actually make on this\" with a number.",
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['shoes', 'clothing', 'accessories', 'home', 'beauty'] },
          q: { type: 'string', description: 'Free text, if they named a kind of product.' },
          max_cost: { type: 'number', description: 'The most they can pay the supplier per unit, in DZD.' },
          min_margin: { type: 'number', description: 'The least they want to make per delivered order, in DZD.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'import_product',
      description:
        "Put a catalog product into the merchant's own shop, at the price THEY choose. After this the product is theirs to sell: it appears in their product list, you can build it a page and run a campaign on it. Never call this without the merchant naming the product — choosing what someone sells is their decision, not yours.",
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string', description: 'The id from browse_catalog.' },
          selling: { type: 'number', description: "What the merchant will sell it for, in DZD. Leave out to use the recommended price. Below the supplier's cost is refused." },
        },
        required: ['product_id'],
      },
    },
  },

  // There is deliberately no separate "build a storefront" tool. Offered both,
  // the model reliably picked the cheaper one and shipped a bare index page
  // with dead links. build_site writes the product pages first and only then
  // the home page, so the links it writes are ones that exist.
  {
    type: 'function',
    function: {
      name: 'build_site',
      description:
        'REAL, not simulated: generate a whole multi-page shop — one landing page per product, then a home page linking them, and the shop gets a live subdomain. This is the ONLY way to build a site, a shop or a storefront: call it whenever the merchant asks for any of those, in any language, instead of explaining what one would involve. It does not open a second shop — it builds into the one on the state board, naming it if it has no name yet. Use it as soon as the merchant has a product and a price; if you leave `products` out, every priced product in their shop goes in.',
      parameters: {
        type: 'object',
        properties: {
          shop_name: { type: 'string' },
          tagline: { type: 'string', description: 'One honest line about what the shop sells.' },
          language: { type: 'string', enum: ['ar', 'fr'] },
          products: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                price_dzd: { type: 'number' },
                angle: { type: 'string', description: 'The reason to buy this one.' },
                image: { type: 'string', description: 'Photo url if the merchant gave one.' },
              },
              required: ['name', 'price_dzd'],
            },
          },
        },
        required: ['shop_name', 'products'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'marketing_angles',
      description:
        'Propose distinct marketing angles for a product before any creative is made. An angle is a reason to buy, not a slogan.',
      parameters: {
        type: 'object',
        properties: {
          product: { type: 'string' },
          angles: {
            type: 'array',
            description: 'Three to five angles.',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'e.g. "proof of material", "price anchor", "fear of fake"' },
                claim: { type: 'string', description: 'What the ad asserts, in the customer\'s language.' },
                visual: { type: 'string', description: 'What the image should show for this angle.' },
              },
              required: ['name', 'claim', 'visual'],
            },
          },
        },
        required: ['product', 'angles'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_creatives',
      description:
        'Generate ad creatives with muse-image from a product photo, one per angle. Leaves the top third empty so the Arabic headline can be composited deterministically afterwards.',
      parameters: {
        type: 'object',
        properties: {
          // Le NOM du produit est demandé en premier, et il n'est pas
          // facultatif : sans lui, l'outil prenait « la dernière photo
          // envoyée », et une publicité pour un manteau est sortie avec la
          // photo d'une basket. Le code apparie le produit à SES photos ;
          // l'identifiant de photo ne sert que si le marchand en désigne une.
          product: { type: 'string', description: 'The product these creatives are for, as the merchant names it.' },
          product_image: { type: 'string', description: 'Id of a photo the merchant uploaded, only if they picked one.' },
          angles: { type: 'array', items: { type: 'string' }, description: 'Angle names from marketing_angles.' },
          headline_ar: { type: 'string', description: 'The Arabic headline to composite. Short.' },
        },
        required: ['product', 'angles'],
      },
    },
  },
  // Le marchand photographie son produit par terre, au néon, sur un carrelage.
  // Il ne veut pas « des angles marketing » : il veut que CETTE photo devienne
  // présentable. Sans cet outil le modèle part sur marketing_angles, qui est
  // l'étape d'à côté, et le marchand a l'impression de ne pas être écouté.
  {
    type: 'function',
    function: {
      name: 'restyle_photo',
      description:
        "REAL: turn the merchant's own photo into clean studio shots of the SAME product. sam-3.1 cuts the product out of its background, then muse-image re-renders it on a clean surface — same object, same colour, same details, better light. Call this the moment they ask to redo, clean up, improve or re-shoot a photo, or say the background is ugly. Do NOT call marketing_angles first: they asked for a picture, not a strategy.",
      parameters: {
        type: 'object',
        properties: {
          photo_index: { type: 'number', description: 'Which uploaded photo. Leave out for the most recent.' },
          product: { type: 'string', description: 'What the product is, in English, for the segmenter — "the black sneaker", "the white polo shirt".' },
          looks: {
            type: 'array',
            items: { type: 'string', enum: ['studio', 'lifestyle', 'closeup', 'packshot'] },
            description: 'One to three renderings. studio = neutral seamless background; packshot = pure white, for a catalogue; closeup = material detail; lifestyle = in use. Default studio.',
          },
        },
        required: ['product'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'build_landing_page',
      description:
        "REAL, not simulated: generate a complete landing page for one product. Returns a URL the merchant can open immediately. The page is filed in their shop — it appears on the Sites screen with the others, and the shop is created on the spot if this is their first page — so the result carries `site_id` and `shop`: say which shop the page went into, and never ask the merchant to create one first.",
      parameters: {
        type: 'object',
        properties: {
          product: { type: 'string' },
          price_dzd: { type: 'number' },
          angle: { type: 'string', description: 'Which marketing angle the page leads with.' },
          language: { type: 'string', enum: ['ar', 'fr'], description: 'Page language. Default ar.' },
          // Leave this out. Every image the session has produced or been given
          // is attached automatically, creatives first — the model used to
          // answer with ids like "photo_1", which are not image URLs, and the
          // page came back with no product on it.
          images: { type: 'array', items: { type: 'string' }, description: 'Leave empty. Images are attached automatically.' },
        },
        required: ['product', 'price_dzd'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'configure_campaign',
      description:
        'Build a Meta campaign exactly as the Marketing API expects it — objective, budget, targeting, placements, ad set, creative. Does NOT launch. Simulated in this prototype.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          objective: { type: 'string', enum: ['OUTCOME_SALES', 'OUTCOME_LEADS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT'] },
          daily_budget_dzd: { type: 'number' },
          geo: { type: 'array', items: { type: 'string' }, description: 'Algerian wilayas.' },
          age_min: { type: 'number' },
          age_max: { type: 'number' },
          genders: { type: 'string', enum: ['all', 'men', 'women'] },
          placements: { type: 'array', items: { type: 'string' }, description: 'e.g. facebook_feed, instagram_reels, instagram_stories' },
          creative_id: { type: 'string' },
          landing_url: { type: 'string' },
        },
        required: ['name', 'objective', 'daily_budget_dzd', 'geo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'launch_campaign',
      description:
        'Set a configured campaign live. SIMULATED in this prototype — nothing is spent and nothing reaches Meta. Only call this when the merchant explicitly asked, in this turn, with a budget.',
      parameters: {
        type: 'object',
        properties: {
          campaign_id: { type: 'string' },
          confirmed_by_merchant: { type: 'boolean', description: 'True only if the merchant asked for it in this turn.' },
        },
        required: ['campaign_id', 'confirmed_by_merchant'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'campaign_results',
      description:
        'Read the running campaign: spend, reach, cost per result, per creative and per placement. SIMULATED in this prototype.',
      parameters: {
        type: 'object',
        properties: {
          campaign_id: { type: 'string' },
          since_hours: { type: 'number', description: 'Window to read. Default 24.' },
        },
        required: ['campaign_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'adjust_campaign',
      description:
        "Act on the results. `scale` multiplies the daily budget — put the factor in `target` (1.5 raises by half, 0.5 halves it). Going above about 1.5 in one step makes Meta relearn the campaign and throws away the days of data already bought, so step up rather than jump. `pause_campaign` stops the spend but keeps the learning and can be resumed; `stop_campaign` ends it for good — say which one you mean. Always name the number that made you decide.",
      parameters: {
        type: 'object',
        properties: {
          campaign_id: { type: 'string' },
          action: { type: 'string', enum: ['scale', 'pause_creative', 'narrow_geo', 'change_placement', 'pause_campaign', 'resume_campaign', 'stop_campaign'] },
          target: { type: 'string', description: 'For scale: the multiplier, e.g. "1.5". Otherwise which creative, wilaya or placement.' },
          because: { type: 'string', description: 'The metric that justified it, with its value.' },
        },
        required: ['campaign_id', 'action', 'because'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'refresh_creatives',
      description:
        "Replace a campaign's tired images with fresh ones, drawn from the same product photo so it is the same object under another angle. Use it when the cost per order has been CLIMBING day after day while reach per dinar falls — that is wear, not bad targeting, and raising the budget on a worn creative only spends faster. The old ads are paused, not deleted, so the cost before and after stays comparable. The budget is left alone.",
      parameters: {
        type: 'object',
        properties: {
          campaign_id: { type: 'string' },
          angles: { type: 'array', items: { type: 'string' }, description: 'One or two new angles, in the merchant language. Default: another light, in use.' },
          because: { type: 'string', description: 'The number that showed the wear, with its value.' },
        },
        required: ['campaign_id'],
      },
    },
  },
  // ── the Facebook side ───────────────────────────────────────────────────
  // Everything below needs a connection. Without one there is no Page, no
  // inbox and no ad account, and the agent has to say so rather than mime it.
  {
    type: 'function',
    function: {
      name: 'connect_meta',
      description:
        'Open the "Continue with Facebook" screen for the merchant. Call this the FIRST time they ask for anything that needs their Page, their Instagram, their inbox or their ad account, and the state board says Meta is not connected. SIMULATED: it is a staged consent flow, no real Meta account is touched. It returns immediately — the merchant then has to click through it themselves, so end your turn and wait.',
      parameters: {
        type: 'object',
        properties: {
          because: { type: 'string', description: 'One short sentence, in the merchant\'s language, saying what it unlocks.' },
        },
        required: ['because'],
      },
    },
  },
  /* ── la Page : ce qu'elle publie, ce qu'on lui écrit dessous ──────────
     Les DM ne sont qu'une partie du travail. En Algérie l'essentiel de la
     demande arrive SOUS la publication — « سومة ؟ » cent fois sous le même
     reel — et un agent qui ne lit que les messages privés ne voit pas le
     gros du flux. */
  {
    type: 'function',
    function: {
      name: 'read_page',
      description:
        "What the shop's Facebook Page actually looks like right now: its published posts, stories and reels with their reach, what is scheduled and for when, and how many comments are still waiting under each. Call it before publishing or before answering comments, so you talk about what is really there.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_post',
      description:
        "Publish on the Page now, or schedule it for later. A story is for the next 24 hours and is where sizes left and today's arrivals go; a reel is what reaches beyond the followers; a post is what stays. Write the caption yourself, in the merchant's language. NEVER promise a reach figure for something not published yet.",
      parameters: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['post', 'story', 'reel'], description: 'Default post.' },
          caption: { type: 'string', description: 'The caption, in darija unless the merchant writes otherwise.' },
          in_hours: { type: 'number', description: 'Schedule this many hours from now. Leave empty to publish immediately.' },
          image: { type: 'string', description: 'A url already produced in this session, if the post carries one.' },
        },
        required: ['caption'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'answer_comments',
      description:
        'Answer the public comments under the posts, in darija. Same rule as the private messages, and it matters MORE here: everyone reading the post reads your answer. A comment that needs a fact you cannot prove from the product sheet — stock for a size, the fee to a given commune, where a parcel is, the return policy — is NOT answered. It comes back marked for the merchant with the one fact you need.',
      parameters: {
        type: 'object',
        properties: {
          comment_ids: { type: 'array', items: { type: 'number' }, description: 'Leave empty to take every open comment.' },
          max: { type: 'number', description: 'Cap how many to handle in one go. Default 6.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_inbox',
      description:
        'List the customers waiting on the Page and on Instagram: comments and private messages, newest first, with what each one asked. Call it before answering so you know what you are dealing with.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['open', 'needs_merchant', 'answered', 'all'], description: 'Default open.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'answer_inbox',
      description:
        'Answer customers in darija. For each thread the model drafts a reply AND decides whether it may send it at all: a question that needs a fact you do not have (stock for a size, the fee for a wilaya, where an existing parcel is, whether the product is authentic) is NOT answered — it comes back marked for the merchant, with the single fact you need from them. Report both kinds honestly afterwards: how many you answered, and what you need from them for the rest.',
      parameters: {
        type: 'object',
        properties: {
          thread_ids: { type: 'array', items: { type: 'number' }, description: 'Which threads. Leave empty to take every open one.' },
          product: { type: 'string', description: 'The product being asked about, if you know it.' },
          price_dzd: { type: 'number', description: 'Its price, if you know it.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'simulate_days',
      description:
        'Fast-forward a running campaign by one or more days so there is a trend to read. SIMULATED, and say so: it writes the days of data the campaign would have produced. Use it when the merchant wants to see results now rather than tomorrow.',
      parameters: {
        type: 'object',
        properties: {
          campaign_id: { type: 'number' },
          days: { type: 'number', description: 'How many days to add. 1 or 2 is usually enough.' },
        },
        required: ['campaign_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_domain',
      description:
        "Attach a domain name to a site the merchant has built. A subdomain of the platform is live at once; their own domain returns the exact DNS records to add, and the DNS check afterwards is a REAL lookup. Never claim a custom domain is live before it verifies.",
      parameters: {
        type: 'object',
        properties: {
          site_id: { type: 'number', description: 'From the state board.' },
          host: { type: 'string', description: 'e.g. sabat-dzair.dz' },
        },
        required: ['site_id', 'host'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_meta_setup',
      description:
        'Show the merchant how to create their own Meta app so the simulated side can become real. Use when they ask to connect Facebook, or before claiming anything would go live.',
      parameters: {
        type: 'object',
        properties: {
          step: { type: 'number', description: '1-4, or omit for the whole thing.' },
        },
      },
    },
  },
]

export const TOOL_NAMES = TOOLS.map((t) => t.function.name)

// Tools that are honest about being simulated. The UI badges these, and the
// agent is told to say so — belt and braces, because the one thing we must
// never do is let a simulated number read as a measured one.
// Le catalogue en fait partie, et il faut le dire : ses produits sont
// modelés sur un vrai catalogue algérien — mêmes champs, mêmes prix d'ordre
// de grandeur, mêmes marges — mais AUCUN fournisseur n'expédiera quoi que ce
// soit. Ce qui en sort, en revanche, est réel : la page, les visuels et le
// calcul de marge sont les vrais.
export const SIMULATED = new Set([
  'configure_campaign', 'launch_campaign', 'campaign_results', 'adjust_campaign',
  'simulate_days', 'connect_meta', 'read_inbox',
  'browse_catalog', 'import_product',
  // La Page et son mur : aucune publication n'est créée chez Facebook, et
  // les chiffres de portée sont à l'échelle d'une vraie Page sans en être
  // une. `answer_comments` reste dehors, comme `answer_inbox` : le fil est
  // mis en scène, mais la darija écrite est un vrai appel de modèle et le
  // refus de répondre est une vraie décision.
  'read_page', 'schedule_post',
])

// Tools that produce something the merchant can actually open.
export const REAL = new Set([
  'build_landing_page', 'build_storefront', 'build_site', 'generate_creatives', 'add_domain',
  'restyle_photo',
])

// answer_inbox is deliberately in NEITHER set: the thread it posts into is
// staged, but the darija it writes is a real model call, and the refusal to
// answer what it cannot verify is the real behaviour on show. Badging it
// "simulé" would undersell it; badging it "réel" would oversell it. The UI
// labels it for what it is — a real reply, on a simulated Page.

// Tools whose result is a prompt back to the merchant rather than an artifact:
// the loop keeps going after them, but the UI renders them in the conversation.
export const CONVERSATIONAL = new Set(['propose_choices', 'ask_merchant'])
