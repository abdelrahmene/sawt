// The knobs on a landing page, in one place.
//
// The set is taken from the generator that already runs in real Algerian
// shops — language, tone, audience, length, template, colour, which sections,
// and how the pictures are made. Those options exist because merchants asked
// for them one at a time, which is a better reason than anything I would have
// invented here.
//
// Two of that generator's options are deliberately NOT carried over, and they
// appear in `REFUSED` so the screen can show them crossed out with the reason
// rather than silently dropping them:
//
//   · testimonials — it generated Algerian first names and five-star reviews
//     for customers who do not exist.
//   · urgency / countdown — "only 3 left", a timer that resets on reload.
//
// Both sell. Both are also fabricated proof on a page that will be submitted
// to Meta, which their own policy calls deceptive, and which gets an ad
// account banned. Hiding the choice would be dishonest in the other direction,
// so the switch is visible, off, and explains itself.

export const OPTIONS = {
  language: {
    label: 'Langue de la page', default: 'ar',
    choices: [
      { v: 'ar', label: 'Darija (lettres arabes)', help: "Comme un vendeur écrit à un client. Les marques restent en latin." },
      { v: 'fr', label: 'Français', help: 'Pour une clientèle francophone.' },
    ],
  },
  scenario: {
    label: 'Scénario des visuels', default: 'lifestyle',
    choices: [
      { v: 'lifestyle', label: 'Lifestyle', help: "Le produit en situation. La bannière est une scène générée." },
      { v: 'studio', label: 'Studio', help: "Fond neutre, le produit au centre. La bannière est TA photo, pas une scène." },
    ],
  },
  theme: {
    label: 'Ambiance', default: 'light',
    choices: [
      { v: 'light', label: 'Clair', help: 'Fond blanc. Le défaut, et le plus lisible sur un téléphone au soleil.' },
      { v: 'dark', label: 'Sombre', help: 'Fond noir. Donne un air plus cher aux produits sombres.' },
    ],
  },
  template: {
    label: 'Gabarit', default: 'editorial',
    choices: [
      { v: 'editorial', label: 'Éditorial', help: 'Beaucoup d\'air, titres mesurés, lignes fines. Sobre.' },
      { v: 'bold', label: 'Audacieux', help: 'Titres énormes, blocs pleins, angles marqués.' },
      { v: 'soft', label: 'Doux', help: 'Coins très arrondis, ombres légères, teintes pâles.' },
      { v: 'vivid', label: 'Vif', help: 'Dégradés, couleur saturée, contrastes forts.' },
    ],
  },
  tone: {
    label: 'Ton du texte', default: 'auto',
    choices: [
      { v: 'auto', label: 'Automatique', help: 'Le modèle choisit d\'après la photo et le prix.' },
      { v: 'premium', label: 'Premium', help: 'Peu de mots, pas de superlatifs, on laisse la photo parler.' },
      { v: 'jeune', label: 'Jeune', help: 'Direct, tutoiement, phrases courtes.' },
      { v: 'confiance', label: 'Confiance', help: 'On insiste sur le paiement à la livraison et le droit de refuser.' },
      { v: 'promo', label: 'Promo', help: 'On met le prix en avant. Sans inventer de remise.' },
    ],
  },
  audience: {
    label: 'À qui ça parle', default: 'auto',
    choices: [
      { v: 'auto', label: 'Automatique' }, { v: 'femmes', label: 'Femmes' },
      { v: 'hommes', label: 'Hommes' }, { v: 'mixte', label: 'Mixte' },
      { v: 'sport', label: 'Sport' }, { v: 'enfants', label: 'Enfants / parents' },
    ],
  },
  length: {
    label: 'Longueur', default: 'moyen',
    choices: [
      { v: 'court', label: 'Court', help: 'On scrolle une fois. Pour un achat évident.' },
      { v: 'moyen', label: 'Moyen', help: 'Le défaut.' },
      { v: 'detaille', label: 'Détaillé', help: 'Pour un produit cher, qui se justifie.' },
    ],
  },
  colorMode: {
    label: 'Couleurs', default: 'auto',
    choices: [
      { v: 'auto', label: 'Depuis la photo', help: 'Le modèle regarde le produit et en tire la couleur dominante.' },
      { v: 'impose', label: 'Couleur imposée', help: 'Ta couleur de marque, sur toute la page.' },
    ],
  },
  scenes: {
    label: 'Visuels de section', default: 4, cost: true,
    choices: [
      { v: 0, label: 'Aucun', help: 'Seulement tes photos. Gratuit et immédiat.' },
      { v: 2, label: '2 visuels', help: 'Le problème et la solution. 2 appels muse-image.' },
      { v: 4, label: '4 visuels', help: 'Bannière, problème, solution, gros plan. 4 appels muse-image.' },
    ],
  },
}

/** The sections the merchant can switch off. `problem` is not one of them. */
export const SECTIONS = [
  { k: 'problem', label: 'Problème → solution', on: true, locked: true,
    why: "C'est la vente. Un acheteur en paiement à la livraison décide d'ouvrir sa porte à un livreur ; ce qui le décide, c'est de reconnaître sa propre galère avant qu'on lui propose quoi que ce soit." },
  { k: 'benefits', label: 'Bénéfices', on: true },
  { k: 'features', label: 'Détails visibles', on: true, why: 'Uniquement ce que le modèle voit sur la photo.' },
  { k: 'gallery', label: 'Galerie photos', on: true },
  { k: 'steps', label: 'Comment commander', on: true },
  { k: 'why', label: 'Pourquoi nous', on: true },
  { k: 'faq', label: 'FAQ', on: true },
]

export const REFUSED = [
  { k: 'testimonials', label: 'Témoignages clients',
    why: "On n'a jamais rencontré un client de cette boutique. Générer des prénoms algériens et des cinq étoiles, c'est fabriquer une preuve — et une page qui porte une fausse preuve fait bannir un compte publicitaire." },
  { k: 'urgency', label: 'Urgence, compte à rebours, « plus que 3 »',
    why: "Le compteur repart à zéro au rechargement. Meta appelle ça une pratique trompeuse, et le client qui s'en aperçoit ne revient pas." },
]

/* ── how each option changes the brief ───────────────────────────────────── */

const TONE = {
  premium: "TONE: premium. Few words. No superlatives, no exclamation marks. Let the photograph do the selling. Short declarative sentences.",
  jeune: "TONE: young and direct. Second person singular, short sentences, the way a friend texts. Still no emoji.",
  confiance: "TONE: reassurance first. Lead on cash on delivery — they pay the courier, they can refuse the parcel at the door, nothing is paid in advance. This is what an Algerian buyer is actually worried about.",
  promo: "TONE: price-led. The price is the argument and appears early. Do NOT invent a discount, a crossed-out price or a limited offer — you do not have one.",
}

const AUDIENCE = {
  femmes: 'AUDIENCE: women. Write to her directly.',
  hommes: 'AUDIENCE: men. Write to him directly.',
  mixte: 'AUDIENCE: mixed. Keep it neutral.',
  sport: 'AUDIENCE: people who train. Comfort, hold, resistance.',
  enfants: 'AUDIENCE: parents buying for a child. Durability, size, price per wear.',
}

const LENGTH = {
  court: 'LENGTH: short. 3 highlights, 3 benefits, 2 features, 3 FAQ. Every text field one sentence.',
  moyen: 'LENGTH: medium. The counts given above.',
  detaille: 'LENGTH: detailed. 4 highlights, 4 benefits, 3 features, 3 whyChoose, 4 FAQ, and two or three full sentences wherever text is allowed.',
}

/** Extra lines appended to the copy brief for the chosen options. */
export function briefFor(o) {
  const lines = []
  if (TONE[o.tone]) lines.push(TONE[o.tone])
  if (AUDIENCE[o.audience]) lines.push(AUDIENCE[o.audience])
  if (LENGTH[o.length]) lines.push(LENGTH[o.length])
  if (o.colorMode === 'impose' && o.color) {
    lines.push(`COLOURS: the merchant imposes ${o.color} as theme.primary. Use it exactly as given. Derive accent, dark and light from it, and ignore the product's own colour for the theme.`)
  }
  const off = SECTIONS.filter((s) => !s.locked && o.sections?.[s.k] === false)
  if (off.length) {
    lines.push(`The merchant turned these sections OFF: ${off.map((s) => s.k).join(', ')}. Return empty arrays for them and put nothing of their content elsewhere.`)
  }
  if (o.scenario === 'studio') {
    lines.push('SCENES: studio. Every scene is the product on a clean seamless background, controlled light, no location and no props beyond a surface. Keep the product identical.')
  }
  if (o.prompt?.trim()) {
    lines.push(`THE MERCHANT ALSO SAID — follow it unless it asks you to invent a fact:\n${o.prompt.trim().slice(0, 600)}`)
  }
  return lines.join('\n\n')
}

/** Which scene slots to generate, for the chosen budget. */
export const slotsFor = (o) =>
  o.scenes === 0 ? [] : o.scenes === 2 ? ['problem', 'solution'] : ['hero', 'problem', 'solution', 'benefits']

/* ── normalisation ───────────────────────────────────────────────────────── */

const HEX = /^#[0-9a-f]{6}$/i

export function normaliseOptions(raw = {}) {
  const o = {}
  for (const [k, spec] of Object.entries(OPTIONS)) {
    const v = raw[k]
    o[k] = spec.choices.some((c) => c.v === v) ? v : spec.default
  }
  o.color = HEX.test(String(raw.color ?? '')) ? raw.color : '#0d7a5f'
  o.prompt = typeof raw.prompt === 'string' ? raw.prompt.slice(0, 1200) : ''
  o.sections = {}
  for (const s of SECTIONS) o.sections[s.k] = s.locked ? true : raw.sections?.[s.k] !== false
  // Photos the merchant picked, in their order. The first is the main one.
  o.photos = Array.isArray(raw.photos) ? raw.photos.filter((u) => typeof u === 'string').slice(0, 8) : []
  return o
}

/** What this configuration will cost, before anything is clicked. */
export function estimate(o) {
  const images = slotsFor(o).length
  return {
    calls: { copy: 1, images },
    label: images
      ? `1 appel texte + ${images} image${images > 1 ? 's' : ''} · environ ${30 + images * 11} s`
      : '1 appel texte · environ 25 s',
    images,
  }
}
