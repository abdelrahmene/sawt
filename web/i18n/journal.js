// Les chaînes de l'écran « journal » — ce que l'agent a trouvé, décidé et fait.
// Clé d'abord, langues à l'intérieur : une traduction manquante se voit.
// La darija est de la darija d'Alger, en lettres arabes.
//
// Une règle gouverne tout ce fichier : on traduit l'ACTION, jamais la RAISON.
// « il a mis en pause » est une étiquette d'interface et se dit dans la langue
// de l'écran ; la phrase qui explique pourquoi a été écrite par l'agent, dans
// la langue où il parlait, et elle est citée telle quelle. La retraduire
// reviendrait à lui faire dire ce qu'il n'a pas dit — et c'est précisément la
// phrase sur laquelle le marchand va décider de lui faire confiance ou non.
export const journal = {
  // L'onglet. Le mot est court exprès : le rail est large de 76 px et une
  // étiquette qui passe à la ligne décale toutes les autres.
  'tab.journal': { en: 'Journal', ar: 'السجل', fr: 'Journal' },

  'journal.loading': { en: 'activity', ar: 'النشاط', fr: 'activité' },

  'journal.head': { en: 'What it did', ar: 'واش دار', fr: "Ce qu'il a fait" },
  'journal.lead': {
    en: 'Every decision, with the reason it gave at the time.',
    ar: 'كل قرار، بالسبب لي قالو وقتها.',
    fr: "Chaque décision, avec la raison qu'il a donnée sur le moment.",
  },

  'journal.live':    { en: 'live', ar: 'مباشر', fr: 'en direct' },
  'journal.paused':  { en: 'paused', ar: 'موقّف', fr: 'en pause' },
  'journal.new':     { en: '{n} new', ar: '{n} جديد', fr: '{n} nouveau(x)' },

  /* ── filtres ──────────────────────────────────────────────────────────── */
  'journal.filter.all':      { en: 'Everything', ar: 'كلشي',      fr: 'Tout' },
  'journal.filter.decision': { en: 'Decisions',  ar: 'القرارات',  fr: 'Décisions' },
  'journal.filter.built':    { en: 'Built',      ar: 'لي بناه',   fr: 'Construit' },
  'journal.filter.answered': { en: 'Answered',   ar: 'لي جاوب',   fr: 'Répondu' },
  'journal.filter.spent':    { en: 'Spent',      ar: 'لي صرف',    fr: 'Dépensé' },

  /* ── en-tête : ce qu'il a fait en 24 h ────────────────────────────────── */
  'journal.sum.decisions': { en: 'decisions',   ar: 'قرارات',       fr: 'décisions' },
  'journal.sum.built':     { en: 'built',       ar: 'مبنيات',       fr: 'constructions' },
  'journal.sum.answered':  { en: 'answered',    ar: 'جوابات',       fr: 'réponses' },
  'journal.sum.handed':    { en: 'handed back', ar: 'رجّعهم ليك',   fr: 'rendus à toi' },
  'journal.sum.window':    { en: 'last 24 hours', ar: 'آخر 24 ساعة', fr: 'dernières 24 h' },

  /* ── l'écran vide ─────────────────────────────────────────────────────── */
  'journal.empty.title': { en: 'Nothing decided yet', ar: 'مازال ما قرر والو', fr: 'Rien de décidé pour le moment' },
  'journal.empty.body': {
    en: 'Launch a campaign and this fills up on its own — every pause, every budget change, every creative it replaces, with the reason.',
    ar: 'لانسي إشهار و هاد الصفحة تعمر وحدها — كل وقفة، كل تبديل في البيدجي، كل فيزيال يبدلو، بالسبب.',
    fr: 'Lance une campagne et cette page se remplit toute seule — chaque pause, chaque changement de budget, chaque visuel remplacé, avec la raison.',
  },
  'journal.empty.cta': { en: 'Ask the agent', ar: 'احكي مع الأجون', fr: "Parler à l'agent" },

  /* ── les décisions, par code d'action ─────────────────────────────────── */
  'journal.act.pause_campaign':   { en: 'Paused {name}',                 ar: 'وقّف {name}',                  fr: 'A mis {name} en pause' },
  'journal.act.resume_campaign':  { en: 'Restarted {name}',              ar: 'عاود شغّل {name}',             fr: 'A relancé {name}' },
  'journal.act.stop_campaign':    { en: 'Stopped {name} for good',       ar: 'حبس {name} نهائي',             fr: 'A arrêté {name} définitivement' },
  'journal.act.scale':            { en: 'Changed the budget on {name}',  ar: 'بدّل البيدجي تاع {name}',      fr: 'A changé le budget de {name}' },
  'journal.act.shift_budget':     { en: 'Moved budget on {name}',        ar: 'حرّك البيدجي تاع {name}',      fr: 'A déplacé du budget sur {name}' },
  'journal.act.change_placement': { en: 'Changed placement on {name}',   ar: 'بدّل البلاسمون تاع {name}',    fr: 'A changé le placement de {name}' },
  'journal.act.narrow_geo':       { en: 'Narrowed the targeting on {name}', ar: 'ضيّق السيبلاج تاع {name}',  fr: 'A resserré le ciblage de {name}' },
  'journal.act.pause_creative':   { en: 'Paused a creative on {name}',   ar: 'وقّف فيزيال في {name}',        fr: 'A mis un visuel de {name} en pause' },
  'journal.act.refresh_creatives':{ en: 'Replaced the creatives on {name}', ar: 'بدّل الفيزيالات تاع {name}', fr: 'A remplacé les visuels de {name}' },
  'journal.act.other':            { en: '{action} on {name}',            ar: '{action} على {name}',          fr: '{action} sur {name}' },

  // L'étiquette au-dessus de la phrase citée. « Dans ses mots » dit que ce qui
  // suit n'a pas été réécrit par l'interface.
  'journal.because': { en: 'in its words', ar: 'بكلامو', fr: 'dans ses mots' },

  /* ── ce qu'il a construit ─────────────────────────────────────────────── */
  'journal.built.page':     { en: 'Built a sales page — {what}', ar: 'بنى صفحة بيع — {what}',   fr: 'A construit une page de vente — {what}' },
  'journal.built.site':     { en: 'Built the shop — {what}',     ar: 'بنى الحانوت — {what}',    fr: 'A construit la boutique — {what}' },
  'journal.built.creative': { en: 'Drew {n} creative(s)',        ar: 'رسم {n} فيزيال',          fr: 'A dessiné {n} visuel(s)' },
  'journal.built.photo':    { en: 'Restyled the photo — {what}', ar: 'عاود التصويرة — {what}',  fr: 'A retravaillé la photo — {what}' },
  'journal.built.product':  { en: 'Imported {what}',             ar: 'جاب {what}',              fr: 'A importé {what}' },
  'journal.built.campaign': { en: 'Prepared the campaign — {what}', ar: 'حضّر الإشهار — {what}', fr: 'A préparé la campagne — {what}' },
  'journal.built.other':    { en: 'Ran {action}',                ar: 'دار {action}',            fr: 'A exécuté {action}' },
  'journal.built.open':     { en: 'open',                        ar: 'حلّ',                     fr: 'ouvrir' },

  /* ── ce qu'il a répondu ───────────────────────────────────────────────── */
  'journal.answer.dm':      { en: 'Answered {who} in Messenger',  ar: 'جاوب {who} في الميساج',   fr: 'A répondu à {who} dans Messenger' },
  'journal.answer.comment': { en: 'Answered {who} under a post',  ar: 'جاوب {who} تحت بوست',     fr: 'A répondu à {who} sous une publication' },
  'journal.handed':         { en: 'Handed {who} back to you',     ar: 'رجّعلك {who}',            fr: "T'a rendu {who}" },
  'journal.handed.why':     { en: 'it needs', ar: 'يلزمو', fr: 'il lui faut' },

  /* ── le reste ─────────────────────────────────────────────────────────── */
  'journal.launched': { en: 'Launched {name} at {budget} a day', ar: 'لانسا {name} بـ {budget} في النهار', fr: 'A lancé {name} à {budget} par jour' },
  'journal.notified': { en: 'Told you: {title}',                 ar: 'قالك: {title}',                      fr: "T'a prévenu : {title}" },
  'journal.spent':    { en: '{name}: {spend} spent, {orders} order(s)', ar: '{name}: صرف {spend}، {orders} طلب', fr: '{name} : {spend} dépensés, {orders} commande(s)' },
  'journal.spent.each': { en: '{cost} each', ar: '{cost} للوحدة', fr: '{cost} pièce' },

  /* ── repères de temps ─────────────────────────────────────────────────── */
  'journal.day.today':     { en: 'Today',     ar: 'اليوم',   fr: "Aujourd'hui" },
  'journal.day.yesterday': { en: 'Yesterday', ar: 'البارح',  fr: 'Hier' },

  'journal.cost': { en: '{n} cr', ar: '{n} كريدي', fr: '{n} cr' },

  /* ── le battement : ce que l'app dit quand elle a agi toute seule ─────
     Deux phrases seulement, et le refus passe devant la réponse — c'est lui
     qui demande quelque chose à un humain. */
  'beat.answered': {
    en: 'Answered {n} customer(s) on its own',
    ar: 'جاوب {n} زبون وحدو',
    fr: 'A répondu tout seul à {n} client(s)',
  },
  'beat.handed': {
    en: '{who} needs you — it would not guess',
    ar: '{who} يحتاجك — ما حبش يخمّن',
    fr: '{who} a besoin de toi — il a refusé de deviner',
  },
}
