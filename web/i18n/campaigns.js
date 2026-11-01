// Les chaînes de l'écran « campaigns ».
// Clé d'abord, langues à l'intérieur : une traduction manquante se voit.
// La darija est de la darija d'Alger, en lettres arabes.
//
// Deux mots reviennent partout et méritent d'être fixés une fois : une
// commande est « كوموند » (le mot qu'on emploie vraiment, pas « طلب »), et une
// place d'affichage est « بلاصة » — Meta dit « placement », le marchand dit
// « وين يبان الإشهار ». Les noms de marques (Facebook, Instagram, Messenger,
// Marketplace) ne se traduisent pas ; en lettres arabes ils gardent la forme
// que Facebook lui-même emploie dans son interface arabe.
export const campaigns = {
  /* ── le portefeuille du compte publicitaire ───────────────────────────
     Un tableau de dépenses sans le solde en face oblige le marchand à
     additionner de tête pour savoir s'il peut encore lancer quelque chose.
     Le « dépensé » n'est pas un nombre choisi : c'est la somme des
     insights, donc il ne peut pas contredire le tableau juste en dessous. */
  'campaigns.wallet.title': { en: 'Ad account', ar: 'كومبت الإشهار', fr: 'Compte publicitaire' },
  'campaigns.wallet.left': { en: 'left', ar: 'باقي', fr: 'restant' },
  'campaigns.wallet.spent': { en: 'spent', ar: 'مصروف', fr: 'dépensé' },
  'campaigns.wallet.cap': { en: 'cap', ar: 'السقف', fr: 'plafond' },

  /* ── l'en-tête de l'écran ─────────────────────────────────────────────── */
  'campaigns.title': { en: 'Ads', ar: 'الإشهار', fr: 'Publicités' },
  'campaigns.subtitle': {
    en: 'Your campaigns, their status and what they bring in.',
    ar: 'الكامبانيات تاعك، الحالة تاعهم وواش داخل منهم.',
    fr: "Tes campagnes, leur état et ce qu'elles rapportent.",
  },
  'campaigns.count': {
    en: '{n} campaign(s) · {live} live',
    ar: '{n} كامبانية · {live} تخدم',
    fr: '{n} campagne(s) · {live} en ligne',
  },
  'campaigns.load.campaigns': { en: 'campaigns', ar: 'الكامبانيات', fr: 'campagnes' },
  'campaigns.load.results': { en: 'results', ar: 'النتائج', fr: 'résultats' },

  /* ── l'écran vide : la phrase d'exemple reste en darija dans les trois
       langues, parce que c'est celle que le marchand dira vraiment ───────── */
  'campaigns.empty.title': { en: 'No campaign yet', ar: 'ما كاين حتى كامبانية', fr: 'Aucune campagne' },
  'campaigns.empty.example': {
    en: 'دير لي إشهار على هاد الصباط بـ 2000 دينار في النهار',
    ar: 'دير لي إشهار على هاد الصباط بـ 2000 دينار في النهار',
    fr: 'دير لي إشهار على هاد الصباط بـ 2000 دينار في النهار',
  },
  'campaigns.empty.body': {
    en: 'Ask it in darija: « {example} ». It builds the campaign, targets it and shows it to you before launching.',
    ar: 'قوله بالدارجة: « {example} ». هو يبنيها، يختار لها الناس، ويوريها لك قبل ما يلانسيها.',
    fr: "Demande-lui en darija : « {example} ». Il la construit, la cible et te la montre avant de la lancer.",
  },
  'campaigns.empty.cta': { en: 'Talk to the agent', ar: 'هدر مع الوكيل', fr: "Parler à l'agent" },

  /* ── la marque « simulé » : règle 2 du projet, elle doit rester lisible
       dans la langue de celui qui regarde l'écran ────────────────────────── */
  'campaigns.sim.badge': { en: 'simulated', ar: 'ماشي حقيقي', fr: 'simulé' },
  'campaigns.sim.title': { en: 'Simulated figures.', ar: 'أرقام ماشي حقيقية.', fr: 'Chiffres simulés.' },
  'campaigns.sim.body': {
    en: 'No ad ran and not one dinar was spent. The model behind them (Reels reach more people per dinar and convert less, cost per result climbs as the audience tires) is deliberately simple, but it is not arbitrary — otherwise the agent would never have a reason to decide anything.',
    ar: 'حتى إشهار ما خدم وحتى دينار ما تصرف. الحساب اللي وراهم (الريلز توصل لناس أكثر بالدينار بصح تبيع أقل، والتكلفة تاع النتيجة تطلع كي يعيا الناس من الإشهار) بسيط بقصد، بصح ماشي مخلوط كيفما جا — لوكان، الوكيل ما يلقى حتى سبب باش يقرر حاجة.',
    fr: "Aucune publicité n'a tourné et aucun dinar n'a été dépensé. Le modèle économique derrière (les Reels touchent plus de monde par dinar et convertissent moins, le coût par résultat monte avec la fatigue) est délibérément simple, mais il n'est pas arbitraire — sinon l'agent n'aurait jamais de raison de décider quoi que ce soit.",
  },

  /* ── les deux notes que le simulateur renvoie, traduites par leur texte
       exact (voir campaigns.js) ─────────────────────────────────────────── */
  'campaigns.note.simulated': {
    en: 'SIMULATED. No ad ran, not one dinar was spent, nothing was sent to Meta.',
    ar: 'ماشي حقيقي. حتى إشهار ما خدم، حتى دينار ما تصرف، وحتى حاجة ما مشات لميتا.',
    fr: "SIMULÉ. Aucune publicité n'a tourné, aucun dinar n'a été dépensé, rien n'est parti chez Meta.",
  },
  'campaigns.note.stopped': {
    en: 'Stopped — nothing to read.',
    ar: 'واقفة — ما كاين واش تقرا.',
    fr: "À l'arrêt — rien à lire.",
  },
  'campaigns.results.none': {
    en: 'No data yet — launch the campaign to produce some.',
    ar: 'ما زال ما كاين معطيات — لانسي الكامبانية باش تجيب الأرقام.',
    fr: 'Pas encore de données — lance la campagne pour en produire.',
  },

  /* ── les KPI ──────────────────────────────────────────────────────────── */
  'campaigns.kpi.spent': { en: 'spent', ar: 'المصروف', fr: 'dépensé' },
  'campaigns.kpi.orders': { en: 'orders', ar: 'الكوموندات', fr: 'commandes' },
  'campaigns.kpi.costPerOrder': { en: 'cost / order', ar: 'التكلفة / الكوموند', fr: 'coût / commande' },
  'campaigns.kpi.clicks': { en: 'clicks', ar: 'الكليكات', fr: 'clics' },
  'campaigns.kpi.messages': { en: 'messages', ar: 'الرسائل', fr: 'messages' },
  'campaigns.kpi.reach': { en: 'reach', ar: 'الوصول', fr: 'portée' },
  'campaigns.kpi.perClick': { en: '{amount} / click', ar: '{amount} / الكليك', fr: '{amount} / clic' },
  'campaigns.kpi.drift': {
    en: '{arrow} {pct}% since day 1',
    ar: '{arrow} {pct} % من أول نهار',
    fr: '{arrow} {pct} % depuis le 1ᵉʳ jour',
  },

  /* ── les titres de section et de carte ────────────────────────────────── */
  'campaigns.sec.list': { en: 'Campaigns', ar: 'الكامبانيات', fr: 'Campagnes' },
  'campaigns.sec.results': { en: 'Results · {n} day(s)', ar: 'النتائج · {n} نهار', fr: 'Résultats · {n} jour(s)' },
  'campaigns.sec.decisions': { en: 'Agent decisions', ar: 'القرارات تاع الوكيل', fr: "Décisions de l'agent" },
  'campaigns.sec.api': { en: 'The Marketing API request', ar: 'الطلب تاع Marketing API', fr: 'La requête Marketing API' },
  'campaigns.card.byPlacement': { en: 'By placement', ar: 'حسب البلاصة', fr: 'Par placement' },
  'campaigns.card.byDay': { en: 'Day by day', ar: 'نهار بنهار', fr: 'Jour par jour' },
  'campaigns.card.byCreative': {
    en: 'By creative and placement',
    ar: 'حسب الكرياتيف والبلاصة',
    fr: 'Par créative et placement',
  },

  /* ── les en-têtes de colonnes : courts, en minuscules comme le français ─ */
  'campaigns.th.campaign': { en: 'campaign', ar: 'الكامبانية', fr: 'campagne' },
  'campaigns.th.objective': { en: 'objective', ar: 'الهدف', fr: 'objectif' },
  'campaigns.th.status': { en: 'status', ar: 'الحالة', fr: 'état' },
  'campaigns.th.budgetDay': { en: 'budget/day', ar: 'الميزانية/النهار', fr: 'budget/j' },
  'campaigns.th.spent': { en: 'spent', ar: 'المصروف', fr: 'dépensé' },
  'campaigns.th.spend': { en: 'spend', ar: 'المصروف', fr: 'dépense' },
  'campaigns.th.orders': { en: 'orders', ar: 'كوموند', fr: 'cmd' },
  'campaigns.th.costPerOrder': { en: 'cost/order', ar: 'تكلفة/كوموند', fr: 'coût/cmd' },
  'campaigns.th.placement': { en: 'placement', ar: 'البلاصة', fr: 'placement' },
  'campaigns.th.clicks': { en: 'clicks', ar: 'الكليكات', fr: 'clics' },
  'campaigns.th.day': { en: 'day', ar: 'النهار', fr: 'jour' },
  'campaigns.th.ctr': { en: 'CTR', ar: 'CTR', fr: 'CTR' },
  'campaigns.th.creative': { en: 'creative', ar: 'الكرياتيف', fr: 'créative' },

  /* ── les états et les objectifs Meta ──────────────────────────────────── */
  'campaigns.status.active': { en: 'live', ar: 'تخدم', fr: 'en ligne' },
  'campaigns.status.paused': { en: 'paused', ar: 'محبوسة', fr: 'en pause' },
  'campaigns.objective.sales': { en: 'sales', ar: 'البيع', fr: 'ventes' },
  'campaigns.objective.leads': { en: 'leads', ar: 'ليدز', fr: 'prospects' },
  'campaigns.objective.traffic': { en: 'traffic', ar: 'الترافيك', fr: 'trafic' },
  'campaigns.objective.engagement': { en: 'engagement', ar: 'التفاعل', fr: 'engagement' },

  /* ── les places d'affichage : la clé technique vient du serveur, le
       libellé est ici (`PLACEMENTS` dans src/meta-sim/campaigns.js) ─────── */
  'campaigns.placement.facebook_feed': { en: 'Facebook · feed', ar: 'فيسبوك · الفيد', fr: 'Facebook · fil' },
  'campaigns.placement.facebook_marketplace': {
    en: 'Facebook · Marketplace',
    ar: 'فيسبوك · Marketplace',
    fr: 'Facebook · Marketplace',
  },
  'campaigns.placement.instagram_feed': { en: 'Instagram · feed', ar: 'إنستغرام · الفيد', fr: 'Instagram · fil' },
  'campaigns.placement.instagram_reels': { en: 'Instagram · Reels', ar: 'إنستغرام · ريلز', fr: 'Instagram · Reels' },
  'campaigns.placement.instagram_stories': { en: 'Instagram · stories', ar: 'إنستغرام · ستوري', fr: 'Instagram · stories' },
  'campaigns.placement.messenger_inbox': { en: 'Messenger', ar: 'ماسنجر', fr: 'Messenger' },

  /* ── la fiche d'une campagne ──────────────────────────────────────────── */
  'campaigns.detail.objective': { en: 'objective', ar: 'الهدف', fr: 'objectif' },
  'campaigns.detail.budgetDay': { en: 'budget / day', ar: 'الميزانية في النهار', fr: 'budget / jour' },
  'campaigns.detail.targeting': { en: 'targeting', ar: 'شكون يشوفها', fr: 'ciblage' },
  'campaigns.detail.placements': { en: 'placements', ar: 'البلايص', fr: 'placements' },
  'campaigns.detail.creatives': { en: 'creatives', ar: 'الكرياتيفات', fr: 'créatives' },
  'campaigns.detail.geoAll': { en: 'Algeria', ar: 'الجزائر', fr: 'Algérie' },
  'campaigns.detail.targetingValue': {
    en: '{geo} · {min}–{max} years · {genders}',
    ar: '{geo} · {min}–{max} سنة · {genders}',
    fr: '{geo} · {min}–{max} ans · {genders}',
  },
  'campaigns.detail.creativesValue': {
    en: '{n} · {active} active',
    ar: '{n} · {active} تخدم',
    fr: '{n} · {active} active(s)',
  },

  /* ── les boutons, et ce qu'ils répondent ──────────────────────────────── */
  'campaigns.btn.open': { en: 'open', ar: 'حل', fr: 'ouvrir' },
  'campaigns.btn.launch': { en: 'launch (simulated)', ar: 'لانسيها (ماشي حقيقي)', fr: 'lancer (simulé)' },
  'campaigns.btn.advance': { en: '+ 1 day of data', ar: '+ نهار من المعطيات', fr: '+ 1 jour de données' },
  'campaigns.btn.pause': { en: 'pause', ar: 'حبسها', fr: 'mettre en pause' },
  'campaigns.toast.live': {
    en: 'Live — simulated. Not one dinar moved.',
    ar: 'تخدم — ماشي حقيقي. حتى دينار ما تحرك.',
    fr: "En ligne — simulé. Aucun dinar n'a bougé.",
  },
  'campaigns.toast.advanced': {
    en: 'One more day of simulated data.',
    ar: 'نهار زايد من المعطيات اللي ماشي حقيقية.',
    fr: 'Un jour de plus de données simulées.',
  },
  'campaigns.decision.manualPause': {
    en: 'Paused by hand from the table.',
    ar: 'حبسناها باليد من الجدول.',
    fr: 'Mise en pause manuelle depuis le tableau.',
  },

  /* ── la requête Marketing API ─────────────────────────────────────────── */
  'campaigns.api.why': {
    en: 'Real shape, simulated data. This is exactly what {endpoint} would receive if the connection were real.',
    ar: 'الشكل حقيقي، المعطيات ماشي حقيقية. هذا بالضبط واش يوصل لـ {endpoint} لوكان الربط كان حقيقي.',
    fr: "Forme réelle, données simulées. C'est exactement ce que recevrait {endpoint} si la connexion était vraie.",
  },

  /* ── un pourcentage : l'espace avant « % » est une règle française ────── */
  'campaigns.pct': { en: '{n}%', ar: '{n}%', fr: '{n} %' },
}
