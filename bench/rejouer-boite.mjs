/**
 * Remet la boîte de réception à zéro pour une session, la ressème, répond à
 * tout, et vérifie que CHAQUE réponse est dans la langue du client.
 *
 * C'est le garde du bug qu'on vient de corriger : la consigne générale disait
 * « réponds dans la langue du client », et la branche du refus, trois
 * paragraphes plus bas, disait « en darija ». Les quatre seules réponses
 * arabes étaient les quatre renvois au marchand. Un test qui ne regarde que
 * les réponses publiées n'aurait rien vu.
 *
 *   node bench/rejouer-boite.mjs [sessionId]
 */
import { all, one, run } from '../src/db.js'
import { connection } from '../src/meta-sim/connect.js'
import { surfacesOf, threads, thread, langueDu } from '../src/meta-sim/inbox.js'
import { tick } from '../src/autoreply.js'

const sid = process.argv[2] ?? 'film'
const s = one('SELECT id, shop, language FROM sessions WHERE id=?', sid)
if (!s) { console.error(`Session « ${sid} » introuvable.`); process.exit(1) }
console.log(`session ${s.id} · boutique « ${s.shop} » · langue ${s.language}\n`)

const c = connection(sid)
if (c.status !== 'connected') { console.error('Meta n\'est pas connecté sur cette session.'); process.exit(1) }

// --- remise à zéro -----------------------------------------------------------
const assets = surfacesOf(c).map((a) => a.id)
for (const a of assets) {
  run('DELETE FROM thread_messages WHERE thread IN (SELECT id FROM threads WHERE asset=?)', a)
  run('DELETE FROM threads WHERE asset=?', a)
  run('DELETE FROM post_comments WHERE post IN (SELECT id FROM posts WHERE asset=?)', a)
  run('DELETE FROM posts WHERE asset=?', a)
}
console.log(`remis à zéro : ${assets.length} surfaces`)

// Le semis repasse par la même porte que l'application, pas par un raccourci.
const re = surfacesOf(connection(sid))
console.log(`resemé : ${re.map((a) => `${a.kind}#${a.id}`).join(' ')}`)

// --- on répond à tout --------------------------------------------------------
let tours = 0
for (;;) {
  const r = await tick(sid, { force: true, max: 3 })
  tours++
  if (!r.ran) { console.log(`arrêt : ${r.why}`); break }
  const n = (r.answered?.length ?? 0) + (r.handed_back?.length ?? 0)
  process.stdout.write(`  tour ${tours} : ${r.answered?.length ?? 0} répondus, ${r.handed_back?.length ?? 0} rendus\n`)
  if (!n) break
  if (tours > 12) { console.log('arrêt : 12 tours'); break }
}

// --- vérification ------------------------------------------------------------
console.log('\n--- chaque réponse, face à la langue du client ---')
let ko = 0, total = 0
for (const a of re) {
  for (const resume of threads(a.id)) {
    // `threads()` ne rend que des résumés — les messages sont dans `thread()`.
    const t = thread(resume.id)
    const client = [...(t.messages ?? [])].reverse().find((m) => m.author === 'customer')
    const agent = [...(t.messages ?? [])].reverse().find((m) => m.author === 'agent')
    if (!client || !agent) continue
    total++
    const attendu = langueDu(client.text).code
    const obtenu = langueDu(agent.text).code
    const rendu = t.status === 'needs_merchant'
    const ok = attendu === obtenu
    if (!ok) ko++
    console.log(
      `${ok ? '✓' : '✗'} ${String(t.person).padEnd(11)} ${attendu}→${obtenu} ${rendu ? '[rendu]' : '[répondu]'}`
    )
    if (!ok) {
      console.log(`    client : ${client.text}`)
      console.log(`    agent  : ${agent.text}`)
    }
  }
}

// Le renvoi au marchand est lu par le marchand, donc en anglais, toujours.
const raisons = all(
  `SELECT th.person, th.subject FROM threads th
   WHERE th.asset IN (${re.map(() => '?').join(',')}) AND th.status='needs_merchant' AND th.subject IS NOT NULL`,
  ...re.map((a) => a.id)
)
if (raisons.length) {
  console.log('\n--- les raisons rendues au marchand (toujours en anglais) ---')
  for (const r of raisons) {
    const l = langueDu(r.subject).code
    console.log(`${l === 'en' ? '✓' : '✗'} ${String(r.person).padEnd(11)} ${r.subject}`)
    if (l !== 'en') ko++
  }
}

console.log(`\n${ko === 0 ? `✓ ${total} réponses, toutes dans la langue du client` : `✗ ${ko} écart(s) sur ${total}`}`)
process.exit(ko === 0 ? 0 : 1)
