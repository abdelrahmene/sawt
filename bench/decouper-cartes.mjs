// Découpe la prise unique des cartons en un clip par carton.
//
// Les neuf cartons sont filmés d'une traite, séparés par le même repère noir
// que les plans d'app. Dix repères encadrent donc neuf segments : on prend
// ce qui se trouve entre la fin d'un repère et le début du suivant.
//
// Pourquoi une seule prise plutôt que neuf : chaque démarrage d'enregistreur
// coûte un aller-retour et quelques secondes de temps mort, et surtout la
// moindre différence de cadrage entre deux prises se verrait au montage comme
// un saut. Une prise, un cadrage.
//
//   node bench/decouper-cartes.mjs
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT } from '../src/config.js'

const run = promisify(execFile)
const SRC = join(ROOT, 'out', 'film', 'cartes-brut.mp4')
const DEST = join(ROOT, 'out', 'film', 'coupes')
mkdirSync(DEST, { recursive: true })

let err = ''
try {
  const r = await run('ffmpeg', ['-v', 'info', '-i', SRC,
    '-vf', 'blackdetect=d=0.35:pix_th=0.05', '-an', '-f', 'null', '-'], { maxBuffer: 1 << 24 })
  err = r.stderr
} catch (e) { err = e.stderr ?? '' }

const marques = [...err.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)]
  .map((m) => ({ debut: Number(m[1]), fin: Number(m[2]) }))

console.log(`\n  ${marques.length} repère(s) trouvé(s).`)
if (marques.length < 2) { console.log('  Rien à découper.\n'); process.exit(1) }

let n = 0
for (let i = 0; i < marques.length - 1; i++) {
  const debut = marques[i].fin
  const fin = marques[i + 1].debut
  const duree = fin - debut
  // Un carton tient 3,6 s à l'écran ; en dessous de 1 s c'est un faux
  // positif, pas un carton — on le laisse passer sans rien écrire.
  if (duree < 1) continue
  n++
  const dest = join(DEST, `carte-${String(n).padStart(2, '0')}.mp4`)
  await run('ffmpeg', [
    '-v', 'error', '-y', '-ss', String(debut), '-to', String(fin), '-i', SRC,
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,' +
           'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0c0e12,format=yuv420p,fps=30',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-profile:v', 'high', '-level', '4.1', '-movflags', '+faststart', '-an', dest,
  ], { maxBuffer: 1 << 24 })
  console.log(`  ✓  carte-${String(n).padStart(2, '0')}   ${duree.toFixed(1)}s`)
}
console.log(`\n  ${n} carton(s) dans out/film/coupes/\n`)
