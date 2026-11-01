// The copy for a landing page, as structured data.
//
// Asking a model for "a landing page" gets you HTML, and HTML you did not
// design: the sections move, the Arabic typography is whatever it felt like,
// and once in three tries it forgets the product photo entirely. Asking for
// JSON gets you the one thing the model is genuinely good at — the words —
// and leaves the layout to code that always does it right.
//
// The section order is not invented here. It is the shape a cash-on-delivery
// page needs: the PROBLEM before the SOLUTION. A COD buyer is not comparing
// specifications, they are deciding whether to open the door to a courier, and
// what moves them is recognising their own frustration on the page before they
// are told what fixes it.
import { chat, visibleAnswer } from '../models/llm.js'
import { dataUrl } from '../models/vision.js'

const SCHEMA = `{
  "theme": { "primary": "#hex", "accent": "#hex", "dark": "#hex", "light": "#hex" },
  "hero": { "eyebrow": "short badge", "headline": "selling headline", "sub": "main benefit", "cta": "button text" },
  "highlights": ["3 or 4 very short reassurances"],
  "problem": { "title": "the real frustration this product ends", "text": "2-3 sentences about life before it" },
  "solution": { "title": "how THIS product ends it", "text": "2-3 sentences, relief and benefit" },
  "benefits": [{ "title": "benefit", "text": "one sentence" }],
  "features": [{ "title": "a concrete feature YOU CAN SEE in the photo", "text": "2-3 selling sentences" }],
  "steps": [{ "title": "short step", "text": "one sentence" }],
  "whyChoose": [{ "title": "a real reason to buy here", "text": "one sentence" }],
  "faq": [{ "q": "question a buyer really asks", "a": "reassuring, concrete answer" }],
  "delivery": "one honest sentence about cash on delivery and the delay",
  "guarantee": "one sentence that is TRUE of this shop, or an empty string",
  "scenes": { "hero": "english scene", "problem": "english scene", "solution": "english scene", "benefits": "english scene" },
  "visual": {
    "couleur": "english: the exact colour AND finish of the product in photo 0",
    "fidelity": "english: the list of visible things an image model must keep identical",
    "accent": "#hex"
  }
}`

const RULES_AR = `LANGUAGE — ABSOLUTE: every VALUE in the JSON is written in Algerian darija,
in ARABIC letters, the way a shopkeeper in Algiers writes to a customer. Never
French, never English, never Modern Standard Arabic. The JSON KEYS stay in
English. The "scenes" values stay in English — they are read by an image model.`

const RULES_FR = `LANGUAGE: every value in the JSON is written in French. The "scenes" values
stay in English — they are read by an image model.`

// L'anglais sert à MONTRER la page, pas à vendre avec. La consigne insiste
// donc sur un point : rester la voix d'un commerçant algérien, pas glisser
// dans l'anglais commercial international. Une page anglaise qui parle de
// « free returns within 30 days » mentirait sur ce que fait le marchand.
const RULES_EN = `LANGUAGE: every value in the JSON is written in plain English.
Keep the voice of an Algerian shopkeeper writing to a customer — direct,
concrete, no international marketing register, no slogans. Prices stay in DZD
and delivery stays cash on delivery. The "scenes" values are already English;
they are read by an image model.`

const RULES = `
BRANDS: brand names, models and references stay in LATIN script exactly as
written — "Adidas IF5340", never "أديداس". Transliterating a brand makes the
page look counterfeit.

NO EMOJI anywhere, in any field. Plain text only.

NOTHING INVENTED. This is the rule that matters most, and it is not a style
preference — a page carrying fabricated proof is a page that gets an ad account
banned, and in this project it would also be dishonest.
  · No testimonials, no customer names, no star ratings. You have never met a
    customer of this shop.
  · No invented scarcity, no countdown, no "only 3 left", no fake discount.
  · No certification, no award, no laboratory, no percentage you cannot see.
  · No material, no origin, no warranty you cannot verify from the photo or
    from what the merchant told you. If you cannot tell what it is made of,
    write about what you CAN see instead.
  · "delivery" says what is true of cash on delivery in Algeria: you pay the
    courier when it arrives. "guarantee" is an empty string unless the merchant
    actually stated one.

LENGTH, because these strings are composited onto images:
  hero.headline <= 6 words · hero.sub <= 8 · problem.title and solution.title
  <= 7 · benefits.title <= 4 · steps.title <= 3 and steps.text <= 7.

COLOURS: theme.primary is the dominant, vivid colour OF THE PRODUCT as you see
it in the photo — a real saturated colour, not grey and not black, unless the
product genuinely is. accent complements it. dark is a very dark version of
primary, light a very pale one. The page is built from these four.

SCENES: for each one write, IN ENGLISH, a 40-70 word photorealistic scene for
an image generator, specific to THIS product — summer sandals belong at a
sunlit poolside, a winter coat on a snowy street. hero is aspirational and
bright; problem is the concrete frustration BEFORE owning it, darker; solution
is warm with the product as the hero; benefits is a dramatic close-up of a real
detail. Leave empty space at the top for a headline, and put NO text or letters
in the scene.

FIDELITY — THE RULE THE WHOLE PAGE DEPENDS ON.
These scenes are not illustrations: they are rendered FROM the merchant's own
photo, and the merchant checks that the pictures show the thing they actually
sell. A page whose hero shows a different product is worse than a page with no
picture at all, because it promises goods that will not arrive.
  · NEVER describe the product's colour or its material inside a scene. Not
    once. An image model follows those words more than it follows the photo,
    so "white polo" in a scene is how a white polo with a green collar comes
    back as a plain white one. Put the colour in visual.couleur and nowhere
    else; write the scenes about the PLACE, the LIGHT and the FRAMING only.
  · Never add "silky", "satin", "glossy", "shiny", "luxurious", "velvet",
    "leather" unless that finish is unmistakable in the photo.
  · Photo 0 is the authority. If two photos disagree about the cut, the
    panels, the closure, the length or the details, photo 0 wins.
  · visual.couleur: the exact colour of the product in photo 0 WITH its real
    finish — "matte black", "off-white with a dark green collar and placket",
    "dark chocolate brown, matte crinkled fabric". Nothing else.
  · visual.fidelity: a precise English list of what must stay identical —
    shape, cut, materials, stitching, sole, closures, matte versus glossy as
    it really is, the real scale of any pattern or topstitching, length and
    proportions, and every distinctive construction detail you can see.
  · visual.accent: the most distinctive accent colour of the product, as hex.

Counts: 3-4 highlights, 3-4 benefits, 2-3 features, EXACTLY 3 steps,
2-3 whyChoose, 3-4 faq. problem and solution are mandatory — they are the sale.

Answer with the JSON object and nothing else.`

export async function landingContent({ product, price_dzd, angle, language = 'ar', shop, photos = [], notes, extra = '' }) {
  const system = [
    `You write cash-on-delivery sales pages for Algerian shops.`,
    language === 'en' ? RULES_EN : language === 'fr' ? RULES_FR : RULES_AR,
    `Return exactly this shape:\n${SCHEMA}`,
    RULES,
    // The merchant's own settings, last, so they win over the defaults above —
    // except on the honesty block, which nothing in here is allowed to unlock.
    extra ? `THE MERCHANT'S SETTINGS — these override the defaults above, except\nthe NOTHING INVENTED block, which no setting can switch off.\n\n${extra}` : '',
  ].filter(Boolean).join('\n\n')

  const content = [
    {
      type: 'text',
      text: [
        `Product: ${product}`,
        `Price: ${price_dzd} DZD`,
        shop ? `Shop: ${shop}` : '',
        angle ? `Lead with this angle, the whole page argues it: ${angle}` : '',
        notes ? `The merchant said: ${notes}` : '',
        photos.length ? 'Look at the photos before writing. Describe only what is in them.' : 'No photo: write from the product name alone and claim nothing visual.',
      ].filter(Boolean).join('\n'),
    },
    // The model writes about what it can see, which is why features are
    // "concrete and visible" rather than invented from the product name.
    ...photos.slice(0, 4).map((p) => ({ type: 'image_url', image_url: { url: p.startsWith('http') || p.startsWith('data:') ? p : dataUrl(p) } })),
  ]

  const msg = await chat([{ role: 'system', content: system }, { role: 'user', content }], { temperature: 0.8 })
  const raw = visibleAnswer(msg)
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('The model did not return landing content as JSON.')

  const data = JSON.parse(m[0])
  return normalise(data, { product, price_dzd, language })
}

// Models drop a field or hand back a string where an array belongs. The
// renderer should never have to ask whether something is there.
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : [])
const str = (v, fb = '') => (typeof v === 'string' ? v.trim() : fb)
const HEX = /^#[0-9a-f]{3,8}$/i
const colour = (v, fb) => (HEX.test(String(v ?? '')) ? v : fb)

function normalise(d, { product, price_dzd, language }) {
  const t = d.theme ?? {}
  return {
    language,
    product,
    price_dzd,
    theme: {
      primary: colour(t.primary, '#1f6f54'),
      accent: colour(t.accent, '#d9a441'),
      dark: colour(t.dark, '#0e241c'),
      light: colour(t.light, '#f2f7f4'),
    },
    hero: {
      eyebrow: str(d.hero?.eyebrow),
      headline: str(d.hero?.headline, product),
      sub: str(d.hero?.sub),
      cta: str(d.hero?.cta, language === 'en' ? 'Order now' : language === 'fr' ? 'Commander' : 'اطلب الآن'),
    },
    highlights: arr(d.highlights).map((x) => str(x)).filter(Boolean).slice(0, 4),
    problem: { title: str(d.problem?.title), text: str(d.problem?.text) },
    solution: { title: str(d.solution?.title), text: str(d.solution?.text) },
    benefits: arr(d.benefits).map((b) => ({ title: str(b.title), text: str(b.text) })).filter((b) => b.title).slice(0, 4),
    features: arr(d.features).map((f) => ({ title: str(f.title), text: str(f.text) })).filter((f) => f.title).slice(0, 3),
    steps: arr(d.steps).map((s) => ({ title: str(s.title), text: str(s.text) })).filter((s) => s.title).slice(0, 3),
    whyChoose: arr(d.whyChoose).map((w) => ({ title: str(w.title), text: str(w.text) })).filter((w) => w.title).slice(0, 3),
    faq: arr(d.faq).map((f) => ({ q: str(f.q), a: str(f.a) })).filter((f) => f.q).slice(0, 4),
    delivery: str(d.delivery),
    guarantee: str(d.guarantee),
    scenes: {
      hero: str(d.scenes?.hero), problem: str(d.scenes?.problem),
      solution: str(d.scenes?.solution), benefits: str(d.scenes?.benefits),
    },
    // Ce bloc ne s'affiche nulle part : il part dans le prompt des images.
    // C'est lui qui empêche la dérive — le modèle d'image suit les mots plus
    // que la photo, donc la couleur et la matière ne vivent qu'ici.
    visual: {
      couleur: str(d.visual?.couleur),
      fidelity: str(d.visual?.fidelity),
      accent: colour(d.visual?.accent, null),
    },
  }
}
