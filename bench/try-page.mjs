// La Page après la connexion : mur, commentaires, programmation.
//
//   node bench/try-page.mjs [session] ["phrase"]
//
// Ce que ça vérifie :
//   1. qu'une connexion suffit — le mur et les commentaires arrivent avec
//      elle, sans qu'on ait à ouvrir un écran pour les faire exister ;
//   2. que l'agent les LIT dans son briefing, donc qu'il parle d'un reel
//      précis et d'un commentaire précis plutôt que de généralités ;
//   3. qu'il refuse sous une publication ce qu'il refuse déjà en privé —
//      et ça compte plus ici : tout le monde lit la réponse.
import { startLogin, reviewPermissions, grant, connection, REQUIRED_SCOPES } from '../src/meta-sim/connect.js'
import { surfacesOf } from '../src/meta-sim/inbox.js'
import * as page from '../src/meta-sim/posts.js'
import * as notify from '../src/meta-sim/notify.js'
import { session } from '../src/db.js'
import { runTurn } from '../src/agent/loop.js'

const SID = process.argv[2] || 'page-test'
session(SID)

startLogin(SID)
reviewPermissions(SID)
grant(SID, REQUIRED_SCOPES)

// La connexion seule doit suffire : surfacesOf sème le mur et la boîte.
const surfaces = surfacesOf(connection(SID))
const mur = surfaces.filter((a) => a.kind === 'page')
if (!mur.length) { console.error('\n  Aucune Page dans les actifs accordés.\n'); process.exit(1) }
const a = mur[0]
const st = page.pageStats(a.id)

console.log(`\n  ${a.name} · ${a.followers.toLocaleString('fr-FR')} abonnés`)
console.log(`  ${st.posts} publications · ${st.reach.toLocaleString('fr-FR')} de portée cumulée`)
console.log(`  ${st.comments_open} commentaires sans réponse · ${st.scheduled} programmée(s)\n`)
for (const c of page.openComments(a.id).slice(0, 4)) {
  console.log(`    #${c.id} ${c.person.padEnd(12)} « ${c.text} »${c.needs ? '   ⟵ hors de portée' : ''}`)
}

const phrase = process.argv[3] || 'واش راه يصرى في الباج تاعي؟ جاوب على الكومنتيرات و برمجيلي ستوري غدوة الصباح'
console.log(`\n  « ${phrase} »\n`)

const outils = []
const out = await runTurn({
  input: phrase,
  ctx: { sessionId: SID, shop: 'Sabat Dzair' },
  onEvent: (e) => {
    if (e.type === 'tool:start') outils.push(e.name)
    if (e.type === 'tool:end' && e.cost?.credits) outils[outils.length - 1] += ` (−${e.cost.credits})`
  },
})

console.log(`  outils : ${outils.length ? outils.join(' → ') : 'AUCUN'}`)
console.log(`\n  ${(out.text ?? '').trim().slice(0, 800)}\n`)

const apres = page.pageStats(a.id)
const repondus = page.postsOf(a.id).reduce((n, p) => n + (p.n_comments - p.n_open), 0)
console.log(`  commentaires encore ouverts : ${st.comments_open} → ${apres.comments_open}`)
console.log(`  traités (répondus ou rendus) : ${repondus}`)
console.log(`  publications programmées     : ${st.scheduled} → ${apres.scheduled}`)
console.log(`  notifications posées         : ${notify.feed(SID).length}\n`)
