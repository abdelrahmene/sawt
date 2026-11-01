// Les chaînes de l'écran « settings ».
// Clé d'abord, langues à l'intérieur : une traduction manquante se voit.
// La darija est de la darija d'Alger, en lettres arabes.
//
// Trois choix qui ne se devinent pas à la lecture :
//   · Les tableaux d'honnêteté sont la réponse à la seule question dure qu'un
//     juré peut poser. Ils se lisent donc en anglais aussi bien qu'en darija —
//     c'est le seul écran où une traduction molle coûterait des points.
//   · « طلب حقيقي » et pas « أپيل » pour « vrai appel » : c'est déjà le mot de
//     `studio.cost.text` (« طلب نص واحد »), et deux mots pour la même chose
//     dans la même interface, c'est un mot de trop.
//   · Les identifiants de modèles, `SQLite`, `DNS`, `Platform Data`,
//     `ads_management`, `npm run baseten`, `node:sqlite` et `out/` restent en
//     lettres latines dans les trois langues : ce sont des choses qu'on tape
//     ou qu'on cherche, pas des mots qu'on lit.
export const settings = {
  /* ── l'en-tête ────────────────────────────────────────────────────────── */
  'settings.loading': { en: 'settings', ar: 'الإعدادات', fr: 'réglages' },
  'settings.title':   { en: 'Settings', ar: 'الإعدادات', fr: 'Réglages' },
  'settings.lede': {
    en: 'The shop, the language, and what is real in this prototype.',
    ar: 'الحانوت، اللغة، وواش راه حقيقي في هاذ البروطوتيپ.',
    fr: 'La boutique, la langue, et ce qui est réel dans ce prototype.',
  },

  /* ── la boutique ──────────────────────────────────────────────────────── */
  'settings.shop.card':   { en: 'The shop',      ar: 'الحانوت',       fr: 'La boutique' },
  'settings.shop.name':   { en: 'Shop name',     ar: 'إسم الحانوت',   fr: 'Nom de la boutique' },
  'settings.shop.lang':   { en: 'Page language', ar: 'لغة الصفحات',   fr: 'Langue des pages' },
  'settings.shop.langAr': { en: 'Darija (Arabic)', ar: 'الدارجة (بالعربية)', fr: 'Darija (arabe)' },
  'settings.shop.langFr': { en: 'French',        ar: 'الفرنسية',      fr: 'Français' },
  'settings.shop.save':   { en: 'save',          ar: 'سجّل',          fr: 'enregistrer' },
  'settings.shop.why': {
    en: 'The name goes into the header of the generated pages and into the answers to customers. The language decides the one the landing pages use — the agent itself always answers in the language it was spoken to.',
    ar: 'الإسم يدخل في راس الصفحات المخرّجة وفي الردود على الزبائن. اللغة تحدّد لغة اللاندينڨات — أما الوكيل، هو يرد ديما باللغة اللي تهدر بيها معاه.',
    fr: "Le nom passe dans l'en-tête des pages générées et dans les réponses aux clients. La langue décide de celle des landings — l'agent, lui, répond toujours dans la langue dans laquelle on lui parle.",
  },
  'settings.saved': { en: 'Saved.', ar: 'تسجّل.', fr: 'Enregistré.' },

  /* ── le cerveau, et la bascule entre les deux ─────────────────────────── */
  'settings.brain.card': { en: "The agent's brain", ar: 'العقل تاع الوكيل', fr: "Le cerveau de l'agent" },
  'settings.brain.meta': { en: 'Meta hosted · {model}',  ar: 'عند ميتا · {model}',      fr: 'Meta hébergé · {model}' },
  'settings.brain.open': { en: 'Open weights · {model}', ar: 'أوزان مفتوحة · {model}',  fr: 'Poids ouverts · {model}' },
  'settings.brain.why': {
    en: 'Switch, then talk to the agent again: the next turn runs on the other model. The setting survives a restart.',
    ar: 'بدّل، ومن بعد ارجع هدر مع الوكيل: الدور اللي جاي يدور على الموديل الآخر. الإعداد يبقى حتى كي تعاود تشعل.',
    fr: "Bascule, puis reparle à l'agent : le tour suivant tourne sur l'autre modèle. Le réglage survit au redémarrage.",
  },
  'settings.brain.toast': { en: 'Brain: {model}', ar: 'العقل: {model}', fr: 'Cerveau : {model}' },

  /* ── ce que les poids ouverts savent faire, et ce qu'ils ne savent pas ──
     Les deux cellules citées (« الصباط… » et le test différentiel) sont des
     sorties de modèle, pas de la prose : elles restent identiques dans les
     trois langues, sinon la mesure n'en est plus une. */
  'settings.open.section': {
    en: 'What runs on the open weights',
    ar: 'واش يدور على الأوزان المفتوحة',
    fr: 'Ce qui tourne sur les poids ouverts',
  },
  'settings.open.th.cap':      { en: 'capability', ar: 'القدرة', fr: 'capacité' },
  'settings.open.th.measured': { en: 'measured',   ar: 'القياس', fr: 'mesuré' },
  'settings.yes': { en: 'yes', ar: 'واه', fr: 'oui' },
  'settings.no':  { en: 'no',  ar: 'لا',  fr: 'non' },

  'settings.open.chat':   { en: 'Conversation', ar: 'الهدرة', fr: 'Conversation' },
  'settings.open.chat.m': {
    en: 'clean answer, the reasoning arrives in a separate field',
    ar: 'رد نقي، والتفكير يجي في خانة بوحدها',
    fr: 'réponse propre, le raisonnement arrive dans un champ séparé',
  },
  'settings.open.darija':   { en: 'Darija', ar: 'الدارجة', fr: 'Darija' },
  'settings.open.darija.m': {
    en: '“الصباط يدير 4500 دج والدفع عند الاستلام”',
    ar: '« الصباط يدير 4500 دج والدفع عند الاستلام »',
    fr: '« الصباط يدير 4500 دج والدفع عند الاستلام »',
  },
  'settings.open.tools':   { en: 'Tool calling', ar: 'استعمال الأوتيات', fr: "Appel d'outils" },
  'settings.open.tools.m': {
    en: 'streaming included, valid JSON arguments',
    ar: 'حتى في الستريمينڨ، وأرڨيمون JSON صحيحة',
    fr: 'y compris en streaming, arguments JSON valides',
  },
  'settings.open.vision':   { en: 'Vision', ar: 'الشوفة', fr: 'Vision' },
  'settings.open.vision.m': {
    en: 'differential test: “Polo blanc vert” vs “Baskets beiges”',
    ar: 'تست ديفيرانسيال : « Polo blanc vert » ضد « Baskets beiges »',
    fr: 'test différentiel : « Polo blanc vert » vs « Baskets beiges »',
  },
  'settings.open.image':   { en: 'Image generation', ar: 'تخريج التصاور', fr: "Génération d'images" },
  'settings.open.image.m': {
    en: 'no equivalent here — stays on muse-image-1.0',
    ar: 'ما كاينش ما يعاوضو هنا — يبقى على muse-image-1.0',
    fr: "pas d'équivalent ici — reste sur muse-image-1.0",
  },
  'settings.open.voice':   { en: 'Voice transcription', ar: 'تحويل الفوكال للكتابة', fr: 'Transcription vocale' },
  'settings.open.voice.m': {
    en: 'no equivalent here — stays on muse-voice-transcribe',
    ar: 'ما كاينش ما يعاوضو هنا — يبقى على muse-voice-transcribe',
    fr: "pas d'équivalent ici — reste sur muse-voice-transcribe",
  },
  'settings.open.verdict': {
    en: "So: the agent's head runs entirely on the open weights, not its hands and not its ears.",
    ar: 'إذن: راس الوكيل كامل يدور على الأوزان المفتوحة، أما يديه وودنيه لا.',
    fr: "Donc : la tête de l'agent tourne entièrement sur les poids ouverts, pas ses mains ni ses oreilles.",
  },
  'settings.open.verify': {
    en: 'Saying “100 % open weights” would be false, and it is checkable in thirty seconds — {cmd} replays the measurement.',
    ar: 'لوكان نقولو « 100 % open weights » راه كذب، وهذا يتشيكي في ثلاثين ثانية — {cmd} يعاود القياس.',
    fr: "Dire « 100 % open weights » serait faux, et c'est vérifiable en trente secondes — {cmd} rejoue la mesure.",
  },

  /* ── les en-têtes partagés par les deux tableaux d'honnêteté ──────────── */
  'settings.th.fn':    { en: 'feature',        ar: 'الخدمة',          fr: 'fonction' },
  'settings.th.src':   { en: 'model / source', ar: 'الموديل / المصدر', fr: 'modèle / source' },
  'settings.th.means': { en: 'what that means', ar: 'واش يعني هاذا',   fr: 'ce que ça veut dire' },
  'settings.th.why':   { en: 'why, and how far', ar: 'علاش، وحتى وين', fr: "pourquoi, et jusqu'où" },

  /* ── ce qui est réel : un vrai appel, un vrai fichier, une vraie ligne ── */
  'settings.real.section': { en: 'What is real', ar: 'واش راه حقيقي', fr: 'Ce qui est réel' },
  'settings.real':         { en: 'real',         ar: 'حقيقي',        fr: 'réel' },

  'settings.real.voice':   { en: 'Voice transcription', ar: 'تحويل الفوكال للكتابة', fr: 'Transcription des vocaux' },
  'settings.real.voice.w': {
    en: 'Real call. Two readings of the same clip every time — forced language and auto-detect — because they do not say the same thing, and the gap is where orders get lost.',
    ar: 'طلب حقيقي. جوج قراءات تاع نفس الكليپ كل مرة — لغة مفروضة وكشف أوتوماتيك — خاطرش ما يقولوش نفس الحاجة، والفرق بيناتهم هو وين تضيع الكوموندات.',
    fr: "Vrai appel. Deux lectures du même clip à chaque fois — langue forcée et détection automatique — parce qu'elles ne disent pas la même chose, et que l'écart est là où les commandes se perdent.",
  },
  'settings.real.vision':   { en: 'Photo reading', ar: 'قراءة التصاور', fr: 'Lecture des photos' },
  'settings.real.vision.w': {
    en: 'Real call. It describes the product, critiques the photo and flags whatever looks like a counterfeit.',
    ar: 'طلب حقيقي. يوصف المنتج، ينقد التصويرة ويقولك كي تبان حاجة تشابه التقليد.',
    fr: 'Vrai appel. Il décrit le produit, critique la photo et signale ce qui ressemble à une contrefaçon.',
  },
  'settings.real.copy':   { en: 'Page text', ar: 'نص الصفحات', fr: 'Texte des pages' },
  'settings.real.copy.w': {
    en: 'Real call. The model writes the copy in darija as JSON; the layout is code.',
    ar: 'طلب حقيقي. الموديل يكتب النص بالدارجة في JSON ؛ وترتيب الصفحة راه كود.',
    fr: 'Vrai appel. Le modèle écrit la copie en darija sous forme de JSON ; la mise en page est du code.',
  },
  'settings.real.images':   { en: 'Visuals', ar: 'التصاور', fr: 'Visuels' },
  'settings.real.images.w': {
    en: 'Real calls. Ad creatives, and one visual per landing section.',
    ar: 'طلبات حقيقية. كرياتيف تاع الإشهار، وتصويرة لكل قسم تاع اللاندينڨ.',
    fr: 'Vrais appels. Créatives publicitaires, et un visuel par section de landing.',
  },
  'settings.real.replies':   { en: 'Customer replies', ar: 'الردود على الزبائن', fr: 'Réponses aux clients' },
  'settings.real.replies.w': {
    en: 'Real call. The darija is written by the model, and the model is the one that decides whether it is allowed to answer.',
    ar: 'طلب حقيقي. الدارجة يكتبها الموديل، وهو اللي يقرر واش عندو الحق يرد ولا لا.',
    fr: "Vrai appel. La darija est écrite par le modèle, et c'est lui qui décide s'il a le droit de répondre.",
  },
  'settings.real.files':     { en: 'Pages, shops, visuals', ar: 'الصفحات، الحوانت، التصاور', fr: 'Pages, boutiques, visuels' },
  'settings.real.files.src': { en: 'files on disk',          ar: 'ملفات في الديسك',          fr: 'fichiers sur le disque' },
  'settings.real.files.w': {
    en: 'Real files in out/. Open them, send them, host them.',
    ar: 'ملفات حقيقية في out/. حلّهم، ابعثهم، هوستيهم.',
    fr: 'De vrais fichiers dans out/. Ouvre-les, envoie-les, héberge-les.',
  },
  'settings.real.orders':   { en: 'Form orders', ar: 'كوموندات الفورميلارات', fr: 'Commandes des formulaires' },
  'settings.real.orders.w': {
    en: 'Real rows. The only numbers in the project that nothing simulates.',
    ar: 'أسطر حقيقية. الأرقام الوحيدة في المشروع اللي ما يسيميليهم حتى حاجة.',
    fr: 'De vraies lignes. Les seuls chiffres du projet que rien ne simule.',
  },
  'settings.real.dns':   { en: 'Domain check', ar: 'تشيكي الدومين', fr: 'Vérification de domaine' },
  'settings.real.dns.w': {
    en: 'Real query to the nameservers. The “simulate propagation” button sits right next to it, and it says so.',
    ar: 'سقسية حقيقية للسرفورات تاع الأسماء. البوطون « سيميلي البروباڨاسيون » راه حداه، ومكتوب.',
    fr: "Vraie requête aux serveurs de noms. Le bouton « simuler la propagation » est à côté, et il est écrit.",
  },

  /* ── ce qui est simulé : exigé par les organisateurs, et dit ligne à ligne */
  'settings.sim.section': { en: 'What is simulated', ar: 'واش ماشي حقيقي', fr: 'Ce qui est simulé' },
  'settings.sim':         { en: 'simulated',         ar: 'ماشي حقيقي',   fr: 'simulé' },

  'settings.sim.login':   { en: 'Facebook login', ar: 'الدخول بـ Facebook', fr: 'Connexion Facebook' },
  'settings.sim.login.w': {
    en: 'The consent flow is staged: same order, same permission names, unusable token. A judge has neither a page nor an ad account, and ads_management takes weeks to be approved.',
    ar: 'مسار الموافقة مدير كي المسرحية: نفس الترتيب، نفس أسماء الصلاحيات، وتوكن ما يخدمش. الجوري ما عندو لا صفحة لا كونت إشهار، و ads_management يدي سمانات باش يتقبل.',
    fr: "Le flux de consentement est mis en scène : même ordre, mêmes noms de permissions, jeton inutilisable. Un juré n'a ni page ni compte publicitaire, et ads_management met des semaines à être approuvé.",
  },
  'settings.sim.assets':   { en: 'Business Manager, page, Instagram', ar: 'Business Manager، الصفحة، Instagram', fr: 'Business Manager, page, Instagram' },
  'settings.sim.assets.w': {
    en: 'Made-up resources. No real page, no real account, no real id.',
    ar: 'موارد مخترعة. لا صفحة حقيقية، لا كونت حقيقي، لا إيدي حقيقي.',
    fr: 'Ressources fictives. Aucune page, aucun compte, aucun identifiant réels.',
  },
  'settings.sim.people':   { en: 'Customers, comments, messages', ar: 'الزبائن، التعليقات، الرسائل', fr: 'Clients, commentaires, messages' },
  'settings.sim.people.w': {
    en: 'Written for the demo. Not one real customer message is in this repo — a page’s conversations are Platform Data, and a merchant’s customers did not agree to appear in a hackathon submission.',
    ar: 'مكتوبين للديمو. ما كان حتى رسالة حقيقية تاع زبون في هاذ الدپو — الهدرة في صفحة هي Platform Data، والزبائن تاع تاجر ما قبلوش يبانو في مشاركة تاع هاكاطون.',
    fr: "Écrits pour la démonstration. Aucun vrai message de client n'est dans ce dépôt — les conversations d'une page sont des Platform Data, et les clients d'un marchand n'ont pas accepté de figurer dans une soumission de hackathon.",
  },
  'settings.sim.numbers':   { en: 'Campaign numbers', ar: 'أرقام الحملات', fr: 'Chiffres des campagnes' },
  'settings.sim.numbers.w': {
    en: 'Deterministic simulation, fixed seed: the same campaign always tells the same story, so the video is reproducible. Reels reach more people per dinar and convert less, and cost per result climbs with fatigue.',
    ar: 'سيميلاسيون ديترميني، ڨرين ثابت: نفس الحملة تحكي ديما نفس القصة، علاهذا الفيديو يتعاود كيف كيف. الريلز توصل لناس أكثر بالدينار بصح تبيع أقل، والتكلفة تاع النتيجة تطلع كي يعيا الناس من الإشهار.',
    fr: 'Simulation déterministe, graine fixe : la même campagne raconte toujours la même histoire, donc la vidéo est reproductible. Les Reels touchent plus par dinar et convertissent moins, le coût par résultat monte avec la fatigue.',
  },
  'settings.sim.spend':   { en: 'Publishing, spend', ar: 'النشر، المصروف', fr: 'Mise en ligne, dépense' },
  'settings.sim.spend.w': {
    en: 'Nothing is sent to Meta. Not one dinar moves.',
    ar: 'ما كان والو يتبعث لميتا. ما يتحركش حتى دينار.',
    fr: "Rien n'est envoyé à Meta. Aucun dinar ne bouge.",
  },

  /* ── cette installation-ci, telle qu'elle tourne maintenant ───────────── */
  'settings.inst.section': { en: 'This install',  ar: 'هاذ الأنستالاسيون', fr: 'Cette installation' },
  'settings.inst.mode':    { en: 'mode',          ar: 'المود',             fr: 'mode' },
  'settings.inst.brain':   { en: 'brain',         ar: 'العقل',             fr: 'cerveau' },
  'settings.inst.db':      { en: 'database',      ar: 'البيز',             fr: 'base de données' },
  'settings.inst.dbValue': {
    en: '{file} — SQLite, through {module}, zero dependencies',
    ar: '{file} — SQLite، عبر {module}، زيرو ديپندونس',
    fr: '{file} — SQLite, via {module}, zéro dépendance',
  },
  'settings.inst.ip':      { en: 'platform IP',     ar: 'IP تاع البلاتفورم', fr: 'IP de la plateforme' },
  'settings.inst.turns':   { en: 'turns in memory', ar: 'الأدوار في الميموار', fr: 'tours en mémoire' },
  'settings.inst.session': { en: 'session',         ar: 'السيسيون',          fr: 'session' },
  'settings.inst.why': {
    en: 'Everything is in {dir}: the database, the pages, the visuals, the photos. Delete the folder and the project starts over.',
    ar: 'كلش في {dir}: البيز، الصفحات، التصاور، والفوطوات. امحي الدوسي والمشروع يبدا من الصفر.',
    fr: 'Tout est dans {dir} : la base, les pages, les visuels, les photos. Supprime le dossier et le projet repart de zéro.',
  },

  /* ── la zone d'où l'on ne revient pas ─────────────────────────────────── */
  'settings.wipe.section': { en: 'Danger zone',        ar: 'منطقة حسّاسة',      fr: 'Zone sensible' },
  'settings.wipe.title':   { en: 'Erase this session', ar: 'امحي هاذ السيسيون', fr: 'Effacer cette session' },
  'settings.wipe.body': {
    en: 'The conversation, the pages, the domains, the Meta connection and the campaigns of this session. Files already generated stay in {dir}.',
    ar: 'الهدرة، الصفحات، الدومينات، الربط مع ميتا والحملات تاع هاذ السيسيون. الملفات اللي تخرّجو من قبل يبقاو في {dir}.',
    fr: 'La conversation, les pages, les domaines, la connexion Meta et les campagnes de cette session. Les fichiers déjà générés restent dans {dir}.',
  },
  'settings.wipe.btn':     { en: 'erase', ar: 'امحي', fr: 'effacer' },
  'settings.wipe.confirm': {
    en: 'Erase this whole session?',
    ar: 'تمحي هاذ السيسيون كامل ؟',
    fr: 'Effacer toute cette session ?',
  },
}
