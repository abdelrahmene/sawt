// SIMULATED campaigns, with the numbers in a table instead of in a closure.
//
// The previous version kept campaigns in a Map and recomputed the results on
// every read. It demoed, but it could not do the one thing the agent needs:
// look at yesterday. A decision like "pause Reels" is only defensible against
// a trend, and a trend needs rows.
//
// So every ad × placement × day is a row in `insights`, written once. The
// agent reads them with SQL, the KPI table reads the same rows, and the two
// can no longer disagree — which they did, the moment the screen cached.
//
// Nothing here touches Meta. No request leaves the machine, no money moves.
// Every object carries `simulated: true`, every screen that shows one badges
// it, and the agent is instructed to say so out loud.
import { createHash } from 'node:crypto'
import { all, one, run, insert, now, J, unJ } from '../db.js'

/** Deterministic: the same campaign always tells the same story, so the demo
 *  is reproducible and the video can be re-shot without the numbers moving. */
const rnd = (...parts) =>
  createHash('sha256').update(parts.join('|')).digest().readUInt32BE(0) / 0xffffffff

// The economics are simple but not arbitrary. Reels reach far more people per
// dinar and convert far worse — which is the real trade-off an Algerian COD
// advertiser lives with, and the one the agent has to discover from the data
// rather than be told.
//
// `reachPerDzd` était dix fois trop bas : 0,42 personne touchée par dinar,
// c'est un CPM de 2 400 DA. Le vrai CPM algérien tourne entre 250 et 450 DA,
// soit 2 à 4 personnes par dinar. Une campagne à 2 000 DA/jour touchait donc
// 840 personnes au lieu de 5 000, et ne pouvait produire aucune commande.
export const PLACEMENTS = {
  facebook_feed:        { label: 'Facebook · fil',         reachPerDzd: 2.5, cvr: 1.00 },
  facebook_marketplace: { label: 'Facebook · Marketplace', reachPerDzd: 1.9, cvr: 1.18 },
  instagram_feed:       { label: 'Instagram · fil',        reachPerDzd: 3.1, cvr: 0.80 },
  instagram_reels:      { label: 'Instagram · Reels',      reachPerDzd: 4.2, cvr: 0.45 },
  instagram_stories:    { label: 'Instagram · stories',    reachPerDzd: 3.6, cvr: 0.58 },
  messenger_inbox:      { label: 'Messenger',              reachPerDzd: 2.3, cvr: 0.92 },
}

/* Arrondi stochastique, mais déterministe.
 *
 * C'est l'autre moitié du bug. Une cellule (une créative × un placement × un
 * jour) produit une fraction de commande — 0,43 par exemple. `Math.round`
 * la ramenait à zéro, dans TOUTES les cellules, tous les jours : six jours,
 * 11 967 DA dépensés, zéro commande. Le total était faux de 100 %.
 *
 * Ici 0,43 vaut 1 dans 43 % des cellules et 0 dans les autres, tiré sur la
 * même empreinte sha256 que le reste — donc la somme est juste, et la vidéo
 * peut être retournée sans que les chiffres bougent. */
const arrondiFractionnaire = (x, ...graine) => Math.floor(x + rnd(...graine, 'frac'))

const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10)

export function configure(sessionId, spec) {
  const conn = one('SELECT id FROM meta_connections WHERE session=? AND status=? ORDER BY id DESC LIMIT 1',
    sessionId, 'connected')

  const placements = spec.placements?.length ? spec.placements : ['facebook_feed', 'instagram_reels']
  const id = insert(
    `INSERT INTO campaigns(session,connection,ext_id,name,objective,status,daily_budget_dzd,
                           geo,age_min,age_max,genders,placements,landing_url,payload,at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    sessionId, conn?.id ?? null, null, spec.name,
    spec.objective ?? 'OUTCOME_SALES', 'PAUSED', Math.round(spec.daily_budget_dzd ?? 0),
    J(spec.geo ?? []), spec.age_min ?? 18, spec.age_max ?? 55, spec.genders ?? 'all',
    J(placements), spec.landing_url ?? null, J(spec.payload ?? null), now()
  )
  run('UPDATE campaigns SET ext_id=? WHERE id=?', `SIM-CAMP-${100000 + id}`, id)

  const creatives = spec.creatives?.length ? spec.creatives : [{ angle: 'par défaut', url: null }]
  for (const c of creatives) {
    const adId = insert(
      'INSERT INTO ads(campaign,ext_id,angle,creative,headline,status,at) VALUES(?,?,?,?,?,?,?)',
      id, null, c.angle ?? null, c.url ?? null, c.headline ?? spec.headline_ar ?? null, 'ACTIVE', now()
    )
    run('UPDATE ads SET ext_id=? WHERE id=?', `SIM-AD-${900000 + adId}`, adId)
  }

  return get(id)
}

export function get(id) {
  const c = one('SELECT * FROM campaigns WHERE id=?', id)
  if (!c) return null
  return {
    ...c,
    simulated: true,
    geo: unJ(c.geo, []),
    placements: unJ(c.placements, []),
    payload: unJ(c.payload),
    ads: all('SELECT * FROM ads WHERE campaign=? ORDER BY id', id),
    decisions: all('SELECT * FROM decisions WHERE campaign=? ORDER BY id DESC', id),
    api_payload: apiPayload(c),
  }
}

export const list = (sessionId) =>
  all(`SELECT c.*,
              (SELECT COALESCE(SUM(spend_dzd),0) FROM insights WHERE campaign=c.id) spend,
              (SELECT COALESCE(SUM(orders),0)    FROM insights WHERE campaign=c.id) orders,
              (SELECT COALESCE(SUM(clicks),0)    FROM insights WHERE campaign=c.id) clicks,
              (SELECT COALESCE(SUM(reach),0)     FROM insights WHERE campaign=c.id) reach,
              (SELECT COUNT(*) FROM ads WHERE campaign=c.id AND status='ACTIVE') ads
       FROM campaigns c WHERE c.session=? ORDER BY c.id DESC`, sessionId)
    .map((c) => ({
      ...c, simulated: true, geo: unJ(c.geo, []), placements: unJ(c.placements, []),
      cost_per_order_dzd: c.orders ? Math.round(c.spend / c.orders) : null,
    }))

/** The request the real Marketing API would receive. Shown in the UI so a
 *  judge can check we build a valid call, not a vague intention. */
function apiPayload(c) {
  const geo = unJ(c.geo, [])
  return {
    campaign: {
      endpoint: 'POST /v21.0/act_<AD_ACCOUNT_ID>/campaigns',
      body: {
        name: c.name, objective: c.objective, status: 'PAUSED',
        special_ad_categories: [],
        daily_budget: Math.round((c.daily_budget_dzd ?? 0) * 100),
      },
    },
    adset: {
      endpoint: 'POST /v21.0/act_<AD_ACCOUNT_ID>/adsets',
      body: {
        name: `${c.name} — ciblage`,
        campaign_id: c.ext_id,
        billing_event: 'IMPRESSIONS',
        optimization_goal: c.objective === 'OUTCOME_LEADS' ? 'LEAD_GENERATION' : 'OFFSITE_CONVERSIONS',
        targeting: {
          geo_locations: { countries: ['DZ'], regions: geo.map((name) => ({ name })) },
          age_min: c.age_min, age_max: c.age_max,
          genders: c.genders === 'men' ? [1] : c.genders === 'women' ? [2] : [1, 2],
          publisher_platforms: [...new Set(unJ(c.placements, []).map((p) => p.split('_')[0]))],
        },
        status: 'PAUSED',
      },
    },
  }
}

export function launch(id, { confirmed_by_merchant } = {}) {
  const c = get(id)
  if (!c) throw new Error(`Campagne ${id} introuvable.`)
  if (!confirmed_by_merchant) {
    return { ...c, refused: true, reason: "Le marchand n'a pas demandé la mise en ligne dans ce tour." }
  }
  if (c.status === 'ACTIVE') return c
  run('UPDATE campaigns SET status=?, launched=? WHERE id=?', 'ACTIVE', now(), id)
  generate(id, 1)
  return get(id)
}

/**
 * Write the rows for `days` days of running.
 *
 * Fatigue is in here on purpose: each extra day the same audience sees the
 * same creative, reach per dinar falls and cost per order climbs. Without it
 * the agent never has a reason to change anything, and a demo of an agent that
 * never decides is a demo of a dashboard.
 */
export function generate(id, days = 1) {
  const c = get(id)
  if (!c) throw new Error(`Campagne ${id} introuvable.`)
  const start = c.launched ?? now()
  const ads = c.ads.filter((a) => a.status === 'ACTIVE')
  const placements = c.placements
  if (!ads.length || !placements.length) return 0

  const already = new Set(all('SELECT DISTINCT day FROM insights WHERE campaign=?', id).map((r) => r.day))
  let written = 0

  for (let d = 0; d < days; d++) {
    const day = dayKey(start + d * 86400_000)
    if (already.has(day)) continue
    const perCell = (c.daily_budget_dzd ?? 0) / (ads.length * placements.length)
    const fatigue = 1 / (1 + 0.22 * d)          // reach per dinar decays
    const costDrift = 1 + 0.17 * d              // and the price of a result rises

    for (const ad of ads) {
      // Creative quality is fixed by its id: the weak creative stays weak
      // across days, so the agent's decision is a judgement, not noise.
      const quality = 0.55 + 0.9 * rnd(c.ext_id, 'q', String(ad.id))
      for (const pl of placements) {
        const p = PLACEMENTS[pl] ?? PLACEMENTS.facebook_feed
        const jitter = 0.85 + 0.3 * rnd(c.ext_id, 'j', String(ad.id), pl, day)
        const spend = Math.round(perCell * (0.92 + 0.16 * rnd(c.ext_id, 's', pl, day)))
        const reach = Math.round(spend * p.reachPerDzd * fatigue * jitter)
        const impressions = Math.round(reach * (1.25 + 0.5 * d * 0.1))
        const clicks = Math.round(reach * 0.019 * quality * jitter)
        const messages = arrondiFractionnaire(clicks * 0.22 * (pl === 'messenger_inbox' ? 2.4 : 1),
          c.ext_id, 'm', String(ad.id), pl, day)
        // 6 % des clics finissent en commande COD — après la correction de la
        // portée, l'ancien 14,5 % donnait dix fois trop de commandes.
        const orders = Math.max(0, arrondiFractionnaire((clicks * 0.06 * p.cvr * quality) / costDrift,
          c.ext_id, 'o', String(ad.id), pl, day))
        insert(
          `INSERT INTO insights(campaign,ad,placement,day,impressions,reach,clicks,messages,orders,spend_dzd)
           VALUES(?,?,?,?,?,?,?,?,?,?)`,
          id, ad.id, pl, day, impressions, reach, clicks, messages, orders, spend
        )
        written++
      }
    }
  }
  return written
}

/** One more day of data, so a 3-day trend does not take 3 days to demo. */
export function advance(id, days = 1) {
  const have = one('SELECT COUNT(DISTINCT day) n FROM insights WHERE campaign=?', id)?.n ?? 0
  generate(id, have + days)
  return results(id)
}

export function results(id, { group = 'ad_placement' } = {}) {
  const c = get(id)
  if (!c) throw new Error(`Campagne ${id} introuvable.`)

  // Ce qui décide, c'est s'il Y A des données — pas si la campagne tourne
  // encore. Avant, mettre en pause renvoyait « à l'arrêt, rien à lire » et
  // l'écran annonçait qu'il n'y avait rien, alors que sept jours et
  // quatorze mille dinars étaient en base. C'est exactement au moment où on
  // coupe une campagne qu'on veut savoir ce qu'elle a coûté.
  const jours = one('SELECT COUNT(DISTINCT day) n FROM insights WHERE campaign=?', id)?.n ?? 0
  if (!jours) {
    return {
      simulated: true, campaign_id: id, status: c.status, days: 0,
      note: c.status === 'ACTIVE'
        ? 'Elle vient de partir — aucune journée de données pour l\'instant.'
        : 'Jamais lancée, donc rien à lire.',
    }
  }

  const totals = one(
    `SELECT COALESCE(SUM(spend_dzd),0) spend, COALESCE(SUM(reach),0) reach,
            COALESCE(SUM(impressions),0) impressions, COALESCE(SUM(clicks),0) clicks,
            COALESCE(SUM(messages),0) messages, COALESCE(SUM(orders),0) orders,
            COUNT(DISTINCT day) days
     FROM insights WHERE campaign=?`, id) ?? {}

  const rows = all(
    `SELECT i.placement, a.angle, a.ext_id ad_ext, a.id ad, a.status,
            SUM(i.spend_dzd) spend_dzd, SUM(i.reach) reach, SUM(i.clicks) clicks,
            SUM(i.messages) messages, SUM(i.orders) orders
     FROM insights i JOIN ads a ON a.id = i.ad
     WHERE i.campaign=? GROUP BY i.placement, a.id`, id)
    .map((r) => ({
      ...r,
      placement_label: PLACEMENTS[r.placement]?.label ?? r.placement,
      ctr: r.reach ? +(100 * r.clicks / r.reach).toFixed(2) : 0,
      cost_per_order_dzd: r.orders ? Math.round(r.spend_dzd / r.orders) : null,
    }))
    .sort((a, b) => (a.cost_per_order_dzd ?? 9e9) - (b.cost_per_order_dzd ?? 9e9))

  const byDay = all(
    `SELECT day, SUM(spend_dzd) spend_dzd, SUM(orders) orders, SUM(clicks) clicks, SUM(reach) reach
     FROM insights WHERE campaign=? GROUP BY day ORDER BY day`, id)
    .map((d) => ({ ...d, cost_per_order_dzd: d.orders ? Math.round(d.spend_dzd / d.orders) : null }))

  const byPlacement = all(
    `SELECT placement, SUM(spend_dzd) spend_dzd, SUM(orders) orders, SUM(clicks) clicks, SUM(reach) reach
     FROM insights WHERE campaign=? GROUP BY placement`, id)
    .map((p) => ({
      ...p, label: PLACEMENTS[p.placement]?.label ?? p.placement,
      cost_per_order_dzd: p.orders ? Math.round(p.spend_dzd / p.orders) : null,
    }))
    .sort((a, b) => (a.cost_per_order_dzd ?? 9e9) - (b.cost_per_order_dzd ?? 9e9))

  return {
    simulated: true, campaign_id: id, name: c.name, status: c.status,
    days: totals.days ?? 0,
    totals: {
      ...totals,
      spend_dzd: totals.spend ?? 0,
      cost_per_order_dzd: totals.orders ? Math.round(totals.spend / totals.orders) : null,
      cost_per_click_dzd: totals.clicks ? Math.round(totals.spend / totals.clicks) : null,
    },
    rows, by_day: byDay, by_placement: byPlacement,
    note: 'SIMULÉ. Aucune publicité n\'a tourné, aucun dinar n\'a été dépensé, rien n\'est parti chez Meta.',
  }
}

export function decide(id, { action, target, because }) {
  const c = get(id)
  if (!c) throw new Error(`Campagne ${id} introuvable.`)

  if (action === 'pause_creative') {
    const ad = c.ads.find((a) => a.angle === target || a.ext_id === target || String(a.id) === String(target))
    if (ad) run('UPDATE ads SET status=? WHERE id=?', 'PAUSED', ad.id)
  } else if (action === 'change_placement') {
    run('UPDATE campaigns SET placements=? WHERE id=?', J(c.placements.filter((p) => p !== target)), id)
  } else if (action === 'narrow_geo') {
    run('UPDATE campaigns SET geo=? WHERE id=?', J(c.geo.filter((g) => g !== target)), id)
  } else if (action === 'shift_budget') {
    run('UPDATE campaigns SET daily_budget_dzd=? WHERE id=?', Math.round(c.daily_budget_dzd * 1.2), id)
  } else if (action === 'pause_campaign') {
    run('UPDATE campaigns SET status=? WHERE id=?', 'PAUSED', id)
  }

  insert('INSERT INTO decisions(campaign,action,target,because,at) VALUES(?,?,?,?,?)',
    id, action, target ?? null, because, now())

  return { simulated: true, campaign: get(id), applied: { action, target: target ?? null, because } }
}

/* ── ce qu'un compte publicitaire a DÉJÀ quand on s'y connecte ────────────
   Un marchand qui branche son Business Manager ne part pas de zéro : il a
   déjà fait tourner des choses, bien ou mal, et c'est précisément ce passé
   qui rend l'agent utile — il peut comparer, dire ce qui a marché, et
   expliquer pourquoi la prochaine devrait être différente. L'écran « aucune
   campagne » après une connexion réussie était le contraire d'une reprise
   de compte : il donnait l'impression que le branchement n'avait rien
   rapporté.

   Deux campagnes, et elles racontent deux choses opposées :
     · une qui a bien tourné puis s'est arrêtée — la référence ;
     · une en cours qui dérive — le travail du jour.
   Une seule campagne « moyenne » n'apprendrait rien à personne.

   Idempotent, comme tous les semis : se reconnecter ne double pas l'historique. */
const PASSE = [
  { name: 'Sandales été — Alger & Blida', product: 'Sandales', budget: 1500, days: 9,
    status: 'PAUSED', ago: 26, placements: ['facebook_feed', 'instagram_stories'] },
  { name: 'Basket homme — national', product: "Men's running shoes", budget: 2500, days: 5,
    status: 'ACTIVE', ago: 5, placements: ['facebook_feed', 'instagram_reels', 'instagram_stories'] },
]

export function seedCampaigns(sessionId) {
  const deja = one('SELECT COUNT(*) n FROM campaigns WHERE session=?', sessionId)
  if (deja?.n) return deja.n

  for (const p of PASSE) {
    const c = configure(sessionId, {
      name: p.name, product: p.product, daily_budget_dzd: p.budget,
      objective: 'OUTCOME_SALES', placements: p.placements,
    })
    // On antidate le lancement pour que l'historique tombe dans le passé :
    // generate() part de `launched`, donc sans ça les neuf jours d'une
    // campagne « d'il y a un mois » seraient datés d'aujourd'hui.
    const debut = now() - p.ago * 86400_000
    run('UPDATE campaigns SET status=?, launched=? WHERE id=?', 'ACTIVE', debut, c.id)
    generate(c.id, p.days)
    if (p.status !== 'ACTIVE') run('UPDATE campaigns SET status=? WHERE id=?', p.status, c.id)
  }
  return PASSE.length
}

/* Le portefeuille du compte publicitaire.
   Le solde et le plafond vivent déjà dans l'actif `adaccount` — on ne les
   réinvente pas ici, on les lit, et on y ajoute ce qui a VRAIMENT été
   dépensé d'après les insights. Un portefeuille dont le « dépensé » serait
   un nombre choisi au hasard contredirait le tableau juste en dessous. */
export function wallet(sessionId, adAccount) {
  const spent = one(
    'SELECT COALESCE(SUM(spend_dzd),0) s FROM insights WHERE campaign IN (SELECT id FROM campaigns WHERE session=?)',
    sessionId)?.s ?? 0
  const cap = adAccount?.meta?.spend_cap_dzd ?? 0
  return {
    currency: adAccount?.currency ?? 'DZD',
    funding: adAccount?.meta?.funding ?? null,
    status: adAccount?.meta?.status ?? null,
    timezone: adAccount?.meta?.timezone ?? null,
    cap, spent, left: Math.max(0, cap - spent),
    simulated: true,
  }
}
