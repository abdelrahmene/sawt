// Une page de vente complète, à partir de RIEN.
//
//   node bench/try-fullpage.mjs
//
// Le cas qui compte vraiment pour un marchand algérien qui démarre : il n'a
// pas de photo. Pas de studio, pas d'appareil, pas de produit en main — juste
// une idée et un fournisseur. Tout le reste du projet part d'une photo ; ce
// script montre ce qui se passe quand il n'y en a aucune.
//
// La chaîne, entièrement chez Meta :
//   1. muse-image-1.0   invente la photo du produit (texte → image)
//   2. sam-3.1          détoure ce produit sur la photo inventée
//   3. muse-image-1.0   le rephotographie dans quatre décors (image → image)
//   4. muse-spark-1.3   écrit la page autour
//
// Le point délicat est l'étape 3 : à partir de l'étape 2, la photo FAIT
// autorité. Si l'étape 1 rend un produit flou ou bancal, les quatre scènes
// reproduiront fidèlement ce produit flou et bancal. D'où le soin mis au
// prompt de la première image — c'est elle qui tient toute la page.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../src/config.js'
import { generate, save, GARDE_MARQUE } from '../src/models/image.js'
import { buildLandingPage } from '../src/creative/landing.js'

const OUT = join(ROOT, 'out')
mkdirSync(OUT, { recursive: true })

/* ── le produit ──────────────────────────────────────────────────────────
   Sans marque, par construction : le règlement du concours a une clause
   « trademark », et une réplique sur une page soumise à Meta ne se rattrape
   pas. Un vêtement d'hiver parce qu'on est le 1er novembre et que c'est ce
   qui se vend en paiement à la livraison en ce moment en Algérie. */
const PRODUIT = {
  nom: 'Long hooded puffer coat',
  prix: 6900,
  boutique: 'Nour Store',
  angle: 'Warm enough for a real Algiers winter. You pay the delivery man, not before.',
  langue: 'en',
}

/* La photo du marchand, inventée. Volontairement une prise de vue de
   CATALOGUE et non une scène de vie : c'est la photo dont les quatre autres
   vont hériter, donc elle doit montrer l'objet, pas une ambiance. Fond neutre,
   lumière douce, produit entier et net, aucun texte. */
const PHOTO = [
  'Studio product photograph of a long hooded puffer coat for women, sand beige,',
  'matte quilted shell with vertical channels, knee length, detachable hood,',
  'two zipped side pockets, full length zip, soft natural drape.',
  'Shown on an invisible mannequin, front view, complete garment in frame.',
  'Clean seamless light grey background, large softbox, gentle floor shadow,',
  'premium e-commerce catalogue quality, sharp, true colour.',
  GARDE_MARQUE,
  'Absolutely no text, no letters, no numbers, no logos, no labels, no watermark.',
  'No human face, no model, no hands.',
].join(' ')

const t0 = Date.now()
const chrono = () => `${Math.round((Date.now() - t0) / 1000)}s`

console.log(`\n  ${PRODUIT.nom} — ${PRODUIT.prix} DZD\n`)
console.log(`  1. muse-image-1.0 · la photo du produit, inventée…`)

const b64 = await generate(PHOTO, { size: '1024x1024' })
if (!b64) {
  console.error('\n  La photo du produit n\'est pas revenue. Rien ne peut être bâti dessus.\n')
  process.exit(1)
}
const photo = join(OUT, 'demo-doudoune.png')
save(b64, photo)
console.log(`     → out/demo-doudoune.png   (${chrono()})`)

console.log(`\n  2-4. sam-3.1 + muse-image + muse-spark · la page…`)
const r = await buildLandingPage({
  product: PRODUIT.nom,
  price_dzd: PRODUIT.prix,
  angle: PRODUIT.angle,
  language: PRODUIT.langue,
  shop: PRODUIT.boutique,
  images: ['/out/demo-doudoune.png'],
  freshScenes: true,
  options: {
    language: PRODUIT.langue,
    scenario: 'lifestyle',
    scenes: 4,
    sections: { problem: true, benefits: true, features: true, gallery: true, steps: true, why: true, faq: true },
  },
  onProgress: (p) => console.log(`     · ${p.phase ?? ''} ${p.label ?? ''} ${p.step ? `${p.step}/${p.total}` : ''}`),
})

console.log(`\n  ─────────────────────────────────────────────`)
console.log(`  page      ${Math.round(r.bytes / 1024)} Ko`)
console.log(`  scènes    ${r.scenes?.length ?? 0} faites${r.scenes_failed?.length ? `, ${r.scenes_failed.length} ratées` : ''}`)
if (r.scenes_from) console.log(`  source    ${r.scenes_from}`)
if (r.isolated) console.log(`  détourage ${JSON.stringify(r.isolated)}`)
for (const f of r.scenes_failed ?? []) console.log(`  ⚠ ${f.slot} : ${f.error}`)
console.log(`  total     ${chrono()}`)
console.log(`\n  → http://localhost:7070${r.url}\n`)
