// Les chaînes de l'écran « meta ».
// Clé d'abord, langues à l'intérieur : une traduction manquante se voit.
// La darija est de la darija d'Alger, en lettres arabes.
//
// C'est l'écran que le jury regarde le plus longtemps, parce que c'est celui
// qui dit « SIMULÉ » et qui montre les vraies permissions. L'anglais y est donc
// sec et concret : « Ads » et pas « Advertising campaigns », aucune voix
// commerciale, aucun point d'exclamation.
//
// Ce qui n'est PAS ici : les noms de permissions (`pages_messaging`…), les
// identifiants, les noms de marque, et les ressources inventées de la
// démonstration (« Dar Essabat », « صباط دزاير ») — le serveur les envoie tels
// quels et le code les compare.
export const meta = {
  /* ── le titre, partagé par les trois étapes ───────────────────────────── */
  'meta.title': { en: 'Meta connections', ar: 'الربط مع ميتا', fr: 'Connexions Meta' },
  'meta.intro': {
    en: 'To message customers, post and run ads, Sawt needs access to your Facebook page, your Instagram and your ad account.',
    ar: 'باش يهدر مع الزبائن، يپوستي ويدير إشهار، Sawt يحتاج يوصل للصفحة تاعك في Facebook، لـ Instagram وللكونت تاع الإشهار.',
    fr: "Pour écrire aux clients, publier et lancer des pubs, Sawt a besoin de l'accès à ta page Facebook, à ton Instagram et à ton compte publicitaire.",
  },

  /* ── la marque « simulé », sur chaque surface ─────────────────────────── */
  'meta.sim': { en: 'simulated', ar: 'ديمو', fr: 'simulé' },
  'meta.sim.flow.lead': { en: 'Simulated login flow.', ar: 'الربط هذا ديمو.', fr: 'Flux de connexion simulé.' },
  'meta.sim.flow.body': {
    en: 'No real Meta app, no real account, no usable token. That is on purpose: the project has to run for a judge who has neither a page nor an ad account. The permissions asked for, though, are the real ones, named as the Graph API names them.',
    ar: 'ما كاين لا أپليكاسيون ميتا حقيقية، لا كونت حقيقي، لا توكن يخدم. هذا بالقصد: المشروع لازم يخدم عند واحد من الجوري لا عندو صفحة لا كونت إشهار. أما الصلاحيات اللي نطلبوها راهم الحقيقيين، كيما تسميهم Graph API.',
    fr: "Aucune vraie application Meta, aucun vrai compte, aucun jeton utilisable. C'est voulu : le projet doit tourner chez un juré qui n'a ni page ni compte publicitaire. Les permissions demandées sont en revanche les vraies, telles que la Graph API les nomme.",
  },
  'meta.sim.env.lead': { en: 'Simulated environment.', ar: 'المحيط كامل ديمو.', fr: 'Environnement simulé.' },
  'meta.sim.env.body': {
    en: 'This connection, this page, this ad account and the customers in the inbox are made up — nothing is sent to Meta. What is real: the darija the model writes, the creatives it draws and the pages it builds.',
    ar: 'هذا الربط، هذ الصفحة، هذ الكونت تاع الإشهار والزبائن اللي في صندوق الرسائل كامل مخترعين — ما كاين حتى شي يتبعث لـ ميتا. اللي حقيقي: الدارجة اللي يكتبها الموديل، الإشهارات اللي يرسمهم والصفحات اللي يبنيهم.',
    fr: "Cette connexion, cette page, ce compte publicitaire et les clients de la boîte de réception sont fictifs — rien n'est envoyé à Meta. Ce qui est réel : la darija que le modèle écrit, les visuels qu'il génère et les pages qu'il construit.",
  },

  /* ── étape 0 : le bouton bleu ─────────────────────────────────────────── */
  'meta.loading.connect': { en: 'connecting', ar: 'نربط', fr: 'connexion' },
  'meta.login.header': { en: 'Log in with Facebook', ar: 'الدخول مع Facebook', fr: 'Se connecter avec Facebook' },
  'meta.login.title': { en: 'Sawt wants to access your account', ar: 'Sawt يحب يوصل للكونت تاعك', fr: 'Sawt voudrait accéder à ton compte' },
  'meta.login.lead': {
    en: 'Next you choose exactly what you grant, permission by permission.',
    ar: 'من بعد تختار بالضبط واش تسمح بيه، صلاحية بصلاحية.',
    fr: 'Tu choisiras ensuite exactement ce que tu accordes, permission par permission.',
  },
  'meta.login.cta': { en: 'Continue with Facebook', ar: 'كمّل مع Facebook', fr: 'Continuer avec Facebook' },
  'meta.login.foot': {
    en: 'Nothing is sent to Meta. No data leaves this machine.',
    ar: 'ما كاين حتى شي يتبعث لـ ميتا. حتى معطية ما تخرج من هذ الماشينة.',
    fr: "Rien n'est envoyé à Meta. Aucune donnée ne quitte cette machine.",
  },

  /* ── étape 1 : le compte ──────────────────────────────────────────────── */
  'meta.step1': { en: 'Step 1 of 2 — the account.', ar: 'المرحلة 1 من 2 — الكونت.', fr: 'Étape 1 sur 2 — le compte.' },
  'meta.account.title': { en: 'Continue as…', ar: 'كمّل باسم…', fr: 'Continuer en tant que…' },
  'meta.account.lead': {
    en: 'Sawt will receive your name, your profile photo and your email address.',
    ar: 'Sawt رايح ياخذ سميتك، تصويرة البروفيل والإيميل تاعك.',
    fr: 'Sawt recevra ton nom, ta photo de profil et ton adresse e-mail.',
  },
  'meta.account.foot': { en: 'Fictional account, made for the demo.', ar: 'كونت مخترع، درناه للديمو.', fr: 'Compte fictif, créé pour la démonstration.' },
  'meta.cancel': { en: 'Cancel', ar: 'ألغي', fr: 'Annuler' },
  'meta.continue': { en: 'Continue', ar: 'كمّل', fr: 'Continuer' },

  /* ── étape 2 : ce qu'on accorde ───────────────────────────────────────── */
  'meta.step2': { en: 'Step 2 of 2 — what you grant.', ar: 'المرحلة 2 من 2 — واش تسمح بيه.', fr: 'Étape 2 sur 2 — ce que tu accordes.' },
  'meta.perms.header': { en: 'Sawt is asking for these permissions', ar: 'Sawt يطلب هذ الصلاحيات', fr: 'Sawt demande ces autorisations' },
  'meta.perms.title': { en: 'Choose what Sawt can do', ar: 'ختار واش يقدر يدير Sawt', fr: 'Choisis ce que Sawt peut faire' },
  'meta.perms.lead': {
    en: 'The greyed-out permissions are needed for the basics. The rest are optional — refuse one and the matching feature really is unavailable, not faked.',
    ar: 'الصلاحيات المطفية لازمين باش تخدم الأساسيات. الباقي اختياري — إذا رفضت واحدة، الخدمة اللي تابعة ليها ما تخدمش بالصح، ماشي تمثيل.',
    fr: 'Les permissions grisées sont nécessaires au fonctionnement de base. Les autres sont facultatives — refuse-en une et la fonction correspondante sera réellement indisponible, pas mimée.',
  },
  'meta.perm.required': { en: 'required', ar: 'لازم', fr: 'requis' },
  'meta.perms.foot1': { en: 'A fake token is issued.', ar: 'يتصنع توكن مزيف.', fr: 'Un jeton factice est émis.' },
  'meta.perms.foot2': {
    en: 'It does not work against the Graph API, and its text says so.',
    ar: 'ما يخدمش مع Graph API، والنص تاعو يقولها.',
    fr: 'Il est inutilisable sur la Graph API, et son texte le dit.',
  },
  'meta.grant': { en: 'Allow', ar: 'سمح', fr: 'Autoriser' },
  'meta.granting': { en: 'Allowing…', ar: 'نسمح…', fr: 'Autorisation…' },
  'meta.toast.connected': {
    en: 'Connected. The page, Instagram and the ad account are available.',
    ar: 'تربط. الصفحة، Instagram والكونت تاع الإشهار موجودين.',
    fr: 'Connecté. La page, Instagram et le compte publicitaire sont disponibles.',
  },

  /* ── les groupes du catalogue de permissions ──────────────────────────────
     Le serveur envoie la valeur technique (`compte`, `pages`, `publicité`) ;
     elle sert à regrouper dans le code, seul le libellé est traduit. Le groupe
     `instagram` n'est pas ici : c'est une marque, elle s'affiche telle quelle. */
  'meta.group.account': { en: 'account', ar: 'الكونت', fr: 'compte' },
  'meta.group.pages':   { en: 'pages',   ar: 'الصفحات', fr: 'pages' },
  'meta.group.ads':     { en: 'ads',     ar: 'الإشهار', fr: 'publicité' },

  /* ── à quoi sert chaque permission ────────────────────────────────────────
     Le serveur les envoie en français (`why`). On les traduit ici, par nom de
     permission : une permission ajoutée côté serveur et absente d'ici garde
     son texte français au lieu de disparaître de l'écran. */
  'meta.scope.public_profile': {
    en: 'Your name and photo, so it knows who it is talking to.',
    ar: 'سميتك وتصويرتك، باش نعرف مع من نهدر.',
    fr: 'Ton nom et ta photo, pour savoir à qui on parle.',
  },
  'meta.scope.pages_show_list': {
    en: 'List your Facebook pages so you can pick the one to manage.',
    ar: 'نعرض صفحاتك في Facebook باش تختار واحدة تسيّرها.',
    fr: 'Lister tes pages Facebook pour que tu choisisses laquelle gérer.',
  },
  'meta.scope.pages_read_engagement': {
    en: 'Read the comments and posts on your page.',
    ar: 'نقرا التعليقات والمنشورات تاع الصفحة تاعك.',
    fr: 'Lire les commentaires et les publications de ta page.',
  },
  'meta.scope.pages_manage_engagement': {
    en: 'Reply to comments for you.',
    ar: 'نجاوب على التعليقات بلاصتك.',
    fr: 'Répondre aux commentaires à ta place.',
  },
  'meta.scope.pages_messaging': {
    en: 'Read and answer your customers’ Messenger messages.',
    ar: 'نقرا ونجاوب رسائل Messenger تاع الزبائن.',
    fr: 'Lire et répondre aux messages Messenger de tes clients.',
  },
  'meta.scope.pages_manage_metadata': {
    en: 'Subscribe to your page notifications (webhooks).',
    ar: 'نشترك في الإشعارات تاع الصفحة (webhooks).',
    fr: "S'abonner aux notifications de ta page (webhooks).",
  },
  'meta.scope.instagram_basic': {
    en: 'See the Instagram account linked to your page.',
    ar: 'نشوف حساب Instagram المربوط بالصفحة.',
    fr: 'Voir le compte Instagram lié à ta page.',
  },
  'meta.scope.instagram_manage_comments': {
    en: 'Reply to Instagram comments.',
    ar: 'نجاوب تعليقات Instagram.',
    fr: 'Répondre aux commentaires Instagram.',
  },
  'meta.scope.instagram_manage_messages': {
    en: 'Reply to Instagram direct messages.',
    ar: 'نجاوب الرسائل الخاصة في Instagram.',
    fr: 'Répondre aux messages privés Instagram.',
  },
  'meta.scope.ads_read': {
    en: 'Read your campaign results: spend, cost per order.',
    ar: 'نقرا نتائج الحملات: الدراهم المصروفة، والتكلفة تاع كل كومند.',
    fr: 'Lire les résultats de tes campagnes : dépense, coût par commande.',
  },
  'meta.scope.ads_management': {
    en: 'Create, pause and edit your campaigns.',
    ar: 'ندير، نحبس ونبدل الحملات تاعك.',
    fr: 'Créer, mettre en pause et modifier tes campagnes.',
  },
  'meta.scope.business_management': {
    en: 'Access your Business Manager and your ad account.',
    ar: 'نوصل للـ Business Manager وللكونت تاع الإشهار.',
    fr: 'Accéder à ton Business Manager et à ton compte publicitaire.',
  },
  'meta.scope.catalog_management': {
    en: 'Keep your product catalog up to date.',
    ar: 'نخلي الكطالوڨ تاع المنتجات محدّث.',
    fr: 'Tenir ton catalogue produits à jour.',
  },

  /* ── connecté : l'en-tête ─────────────────────────────────────────────── */
  'meta.connectedAs': { en: 'Connected as {name}', ar: 'مربوط باسم {name}', fr: 'Connecté en tant que {name}' },
  'meta.grantedCount': { en: '{n} permission(s) granted', ar: '{n} صلاحية مسموحة', fr: '{n} permission(s) accordée(s)' },
  'meta.declinedCount': { en: '{n} refused', ar: '{n} مرفوضة', fr: '{n} refusée(s)' },
  'meta.graphBtn': { en: 'Graph response', ar: 'رد Graph', fr: 'réponse Graph' },
  'meta.disconnect': { en: 'disconnect', ar: 'افصل', fr: 'déconnecter' },
  'meta.confirmOff': {
    en: 'Disconnect? The inbox and the assets will disappear.',
    ar: 'تفصل؟ صندوق الرسائل والموارد يروحو.',
    fr: 'Déconnecter ? La boîte de réception et les ressources disparaîtront.',
  },

  /* ── connecté : le compte et le jeton ─────────────────────────────────── */
  'meta.card.account': { en: 'Account · token', ar: 'الكونت · التوكن', fr: 'Compte · jeton' },
  'meta.kv.user':      { en: 'user',     ar: 'المستعمل', fr: 'utilisateur' },
  'meta.kv.business':  { en: 'business', ar: 'البيزنس',  fr: 'business' },
  'meta.kv.token':     { en: 'token',    ar: 'التوكن',   fr: 'jeton' },
  'meta.token.why': {
    en: 'The token says what it is. A demo token that looks like a real one is the only way to end up believing one.',
    ar: 'التوكن يقول بروحو واش هو. توكن ديمو اللي يشبه للحقيقي هو الطريق الوحيد باش تصدق واحد منهم في الأخير.',
    fr: "Le jeton dit lui-même ce qu'il est. Un jeton de démonstration qui ressemble à un vrai est la seule façon de finir par en croire un.",
  },

  /* ── connecté : les ressources ────────────────────────────────────────── */
  'meta.sec.assets': { en: 'Assets', ar: 'الموارد', fr: 'Ressources' },
  'meta.kind.page':      { en: 'Facebook page',    ar: 'صفحة Facebook',   fr: 'Page Facebook' },
  'meta.kind.instagram': { en: 'Instagram account', ar: 'حساب Instagram',  fr: 'Compte Instagram' },
  'meta.kind.adaccount': { en: 'Ad account',        ar: 'كونت الإشهار',    fr: 'Compte publicitaire' },
  'meta.kind.pixel':     { en: 'Pixel',             ar: 'الپيكسل',         fr: 'Pixel' },
  'meta.kind.catalog':   { en: 'Product catalog',   ar: 'كطالوڨ المنتجات', fr: 'Catalogue produits' },
  'meta.line.followers':    { en: '{n} followers', ar: '{n} متابع', fr: '{n} abonnés' },
  'meta.line.response':     { en: 'replies {pct}%', ar: 'نسبة الرد {pct}%', fr: 'réponse {pct} %' },
  'meta.line.linkedToPage': { en: 'linked to the page', ar: 'مربوط بالصفحة', fr: 'lié à la page' },
  'meta.line.events7d':     { en: '{n} events / 7 days', ar: '{n} حدث في 7 أيام', fr: '{n} évènements / 7 j' },
  'meta.line.products':     { en: '{n} products', ar: '{n} منتج', fr: '{n} produits' },

  /* ── connecté : les permissions accordées et refusées ─────────────────── */
  'meta.sec.perms': { en: 'Permissions', ar: 'الصلاحيات', fr: 'Permissions' },
  'meta.declined.label': { en: 'Refused:', ar: 'المرفوضة:', fr: 'Refusées :' },
  'meta.declined.why': {
    en: 'This is not decoration — what those permissions open really is missing from the app, and the agent has to name it instead of pretending.',
    ar: 'هذا ماشي زينة — اللي يفتحوه هذ الصلاحيات ناقص بالصح من الأپليكاسيون، والوكيل لازم يسميه بلا ما يمثل.',
    fr: "Ce n'est pas décoratif — ce que ces permissions ouvrent est réellement absent de l'app, et l'agent doit le nommer au lieu de faire semblant.",
  },

  /* ── connecté : les surfaces et leurs compteurs ───────────────────────── */
  'meta.sec.surfaces': { en: 'Surfaces to manage', ar: 'البلايص اللي نسيّرو', fr: 'Surfaces à gérer' },
  'meta.kpi.open':     { en: 'waiting',  ar: 'في الانتظار', fr: 'en attente' },
  'meta.kpi.answered': { en: 'answered', ar: 'مجاوبين',     fr: 'répondus' },
  'meta.escalated': { en: '{n} handed back to the merchant', ar: '{n} مردودين للتاجر', fr: '{n} renvoyé(s) au marchand' },
  'meta.open': { en: 'open', ar: 'حل', fr: 'ouvrir' },

  /* ── l'écho de la Graph API ───────────────────────────────────────────── */
  'meta.loading.read': { en: 'reading', ar: 'نقرا', fr: 'lecture' },
  'meta.graph.title': {
    en: 'What the real Graph API would return',
    ar: 'واش ترجع Graph API الحقيقية',
    fr: 'Ce que la vraie Graph API renverrait',
  },
  'meta.graph.sim': { en: 'real shape · simulated data', ar: 'الشكل حقيقي · المعطيات ديمو', fr: 'forme réelle · données simulées' },
}
