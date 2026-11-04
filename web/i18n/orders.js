// Les chaînes de l'écran « commandes ».
// Clé d'abord, langues à l'intérieur : une traduction manquante se voit.
// La darija est de la darija d'Alger, en lettres arabes.
export const orders = {
  'tab.orders':     { en: 'Orders', ar: 'الطلبات', fr: 'Commandes' },
  'orders.loading': { en: 'orders', ar: 'الطلبات', fr: 'commandes' },

  'orders.head': { en: 'Orders', ar: 'الطلبات', fr: 'Commandes' },
  'orders.lead': {
    en: 'Every order placed on your pages. Call to confirm before you ship.',
    ar: 'كل طلب جا من الصفحات تاعك. عيّط باش تأكد قبل ما تبعث.',
    fr: 'Chaque commande passée sur tes pages. Appelle pour confirmer avant d’expédier.',
  },

  'orders.kpi.today':  { en: 'Today',       ar: 'اليوم',        fr: "Aujourd'hui" },
  'orders.kpi.all':    { en: 'All orders',  ar: 'كل الطلبات',   fr: 'Toutes' },
  'orders.kpi.value':  { en: 'To collect',  ar: 'لي تحصّلو',    fr: 'À encaisser' },
  'orders.kpi.basket': { en: '{n} average basket', ar: '{n} معدل الطلب', fr: '{n} de panier moyen' },

  'orders.table': { en: 'Received', ar: 'لي وصلو', fr: 'Reçues' },

  'orders.th.when':  { en: 'When',     ar: 'وقتاش',   fr: 'Quand' },
  'orders.th.what':  { en: 'Product',  ar: 'المنتج',  fr: 'Produit' },
  'orders.th.who':   { en: 'Customer', ar: 'الزبون',  fr: 'Client' },
  'orders.th.where': { en: 'Where',    ar: 'وين',     fr: 'Où' },
  'orders.th.qty':   { en: 'Qty',      ar: 'الكمية',  fr: 'Qté' },
  'orders.th.total': { en: 'Total',    ar: 'المجموع', fr: 'Total' },

  'orders.today':     { en: 'today',     ar: 'اليوم',  fr: "auj." },
  'orders.yesterday': { en: 'yesterday', ar: 'البارح', fr: 'hier' },
  'orders.fromPage':  { en: 'open the page', ar: 'حلّ الصفحة', fr: 'ouvrir la page' },

  // Dit une fois, en bas : pourquoi ces montants ne sont pas de l'argent reçu.
  'orders.cod': {
    en: 'Cash on delivery: nothing is paid until the parcel is handed over, so these are orders, not revenue. A confirmation call is what turns one into the other.',
    ar: 'الدفع عند الاستلام: ما يتخلّص والو حتى يوصل الكولي، إذن هاذو طلبات ماشي مداخيل. تيليفون تأكيد هو لي يبدّلهم.',
    fr: "Paiement à la livraison : rien n'est payé tant que le colis n'est pas remis, donc ce sont des commandes, pas un chiffre d'affaires. C'est l'appel de confirmation qui transforme l'un en l'autre.",
  },

  'orders.empty.title': { en: 'No order yet', ar: 'مازال ما جا طلب', fr: 'Aucune commande' },
  'orders.empty.body': {
    en: 'Orders land here the moment someone fills the form on one of your pages — no refresh, no export.',
    ar: 'الطلبات توصل هنا كي يعمّر شي واحد الفورم في صفحة تاعك — بلا ما تعاود تحمّل، بلا إكسبور.',
    fr: 'Les commandes arrivent ici dès que quelqu’un remplit le formulaire d’une de tes pages — sans rechargement, sans export.',
  },
  'orders.empty.cta': { en: 'See my pages', ar: 'شوف صفحاتي', fr: 'Voir mes pages' },
}
