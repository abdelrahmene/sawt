// Les chaînes de l'écran « sites ».
// Clé d'abord, langues à l'intérieur : une traduction manquante se voit.
// La darija est de la darija d'Alger, en lettres arabes.
//
// Deux familles de mots se croisent ici et ne se traduisent pas pareil : les
// noms des choses du marchand (حانوت، صفحة، كوموند) et le vocabulaire du
// registrar (DNS, domaine, propagation), que personne en Algérie ne dit
// autrement qu'en emprunt — « دومين »، « ريكورد »، « بروباڨاسيون ». Traduire
// ces derniers en arabe littéraire les rendrait moins compréhensibles, pas plus.
export const sites = {
  /* ── l'en-tête et l'écran vide ────────────────────────────────────────── */
  'sites.loading':    { en: 'sites', ar: 'المواقع', fr: 'sites' },
  'sites.title':      { en: 'Sites and domains', ar: 'المواقع والدومينات', fr: 'Sites & domaines' },
  'sites.sub': {
    en: '{shops} shop(s) · {pages} page(s) · these are real files you can open.',
    ar: '{shops} حوانت · {pages} صفحات · كلش ملفات حقيقية تقدر تحلها.',
    fr: '{shops} boutique(s) · {pages} page(s) · tout est de vrais fichiers que tu peux ouvrir.',
  },
  'sites.empty.head': { en: 'Sites', ar: 'المواقع', fr: 'Sites' },
  'sites.empty.lead': {
    en: 'The pages and shops the agent builds, and their domains.',
    ar: 'الصفحات والحوانت اللي يبنيهم الوكيل، والدومينات تاعهم.',
    fr: "Les pages et les boutiques que l'agent construit, et leurs domaines.",
  },
  'sites.empty.title': { en: 'Nothing built yet', ar: 'مازال ما بنى والو', fr: "Rien de construit pour l'instant" },
  'sites.empty.body': {
    en: 'Send it a product photo and tell it to build you a shop. It writes the text, generates the visuals for each section and hands you real files.',
    ar: 'ابعثلو تصويرة تاع المنتج وقوله يديرلك حانوت. هو يكتب النص، يخرّج الصور تاع كل قسم ويعطيك ملفات حقيقية.',
    fr: "Envoie-lui une photo de produit et dis-lui de te faire une boutique. Il écrit le texte, génère les visuels de chaque section et te rend de vrais fichiers.",
  },
  'sites.empty.cta': { en: 'Talk to the agent', ar: 'هدر مع الوكيل', fr: "Parler à l'agent" },

  /* ── les compteurs du haut ────────────────────────────────────────────── */
  'sites.kpi.pages':      { en: 'pages', ar: 'الصفحات', fr: 'pages' },
  'sites.kpi.orders':     { en: 'orders received', ar: 'الكوموندات اللي وصلت', fr: 'commandes reçues' },
  'sites.kpi.ordersFrom': { en: 'from the forms', ar: 'من الفورميلارات', fr: 'depuis les formulaires' },
  'sites.kpi.value':      { en: 'value', ar: 'القيمة', fr: 'valeur' },
  'sites.kpi.ip':         { en: 'platform IP', ar: 'IP تاع البلاتفورم', fr: 'IP de la plateforme' },
  'sites.kpi.ipFor':      { en: 'for the A records', ar: 'للريكوردات A', fr: 'pour les enregistrements A' },

  /* ── la pastille de provenance : mesuré, pas mis en scène ─────────────── */
  'sites.real': { en: 'real', ar: 'حقيقي', fr: 'réel' },

  /* ── les commandes arrivées par les formulaires ───────────────────────── */
  'sites.orders.title': { en: 'Orders received', ar: 'الكوموندات اللي وصلت', fr: 'Commandes reçues' },
  'sites.orders.why': {
    en: 'These rows are not simulated: someone filled in a form on a generated page, and the order is in the database.',
    ar: 'هاذ الأسطر ماشي سيميلاسيون: واحد عمّر فورميلار في صفحة مخرّجة، والكوموند راهي مسجّلة في البيز.',
    fr: "Ces lignes-là ne sont pas simulées : quelqu'un a rempli un formulaire sur une page générée, et la commande est en base.",
  },
  'sites.th.product':  { en: 'product', ar: 'المنتج', fr: 'produit' },
  'sites.th.client':   { en: 'customer', ar: 'الكليان', fr: 'client' },
  'sites.th.phone':    { en: 'phone', ar: 'التيليفون', fr: 'téléphone' },
  'sites.th.wilaya':   { en: 'wilaya', ar: 'الولاية', fr: 'wilaya' },
  'sites.th.qty':      { en: 'qty', ar: 'الكمية', fr: 'qté' },
  'sites.th.total':    { en: 'total', ar: 'الطوطال', fr: 'total' },
  'sites.th.received': { en: 'received', ar: 'وصلت', fr: 'reçue' },

  /* ── une boutique et ses pages ────────────────────────────────────────── */
  'sites.site.home':     { en: 'home', ar: 'الصفحة الأولى', fr: 'accueil' },
  'sites.site.products': { en: '{n} products', ar: '{n} منتجات', fr: '{n} produits' },

  /* ── les landings construites hors boutique ───────────────────────────── */
  'sites.loose.title': { en: 'Standalone pages', ar: 'صفحات بوحدهم', fr: 'Pages seules' },
  'sites.loose.why': {
    en: 'Landing pages built outside a shop. To give them a domain, create a shop first.',
    ar: 'لاندينڨات مبنية برّا الحانوت. باش تربطلهم دومين، دير حانوت قبل.',
    fr: "Des landings construites hors boutique. Attache-leur un domaine en créant d'abord une boutique.",
  },
  'sites.loose.count': { en: '{n} page(s)', ar: '{n} صفحات', fr: '{n} page(s)' },
  'sites.page.orders': { en: '{n} orders', ar: '{n} كوموند', fr: '{n} cmd' },

  /* ── l'automate des domaines : brouillon → DNS → vérifié → en ligne ───── */
  'sites.st.live':       { en: 'live', ar: 'أونلاين', fr: 'en ligne' },
  'sites.st.verified':   { en: 'DNS checked', ar: 'DNS متشيكي', fr: 'DNS vérifié' },
  'sites.st.dnsPending': { en: 'waiting for DNS', ar: 'يستنى DNS', fr: 'attente DNS' },
  'sites.st.draft':      { en: 'draft', ar: 'بروييون', fr: 'brouillon' },
  'sites.st.failed':     { en: 'failed', ar: 'ما نجحش', fr: 'échec' },

  /* ── le domaine : l'ajouter, l'attendre, le vérifier ──────────────────── */
  'sites.dom.section': { en: 'Domain name', ar: 'إسم الدومين', fr: 'Nom de domaine' },
  'sites.dom.none': {
    en: 'No domain. The shop opens from its file, but it has no address.',
    ar: 'ما كان حتى دومين. الحانوت تتحل من الملف تاعها، بصح ما عندهاش عنوان.',
    fr: "Aucun domaine. La boutique est accessible par son fichier, mais elle n'a pas d'adresse.",
  },
  'sites.dom.addLabel':  { en: 'Add a domain', ar: 'زيد دومين', fr: 'Ajouter un domaine' },
  'sites.dom.addBtn':    { en: 'add', ar: 'زيد', fr: 'ajouter' },
  'sites.dom.added': {
    en: '{host} added. Add the two DNS records, then check.',
    ar: '{host} تزاد. زيد جوج ريكوردات DNS، ومن بعد تشيكي.',
    fr: '{host} ajouté. Ajoute les deux enregistrements DNS, puis vérifie.',
  },
  'sites.dom.subdomain': { en: 'platform subdomain', ar: 'صو-دومين تاع البلاتفورم', fr: 'sous-domaine plateforme' },
  'sites.dom.checked':   { en: 'checked {when} ago', ar: 'متشيكي قبل {when}', fr: 'vérifié il y a {when}' },
  'sites.dom.verify':    { en: 'check DNS', ar: 'تشيكي DNS', fr: 'vérifier le DNS' },
  'sites.dom.querying':  { en: 'DNS query…', ar: '…نسقسي DNS', fr: 'requête DNS…' },
  'sites.dom.remove':    { en: 'remove', ar: 'نحّي', fr: 'retirer' },
  'sites.dom.confirm':   { en: 'Remove {host}?', ar: 'نحّي {host} ؟', fr: 'Retirer {host} ?' },
  'sites.dom.live':      { en: 'Live.', ar: 'راهي أونلاين.', fr: 'En ligne.' },
  'sites.dom.stillNot': {
    en: 'Still “{status}” — look at what DNS answered.',
    ar: 'مازال « {status} » — شوف واش جاوب DNS.',
    fr: 'Toujours « {status} » — regarde ce que le DNS a répondu.',
  },

  /* ── le raccourci de démonstration, et le fait qu'il soit dit ─────────── */
  'sites.dom.pretend':   { en: 'simulate propagation', ar: 'سيميلي البروباڨاسيون', fr: 'simuler la propagation' },
  'sites.dom.pretended': {
    en: 'Propagation simulated — and it says so.',
    ar: 'البروباڨاسيون سيميلي — وهذا مكتوب.',
    fr: "Propagation simulée — et c'est écrit comme tel.",
  },

  /* ── ce qu'il faut poser chez le registrar, et ce qu'il a répondu ─────── */
  'sites.dns.help': {
    en: 'Add these at your registrar. The “check” button makes a real DNS query.',
    ar: 'تزادو عند الريجيسترار تاعك. البوطون « تشيكي » يدير سقسية DNS حقيقية.',
    fr: "À ajouter chez ton registrar. Le bouton « vérifier » fait une vraie requête DNS.",
  },
  'sites.dns.got': { en: 'got: {values}', ar: 'جا: {values}', fr: 'reçu : {values}' },
}
