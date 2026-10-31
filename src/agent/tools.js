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
  // There is deliberately no separate "build a storefront" tool. Offered both,
  // the model reliably picked the cheaper one and shipped a bare index page
  // with dead links. build_site writes the product pages first and only then
  // the home page, so the links it writes are ones that exist.
  {
    type: 'function',
    function: {
      name: 'build_site',
      description:
        'REAL, not simulated: generate a whole multi-page shop — one landing page per product, then a home page linking them. This is the ONLY way to build a site or a storefront. Use it as soon as the merchant has given you a product and a price.',
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
          product_image: { type: 'string', description: 'Id of a photo the merchant uploaded.' },
          angles: { type: 'array', items: { type: 'string' }, description: 'Angle names from marketing_angles.' },
          headline_ar: { type: 'string', description: 'The Arabic headline to composite. Short.' },
        },
        required: ['product_image', 'angles'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'build_landing_page',
      description:
        'REAL, not simulated: generate a complete landing page for one product. Returns a URL the merchant can open immediately.',
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
        'Act on results: pause a creative, shift budget, narrow geo, change placement. Say which number made you decide. SIMULATED.',
      parameters: {
        type: 'object',
        properties: {
          campaign_id: { type: 'string' },
          action: { type: 'string', enum: ['pause_creative', 'shift_budget', 'narrow_geo', 'change_placement', 'pause_campaign'] },
          target: { type: 'string', description: 'Which creative, wilaya or placement.' },
          because: { type: 'string', description: 'The metric that justified it, with its value.' },
        },
        required: ['campaign_id', 'action', 'because'],
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
export const SIMULATED = new Set([
  'configure_campaign', 'launch_campaign', 'campaign_results', 'adjust_campaign',
  'simulate_days', 'connect_meta', 'read_inbox',
])

// Tools that produce something the merchant can actually open.
export const REAL = new Set([
  'build_landing_page', 'build_storefront', 'build_site', 'generate_creatives', 'add_domain',
])

// answer_inbox is deliberately in NEITHER set: the thread it posts into is
// staged, but the darija it writes is a real model call, and the refusal to
// answer what it cannot verify is the real behaviour on show. Badging it
// "simulé" would undersell it; badging it "réel" would oversell it. The UI
// labels it for what it is — a real reply, on a simulated Page.

// Tools whose result is a prompt back to the merchant rather than an artifact:
// the loop keeps going after them, but the UI renders them in the conversation.
export const CONVERSATIONAL = new Set(['propose_choices', 'ask_merchant'])
