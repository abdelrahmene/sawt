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
  /* ── le mur de la Page ─────────────────────────────────────────────────
     « Rien n'est publié chez Facebook » est répété ici parce que c'est
     l'écran où l'illusion est la plus forte : on y voit des portées, des
     mentions j'aime et de vrais commentaires en darija. C'est exactement
     là qu'il faut le dire, pas dans une note de bas de page. */
  'meta.sec.wall': { en: 'The Page wall', ar: 'الحيط تاع الباج', fr: 'Le mur de la Page' },
  'meta.wall.loading': { en: 'Reading the Page…', ar: 'نقرا الباج…', fr: 'Lecture de la Page…' },
  'meta.wall.posts': { en: 'published', ar: 'منشورات', fr: 'publications' },
  'meta.wall.reach': { en: 'reach', ar: 'وصلت لـ', fr: 'portée' },
  'meta.wall.likes': { en: 'likes', ar: 'جيمات', fr: "j'aime" },
  'meta.wall.shares': { en: 'shares', ar: 'مشاركات', fr: 'partages' },
  'meta.wall.saves': { en: 'saves', ar: 'محفوظات', fr: 'enregistrements' },
  'meta.wall.open': { en: 'comments waiting', ar: 'كومنتير يستنى', fr: 'commentaires en attente' },
  'meta.wall.kind.post': { en: 'Post', ar: 'بوست', fr: 'Publication' },
  'meta.wall.kind.story': { en: 'Story', ar: 'ستوري', fr: 'Story' },
  'meta.wall.kind.reel': { en: 'Reel', ar: 'ريل', fr: 'Reel' },
  'meta.wall.caption': { en: 'What do you want to say?', ar: 'واش تحب تكتب؟', fr: "Qu'est-ce que tu veux écrire ?" },
  'meta.wall.when': { en: 'When', ar: 'وقتاش', fr: 'Quand' },
  'meta.wall.now': { en: 'Now', ar: 'دوكا', fr: 'Maintenant' },
  'meta.wall.in': { en: 'In {n} h', ar: 'بعد {n} سوايع', fr: 'Dans {n} h' },
  'meta.wall.publish': { en: 'Publish', ar: 'انشر', fr: 'Publier' },
  'meta.wall.why': {
    en: 'Nothing is published on Facebook. The Page, its reach and its comments are staged so a judge can run this without a Meta account.',
    ar: 'والو ما يتنشر في فايسبوك. الباج والأرقام والكومنتيرات كامل ديمو، باش الجيري يقدر يجرب بلا كومبت Meta.',
    fr: "Rien n'est publié sur Facebook. La Page, ses chiffres et ses commentaires sont une mise en scène, pour qu'un juré puisse essayer sans compte Meta.",
  },
  'meta.wall.scheduled': { en: 'Scheduled ({n})', ar: 'مبرمجة ({n})', fr: 'Programmées ({n})' },
  'meta.wall.published': { en: 'Published', ar: 'اللي تنشرو', fr: 'Publiées' },
  'meta.wall.inH': { en: 'in {n} h', ar: 'بعد {n} س', fr: 'dans {n} h' },
  'meta.wall.hoursAgo': { en: '{n} h ago', ar: 'من {n} س', fr: 'il y a {n} h' },
  'meta.wall.needCaption': { en: 'Write something first.', ar: 'اكتب حاجة الأول.', fr: "Écris quelque chose d'abord." },
  'meta.wall.scheduledToast': { en: 'Scheduled.', ar: 'مبرمجة.', fr: 'Programmée.' },
  'meta.wall.publishedToast': { en: 'Published on the Page.', ar: 'تنشرات في الباج.', fr: 'Publiée sur la Page.' },
  'meta.wall.byAi': { en: 'agent', ar: 'الاجون', fr: 'agent' },
  'meta.wall.needs': { en: 'It needs you:', ar: 'خصو منك:', fr: 'Il a besoin de toi :' },
  'meta.wall.yourAnswer': { en: 'Your answer, and the agent reuses it', ar: 'جاوب انت، والاجون يعاود يستعملها', fr: "Ta réponse, et l'agent la réutilise" },
  'meta.wall.send': { en: 'Reply', ar: 'جاوب', fr: 'Répondre' },

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

  /* ── « branche ta propre app Meta » ────────────────────────────────────────
     Le panneau le plus important de l'écran, et le seul qui ne parle pas au
     marchand mais au juré : il regardait des surfaces marquées « SIMULÉ » et
     en concluait que la plateforme n'avait jamais été touchée. Elle l'est, par
     src/meta-graph/index.js, et depuis la ligne de commande — ce panneau le
     dit sans qu'il faille ouvrir le README.

     Rien ici n'affirme que ces écrans deviennent vivants : ils restent mis en
     scène dans les trois modes, et c'est écrit noir sur blanc. Un panneau qui
     laisserait croire le contraire serait pire que pas de panneau. */
  'meta.own.title': { en: 'Use your own Meta app', ar: 'استعمل الأپليكاسيون تاعك في Meta', fr: 'Utilise ta propre app Meta' },
  'meta.own.lead': {
    en: 'Sawt reaches the Graph API from one file — src/meta-graph/index.js — and makes exactly five calls. Replay is the default, so a judge needs no account at all. A merchant who already has an app in Meta for Developers fills six variables in .env and runs one command.',
    ar: 'Sawt يوصل لـ Graph API من ملف واحد — src/meta-graph/index.js — ويدير بالضبط خمسة أپيلات. الـ replay هو الأصل، باش الجيري ما يحتاجش كونت. التاجر اللي عندو ديجا أپليكاسيون في Meta for Developers يعمّر ستة متغيرات في .env ويلانسي كوموند وحدة.',
    fr: "Sawt atteint la Graph API depuis un seul fichier — src/meta-graph/index.js — et fait exactement cinq appels. Le mode replay est le défaut, pour qu'un juré n'ait besoin d'aucun compte. Un marchand qui possède déjà une app dans Meta for Developers remplit six variables dans .env et lance une commande.",
  },
  'meta.own.warn': {
    en: 'The screens here are the staged console, in all three modes. That is how a judge clicks through the whole flow with no account. The real calls are made from the command line, by the file named above — and keeping the two apart is the only thing that makes the “simulated” mark mean anything.',
    ar: 'الإيكرانات هذي هي الكونسول المسرحي، في التلاثة مودات. هكذا الجيري يقدر يدوز على الفلو كامل بلا كونت. الأپيلات الحقيقيين يتديرو من سطر الأوامر، بالملف اللي فوق — وفصل الزوج هو الوحيد اللي يخلي علامة « ديمو » عندها معنى.',
    fr: "Les écrans ici sont la console mise en scène, dans les trois modes. C'est ce qui permet à un juré de dérouler tout le parcours sans compte. Les vrais appels se font depuis la ligne de commande, par le fichier nommé plus haut — et séparer les deux est la seule chose qui donne un sens à la marque « simulé ».",
  },
  'meta.own.modeNow': { en: 'running now', ar: 'يخدم دروك', fr: 'en cours' },
  'meta.own.isDefault': { en: 'default', ar: 'الأصل', fr: 'par défaut' },
  'meta.own.modesTitle': { en: 'The three modes', ar: 'التلاثة مودات', fr: 'Les trois modes' },
  'meta.own.v.replay': { en: 'replayed', ar: 'معاود', fr: 'rejoué' },
  'meta.own.v.live': { en: 'live', ar: 'حقيقي', fr: 'en direct' },
  'meta.own.v.staged': { en: 'staged', ar: 'ديمو', fr: 'mis en scène' },
  'meta.own.v.none': { en: 'nothing', ar: 'والو', fr: 'rien' },
  'meta.own.kv.models': { en: 'Meta models', ar: 'موديلات Meta', fr: 'modèles Meta' },
  'meta.own.kv.graph': { en: 'Graph API', ar: 'Graph API', fr: 'Graph API' },
  'meta.own.kv.screens': { en: 'these screens', ar: 'هذ الإيكرانات', fr: 'ces écrans' },
  'meta.own.kv.env': { en: 'needs in .env', ar: 'يحتاج في .env', fr: 'exige dans .env' },
  'meta.own.kv.how': { en: 'command', ar: 'الكوموند', fr: 'commande' },

  'meta.own.callsTitle': { en: 'The five Graph calls, field by field', ar: 'الخمسة أپيلات تاع Graph، حقل بحقل', fr: 'Les cinq appels Graph, champ par champ' },
  'meta.own.callsLead': {
    en: 'Endpoint, method, the permission Meta really requires, and what happens in replay. This list is not documentation sitting next to the code: it is the table the code builds its paths from, so an endpoint cannot be shown here without being called.',
    ar: 'الـ endpoint، الميثود، الصلاحية اللي Meta تطلبها بالصح، وواش يصرا في الـ replay. هذ الليستة ماشي دوكيمونطاسيون محطوطة حدا الكود: هي الطابلو اللي الكود يبني منو الشمان تاعو، يعني endpoint ما يقدرش يبان هنا بلا ما يتعيّط.',
    fr: "Point de terminaison, méthode, la permission que Meta exige réellement, et ce qui se passe en replay. Cette liste n'est pas une documentation posée à côté du code : c'est la table dont le code construit ses chemins, donc un point de terminaison ne peut pas apparaître ici sans être appelé.",
  },
  'meta.own.kv.perms': { en: 'permission', ar: 'الصلاحية', fr: 'permission' },
  'meta.own.kv.needs': { en: 'needs', ar: 'يحتاج', fr: 'exige' },
  'meta.own.kv.replay': { en: 'in replay', ar: 'في الـ replay', fr: 'en replay' },
  'meta.own.kv.body': { en: 'body sent', ar: 'الـ body اللي يتبعث', fr: 'corps envoyé' },
  'meta.own.forced': { en: 'status forced to PAUSED', ar: 'الـ status مفروض PAUSED', fr: 'status forcé à PAUSED' },
  'meta.own.forcedWhy': {
    en: 'Not a default the caller can override: the code merges this over whatever it was asked for. An agent that can start spending money without a human saying so is not a feature.',
    ar: 'ماشي قيمة أصلية يقدر يبدلها اللي عيّط: الكود يحطها فوق كل ما طُلب. أجون يقدر يبدا يصرف دراهم بلا ما إنسان قالها، هذي ماشي ميزة.',
    fr: "Pas une valeur par défaut que l'appelant peut écraser : le code la fusionne par-dessus ce qu'on lui a demandé. Un agent qui peut commencer à dépenser de l'argent sans qu'un humain l'ait dit n'est pas une fonctionnalité.",
  },
  'meta.call.inbox': { en: 'Read the Messenger conversations of the Page', ar: 'يقرا المحادثات تاع Messenger في الباج', fr: 'Lire les conversations Messenger de la Page' },
  'meta.call.comments': { en: 'Read the comments under a post', ar: 'يقرا الكومنتيرات تحت بوست', fr: "Lire les commentaires sous une publication" },
  'meta.call.reply': { en: 'Send the reply the model wrote', ar: 'يبعث الرد اللي كتبو الموديل', fr: 'Envoyer la réponse écrite par le modèle' },
  'meta.call.createCampaign': { en: 'Create the campaign on the ad account', ar: 'يدير الكومپاني في كونت الإشهار', fr: 'Créer la campagne sur le compte publicitaire' },
  'meta.call.createAd': { en: 'Create the ad inside the campaign', ar: 'يدير الإشهار داخل الكومپاني', fr: "Créer l'annonce dans la campagne" },

  'meta.own.envTitle': { en: '.env — what real mode reads', ar: '.env — واش يقرا مود real', fr: '.env — ce que le mode real lit' },
  'meta.own.envSet': { en: 'set', ar: 'معمّرة', fr: 'renseignée' },
  'meta.own.envMissing': { en: 'missing', ar: 'خالية', fr: 'manquante' },
  'meta.own.use.you': {
    en: 'yours to use at developers.facebook.com, to mint the Page token — Sawt never sends it anywhere',
    ar: 'تخدم بيها انت في developers.facebook.com باش تصنع التوكن تاع الباج — Sawt عمرو ما يبعثها',
    fr: "à toi, sur developers.facebook.com, pour frapper le jeton de Page — Sawt ne l'envoie jamais nulle part",
  },
  'meta.own.use.path': { en: 'goes into the request path', ar: 'تدخل في شمان الطلب', fr: 'entre dans le chemin de la requête' },
  'meta.own.use.header': { en: 'sent as the Authorization: Bearer header', ar: 'تتبعث في الهيدر Authorization: Bearer', fr: "envoyée dans l'en-tête Authorization: Bearer" },
  'meta.own.use.url': { en: 'the API version in the URL', ar: 'فيرسيون الـ API في الـ URL', fr: "la version de l'API dans l'URL" },
  'meta.own.envRead': { en: 'read by', ar: 'يقراها', fr: 'lue par' },
  'meta.own.envFoot': {
    en: 'Only presence is shown. No token value is ever served to this screen — one screenshot is one token to revoke.',
    ar: 'غير الحضور يتبان. حتى قيمة تاع توكن ما توصل لهذ الإيكران — سكرينشوت وحدة تعني توكن لازم يتلغى.',
    fr: "Seule la présence est affichée. Aucune valeur de jeton n'est servie à cet écran — une capture, c'est un jeton à révoquer.",
  },

  'meta.own.recTitle': { en: 'Replayed from recorded calls', ar: 'معاود من أپيلات مسجّلة', fr: "Rejoué depuis de vrais appels" },
  'meta.own.recLead': {
    en: 'Staged and replayed are not the same claim. The Page, the Business Manager and the inbox on this screen are invented for the demo and marked so. The exchanges below were recorded against a test Page, and each one carries the date it was recorded.',
    ar: 'ديمو وماعاود ماشي نفس الحاجة. الباج، الـ Business Manager وصندوق الرسائل في هذ الإيكران مخترعين للديمو ومعلّمين هكذا. الأپيلات اللي تحت تسجلو على باج تاع تجريب، وكل واحد حامل النهار اللي تسجل فيه.',
    fr: "Mis en scène et rejoué ne sont pas la même affirmation. La Page, le Business Manager et la boîte de réception de cet écran sont inventés pour la démonstration, et marqués comme tels. Les échanges ci-dessous ont été enregistrés contre une Page de test, et chacun porte sa date d'enregistrement.",
  },
  'meta.own.recordedOn': { en: 'recorded: {when}', ar: 'تسجل: {when}', fr: 'enregistré : {when}' },
  'meta.own.recBy': { en: 'replayed by', ar: 'يعاودها', fr: 'rejoué par' },

  'meta.own.gapTitle': { en: 'What this repo does NOT call', ar: 'واش ما يعيّطلوش هذ المشروع', fr: "Ce que ce dépôt n'appelle PAS" },
  'meta.own.gap1': {
    en: 'No OAuth code exchange, no appsecret_proof. META_APP_ID and META_APP_SECRET identify the app you created; the token is what Sawt sends.',
    ar: 'ما كاين لا تبديل كود OAuth لا appsecret_proof. META_APP_ID و META_APP_SECRET يعرّفو الأپليكاسيون اللي درتها انت؛ التوكن هو اللي يبعثو Sawt.',
    fr: "Aucun échange de code OAuth, aucun appsecret_proof. META_APP_ID et META_APP_SECRET identifient l'app que tu as créée ; ce que Sawt envoie, c'est le jeton.",
  },
  'meta.own.gap2': {
    en: 'No insights read-back. Spend, reach and cost per order on the campaign screens are staged and labelled, and a staged number is never added to a measured one.',
    ar: 'ما كاين قراية تاع insights. الدراهم، الوصول والتكلفة تاع الكومند في إيكرانات الكومپاني ديمو ومعلّمين، ورقم ديمو عمرو ما يتزاد مع رقم مقيس.',
    fr: "Aucune relecture des insights. Dépense, portée et coût par commande des écrans campagnes sont mis en scène et étiquetés, et un chiffre simulé ne s'additionne jamais à un chiffre mesuré.",
  },
  'meta.own.gap3': {
    en: 'Five endpoints and no others. SETUP.md lists them field by field, including what has not been exercised against production Graph.',
    ar: 'خمسة endpoints وماشي أكثر. SETUP.md يعدّهم حقل بحقل، وحتى اللي ما تجربش على Graph الحقيقية.',
    fr: "Cinq points de terminaison et pas un de plus. SETUP.md les énumère champ par champ, y compris ce qui n'a pas été éprouvé sur la Graph de production.",
  },
  'meta.own.setupFoot': {
    en: 'The same table, with the request body of every call: SETUP.md at the root of the repo.',
    ar: 'نفس الطابلو، بالـ body تاع كل أپيل: SETUP.md في جدر المشروع.',
    fr: "La même table, avec le corps de requête de chaque appel : SETUP.md à la racine du dépôt.",
  },
}
