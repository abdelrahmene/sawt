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

/* Les libellés sont trilingues, comme le reste de l'interface.
   Ils étaient les derniers à échapper à la couche de langue : le Studio les
   reçoit du serveur, donc un écran par ailleurs anglais affichait « Langue
   de la page » et « Visuels de section ». Le serveur envoie les trois, le
   client prend la sienne — c'est le plus simple, et ça évite de rendre le
   serveur conscient d'une préférence d'affichage. */
const T = (en, ar, fr) => ({ en, ar, fr })

export const OPTIONS = {
  language: {
    label: T('Page language', 'لغة الصفحة', 'Langue de la page'), default: 'ar',
    choices: [
      { v: 'ar', label: T('Darija (Arabic letters)', 'الدارجة', 'Darija (lettres arabes)'),
        help: T('The way a shopkeeper writes to a customer. Brand names stay in Latin script.', 'كيما يكتب التاجر للزبون. أسماء الماركات تبقى باللاتيني.', "Comme un vendeur écrit à un client. Les marques restent en latin.") },
      { v: 'fr', label: T('French', 'فرنسية', 'Français'),
        help: T('For a French-speaking customer base.', 'للزبائن لي يهدرو الفرنسية.', 'Pour une clientèle francophone.') },
      // L'anglais n'est pas la langue d'un acheteur algérien — il est là pour
      // qu'on puisse MONTRER la page à quelqu'un qui ne lit ni l'arabe ni le
      // français. Sans lui, « tout en anglais pour la démonstration »
      // s'arrêtait à l'interface : la page produite, elle, restait en arabe.
      { v: 'en', label: T('English', 'إنجليزية', 'Anglais'),
        help: T('For showing the page to someone who reads neither Arabic nor French. Not what you sell with in Algeria.', 'باش توري الصفحة لواحد ما يقراش عربية ولا فرنسية. ماشي هي لي تبيع بيها في الجزائر.', "Pour montrer la page à qui ne lit ni l'arabe ni le français. Pas la langue avec laquelle on vend en Algérie.") },
    ],
  },
  /* Le libellé dit ce que la scène CONTIENT, pas seulement son nom.
     « Studio » tout court ne laisse rien deviner ; « reflets, macros,
     piédestal » dit au marchand ce qu'il va recevoir avant de payer. Les
     deux intitulés viennent du générateur qui tourne déjà en boutique. */
  scenario: {
    label: T('Photo scenario', 'ستيل التصاور', 'Scénario photo'), default: 'lifestyle',
    choices: [
      { v: 'studio', label: T('Premium studio — product in the spotlight (reflections, macros, pedestal)',
          'ستوديو بريميوم — المنتج في الضو (انعكاسات، ماكرو، بييدستال)',
          'Studio premium — le produit en vedette (reflets, macros, piédestal)'),
        help: T('Switch scenarios to vary your landing pages from one product to the next.',
          'بدّل السيناريو باش الصفحات ما يجيوش كيف كيف من منتج لآخر.',
          "Change de scénario pour que tes pages ne se ressemblent pas d'un produit à l'autre.") },
      { v: 'lifestyle', label: T('Lifestyle — real settings, natural light, product in use',
          'في الحياة — بلايص حقيقية، ضو طبيعي، المنتج مستعمل',
          "Lifestyle — décors réels, lumière naturelle, produit en situation"),
        help: T('Switch scenarios to vary your landing pages from one product to the next.',
          'بدّل السيناريو باش الصفحات ما يجيوش كيف كيف من منتج لآخر.',
          "Change de scénario pour que tes pages ne se ressemblent pas d'un produit à l'autre.") },
    ],
  },
  theme: {
    label: T('Visual style', 'الستيل', 'Style visuel'), default: 'light',
    choices: [
      { v: 'dark', label: T('Dark — cinematic luxury', 'غامق — لوكس سينمائي', 'Sombre — luxe cinématographique'),
        help: T('Black page. Makes dark products look more expensive.', 'صفحة كحلة. تخلي المنتجات الغامقة تبان أغلى.', 'Page noire. Donne un air plus cher aux produits sombres.') },
      { v: 'light', label: T('Light — bright commercial', 'فاتح — تجاري ومضوي', 'Clair — commercial lumineux'),
        help: T('White page. The default, and the most readable on a phone in the sun.', 'صفحة بيضة. هي الأصل، وأحسن وحدة تتقرا في الشمس.', 'Page blanche. Le défaut, et le plus lisible sur un téléphone au soleil.') },
    ],
  },
  template: {
    label: T('Template', 'القالب', 'Gabarit'), default: 'editorial',
    choices: [
      { v: 'editorial', label: T('Editorial', 'كلاسيك', 'Éditorial'),
        help: T('Plenty of air, measured headings, fine rules. Sober.', 'بزاف فراغ، عناوين مقيسة، خطوط رقيقة. هادي.', 'Beaucoup d\'air, titres mesurés, lignes fines. Sobre.') },
      { v: 'bold', label: T('Bold', 'قوي', 'Audacieux'),
        help: T('Huge headings, solid blocks, sharp angles.', 'عناوين كبار، بلوكات ممتلية، زوايا حادة.', 'Titres énormes, blocs pleins, angles marqués.') },
      { v: 'soft', label: T('Soft', 'ناعم', 'Doux'),
        help: T('Very rounded corners, light shadows, pale tints.', 'زوايا مدوّرة، ظلال خفيفة، ألوان باهتة.', 'Coins très arrondis, ombres légères, teintes pâles.') },
      { v: 'vivid', label: T('Vivid', 'حيّ', 'Vif'),
        help: T('Gradients, saturated colour, strong contrast.', 'تدرجات، لون قوي، تباين كبير.', 'Dégradés, couleur saturée, contrastes forts.') },
    ],
  },
  tone: {
    label: T('Tone of voice', 'نبرة الكلام', 'Ton du texte'), default: 'auto',
    choices: [
      { v: 'auto', label: T('Automatic', 'أوتوماتيك', 'Automatique'),
        help: T('The model decides from the photo and the price.', 'الموديل يختار حسب التصويرة والسومة.', 'Le modèle choisit d\'après la photo et le prix.') },
      { v: 'premium', label: T('Premium', 'راقي', 'Premium'),
        help: T('Few words, no superlatives, let the photograph sell.', 'كلام قليل، بلا مبالغة، خلي التصويرة تبيع.', 'Peu de mots, pas de superlatifs, on laisse la photo parler.') },
      { v: 'jeune', label: T('Young', 'شباب', 'Jeune'),
        help: T('Direct, informal, short sentences.', 'مباشر، بلا رسميات، جمل قصار.', 'Direct, tutoiement, phrases courtes.') },
      { v: 'confiance', label: T('Reassuring', 'ثقة', 'Confiance'),
        help: T('Leads on cash on delivery and the right to refuse at the door.', 'يركّز على الدفع عند الاستلام وحقك ترفض في الباب.', 'On insiste sur le paiement à la livraison et le droit de refuser.') },
      { v: 'promo', label: T('Price-led', 'بروومو', 'Promo'),
        help: T('Puts the price up front. Without inventing a discount.', 'يحط السومة قدّام. بلا ما يخترع تخفيض.', 'On met le prix en avant. Sans inventer de remise.') },
    ],
  },
  audience: {
    label: T('Who it speaks to', 'لمن يهدر', 'À qui ça parle'), default: 'auto',
    choices: [
      { v: 'auto', label: T('Automatic', 'أوتوماتيك', 'Automatique') },
      { v: 'femmes', label: T('Women', 'النساء', 'Femmes') },
      { v: 'hommes', label: T('Men', 'الرجال', 'Hommes') },
      { v: 'mixte', label: T('Mixed', 'الزوج', 'Mixte') },
      { v: 'sport', label: T('Sport', 'سبور', 'Sport') },
      { v: 'enfants', label: T('Kids / parents', 'الصغار والوالدين', 'Enfants / parents') },
    ],
  },
  length: {
    label: T('Length', 'الطول', 'Longueur'), default: 'moyen',
    choices: [
      { v: 'court', label: T('Short', 'قصير', 'Court'),
        help: T('One scroll. For an obvious purchase.', 'سكرول وحدة. للشراء الواضح.', 'On scrolle une fois. Pour un achat évident.') },
      { v: 'moyen', label: T('Medium', 'متوسط', 'Moyen'), help: T('The default.', 'هو الأصل.', 'Le défaut.') },
      { v: 'detaille', label: T('Detailed', 'مفصّل', 'Détaillé'),
        help: T('For an expensive product that has to justify itself.', 'لمنتج غالي، لازم يبرر سومته.', 'Pour un produit cher, qui se justifie.') },
    ],
  },
  colorMode: {
    label: T('Colours', 'الألوان', 'Couleurs'), default: 'auto',
    choices: [
      { v: 'auto', label: T('From the photo', 'من التصويرة', 'Depuis la photo'),
        help: T('The model looks at the product and takes its dominant colour.', 'الموديل يشوف المنتج وياخذ اللون الغالب.', 'Le modèle regarde le produit et en tire la couleur dominante.') },
      { v: 'impose', label: T('Set a colour', 'لون محدّد', 'Couleur imposée'),
        help: T('Your brand colour, across the whole page.', 'لون الماركة تاعك، على الصفحة كاملة.', 'Ta couleur de marque, sur toute la page.') },
    ],
  },
  scenes: {
    label: T('Section visuals', 'تصاور الأقسام', 'Visuels de section'), default: 4, cost: true,
    choices: [
      { v: 0, label: T('None', 'والو', 'Aucun'),
        help: T('Your photos only. Free and instant.', 'غير تصاورك. بلاش وفي الحين.', 'Seulement tes photos. Gratuit et immédiat.') },
      { v: 2, label: T('2 visuals', 'زوج تصاور', '2 visuels'),
        help: T('The problem and the solution. 2 muse-image calls.', 'المشكل والحل. زوج طلبات muse-image.', 'Le problème et la solution. 2 appels muse-image.') },
      { v: 4, label: T('4 visuals', '4 تصاور', '4 visuels'),
        help: T('Banner, problem, solution, close-up. 4 muse-image calls.', 'البانير، المشكل، الحل، وقريب. 4 طلبات muse-image.', 'Bannière, problème, solution, gros plan. 4 appels muse-image.') },
    ],
  },
}

/** The sections the merchant can switch off. `problem` is not one of them. */
export const SECTIONS = [
  { k: 'problem', label: T('Problem → solution', 'المشكل ← الحل', 'Problème → solution'), on: true, locked: true,
    why: T(
      'This is the sale. A cash-on-delivery buyer is deciding whether to open their door to a courier, and what decides them is recognising their own frustration before anything is offered to them.',
      'هذي هي البيعة. لي يشري بالدفع عند الاستلام راه يقرّر واش يحلّ الباب للليفرور، ولي يقرّرو هو بلي يلقى مشكلتو مكتوبة قبل ما تعرض عليه حتى حاجة.',
      "C'est la vente. Un acheteur en paiement à la livraison décide d'ouvrir sa porte à un livreur ; ce qui le décide, c'est de reconnaître sa propre galère avant qu'on lui propose quoi que ce soit.") },
  { k: 'benefits', label: T('Benefits', 'الفوايد', 'Bénéfices'), on: true },
  { k: 'features', label: T('Visible details', 'تفاصيل تبان', 'Détails visibles'), on: true,
    why: T('Only what the model can see in the photo.', 'غير لي يشوفو الموديل في التصويرة.', 'Uniquement ce que le modèle voit sur la photo.') },
  { k: 'gallery', label: T('Photo gallery', 'معرض التصاور', 'Galerie photos'), on: true },
  { k: 'steps', label: T('How to order', 'كيفاش تطلب', 'Comment commander'), on: true },
  { k: 'why', label: T('Why buy from us', 'علاش من عندنا', 'Pourquoi nous'), on: true },
  { k: 'faq', label: T('FAQ', 'أسئلة', 'FAQ'), on: true },
]

export const REFUSED = [
  { k: 'testimonials', label: T('Customer testimonials', 'شهادات الزبائن', 'Témoignages clients'),
    why: T(
      'We have never met a customer of this shop. Generating Algerian first names and five-star reviews is manufacturing proof — and a page carrying fabricated proof gets an ad account banned.',
      'ما تلاقينا حتى مرة مع زبون تاع هاد الحانوت. تخترع أسماء جزائرية وخمس نجوم، راك تصنع دليل كذوب — والصفحة لي فيها دليل مزوّر تدّي الكومبت الإشهاري.',
      "On n'a jamais rencontré un client de cette boutique. Générer des prénoms algériens et des cinq étoiles, c'est fabriquer une preuve — et une page qui porte une fausse preuve fait bannir un compte publicitaire.") },
  { k: 'urgency', label: T('Urgency, countdown, "only 3 left"', 'استعجال، عدّاد، « ما بقاو غير 3 »', 'Urgence, compte à rebours, « plus que 3 »'),
    why: T(
      'The counter resets on reload. Meta calls that a deceptive practice, and the customer who notices does not come back.',
      'العدّاد يرجع من اللول كي تعاود تحمّل الصفحة. ميتا تسمّيها ممارسة خادعة، والزبون لي ينتبه ما يرجعش.',
      "Le compteur repart à zéro au rechargement. Meta appelle ça une pratique trompeuse, et le client qui s'en aperçoit ne revient pas.") },
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
  // L'identifiant du pixel du marchand. Validé ici, une fois : la valeur part
  // dans une balise <script> de la page publique, donc tout ce qui n'est pas
  // une suite de chiffres est jeté plutôt qu'échappé. Vide = pas de pixel du
  // tout, et pas un script Facebook qui ralentit le téléphone pour rien.
  o.pixelId = /^\d{8,20}$/.test(String(raw.pixelId ?? '').trim()) ? String(raw.pixelId).trim() : ''
  o.sections = {}
  for (const s of SECTIONS) o.sections[s.k] = s.locked ? true : raw.sections?.[s.k] !== false
  // Photos the merchant picked, in their order. The first is the main one.
  o.photos = Array.isArray(raw.photos) ? raw.photos.filter((u) => typeof u === 'string').slice(0, 8) : []
  return o
}

/** What this configuration will cost, before anything is clicked. */
export function estimate(o) {
  const images = slotsFor(o).length
  const s = images ? 30 + images * 11 : 25
  return {
    calls: { copy: 1, images },
    label: images
      ? T(`1 text call + ${images} image${images > 1 ? 's' : ''} · about ${s} s`,
          `طلب نص + ${images} ${images > 1 ? 'تصاور' : 'تصويرة'} · تقريبا ${s} ثانية`,
          `1 appel texte + ${images} image${images > 1 ? 's' : ''} · environ ${s} s`)
      : T('1 text call · about 25 s', 'طلب نص واحد · تقريبا 25 ثانية', '1 appel texte · environ 25 s'),
    images,
    seconds: s,
  }
}
