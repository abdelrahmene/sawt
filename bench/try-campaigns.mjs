// Le marchand revient et demande où en sont ses campagnes.
//
//   node bench/try-campaigns.mjs
//
// Ce que ça vérifie, et qu'aucun autre banc ne couvre : l'agent sait-il
// REPRENDRE une boutique qui tourne déjà ? Tous les autres chemins partent
// d'une page blanche — un marchand qui n'a rien, qui importe, qui construit.
// Celui-là part de l'inverse : un compte connecté, une campagne en ligne
// depuis quatre jours, des clients qui attendent. Le seul outil de résultats
// prend un identifiant de campagne en paramètre, donc si l'agent ne sait pas
// lequel demander, il ne peut rien montrer. L'identifiant ne lui est jamais
// dit par le marchand : il doit le lire dans son briefing.
import * as camp from '../src/meta-sim/campaigns.js'
import { threads, surfacesOf } from '../src/meta-sim/inbox.js'
import { startLogin, reviewPermissions, grant, connection, REQUIRED_SCOPES } from '../src/meta-sim/connect.js'
import { session } from '../src/db.js'
import { runTurn } from '../src/agent/loop.js'

const SID = process.argv[2] || 'reprise'
session(SID)

// ── on monte une boutique qui tourne déjà ────────────────────────────────
// Le vrai parcours : on demande, on relit les permissions, on accorde.
startLogin(SID)
reviewPermissions(SID)
grant(SID, REQUIRED_SCOPES)
const c = camp.configure(SID, {
  name: 'Doudoune longue — Alger',
  product: 'Long hooded puffer coat',
  daily_budget_dzd: 2000,
  objective: 'OUTCOME_SALES',
  placements: ['facebook_feed', 'instagram_reels', 'instagram_stories'],
})
camp.launch(c.id, { confirmed_by_merchant: true })
camp.advance(c.id, 4)
// `threads()` prend un id d'ACTIF, pas de session : compter sur la session
// renvoyait zero et le banc affichait « 0 fil » devant une boite pleine.
const fils = surfacesOf(connection(SID)).flatMap((a) => threads(a.id))

console.log(`\n  session ${SID}`)
console.log(`  campagne #${c.id} en ligne depuis 4 jours · ${fils.length} fils dans la boîte\n`)

// ── et on lui parle en darija ────────────────────────────────────────────
const phrase = process.argv[3] || 'وريني الكومبانيات لي خدامين وشحال صرفت، و واش كاين في الميساجات'
console.log(`  « ${phrase} »\n`)

const outils = []
const out = await runTurn({
  input: phrase,
  ctx: { sessionId: SID, shop: 'Nour Store' },
  onEvent: (e) => {
    if (e.type === 'tool:start') outils.push(e.name)
    if (e.type === 'tool:end' && e.cost?.credits) outils[outils.length - 1] += ` (−${e.cost.credits})`
  },
})

console.log(`  outils appelés : ${outils.length ? outils.join(' → ') : 'AUCUN'}`)
console.log(`\n  ${(out.text ?? '').trim().slice(0, 700)}\n`)

// Ce qui compte n'est pas que l'agent réponde, c'est qu'il soit allé CHERCHER.
// Une belle phrase sur des chiffres qu'il n'a pas lus est le pire des cas :
// elle a l'air juste et elle est inventée.
const alle = outils.some((o) => o.startsWith('campaign_results'))
const lu = outils.some((o) => o.startsWith('read_inbox'))
console.log(`  résultats de campagne lus : ${alle ? 'oui' : 'NON — il a répondu sans aller voir'}`)
console.log(`  boîte de réception lue    : ${lu ? 'oui' : 'NON'}\n`)
