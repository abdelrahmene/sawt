// La coque : le rail, l'écran d'accueil, le composeur, les bascules.
//
// Ce sont les chaînes que la démonstration montre en premier et le plus
// longtemps — elles sont écrites à la main, pas traduites à la chaîne.
// La darija est de la darija d'Alger, en lettres arabes : « دير » et pas
// « قم بـ », « صور » et pas « صورة فوتوغرافية ».
export const shell = {
  /* ── les onglets du rail ──────────────────────────────────────────────── */
  'tab.chat':      { en: 'Agent',     ar: 'الوكيل',    fr: 'Agent' },
  'tab.catalog':   { en: 'Catalog',   ar: 'الكطالوڨ',  fr: 'Catalogue' },
  'tab.studio':    { en: 'Studio',    ar: 'الستوديو',  fr: 'Studio' },
  'tab.sites':     { en: 'Sites',     ar: 'المواقع',   fr: 'Sites' },
  'tab.campaigns': { en: 'Ads',       ar: 'الإشهار',   fr: 'Pubs' },
  'tab.inbox':     { en: 'Messages',  ar: 'الرسائل',   fr: 'Messages' },
  'tab.meta':      { en: 'Meta',      ar: 'ميتا',      fr: 'Meta' },
  'tab.settings':  { en: 'Settings',  ar: 'الإعدادات', fr: 'Réglages' },

  /* ── la barre du haut et le composeur ─────────────────────────────────── */
  'shell.newChat': { en: 'New conversation', ar: 'محادثة جديدة', fr: 'Nouvelle conversation' },
  'shell.addPhoto': { en: 'Add a product photo', ar: 'زيد تصويرة تاع المنتج', fr: 'Ajouter une photo produit' },
  'shell.holdMic': { en: 'Hold to speak', ar: 'شد باش تهدر', fr: 'Maintenir pour parler' },
  'shell.composer': {
    en: 'Type, or hold the mic and speak in darija…',
    ar: '…اكتب، ولا شد الميكرو وهدر بالدارجة',
    fr: 'Écris, ou tiens le micro et parle en darija…',
  },
  'shell.hint': {
    en: 'Hold the mic while you speak · Enter to send',
    ar: 'شد الميكرو كي تهدر · Enter باش تبعث',
    fr: 'Tiens le micro enfoncé pendant que tu parles · Entrée pour envoyer',
  },

  /* ── l'écran d'accueil : la première phrase que le jury lira ──────────── */
  'shell.empty.title': { en: 'Talk to it. It builds.', ar: 'هدر معاه. هو يبني.', fr: 'Parle-lui. Il construit.' },
  'shell.empty.body': {
    en: 'Give it a product photo, then say what you want. It writes the page, draws the creatives, sets up the campaign and answers your customers.',
    ar: 'أعطيه تصويرة تاع المنتج، ومن بعد قوله واش تحب. هو يكتب الصفحة، يرسم الإشهارات، يوجد الحملة ويرد على الزبائن تاعك.',
    fr: 'Donne-lui une photo de produit, puis dis-lui ce que tu veux. Il écrit la page, dessine les visuels, prépare la campagne et répond à tes clients.',
  },
  'shell.empty.tip': {
    en: 'Hold the mic down while you speak.',
    ar: 'شد الميكرو مشدود كي تهدر.',
    fr: 'Tiens le micro enfoncé pendant que tu parles.',
  },

  /* ── divers ───────────────────────────────────────────────────────────── */
  'shell.toLatest': { en: '↓ new', ar: '↓ جديد', fr: '↓ nouveau' },
  'shell.lightbox': { en: 'click to close · Esc', ar: 'كليكي باش تسكر · Esc', fr: 'clique pour fermer · Échap' },
  'shell.toLight': { en: 'Switch to light', ar: 'دير الضوء', fr: 'Passer en clair' },
  'shell.toDark': { en: 'Switch to dark', ar: 'دير الظلام', fr: 'Passer en sombre' },
  'shell.toDesk': { en: 'Desktop layout', ar: 'عرض أورديناتور', fr: 'Affichage bureau' },
  /* Le portefeuille est une MISE EN SCÈNE et l'infobulle le dit en toutes
     lettres. Le nombre d'appels derrière, lui, est compté pour de vrai :
     une scène reprise du cache ne coûte rien et n'est pas débitée. */
  'shell.credits': { en: 'Credits left', ar: 'الكريدي لي باقي', fr: 'Crédits restants' },
  'shell.creditsTitle': {
    en: '{left} of {pack} credits left · {spent} spent. Pack: {pack} credits for ${usd}. The wallet is staged — the model calls behind it are counted for real.',
    ar: '{left} من {pack} كريدي · صرفت {spent}. الباكي: {pack} كريدي بـ {usd} دولار. البورتوفاي راه ديمو — أما عدد الطلبات للموديل محسوب بصح.',
    fr: '{left} crédits sur {pack} · {spent} dépensés. Pack : {pack} crédits pour {usd} $. Le portefeuille est une mise en scène — les appels aux modèles, eux, sont comptés pour de vrai.',
  },
  'shell.toPhone': { en: 'Phone layout', ar: 'عرض تيليفون', fr: 'Affichage téléphone' },
  'shell.notifs': { en: 'What happened', ar: 'واش صرى', fr: 'Ce qui est arrivé' },
  'shell.notifs.loading': { en: 'Reading…', ar: 'نقرا…', fr: 'Lecture…' },
  'shell.notifs.empty': { en: 'Nothing new.', ar: 'ما كاين والو جديد.', fr: 'Rien de nouveau.' },
  'shell.brain': { en: "The agent's brain", ar: 'العقل تاع الوكيل', fr: "Le cerveau de l'agent" },
  'shell.brainSwap': { en: 'click to switch', ar: 'كليكي باش تبدل', fr: 'clique pour basculer' },
  'shell.brainNow': { en: 'Brain: {model}', ar: 'العقل: {model}', fr: 'Cerveau : {model}' },
  'shell.langTitle': { en: 'Language', ar: 'اللغة', fr: 'Langue' },

  /* ── les deux volets de l'agent sur téléphone ─────────────────────────── */
  'shell.pane.talk': { en: 'Talk',  ar: 'الهدرة', fr: 'Parler' },
  'shell.pane.work': { en: 'Work',  ar: 'الخدمة', fr: 'Atelier' },

  /* ── les atomes partagés (ui.js) ──────────────────────────────────────── */
  'ui.open':     { en: 'open',     ar: 'حلّ',        fr: 'ouvrir' },
  'ui.openPage': { en: 'open the page', ar: 'حلّ الصفحة', fr: 'ouvrir la page' },
  'ui.loading':  { en: 'loading',  ar: 'راه يحمّل', fr: 'chargement' },
  // Le mot qui décide de tout : un écran simulé ne doit JAMAIS pouvoir
  // passer pour une mesure, dans aucune des trois langues.
  'ui.simulated': { en: 'simulated', ar: 'تجربة',  fr: 'simulé' },
  'ui.real':      { en: 'real',      ar: 'حقيقي',  fr: 'réel' },

  'ui.now':  { en: 'just now', ar: 'توّا',       fr: "à l'instant" },
  'ui.min':  { en: '{n} min',  ar: '{n} دقيقة',  fr: '{n} min' },
  'ui.hour': { en: '{n} h',    ar: '{n} سوايع',  fr: '{n} h' },
  'ui.day':  { en: '{n} d',    ar: '{n} أيام',   fr: '{n} j' },

  /* ── les deux chaînes prisonnières du CSS (voir i18n.js) ──────────────── */
  'shell.css.missing': { en: 'something is missing', ar: 'خاصو حاجة', fr: 'il lui manque quelque chose' },
  'shell.css.publishing': { en: 'the post', ar: 'المنشور', fr: 'la publication' },
}
