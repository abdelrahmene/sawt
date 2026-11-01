// Les chaînes de l'écran « inbox ».
// Clé d'abord, langues à l'intérieur : une traduction manquante se voit.
// La darija est de la darija d'Alger, en lettres arabes.
//
// C'est l'écran où le projet se joue : trois conversations sur huit ne peuvent
// PAS être répondues sans le marchand, et le refus doit se lire aussi clair en
// anglais pour le jury qu'en darija pour le marchand. D'où un ton plat partout
// — ni promesse, ni point d'exclamation : « il n'a pas répondu » est un fait,
// pas une excuse.
//
// Les noms des clients, le texte de la publication et les messages reçus
// restent où ils sont (`src/meta-sim/inbox.js`) : ils sont en arabe exprès,
// c'est le contenu de la démonstration, pas de l'interface.
export const inbox = {
  /* ── l'en-tête de l'écran ─────────────────────────────────────────────── */
  'inbox.loading': { en: 'inbox', ar: 'صندوق الرسائل', fr: 'boîte de réception' },
  'inbox.title':   { en: 'Messages', ar: 'الرسائل', fr: 'Messages' },
  'inbox.sub': {
    en: 'Comments and private messages from your customers.',
    ar: 'التعليقات والرسائل الخاصة من الزبائن تاعك.',
    fr: 'Commentaires et messages privés de tes clients.',
  },

  /* ── rien de connecté : le seul chemin qui sort de l'écran ────────────── */
  'inbox.empty.title': { en: 'No page connected', ar: 'ما كاين حتى صفحة مربوطة', fr: 'Aucune page connectée' },
  'inbox.empty.body': {
    en: 'Connect your Facebook page and your Instagram, and the comments and messages land here.',
    ar: 'اربط الصفحة تاع Facebook والحساب تاع Instagram، والتعليقات والرسائل يوصلو هنا.',
    fr: 'Connecte ta page Facebook et ton Instagram, et les commentaires et messages arriveront ici.',
  },
  'inbox.empty.cta': { en: 'Connect Facebook', ar: 'اربط Facebook', fr: 'Connecter Facebook' },

  /* ── la colonne des pages et des comptes ──────────────────────────────── */
  // « Surfaces » est le mot de Business Suite ; en anglais et en darija on dit
  // ce que c'est vraiment, des comptes — le jury n'a pas à deviner le jargon.
  'inbox.surfaces':     { en: 'Accounts', ar: 'الحسابات', fr: 'Surfaces' },
  'inbox.conversations': { en: '{n} conversation(s)', ar: '{n} محادثة', fr: '{n} conversation(s)' },

  /* ── la mention qui ne peut pas manquer (règle 2 du CLAUDE.md) ────────── */
  'inbox.sim': { en: 'simulated', ar: 'محاكاة', fr: 'simulé' },
  'inbox.sim.body': {
    en: 'Customers and messages written for the demo. No real customer, no real page.',
    ar: 'الزبائن والرسائل راهم مكتوبين للعرض. ما كاينش زبون حقيقي، ما كاينش صفحة حقيقية.',
    fr: 'Clients et messages écrits pour la démonstration. Aucun vrai client, aucune vraie page.',
  },

  /* ── la liste des conversations ───────────────────────────────────────── */
  'inbox.answerAll': { en: 'answer all', ar: 'جاوب على الكل', fr: 'tout traiter' },
  'inbox.none':      { en: 'Nothing here.', ar: 'ما كاين والو.', fr: 'Rien ici.' },
  'inbox.aiCount':   { en: '{n} AI', ar: '{n} بالذكاء', fr: '{n} IA' },

  /* ── les trois états ──────────────────────────────────────────────────────
     Les valeurs comparées dans le code (`open`, `answered`, `needs_merchant`)
     ne bougent pas : ici il n'y a que ce que le marchand lit. */
  'inbox.status.open':     { en: 'waiting', ar: 'يستنى', fr: 'en attente' },
  'inbox.status.answered': { en: 'answered', ar: 'تجاوب', fr: 'répondu' },
  'inbox.status.needs':    { en: 'needs you', ar: 'جاوب نتا', fr: 'à toi de répondre' },

  /* ── les canaux ───────────────────────────────────────────────────────── */
  'inbox.channel.comment':   { en: 'comment', ar: 'تعليق', fr: 'commentaire' },
  'inbox.channel.messenger': { en: 'Messenger', ar: 'Messenger', fr: 'Messenger' },
  'inbox.channel.dm':        { en: 'Instagram DM', ar: 'رسالة Instagram', fr: 'DM Instagram' },

  /* ── la conversation ouverte ──────────────────────────────────────────── */
  'inbox.pick.title':    { en: 'Pick a conversation', ar: 'اختار محادثة', fr: 'Choisis une conversation' },
  'inbox.pick.body':     { en: 'The messages show up here.', ar: 'الرسائل يبانو هنا.', fr: 'Les messages apparaîtront ici.' },
  'inbox.loading.thread': { en: 'conversation', ar: 'المحادثة', fr: 'conversation' },
  'inbox.answerAI':      { en: 'answer with AI', ar: 'جاوب بالذكاء الاصطناعي', fr: "répondre avec l'IA" },
  'inbox.writing':       { en: 'writing…', ar: '…يكتب', fr: 'rédige…' },
  'inbox.myReply':       { en: 'Answer it yourself…', ar: '…جاوب بروحك', fr: 'Réponds toi-même…' },

  /* ── qui parle dans chaque bulle ──────────────────────────────────────── */
  'inbox.who.customer': { en: 'customer', ar: 'الزبون', fr: 'client' },
  'inbox.who.you':      { en: 'you', ar: 'نتا', fr: 'toi' },
  'inbox.who.ai':       { en: 'AI', ar: 'ذكاء اصطناعي', fr: 'IA' },

  /* ── le refus, qui est la démonstration ───────────────────────────────────
     Un « oui, la pointure 43 est dispo » inventé, c'est une livraison refusée,
     700 DA de retour et un client perdu. Le texte dit donc que le silence est
     un choix, et nomme le fait qui manque. */
  'inbox.escal.title': {
    en: 'It did not answer, and that is deliberate.',
    ar: 'ما جاوبش، وهذا بالقصد.',
    fr: "Il n'a pas répondu, et c'est voulu.",
  },
  'inbox.escal.body': {
    en: 'The answer needed a fact it does not have. Rather than invent one, it hands the thread back to you.',
    ar: 'الرد كان يحتاج معلومة ما عندوهاش. بلاصة ما يخترعها، يرجعها ليك.',
    fr: "La réponse exigeait un fait qu'il n'a pas. Plutôt que d'inventer, il te la rend.",
  },
  'inbox.escal.need': { en: 'It needs from you: {what}', ar: 'لازمو منك: {what}', fr: 'Il lui faut de toi : {what}' },

  /* ── les retours après action ─────────────────────────────────────────── */
  'inbox.toast.answered': { en: 'Answered in {ms} ms.', ar: 'جاوب في {ms} ms.', fr: 'Répondu en {ms} ms.' },
  'inbox.toast.missing':  { en: 'Not answered — you need: {what}', ar: 'ما جاوبش — لازمك: {what}', fr: 'Pas répondu — il te faut : {what}' },
  'inbox.toast.nobody':   { en: 'Nobody is waiting.', ar: 'حتى واحد ما يستنى.', fr: "Personne n'attend." },
  'inbox.toast.batch': {
    en: '{ok} answered, {back} handed back to you.',
    ar: '{ok} تجاوبو، {back} رجعو ليك.',
    fr: '{ok} répondus, {back} renvoyés à toi.',
  },
}
