// Ce que ça coûte, au moment où ça coûte.
//
// Un marchand algérien qui démarre compte ses dinars. Une app qui appelle un
// modèle d'image quatre fois sans rien dire, puis présente l'addition à la
// fin du mois, est une app qu'on désinstalle. Donc : le prix est écrit AVANT
// le bouton, et le débit est écrit juste après, à côté de ce qu'on a reçu.
//
// ⚠️ CE QUI EST VRAI ET CE QUI NE L'EST PAS — la distinction compte, c'est la
// règle n° 2 du projet.
//
//   · Le NOMBRE D'APPELS est réel. Il est compté ici au moment où le modèle
//     répond, pas estimé à l'avance : une scène reprise du cache ne coûte
//     rien et n'apparaît pas, un appel qui échoue n'est pas facturé.
//   · Le PORTEFEUILLE est une mise en scène. L'API de Meta n'expose aucun
//     solde, et ce hackathon ne facture rien. Le pack « 2 000 crédits pour
//     20 $ » est le modèle économique qu'on propose, pas une somme que
//     quelqu'un a payée. L'écran doit le dire, et il le dit.
//
// Le tarif vient du coût réel des modèles, arrondi à l'entier : une image
// coûte à peu près le double d'un appel de texte, et le détourage à peu près
// autant qu'un texte. Un crédit vaut un centime de dollar.
import { all, one, run, insert, now } from './db.js'

/* Un crédit = 0,01 $. Le pack d'entrée fait 2 000 crédits pour 20 $, ce qui
   représente environ 200 pages de vente complètes — de quoi tenir une saison
   pour une boutique qui sort deux ou trois produits par semaine. */
export const PACK = { credits: 2000, usd: 20 }

export const TARIF = {
  text: { credits: 1, model: 'muse-spark-1.3' },      // une réponse, une page de copie
  image: { credits: 2, model: 'muse-image-1.0' },     // une scène, une créative
  segment: { credits: 1, model: 'sam-3.1' },          // un détourage
  voice: { credits: 1, model: 'muse-voice-transcribe-1.0' }, // un vocal transcrit
}

run(`CREATE TABLE IF NOT EXISTS credit_ledger (
  id INTEGER PRIMARY KEY,
  session TEXT NOT NULL,
  kind TEXT NOT NULL,        -- text | image | segment | voice
  n INTEGER NOT NULL,        -- combien d'appels, réellement effectués
  credits INTEGER NOT NULL,  -- n x tarif
  label TEXT,                -- ce que le marchand a demandé, en clair
  at INTEGER NOT NULL
)`)

/**
 * Débite ce qui vient d'être consommé.
 *
 * `items` est une liste de { kind, n }. Les entrées à zéro sont ignorées :
 * une page dont les quatre scènes sortent du cache ne doit pas apparaître
 * comme une ligne à zéro crédit, elle ne doit pas apparaître du tout.
 *
 * Renvoie ce que l'écran a besoin de montrer, pas plus.
 */
export function charge(sessionId, items = [], label = null) {
  if (!sessionId) return { credits: 0, lines: [] }
  const lines = []
  let total = 0
  for (const { kind, n } of items) {
    const t = TARIF[kind]
    const k = Math.round(Number(n) || 0)
    if (!t || k <= 0) continue
    const c = k * t.credits
    total += c
    lines.push({ kind, n: k, credits: c, model: t.model })
    insert('INSERT INTO credit_ledger(session,kind,n,credits,label,at) VALUES(?,?,?,?,?,?)',
      sessionId, kind, k, c, label, now())
  }
  return { credits: total, lines, label }
}

/** Dépensé, restant, et de quoi l'écrire honnêtement. */
export function balance(sessionId) {
  const spent = one('SELECT COALESCE(SUM(credits),0) c FROM credit_ledger WHERE session=?', sessionId)?.c ?? 0
  return {
    pack: PACK.credits,
    usd: PACK.usd,
    spent,
    left: Math.max(0, PACK.credits - spent),
    // Dit à l'écran ce qu'il doit afficher à côté du solde. Sans ça, un juré
    // lit « 1 970 crédits » et croit qu'un compte a été débité.
    simulated: true,
  }
}

/** Le détail récent, pour qui veut savoir où est passé l'argent. */
export const recent = (sessionId, limit = 12) =>
  all('SELECT kind,n,credits,label,at FROM credit_ledger WHERE session=? ORDER BY id DESC LIMIT ?', sessionId, limit)

/** Ce qu'une action VA coûter, avant de la lancer. Même tarif, même calcul. */
export const devis = (items = []) =>
  items.reduce((s, { kind, n }) => s + (TARIF[kind]?.credits ?? 0) * (Number(n) || 0), 0)
