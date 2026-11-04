// L'état exact que la caméra doit trouver — rejouable à l'identique.
//
// POURQUOI CE FICHIER EXISTE. On ne filme jamais contre une base qui dérive.
// Une vidéo de trois minutes se tourne en dix prises, et si la prise 7 part
// d'un état différent de la prise 2 — un crédit de moins, un client de plus,
// une campagne qui a vieilli d'un jour — les plans ne raccordent pas et le
// montage se voit. Ce script remet la scène à zéro en quelques secondes,
// autant de fois qu'il faut.
//
// Il ne construit PAS la boutique : c'est le moment fort du film, et il se
// tourne en direct. Ce qu'il prépare, c'est tout ce qui doit déjà être là
// pour que ce moment ait un sens — le catalogue, le compte Meta branché avec
// son passé, les clients qui attendent, et un compteur de crédits entier.
//
//   node bench/demo-seed.mjs            # remet la session « film » à neuf
//   node bench/demo-seed.mjs --session X
import { all, one, run, session, setting } from '../src/db.js'
import * as catalog from '../src/catalog.js'
import { startLogin, reviewPermissions, grant, connection, SCOPES } from '../src/meta-sim/connect.js'
import { surfacesOf } from '../src/meta-sim/inbox.js'
import { balance } from '../src/credits.js'

const args = process.argv.slice(2)
const SID = args.includes('--session') ? args[args.indexOf('--session') + 1] : 'film'

/* La boutique du film : des vêtements, parce que c'est ce qui se vend le plus
   en ligne ici et ce qui photographie le mieux. Les prix sont au-dessus du
   plancher fournisseur — c'est le marchand qui les fixe, et un prix collé au
   minimum ne raconte aucune décision. */
const PANIER = [
  { id: 'manteau-laine', selling: 15900 },
  { id: 'trench-ceinture', selling: 12500 },
  { id: 'pull-maille', selling: 5400 },
]

const BOUTIQUE = 'Dar Ennour'

/* ── on efface ce que la session avait ─────────────────────────────────────
   Dans l'ordre des dépendances, sinon une ligne orpheline survit et se
   retrouve à l'image au pire moment. `imports` en dernier : les pages y
   réfèrent. */
function effacer(sid) {
  const camps = all('SELECT id FROM campaigns WHERE session=?', sid).map((c) => c.id)
  for (const c of camps) {
    run('DELETE FROM insights WHERE campaign=?', c)
    run('DELETE FROM ads WHERE campaign=?', c)
    run('DELETE FROM decisions WHERE campaign=?', c)
  }
  run('DELETE FROM campaigns WHERE session=?', sid)

  const cnx = all('SELECT id FROM meta_connections WHERE session=?', sid).map((x) => x.id)
  for (const id of cnx) {
    const assets = all('SELECT id FROM meta_assets WHERE connection=?', id).map((a) => a.id)
    for (const a of assets) {
      const fils = all('SELECT id FROM threads WHERE asset=?', a).map((t) => t.id)
      for (const t of fils) run('DELETE FROM thread_messages WHERE thread=?', t)
      run('DELETE FROM threads WHERE asset=?', a)
      const posts = all('SELECT id FROM posts WHERE asset=?', a).map((p) => p.id)
      for (const p of posts) run('DELETE FROM post_comments WHERE post=?', p)
      run('DELETE FROM posts WHERE asset=?', a)
    }
    run('DELETE FROM meta_assets WHERE connection=?', id)
  }
  run('DELETE FROM meta_connections WHERE session=?', sid)

  for (const t of ['notifications', 'credit_ledger', 'events', 'turns', 'creatives', 'photos', 'imports'])
    run(`DELETE FROM ${t} WHERE session=?`, sid)

  const sites = all('SELECT id FROM sites WHERE session=?', sid).map((s) => s.id)
  for (const s of sites) run('DELETE FROM domains WHERE site=?', s)
  run('DELETE FROM pages WHERE session=?', sid)
  run('DELETE FROM sites WHERE session=?', sid)
  run('DELETE FROM posts WHERE session=?', sid)

  // Les réglages du Studio et l'interrupteur de réponse auto sont des clés
  // globales préfixées par la session : elles survivraient au nettoyage.
  for (const k of [`landing:${sid}`, `autoreply.${sid}`, `autoreply.last.${sid}`])
    run('DELETE FROM settings WHERE k=?', k)
}

console.log(`\n  Session « ${SID} » — remise à neuf.\n`)

effacer(SID)
session(SID)
run('UPDATE sessions SET shop=?, language=? WHERE id=?', BOUTIQUE, 'ar', SID)

// Le catalogue est global ; on s'assure seulement qu'il est à jour avec la
// fixture, sinon les quatre vêtements premium manquent à l'écran.
catalog.seed()

/* ── ce que le marchand vend déjà ─────────────────────────────────────────
   Trois produits, pas un : la vitrine doit avoir des cartes, et le choix
   d'un produit parmi plusieurs est ce qui rend la scène du catalogue
   intéressante. */
for (const p of PANIER) {
  catalog.importProduct(SID, p.id, { selling: p.selling })
  const d = catalog.detail(p.id)
  console.log(`  importé   ${d.name.en.padEnd(30)} ${p.selling} DZD   ${d.images.length} photos`)
}

/* ── le compte Meta, branché avec son passé ───────────────────────────────
   On passe par le vrai chemin — login, revue des permissions, octroi — et
   non par un INSERT : c'est ce chemin qui sème les campagnes, la Page, son
   mur et la boîte de réception. Un INSERT donnerait un compte branché sur
   rien, c'est-à-dire exactement l'écran qu'on a corrigé la semaine dernière. */
startLogin(SID)
reviewPermissions(SID)
grant(SID, SCOPES.map((s) => s.name))
const c = connection(SID)
const surfaces = surfacesOf(c)

const camps = all('SELECT name, status, daily_budget_dzd FROM campaigns WHERE session=? ORDER BY id', SID)
const fils = one(
  `SELECT COUNT(*) n FROM threads WHERE asset IN
     (SELECT id FROM meta_assets WHERE connection=?)`, c.id)?.n ?? 0
const comms = one(
  `SELECT COUNT(*) n FROM post_comments WHERE status='open' AND post IN
     (SELECT id FROM posts WHERE session=?)`, SID)?.n ?? 0

console.log('')
console.log(`  Meta      ${c.status} · ${surfaces.length} surface(s) · ${camps.length} campagne(s)`)
for (const x of camps) console.log(`            ${x.status.padEnd(9)} ${x.name}`)
console.log(`  Clients   ${fils} conversation(s), ${comms} commentaire(s) ouverts`)

const b = balance(SID)
console.log(`  Crédits   ${b.left} / ${b.pack}`)

console.log(`
  Prêt. Dans le navigateur :
      localStorage.setItem('sawt.session','${SID}')
      localStorage.setItem('sawt.lang','en')
      localStorage.setItem('sawt.theme','jour')

  ⚠️ La boutique n'est PAS construite : c'est le plan à tourner en direct.
`)
