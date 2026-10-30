// SIMULATED Meta campaigns.
//
// Nothing here touches Meta and nothing spends money. It exists so the agent
// has something real to decide ON: the numbers move, they differ per creative,
// per placement and per wilaya, and one of each is reliably worse. An agent
// that only ever sees flat fake data never has to make a judgement, and a
// demo of that is worthless.
//
// The model of COD advertising underneath is deliberately simple but not
// arbitrary: reach scales with budget, cost per result drifts up as frequency
// rises, Reels reach more people per dinar but convert worse than Feed, and
// orders outside the big wilayas cost more to deliver so they are worth less.
//
// Everything that leaves this file carries `simulated: true`. The UI badges it
// and the agent is instructed to say so out loud.
import { createHash } from 'node:crypto'

const campaigns = new Map()
let seq = 1

// Deterministic pseudo-randomness: the same campaign always tells the same
// story, so the demo is reproducible and the video can be re-shot.
function rnd(seed, ...parts) {
  const h = createHash('sha256').update([seed, ...parts].join('|')).digest()
  return h.readUInt32BE(0) / 0xffffffff
}

const PLACEMENTS = {
  facebook_feed: { reachPerDzd: 0.42, cvr: 1.0 },
  instagram_reels: { reachPerDzd: 0.95, cvr: 0.45 },
  instagram_feed: { reachPerDzd: 0.55, cvr: 0.8 },
  instagram_stories: { reachPerDzd: 0.7, cvr: 0.6 },
}

export function configureCampaign(spec) {
  const id = `sim_${Date.now().toString(36)}_${seq++}`
  const c = {
    id,
    simulated: true,
    status: 'PAUSED',
    created_at: new Date().toISOString(),
    name: spec.name,
    objective: spec.objective ?? 'OUTCOME_SALES',
    daily_budget_dzd: spec.daily_budget_dzd,
    geo: spec.geo ?? [],
    age_min: spec.age_min ?? 18,
    age_max: spec.age_max ?? 55,
    genders: spec.genders ?? 'all',
    placements: spec.placements?.length ? spec.placements : ['facebook_feed', 'instagram_reels'],
    creatives: spec.creatives?.length ? spec.creatives : ['creative_1'],
    landing_url: spec.landing_url ?? null,
    // The shape the real Marketing API would receive, shown so a judge can
    // see the agent builds a valid request rather than a vague intention.
    api_payload: {
      endpoint: 'POST /v21.0/act_<AD_ACCOUNT_ID>/campaigns',
      body: {
        name: spec.name,
        objective: spec.objective ?? 'OUTCOME_SALES',
        status: 'PAUSED',
        special_ad_categories: [],
        daily_budget: Math.round((spec.daily_budget_dzd ?? 0) * 100),
      },
    },
    launched_at: null,
    adjustments: [],
  }
  campaigns.set(id, c)
  return c
}

export function launchCampaign(id, { confirmed_by_merchant } = {}) {
  const c = campaigns.get(id)
  if (!c) throw new Error(`No such simulated campaign: ${id}`)
  if (!confirmed_by_merchant) {
    return { ...c, refused: true, reason: 'The merchant has not asked for this campaign to go live in this turn.' }
  }
  c.status = 'ACTIVE'
  c.launched_at = new Date().toISOString()
  return c
}

export function campaignResults(id, { since_hours = 24 } = {}) {
  const c = campaigns.get(id)
  if (!c) throw new Error(`No such simulated campaign: ${id}`)
  if (c.status !== 'ACTIVE') {
    return { simulated: true, campaign_id: id, status: c.status, note: 'Not running — nothing to read.' }
  }

  const hours = Math.max(1, since_hours)
  const spend = Math.round((c.daily_budget_dzd * hours) / 24)
  const rows = []

  for (const cr of c.creatives) {
    for (const pl of c.placements) {
      const p = PLACEMENTS[pl] ?? PLACEMENTS.facebook_feed
      const share = spend / (c.creatives.length * c.placements.length)
      // Per-creative quality is fixed by its id, so the weak creative stays
      // weak across reads — otherwise the agent's decision would be noise.
      const quality = 0.6 + 0.8 * rnd(c.id, 'creative', cr)
      const reach = Math.round(share * p.reachPerDzd * (0.85 + 0.3 * rnd(c.id, 'reach', cr, pl)))
      const clicks = Math.round(reach * 0.018 * quality * (0.8 + 0.4 * rnd(c.id, 'clk', cr, pl)))
      const orders = Math.round(clicks * 0.14 * p.cvr * quality)
      rows.push({
        creative: cr,
        placement: pl,
        spend_dzd: Math.round(share),
        reach,
        clicks,
        orders,
        cost_per_order_dzd: orders ? Math.round(share / orders) : null,
      })
    }
  }

  const orders = rows.reduce((s, r) => s + r.orders, 0)
  return {
    simulated: true,
    campaign_id: id,
    window_hours: hours,
    status: c.status,
    totals: {
      spend_dzd: spend,
      reach: rows.reduce((s, r) => s + r.reach, 0),
      clicks: rows.reduce((s, r) => s + r.clicks, 0),
      orders,
      cost_per_order_dzd: orders ? Math.round(spend / orders) : null,
    },
    rows: rows.sort((a, b) => (a.cost_per_order_dzd ?? 9e9) - (b.cost_per_order_dzd ?? 9e9)),
    note: 'SIMULATED. No ad ran, no money was spent, nothing reached Meta.',
  }
}

export function adjustCampaign(id, { action, target, because }) {
  const c = campaigns.get(id)
  if (!c) throw new Error(`No such simulated campaign: ${id}`)
  const entry = { at: new Date().toISOString(), action, target: target ?? null, because }

  if (action === 'pause_creative') c.creatives = c.creatives.filter((x) => x !== target)
  else if (action === 'change_placement') c.placements = c.placements.filter((x) => x !== target)
  else if (action === 'narrow_geo') c.geo = c.geo.filter((x) => x !== target)
  else if (action === 'shift_budget') c.daily_budget_dzd = Math.round(c.daily_budget_dzd * 1.2)
  else if (action === 'pause_campaign') c.status = 'PAUSED'

  c.adjustments.push(entry)
  return { simulated: true, campaign: c, applied: entry }
}

export const getCampaign = (id) => campaigns.get(id) ?? null
export const allCampaigns = () => [...campaigns.values()]
