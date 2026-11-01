// Les photos du catalogue, fabriquées une fois et versionnées.
//
// Le dépôt doit tourner chez un juré sans clé et sans réseau : le catalogue
// ne peut donc pas aller chercher ses images ailleurs. Elles sont produites
// ici par muse-image-1.0 depuis le champ `shots` de fixtures/catalog.json,
// réduites en WebP par ffmpeg — déjà présent pour l'audio — et commitées dans
// fixtures/catalog/.
//
// Pourquoi générer plutôt que reprendre les vraies photos fournisseur :
//   · aucun droit de tiers à demander sur une image qu'on a produite ;
//   · le vrai catalogue contient des répliques de marques, que le règlement
//     du concours interdit de montrer ;
//   · 0,01 $ l'image, et le résultat est propre et homogène.
//
//   node bench/make-catalog.mjs            # ne refait que ce qui manque
//   node bench/make-catalog.mjs --force    # tout refaire
//   node bench/make-catalog.mjs sacoche    # un seul produit
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT, META } from '../src/config.js'
import { generate, save } from '../src/models/image.js'

const run = promisify(execFile)
const DIR = join(ROOT, 'fixtures', 'catalog')
const FILE = join(ROOT, 'fixtures', 'catalog.json')

const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.find((a) => !a.startsWith('--'))

// Une consigne commune, par-dessus chaque scène : ce sont des photos de
// CATALOGUE, pas des publicités. Rien d'écrit, aucune marque, aucun visage.
const GUARD =
  'Absolutely no text, no letters, no numbers, no logo, no brand mark, no watermark anywhere in the image. ' +
  'No people, no faces, no hands. One single product, nothing else in frame.'

const ko = (m) => { console.error('\n  ' + m + '\n'); process.exit(1) }

if (!META.key) ko('MODEL_API_KEY manquante — copie .env.example en .env et mets la clé.')
try { await run('ffmpeg', ['-version']) } catch { ko('ffmpeg introuvable dans le PATH.') }

const cat = JSON.parse(readFileSync(FILE, 'utf8'))
mkdirSync(DIR, { recursive: true })

const jobs = []
for (const p of cat.products) {
  if (only && !p.id.includes(only)) continue
  p.shots.forEach((prompt, i) => {
    const name = p.images[i]
    if (!name) return
    if (!force && existsSync(join(DIR, name))) return
    jobs.push({ id: p.id, name, prompt })
  })
}

if (!jobs.length) {
  console.log('\n  Rien à faire — toutes les images sont déjà là. --force pour refaire.\n')
  process.exit(0)
}

console.log(`\n  ${jobs.length} image(s) à produire · muse-image-1.0 · ~0,01 $ pièce\n`)

let ok = 0
const failed = []
// En série, pas en parallèle : l'endpoint image est le plus lent et le plus
// fragile du projet, et un lot de vingt en parallèle rate la moitié.
for (const [i, j] of jobs.entries()) {
  const tag = `  ${String(i + 1).padStart(2)}/${jobs.length}  ${j.name.padEnd(30)}`
  const t0 = Date.now()
  try {
    const b64 = await generate(`${j.prompt} ${GUARD}`, { size: '1024x1024' })
    if (!b64) throw new Error('aucune image renvoyée')
    const png = join(DIR, j.name.replace(/\.webp$/, '.png'))
    save(b64, png)
    // 1024 px de PNG pèse 1,5 Mo ; le même visuel en WebP q82 en pèse 100.
    // Un dépôt qu'on clone pour une démonstration ne peut pas peser 30 Mo
    // d'images de catalogue.
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', 'scale=900:-1', '-quality', '82', join(DIR, j.name)])
    rmSync(png, { force: true })
    const kb = Math.round(statSync(join(DIR, j.name)).size / 1024)
    console.log(`${tag}${kb} Ko   ${((Date.now() - t0) / 1000).toFixed(1)} s`)
    ok++
  } catch (e) {
    console.log(`${tag}ÉCHEC — ${e.message.slice(0, 90)}`)
    failed.push(j.name)
  }
}

console.log(`\n  ${ok}/${jobs.length} produites.${failed.length ? ' Manquantes : ' + failed.join(', ') : ''}\n`)
if (failed.length) process.exitCode = 1

// Un index lisible, pour que le catalogue sache sans scruter le disque.
const have = cat.products.flatMap((p) => p.images).filter((n) => existsSync(join(DIR, n)))
writeFileSync(join(DIR, 'index.json'), JSON.stringify({ generated_by: 'muse-image-1.0', files: have }, null, 1))
