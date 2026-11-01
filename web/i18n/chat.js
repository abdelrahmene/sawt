// Les chaînes de l'écran « chat ».
// Clé d'abord, langues à l'intérieur : une traduction manquante se voit.
// La darija est de la darija d'Alger, en lettres arabes.
//
// C'est l'écran le plus long de la démonstration : la conversation, les cartes
// d'artefacts, et surtout la bande de point de contrôle — les trois phrases
// qui disent au marchand que rien n'est engagé sans son clic. Elles sont
// écrites à la main dans les trois langues, pas traduites à la chaîne.
//
// Ce qui ne se traduit PAS et reste en clair dans les valeurs : les noms de
// modèles (sam-3.1, muse-image-1.0, muse-spark-1.3), Meta, Facebook, DZD, et
// les noms de champs que le code compare (intent, size, quantity, wilaya).
export const chat = {
  /* ── les chips d'étape : ce que l'agent est en train de faire ─────────── */
  'chat.step.thinking':  { en: 'thinking',  ar: 'يفكّر', fr: 'réfléchit' },
  'chat.step.listening': { en: 'listening', ar: 'يسمع',  fr: 'écoute' },
  'chat.step.photo':     { en: 'looking at the photo', ar: 'يشوف التصويرة', fr: 'regarde la photo' },
  'chat.step.site':      { en: 'building the site',    ar: 'يبني الموقع',   fr: 'construit le site' },
  'chat.step.landing':   { en: 'writing the page',     ar: 'يكتب الصفحة',   fr: 'écrit la page' },
  'chat.step.creatives': { en: 'drawing the creatives', ar: 'يرسم التصاور', fr: 'dessine les visuels' },
  'chat.step.angles':    { en: 'looking for angles',   ar: 'يقلّب على الأفكار', fr: 'cherche les angles' },
  'chat.step.campaign':  { en: 'setting up the campaign', ar: 'يوجد الحملة', fr: 'prépare la campagne' },
  'chat.step.launch':    { en: 'launching the campaign', ar: 'يلانسي الحملة', fr: 'lance la campagne' },
  'chat.step.results':   { en: 'reading the results',  ar: 'يقرا النتائج',  fr: 'lit les résultats' },
  'chat.step.decide':    { en: 'deciding',             ar: 'يقرّر',         fr: 'décide' },
  'chat.step.days':      { en: 'moving the days forward', ar: 'يفوّت النهارات', fr: 'avance les jours' },
  'chat.step.inbox':     { en: 'reading the messages', ar: 'يقرا الرسائل',  fr: 'lit la boîte' },
  'chat.step.answer':    { en: 'answering customers',  ar: 'يرد على الزبائن', fr: 'répond aux clients' },
  'chat.step.connect':   { en: 'opening the connection', ar: 'يحل الربط',   fr: 'ouvre la connexion' },
  'chat.step.domain':    { en: 'attaching the domain', ar: 'يربط الدومين',  fr: 'attache le domaine' },
  'chat.step.metaSetup': { en: 'preparing the steps',  ar: 'يوجد الخطوات',  fr: 'prépare la marche à suivre' },

  /* ── la phase, en sous-titre du chip ──────────────────────────────────── */
  'chat.phase.copy':   { en: 'text',    ar: 'النص',     fr: 'texte' },
  'chat.phase.scenes': { en: 'visuals', ar: 'التصاور',  fr: 'visuels' },
  'chat.phase.scene':  { en: 'visual',  ar: 'تصويرة',   fr: 'visuel' },
  'chat.phase.page':   { en: 'page',    ar: 'الصفحة',   fr: 'page' },
  'chat.phase.home':   { en: 'home',    ar: 'الواجهة',  fr: 'accueil' },

  /* ── les deux lectures d'un vocal, côte à côte ────────────────────────── */
  'chat.heard.title': { en: 'what the model heard', ar: 'واش سمع الموديل', fr: 'ce que le modèle a entendu' },
  'chat.heard.lostByPinned': {
    en: '"ar" lost: {words}',
    ar: '« ar » ضيّع: {words}',
    fr: '« ar » a perdu : {words}',
  },
  'chat.heard.lostByAuto': {
    en: '"auto" lost: {words}',
    ar: '« auto » ضيّع: {words}',
    fr: '« auto » a perdu : {words}',
  },
  // `intent`, `size`, `quantity` et `wilaya` sont les champs du JSON que le
  // code compare — ils restent tels quels dans les trois langues.
  'chat.heard.intentMissing': {
    en: 'intent = {intent}  ·  missing: {missing}',
    ar: 'intent = {intent}  ·  خاص: {missing}',
    fr: 'intent = {intent}  ·  manquant : {missing}',
  },
  'chat.heard.intentFull': {
    en: 'intent = {intent}  ·  nothing missing',
    ar: 'intent = {intent}  ·  ما خاص والو',
    fr: 'intent = {intent}  ·  rien ne manque',
  },

  /* ── le point de contrôle : l'arrêt avant la dépense ──────────────────── */
  'chat.ckpt.title':  { en: 'checkpoint', ar: 'وقفة',       fr: 'point de contrôle' },
  'chat.ckpt.notNow': { en: 'Not now',    ar: 'ماشي دروك',  fr: 'Pas maintenant' },
  // Ce que le bouton de sortie envoie à l'agent — donc aussi ce que le
  // marchand voit dans sa propre bulle : il doit être dans SA langue.
  'chat.ckpt.notNowSend': {
    en: 'not now, do not launch anything',
    ar: 'ماشي دروك، ما تلانسي والو',
    fr: 'pas maintenant, ne lance rien',
  },
  'chat.ckpt.foot': {
    en: 'Nothing is committed before you click. And in this prototype the Facebook side is simulated: no spend goes to Meta.',
    ar: 'ما يتحرك والو قبل ما تكليكي. وفي هذا البروتوتيب الجهة تاع Facebook مصنوعة للتجربة: ما يخرج حتى دورو عند Meta.',
    fr: "Rien n'est engagé avant ton clic. Et dans ce prototype le côté Facebook est simulé : aucune dépense ne part sur Meta.",
  },

  /* ── les deux pastilles de provenance, en tête de chaque carte ────────── */
  'chat.badge.real': { en: 'real',      ar: 'حقيقي', fr: 'réel' },
  'chat.badge.sim':  { en: 'simulated', ar: 'تجربة', fr: 'simulé' },
  'chat.prov.replay': {
    en: 'replay — no model call ({by} when live)',
    ar: 'إعادة — ما تنادى حتى موديل ({by} كي يكون لايف)',
    fr: 'rejeu — aucun appel modèle ({by} en mode live)',
  },

  /* ── étiquettes courtes et unités ─────────────────────────────────────── */
  'chat.label.home':     { en: 'home',     ar: 'الواجهة', fr: 'accueil' },
  'chat.label.page':     { en: 'page',     ar: 'صفحة',    fr: 'page' },
  'chat.label.artifact': { en: 'artifact', ar: 'عنصر',    fr: 'artefact' },
  'chat.minutes':        { en: '{n} min',  ar: '{n} دقيقة', fr: '{n} min' },
  'chat.retry':          { en: 'retry',    ar: 'عاود',    fr: 'réessayer' },

  /* ── un artefact écrit par une version précédente ─────────────────────── */
  'chat.artifact.stale': {
    en: 'This item comes from an earlier version and no longer renders as is.',
    ar: 'هذا العنصر جاي من فرسيون قديمة، ما عادش يبان كيما كان.',
    fr: "Cet élément vient d'une version précédente et ne s'affiche plus tel quel.",
  },
  'chat.artifact.openAnyway': { en: 'open it anyway ↗', ar: 'حلّه على كل حال ↗', fr: 'ouvrir quand même ↗' },

  /* ── les titres des cartes ────────────────────────────────────────────── */
  'chat.card.photos':      { en: 'Product photos',       ar: 'تصاور المنتج',      fr: 'Photos produit' },
  /* ── le catalogue fournisseur, dans la conversation ───────────────────
     « par commande LIVRÉE » n'est pas une précaution de style. En paiement
     à la livraison une part des colis revient, donc une marge annoncée par
     commande PASSÉE est une marge que le marchand ne touchera jamais. */
  'chat.card.catalog': { en: '{n} products from the supplier', ar: '{n} منتجات من المورد', fr: '{n} produits du fournisseur' },
  'chat.catalog.cost': { en: 'cost', ar: 'التكلفة', fr: 'coût' },
  'chat.catalog.price': { en: 'sell at', ar: 'تبيع بـ', fr: 'vendre à' },
  'chat.catalog.marginLbl': { en: 'you keep', ar: 'تربح', fr: 'tu gardes' },
  'chat.catalog.sell': { en: 'Sell this one', ar: 'نبيع هذا', fr: 'Vendre celui-ci' },
  'chat.catalog.sellMsg': { en: 'I want to sell the {name}.', ar: 'نحب نبيع {name}.', fr: 'Je veux vendre le {name}.' },
  'chat.card.imported': { en: '{name} — now in your shop', ar: '{name} — راه في حانوتك', fr: '{name} — dans ta boutique' },
  'chat.imported.money': {
    en: 'You sell at {price}. The supplier bills you {cost}. You keep {margin} on every delivered order — {pct}%.',
    ar: 'تبيع بـ {price}. المورد يحاسبك {cost}. تربح {margin} في كل طلب موصل — {pct}%.',
    fr: 'Tu vends à {price}. Le fournisseur te facture {cost}. Tu gardes {margin} par commande livrée — {pct} %.',
  },
  'chat.imported.next': { en: 'Build its page', ar: 'إبني الصفحة تاعو', fr: 'Construire sa page' },
  'chat.imported.nextMsg': { en: 'Build the landing page for the {name}.', ar: 'إبنيلي الصفحة تاع {name}.', fr: 'Construis la landing page du {name}.' },

  /* ── le débit ─────────────────────────────────────────────────────── */
  'chat.cost.credits': { en: 'credits', ar: 'كريدي', fr: 'crédits' },
  'chat.cost.line': { en: '{n}× {model}', ar: '{n}× {model}', fr: '{n}× {model}' },

  'chat.card.angles':      { en: 'Marketing angles',     ar: 'أفكار الإشهار',     fr: 'Angles marketing' },
  'chat.card.restyle':     { en: 'Photo redone — {product}', ar: 'التصويرة معاودة — {product}', fr: 'Photo refaite — {product}' },
  'chat.card.creatives':   { en: 'Creatives',            ar: 'تصاور الإشهار',     fr: 'Créatives' },
  'chat.card.site':        { en: 'Site — {shop}',        ar: 'الموقع — {shop}',   fr: 'Site — {shop}' },
  'chat.card.storefront':  { en: 'Storefront — {shop}',  ar: 'الفيترينة — {shop}', fr: 'Vitrine — {shop}' },
  'chat.card.landing':     { en: 'Landing — {product}',  ar: 'صفحة البيع — {product}', fr: 'Landing — {product}' },
  'chat.card.connectMeta': { en: 'Facebook connection',  ar: 'الربط مع Facebook', fr: 'Connexion Facebook' },
  'chat.card.inbox':       { en: 'Inbox — {n} waiting',  ar: 'الرسائل — {n} يستناو', fr: 'Boîte de réception — {n} en attente' },
  'chat.card.answers':     { en: 'Customer answers — {summary}', ar: 'الردود على الزبائن — {summary}', fr: 'Réponses clients — {summary}' },
  'chat.card.campaign':    { en: 'Campaign — {name}',    ar: 'الحملة — {name}',   fr: 'Campagne — {name}' },
  'chat.card.launch':      { en: 'Launch',               ar: 'اللانسمون',         fr: 'Lancement' },
  'chat.card.results':     { en: 'Results — {n} day(s)', ar: 'النتائج — {n} يوم', fr: 'Résultats — {n} jour(s)' },
  'chat.card.decision':    { en: 'Decision',             ar: 'القرار',            fr: 'Décision' },
  'chat.card.domain':      { en: 'Domain — {host}',      ar: 'الدومين — {host}',  fr: 'Domaine — {host}' },
  'chat.card.metaSetup':   { en: 'Connect your own Meta app', ar: 'اربط الأپليكاسيون Meta تاعك', fr: 'Connecter ta propre app Meta' },

  /* ── la photo refaite ─────────────────────────────────────────────────── */
  'chat.restyle.yourPhoto': { en: 'your photo', ar: 'التصويرة تاعك', fr: 'ta photo' },
  'chat.restyle.cutout':    { en: 'cut out · sam-3.1', ar: 'مقصوص · sam-3.1', fr: 'détouré · sam-3.1' },
  // L'avertissement de marque : c'est le compte publicitaire du marchand qui
  // est en jeu, il passe avant le reste de la carte.
  'chat.restyle.brandTitle': {
    en: 'Brand visible on the photo.',
    ar: 'كاين ماركة تبان في التصويرة.',
    fr: 'Marque visible sur la photo.',
  },
  'chat.restyle.brandNote': {
    en: 'The render does not make it more readable than on your original — but a Meta ad with a logo you have no right to closes the account.',
    ar: 'الرسم ما خلّاهاش تتقرا أكثر مما كانت في الأصل تاعك — بصح إشهار على Meta بلوڨو بلا رخصة يسكّر الكونط.',
    fr: 'Le rendu ne la rend pas plus lisible que sur ton original — mais une pub Meta avec un logo sans autorisation ferme le compte.',
  },

  /* ── les créatives ────────────────────────────────────────────────────── */
  'chat.creatives.subject':   { en: 'from what it saw: {subject}', ar: 'على حساب واش شاف: {subject}', fr: "d'après ce qu'il a vu : {subject}" },
  'chat.creatives.iso':       { en: '{model} cut the product out before drawing — {gain}.', ar: '{model} قصّ المنتج قبل ما يرسم — {gain}.', fr: '{model} a détouré le produit avant de dessiner — {gain}.' },
  'chat.creatives.isoAlt':    { en: 'product cut out', ar: 'المنتج مقصوص', fr: 'produit détouré' },
  'chat.creatives.isoFailed': { en: '{model} could not cut it out: {why}.', ar: '{model} ما نجحش يقص: {why}.', fr: "{model} n'a pas pu détourer : {why}." },
  'chat.creatives.headline':  { en: 'headline burned in: {text}', ar: 'العنوان مركّب فيها: {text}', fr: 'titre incrusté : {text}' },

  /* ── le site ──────────────────────────────────────────────────────────── */
  'chat.site.count': { en: '{n} products', ar: '{n} منتوج', fr: '{n} produits' },
  'chat.site.onlineAt': {
    en: 'Online at {host} — every page is a real file. Click to open it.',
    ar: 'راه أونلاين على {host} — كل صفحة هي ملف حقيقي. كليكي باش تحلها.',
    fr: "En ligne sur {host} — chaque page est un vrai fichier. Clique pour l'ouvrir.",
  },
  'chat.site.realFiles': {
    en: 'Every page is a real file. Click to open it.',
    ar: 'كل صفحة هي ملف حقيقي. كليكي باش تحلها.',
    fr: "Chaque page est un vrai fichier. Clique pour l'ouvrir.",
  },
  'chat.site.failed':       { en: '{product}: {error}', ar: '{product}: {error}', fr: '{product} : {error}' },
  'chat.site.manageDomain': { en: 'manage the domain', ar: 'سيّر الدومين', fr: 'gérer le domaine' },

  /* ── la landing et la vitrine ─────────────────────────────────────────── */
  'chat.landing.kb':     { en: '{n} KB', ar: '{n} كيلوبايت', fr: '{n} Ko' },
  'chat.landing.scenes': {
    en: '{n} section visual(s) generated by muse-image',
    ar: '{n} تصويرة(ات) تاع الأقسام مرسومين بـ muse-image',
    fr: '{n} visuel(s) de section générés par muse-image',
  },
  'chat.landing.sections': {
    en: '{benefits} benefits · {features} details · {steps} steps · {faq} FAQ',
    ar: '{benefits} فوائد · {features} تفاصيل · {steps} خطوات · {faq} FAQ',
    fr: '{benefits} bénéfices · {features} détails · {steps} étapes · {faq} FAQ',
  },
  'chat.landing.made': {
    en: 'Text written by muse-spark, visuals by muse-image, layout by the code.',
    ar: 'النص كتبو muse-spark، التصاور رسمهم muse-image، والترتيب درّاه الكود.',
    fr: 'Texte écrit par muse-spark, visuels par muse-image, mise en page par le code.',
  },
  'chat.landing.sceneFailed': {
    en: 'visual "{slot}" not generated: {error} — the section stays without an image.',
    ar: 'التصويرة « {slot} » ما ترسمتش: {error} — القسم يبقى بلا تصويرة.',
    fr: 'visuel « {slot} » non généré : {error} — la section reste sans image.',
  },

  /* ── la connexion Facebook ────────────────────────────────────────────── */
  'chat.meta.connectBtn':  { en: 'Connect Facebook',       ar: 'اربط Facebook',    fr: 'Connecter Facebook' },
  'chat.meta.continueFb':  { en: 'Continue with Facebook', ar: 'كمّل مع Facebook', fr: 'Continuer avec Facebook' },
  'chat.meta.already':     { en: 'already connected — view', ar: 'مربوط من قبل — شوف', fr: 'déjà connecté — voir' },

  /* ── la boîte de réception ────────────────────────────────────────────── */
  'chat.inbox.nobody':     { en: 'Nobody is waiting.', ar: 'حتى واحد ما يستنى.', fr: "Personne n'attend." },
  'chat.inbox.th.person':  { en: 'customer', ar: 'الزبون',    fr: 'client' },
  'chat.inbox.th.channel': { en: 'channel',  ar: 'القنال',    fr: 'canal' },
  'chat.inbox.th.asked':   { en: 'asked',    ar: 'واش سقسى',  fr: 'a demandé' },
  'chat.inbox.th.ago':     { en: 'ago',      ar: 'قبل',       fr: 'il y a' },
  'chat.inbox.open':       { en: 'open the inbox', ar: 'حل الرسائل', fr: 'ouvrir la boîte' },

  /* ── les réponses clients : les refus sont le propos ──────────────────── */
  'chat.answers.note':        { en: 'real answer · simulated page', ar: 'رد حقيقي · صفحة تجربة', fr: 'réponse réelle · page simulée' },
  'chat.answers.onPurpose':   { en: 'not answered, on purpose', ar: 'ما ردّش عليه، وهذا بقصد', fr: "pas répondu, et c'est voulu" },
  'chat.answers.needsYou':    { en: 'it needs from you: {need}', ar: 'خاصو منك: {need}', fr: 'il lui faut de toi : {need}' },
  'chat.answers.openThreads': { en: 'see the conversations', ar: 'شوف المحادثات', fr: 'voir les conversations' },

  /* ── la campagne ──────────────────────────────────────────────────────── */
  'chat.campaign.objective':   { en: 'objective',   ar: 'الهدف',           fr: 'objectif' },
  'chat.campaign.dailyBudget': { en: 'budget / day', ar: 'الميزانية / النهار', fr: 'budget / jour' },
  'chat.campaign.targeting':   { en: 'targeting',   ar: 'الجمهور',         fr: 'ciblage' },
  'chat.campaign.placements':  { en: 'placements',  ar: 'وين تبان',        fr: 'placements' },
  'chat.campaign.creatives':   { en: 'creatives',   ar: 'تصاور الإشهار',   fr: 'créatives' },
  'chat.campaign.status':      { en: 'status',      ar: 'الحالة',          fr: 'statut' },
  // Les wilayas restent écrites comme elles arrivent, et les genres sont des
  // valeurs du simulateur.
  'chat.campaign.targetingValue': {
    en: '{geo} · {min}-{max} yrs · {genders}',
    ar: '{geo} · {min}-{max} عام · {genders}',
    fr: '{geo} · {min}-{max} ans · {genders}',
  },
  'chat.campaign.exactRequest': {
    en: 'The exact request the Marketing API would receive:',
    ar: 'الطلب بالضبط اللي يوصل لـ Marketing API:',
    fr: 'La requête exacte que recevrait la Marketing API :',
  },
  'chat.campaign.seeInAds': { en: 'see in Ads', ar: 'شوف في الإشهار', fr: 'voir dans Pubs' },

  /* ── le lancement ─────────────────────────────────────────────────────── */
  'chat.launch.refused': { en: 'refused', ar: 'مرفوض', fr: 'refusé' },
  'chat.launch.noSpend': {
    en: 'no real spend, nothing went to Meta.',
    ar: 'ما خرجش حتى دورو، ما راح والو عند Meta.',
    fr: "aucune dépense réelle, rien n'est parti chez Meta.",
  },

  /* ── les résultats ────────────────────────────────────────────────────── */
  'chat.results.nothing':      { en: 'nothing to read', ar: 'ما كاين واش تقرا', fr: 'rien à lire' },
  'chat.kpi.spent':            { en: 'spent',        ar: 'اللي خرج',        fr: 'dépensé' },
  'chat.kpi.orders':           { en: 'orders',       ar: 'الكومندات',       fr: 'commandes' },
  'chat.kpi.costPerOrder':     { en: 'cost / order', ar: 'التكلفة / كومندة', fr: 'coût / commande' },
  'chat.kpi.clicks':           { en: 'clicks',       ar: 'الكليكات',        fr: 'clics' },
  'chat.results.th.creative':  { en: 'creative',  ar: 'تصويرة',     fr: 'créative' },
  'chat.results.th.placement': { en: 'placement', ar: 'وين',        fr: 'placement' },
  'chat.results.th.spend':     { en: 'spend',     ar: 'خرج',        fr: 'dépense' },
  'chat.results.th.clicks':    { en: 'clicks',    ar: 'كليكات',     fr: 'clics' },
  'chat.results.th.orders':    { en: 'ord.',      ar: 'كومند',      fr: 'cmd' },
  'chat.results.th.cpo':       { en: 'cost/ord.', ar: 'تكلفة/كومند', fr: 'coût/cmd' },

  /* ── le domaine ───────────────────────────────────────────────────────── */
  'chat.domain.status': { en: 'status: {status} — {label}', ar: 'الحالة: {status} — {label}', fr: 'statut : {status} — {label}' },
  'chat.domain.addAtRegistrar': {
    en: 'To add at your registrar. The check after that is a real DNS query.',
    ar: 'زيدهم عند الريجيسترار تاعك. والتحقيق من بعد هو طلب DNS حقيقي.',
    fr: 'À ajouter chez ton registrar. La vérification ensuite est une vraie requête DNS.',
  },
  'chat.domain.manage': { en: 'manage the domains', ar: 'سيّر الدومينات', fr: 'gérer les domaines' },

  /* ── la photo que le marchand envoie ──────────────────────────────────── */
  // `photo_quality` arrive du modèle de vision et vaut « bonne » quand tout va
  // bien — le code compare cette valeur, elle n'est pas traduite.
  'chat.photo.see':     { en: 'I see: {product}.', ar: 'راني نشوف: {product}.', fr: 'Je vois : {product}.' },
  'chat.photo.quality': { en: 'Photo: {quality}',  ar: 'التصويرة: {quality}',  fr: 'Photo : {quality}' },

  /* ── les pannes, dites comme des pannes et pas comme des questions ────── */
  'chat.mic.unavailable': { en: 'microphone unavailable: {error}', ar: 'الميكرو ما يخدمش: {error}', fr: 'micro indisponible : {error}' },
  'chat.offline.title':   { en: 'Connection to the server lost.', ar: 'تقطع الاتصال بالسيرفور.', fr: 'Connexion au serveur perdue.' },
  'chat.offline.body': {
    en: 'This is not the agent: nothing was lost, the conversation is in the database. Restart {cmd} then try again.',
    ar: 'هذا ماشي الوكيل: ما ضاع والو، المحادثة راهي في الباز. عاود شغّل {cmd} ومن بعد عاود جرّب.',
    fr: "Ce n'est pas l'agent : rien n'a été perdu, la conversation est en base. Relance {cmd} puis réessaie.",
  },
  'chat.reset.confirm': {
    en: 'Erase this conversation and start over?',
    ar: 'تمحي هذي المحادثة وتبدا من الصفر؟',
    fr: 'Effacer cette conversation et repartir de zéro ?',
  },
}
