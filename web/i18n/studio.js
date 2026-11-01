// Les chaînes de l'écran « studio ».
// Clé d'abord, langues à l'intérieur : une traduction manquante se voit.
// La darija est de la darija d'Alger, en lettres arabes.
//
// Deux choix qui ne se devinent pas à la lecture :
//   · « اللاندينڨ », « الڨارانتي », « فيشي », « أورديناتور » — quand le mot
//     n'a pas de forme en darija, le marchand dit l'emprunt français en
//     lettres arabes. C'est ce qu'il dit vraiment, pas de l'arabe littéraire.
//   · `studio.empty.body` dit « على اليمين » là où le français dit « à
//     gauche » : en arabe le document passe en `dir="rtl"`, la grille
//     `#v-studio` se retourne, et le panneau des réglages est à DROITE.
//     Traduire « gauche » par « gauche » enverrait le marchand du mauvais côté.
export const studio = {
  /* ── l'en-tête du panneau ─────────────────────────────────────────────── */
  'studio.title': { en: 'Landing studio', ar: 'ستوديو اللاندينڨ', fr: 'Studio landing' },
  'studio.lede': {
    en: 'The model writes the copy and draws the visuals. The layout is code, so it comes out the same every time.',
    ar: 'الموديل يكتب النص ويرسم التصاور. أما ترتيب الصفحة راه كود — علاهذا يخرج كيف كيف كل مرة.',
    fr: 'Le modèle écrit le texte et dessine les visuels. La mise en page, elle, est du code — donc elle est la même à chaque fois.',
  },
  'studio.loading': { en: 'studio', ar: 'الستوديو', fr: 'studio' },

  /* ── le formulaire ────────────────────────────────────────────────────── */
  'studio.product': { en: 'Product',     ar: 'المنتج',     fr: 'Produit' },
  'studio.price':   { en: 'Price (DZD)', ar: 'الثمن (دج)', fr: 'Prix (DA)' },
  'studio.shop':    { en: 'Shop',        ar: 'الحانوت',    fr: 'Boutique' },
  'studio.angle':   { en: 'Angle',       ar: 'الأنڨل',     fr: 'Angle' },
  'studio.angle.hint': {
    en: 'the reason to buy, in one sentence',
    ar: 'علاش يشري، في جملة وحدة',
    fr: "la raison d'acheter, en une phrase",
  },
  'studio.angle.ph': {
    en: 'The quality shows, and you pay on delivery',
    ar: 'النوعية تبان، وتخلّص كي توصلك',
    fr: 'La qualité se voit, et tu paies à la livraison',
  },

  /* ── les photos de référence ──────────────────────────────────────────── */
  'studio.photos':      { en: 'Reference photos', ar: 'التصاور لي يتبعها', fr: 'Photos de référence' },
  'studio.photos.hint': { en: 'the first one is the main one', ar: 'الأولى هي الأساسية', fr: 'la 1ʳᵉ est la principale' },
  'studio.photos.main': { en: 'main', ar: 'الأساسية', fr: 'principale' },
  'studio.photos.count': {
    en: '{n} selected. Click again to remove.',
    ar: '{n} مختارين. ارجع كليكي باش تنحّي.',
    fr: '{n} sélectionnée(s). Reclique pour retirer.',
  },
  'studio.photos.none': {
    en: 'Nothing selected: it will take the creatives first, then the session photos, in that order.',
    ar: 'ماكاش اختيار: يدّي الإشهارات لي رسمهم، ومن بعد تصاور هاد المحادثة، بهاد الترتيب.',
    fr: 'Aucune sélection : il prendra les créatives puis les photos de la session, dans cet ordre.',
  },
  'studio.photos.empty': {
    en: 'No photo in this session. Send one to the agent, or generate creatives — a page with no product sells nothing.',
    ar: 'ماكاش تصويرة في هاد المحادثة. ابعث واحدة للوكيل، ولا دير إشهارات — صفحة بلا منتج ما تبيع والو.',
    fr: "Aucune photo dans cette session. Envoie-en une à l'agent, ou génère des créatives — une page sans produit ne vend rien.",
  },

  /* ── les trois titres de section ──────────────────────────────────────── */
  'studio.sec.settings': { en: 'Settings', ar: 'الإعدادات', fr: 'Réglages' },
  'studio.sec.sections': { en: 'Sections', ar: 'الأقسام',   fr: 'Sections' },
  'studio.sec.refused':  { en: 'What we will not add', ar: 'واش ما نزيدوهش', fr: "Ce qu'on n'ajoutera pas" },
  // Le libellé vient du serveur : il passe en variable, jamais en recollage —
  // en arabe le suffixe ne tombe pas du même côté de la phrase.
  'studio.sections.locked': { en: '{label} · always on', ar: '{label} · ديما موجود', fr: '{label} · toujours là' },

  /* ── la consigne libre ────────────────────────────────────────────────── */
  'studio.notes':      { en: 'Extra instructions', ar: 'التوصية تاعك', fr: 'Consigne libre' },
  'studio.notes.hint': { en: 'optional', ar: 'ماشي ضروري', fr: 'facultatif' },
  'studio.notes.ph': {
    en: 'What the merchant knows and the model cannot see: the material, the warranty, the real delivery time…',
    ar: 'واش يعرفه التاجر والموديل ما يقدرش يشوفه: المادة، الڨارانتي، الوقت الحقيقي تاع التوصيل…',
    fr: 'Ce que le marchand sait et que le modèle ne peut pas voir : la matière, la garantie, le délai réel…',
  },
  'studio.notes.help': {
    en: 'It will follow the instruction — unless it asks it to state a fact it cannot check. That, it refuses.',
    ar: 'يتبع التوصية — غير إذا طلبت منه يقول حاجة ما يقدرش يتأكد منها. هاذي يرفضها.',
    fr: "Il suivra la consigne — sauf si elle lui demande d'affirmer un fait qu'il ne peut pas vérifier. Ça, il refusera.",
  },

  /* ── le coût, imprimé avant le bouton et pas après la facture ─────────── */
  'studio.cost.text':   { en: 'Cost: 1 text call · about 25 s', ar: 'التكلفة: طلب نص واحد · تقريبا 25 ثانية', fr: 'Coût : 1 appel texte · environ 25 s' },
  'studio.cost.images': {
    en: 'Cost: 1 text call + {n} images · about {s} s',
    ar: 'التكلفة: طلب نص واحد + {n} تصاور · تقريبا {s} ثانية',
    fr: 'Coût : 1 appel texte + {n} images · environ {s} s',
  },

  /* ── générer ──────────────────────────────────────────────────────────── */
  'studio.build':      { en: 'Generate the page', ar: 'دير الصفحة', fr: 'Générer la page' },
  'studio.fresh':      { en: 'Redraw the visuals', ar: 'عاود ارسم التصاور', fr: 'Redessiner les visuels' },
  'studio.fresh.why': {
    en: 'By default the visuals already on disk are reused — rebuilding a page should not cost four more image generations.',
    ar: 'بالعادة التصاور لي راهم محفوظين يتستعملوا من جديد — ما لازمش تعاود تخلّص أربع تصاور كي تعاود تبني الصفحة.',
    fr: "Par défaut, les visuels déjà sur le disque sont réutilisés — rebâtir une page ne doit pas recoûter quatre générations d'images.",
  },
  'studio.color.aria': { en: 'main color', ar: 'اللون الأساسي', fr: 'couleur principale' },
  'studio.need.product': { en: 'The product name is missing.', ar: 'خاصك اسم المنتج.', fr: 'Il manque le nom du produit.' },

  /* ── la progression, pendant la construction ──────────────────────────── */
  'studio.step.copy':   { en: 'the model is writing the copy…', ar: 'الموديل راه يكتب النص…', fr: 'le modèle écrit le texte…' },
  'studio.step.scenes': { en: 'it is drawing the visuals…', ar: 'راه يرسم التصاور…', fr: 'il dessine les visuels…' },
  'studio.step.scene':  { en: 'visual “{label}” · {step}/{total}', ar: 'تصويرة « {label} » · {step}/{total}', fr: 'visuel « {label} » · {step}/{total}' },
  'studio.done.ready':  { en: 'ready — {bits}', ar: 'واجدة — {bits}', fr: 'prête — {bits}' },
  'studio.done.size':   { en: '{n} KB', ar: '{n} كو', fr: '{n} Ko' },
  'studio.done.scenes': { en: '{n} visuals', ar: '{n} تصاور', fr: '{n} visuel(s)' },
  'studio.done.reused': { en: '{n} reused', ar: '{n} مستعملين من جديد', fr: '{n} réutilisé(s)' },
  'studio.done.failed': {
    en: 'visual “{slot}” not generated: {error}',
    ar: 'تصويرة « {slot} » ما تولّدتش: {error}',
    fr: 'visuel « {slot} » non généré : {error}',
  },
  'studio.done.toast': { en: 'Page generated.', ar: 'الصفحة واجدة.', fr: 'Page générée.' },

  /* ── l'aperçu, à droite (à gauche en arabe) ───────────────────────────── */
  'studio.preview':       { en: 'Preview',  ar: 'الشوفة',     fr: 'Aperçu' },
  'studio.preview.frame': { en: 'preview',  ar: 'الشوفة',     fr: 'aperçu' },
  'studio.real':          { en: 'real',     ar: 'حقيقي',      fr: 'réel' },
  'studio.dev.phone':     { en: 'phone',    ar: 'تيليفون',    fr: 'téléphone' },
  'studio.dev.desk':      { en: 'desktop',  ar: 'أورديناتور', fr: 'bureau' },
  'studio.open':          { en: 'open',     ar: 'حل',         fr: 'ouvrir' },
  'studio.empty.title':   { en: 'Nothing to show yet', ar: 'مازال ماكاش واش نوري', fr: 'Rien à montrer encore' },
  'studio.empty.body': {
    en: 'Set the options on the left, then generate. The page shows up here, and it is a real file you can open, send or host.',
    ar: 'وجّد الإعدادات على اليمين، ومن بعد دير الصفحة. تبان هنا، وراهي فيشي حقيقي تقدر تحلّه، تبعثه ولا تحطّه في الويب.',
    fr: 'Règle les paramètres à gauche, puis génère. La page apparaîtra ici, et ce sera un vrai fichier que tu peux ouvrir, envoyer ou héberger.',
  },
}
