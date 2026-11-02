// Ce que le marchand doit voir AVANT de parler.
//
// POURQUOI. L'app s'ouvrait sur une zone de saisie. Toutes les réponses
// étaient dans l'app — l'argent dans le Studio, les campagnes dans Ads, les
// clients dans Messages — mais il fallait savoir où cliquer pour les
// trouver. Un marchand qui ouvre son commerce le matin ne veut pas
// naviguer : il veut savoir combien il a dépensé hier, ce qui tourne, ce
// que ça lui rapporte, et qui attend.
//
// Ce fichier n'invente aucun chiffre. Il agrège ce qui existe déjà :
//   · le registre des crédits    (réel : compté à l'appel de modèle)
//   · les insights des campagnes (simulés, et marqués comme tels)
//   · le portefeuille publicitaire
//   · les pages et sites construits
//   · la boîte de réception et les commentaires
//
// ⚠️ La règle de séparation est respectée à la ligne près : `real` dit ce
// qui est compté pour de vrai, `simulated` ce qui est mis en scène. Les
// mélanger dans un même « total dépensé » serait exactement le chiffre
// simulé qui ressemble à une mesure.
import { all, one } from './db.js'
import { balance, PACK } from './credits.js'
import { PLACEMENTS } from './meta-sim/campaigns.js'

const J = 86_400_000
const jour = (ms) => new Date(ms).toISOString().slice(0, 10)

/** Un taux unique, écrit une fois : 1 crédit = 1 cent. */
const enDollars = (credits) => Math.round((credits * PACK.usd * 100) / PACK.credits) / 100

/**
 * L'analyse d'une campagne, en une phrase et deux nombres.
 *
 * Ce qui compte en paiement à la livraison, ce n'est pas le coût du clic,
 * c'est le COÛT PAR COMMANDE et surtout sa DÉRIVE. Une campagne à 400 DA
 * la commande qui monte de 15 % par jour est une campagne qui sera à 800
 * dans cinq jours. Le chiffre du jour ne le dit pas ; la pente, si.
 */
function analyse(campaignId) {
  const jours = all(
    `SELECT day, SUM(spend_dzd) s, SUM(orders) o FROM insights
     WHERE campaign=? GROUP BY day ORDER BY day`, campaignId)
  if (!jours.length) return null

  const cpo = (r) => (r.o > 0 ? r.s / r.o : null)
  const chiffres = jours.map(cpo).filter((x) => x != null)
  if (chiffres.length < 2) {
    return { days: jours.length, cost_per_order: chiffres[0] ? Math.round(chiffres[0]) : null, trend: null }
  }

  // Les deux premiers jours contre les deux derniers : un seul jour se
  // laisse emporter par un hasard, deux lissent sans masquer la pente.
  const tete = chiffres.slice(0, 2)
  const queue = chiffres.slice(-2)
  const moy = (a) => a.reduce((x, y) => x + y, 0) / a.length
  const debut = moy(tete), fin = moy(queue)
  const derive = debut > 0 ? Math.round(((fin - debut) / debut) * 100) : null

  const pire = one(
    `SELECT placement, SUM(spend_dzd) s, SUM(orders) o FROM insights WHERE campaign=?
     GROUP BY placement ORDER BY (CASE WHEN o=0 THEN 9e9 ELSE CAST(s AS REAL)/o END) DESC LIMIT 1`, campaignId)
  const mieux = one(
    `SELECT placement, SUM(spend_dzd) s, SUM(orders) o FROM insights WHERE campaign=?
     GROUP BY placement HAVING o > 0 ORDER BY CAST(s AS REAL)/o ASC LIMIT 1`, campaignId)

  return {
    days: jours.length,
    cost_per_order: Math.round(fin),
    first_days: Math.round(debut),
    trend: derive,
    // `verdict` n'est PAS une phrase toute faite : c'est une étiquette que
    // l'écran traduit. Une phrase figée ici sortirait en français dans une
    // interface en darija.
    verdict: derive == null ? null : derive > 25 ? 'wearing' : derive < -10 ? 'improving' : 'steady',
    worst: pire?.placement ? { placement: PLACEMENTS[pire.placement]?.label ?? pire.placement,
      per_order: pire.o ? Math.round(pire.s / pire.o) : null } : null,
    best: mieux?.placement ? { placement: PLACEMENTS[mieux.placement]?.label ?? mieux.placement,
      per_order: Math.round(mieux.s / mieux.o) } : null,
  }
}

/**
 * Hier, en quelques faits.
 *
 * Pas « 3 événements » — ce qui s'est passé. Un compteur ne se retient pas ;
 * « tu as dépensé 2 100 DA et reçu 6 commandes » se retient.
 */
function hier(sessionId) {
  const d = jour(Date.now() - J)
  const pub = one(
    `SELECT COALESCE(SUM(spend_dzd),0) s, COALESCE(SUM(orders),0) o, COALESCE(SUM(clicks),0) c
     FROM insights WHERE day=? AND campaign IN (SELECT id FROM campaigns WHERE session=?)`, d, sessionId)
  const debut = Date.now() - J, fin = Date.now()
  const pages = one('SELECT COUNT(*) n FROM pages WHERE session=? AND at BETWEEN ? AND ?', sessionId, debut, fin)?.n ?? 0
  const credits = one(
    'SELECT COALESCE(SUM(credits),0) c FROM credit_ledger WHERE session=? AND at BETWEEN ? AND ?',
    sessionId, debut, fin)?.c ?? 0
  const repondus = one(
    `SELECT COUNT(*) n FROM thread_messages m JOIN threads t ON t.id=m.thread
     WHERE m.by_ai=1 AND m.at BETWEEN ? AND ?
       AND t.asset IN (SELECT id FROM meta_assets WHERE connection IN
         (SELECT id FROM meta_connections WHERE session=?))`, debut, fin, sessionId)?.n ?? 0

  const quelquechose = pub?.s || pub?.o || pages || credits || repondus
  return quelquechose
    ? { date: d, spend_dzd: pub?.s ?? 0, orders: pub?.o ?? 0, clicks: pub?.c ?? 0,
        pages, credits, replies: repondus }
    : null
}

/**
 * Le tableau du matin, en un seul appel.
 *
 * Un appel et pas cinq : l'écran d'accueil ne doit pas attendre cinq
 * allers-retours avant d'afficher un chiffre, surtout sur une 4G d'Oran.
 */
export function board(sessionId, { wallet = null } = {}) {
  const camps = all(
    `SELECT c.id, c.name, c.status, c.daily_budget_dzd,
            (SELECT COALESCE(SUM(spend_dzd),0) FROM insights WHERE campaign=c.id) spend,
            (SELECT COALESCE(SUM(orders),0)    FROM insights WHERE campaign=c.id) orders
     FROM campaigns c WHERE c.session=? ORDER BY
       CASE c.status WHEN 'ACTIVE' THEN 0 WHEN 'PAUSED' THEN 1 ELSE 2 END, c.id DESC`, sessionId)

  const live = camps.filter((c) => c.status === 'ACTIVE')
  const spend = camps.reduce((n, c) => n + c.spend, 0)
  const orders = camps.reduce((n, c) => n + c.orders, 0)
  const cr = balance(sessionId)

  return {
    // ── ce qui est COMPTÉ pour de vrai ──────────────────────────────────
    real: {
      credits_left: cr.left,
      credits_spent: cr.spent,
      credits_pack: cr.pack,
      usd_spent: enDollars(cr.spent),
      usd_pack: cr.usd,
    },
    // ── ce qui est MIS EN SCÈNE, et le dit ──────────────────────────────
    simulated: {
      campaigns: camps.length,
      live: live.length,
      daily_budget_dzd: live.reduce((n, c) => n + (c.daily_budget_dzd ?? 0), 0),
      spend_dzd: spend,
      orders,
      cost_per_order: orders ? Math.round(spend / orders) : null,
      wallet,
      top: camps.slice(0, 3).map((c) => ({
        id: c.id, name: c.name, status: c.status,
        daily_budget_dzd: c.daily_budget_dzd, spend_dzd: c.spend, orders: c.orders,
        analysis: analyse(c.id),
      })),
    },
    yesterday: hier(sessionId),
  }
}
