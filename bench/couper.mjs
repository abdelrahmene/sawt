// Coupe chaque plan sur ses repères noirs, et le normalise pour le montage.
//
// POURQUOI DES REPÈRES. L'enregistreur du navigateur filme en temps réel : il
// capte aussi les secondes où je parle au navigateur et non à l'app. Un plan
// de quatorze secondes arrive donc dans un fichier de vingt-quatre, avec du
// temps mort devant et derrière, et la position exacte de l'action change à
// chaque prise. Régler ça à la main dix fois, c'est dix occasions de se
// tromper d'une seconde.
//
// Chaque plan s'ouvre et se ferme donc sur un écran noir de 0,7 s, posé par
// la chorégraphie elle-même. `blackdetect` les retrouve, et la coupe tombe
// juste sans que personne ait regardé le fichier.
//
// La normalisation compte autant que la coupe : les plans sortent en AV1 à
// cadence variable, ce que `concat` recolle mal. On réécrit tout en H.264,
// 30 images par seconde, yuv420p — le format que tout lecteur accepte.
//
//   node bench/couper.mjs                 # tous les plans de out/film
//   node bench/couper.mjs 01-board        # un seul
import { readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT } from '../src/config.js'

const run = promisify(execFile)
const BRUT = join(ROOT, 'out', 'film')
const NET = join(ROOT, 'out', 'film', 'coupes')
mkdirSync(NET, { recursive: true })

const seul = process.argv[2]

/** Les intervalles noirs d'un fichier, en secondes. */
async function noirs(fichier) {
  // blackdetect écrit sur stderr ; execFile le capture, et un code de sortie
  // non nul ne doit pas tout arrêter — un plan sans repère est un plan à
  // signaler, pas une exception.
  let err = ''
  try {
    const r = await run('ffmpeg', ['-v', 'info', '-i', fichier,
      '-vf', 'blackdetect=d=0.35:pix_th=0.05', '-an', '-f', 'null', '-'],
      { maxBuffer: 1 << 24 })
    err = r.stderr
  } catch (e) { err = e.stderr ?? '' }

  return [...err.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)]
    .map((m) => ({ debut: Number(m[1]), fin: Number(m[2]) }))
}

const fichiers = readdirSync(BRUT)
  .filter((f) => f.endsWith('.mp4') && !f.startsWith('test-'))
  .filter((f) => !seul || f.startsWith(seul))
  .sort()

if (!fichiers.length) { console.log('\n  Aucun plan dans out/film.\n'); process.exit(0) }

console.log('')
let ok = 0
for (const f of fichiers) {
  const src = join(BRUT, f)
  const marques = await noirs(src)

  if (marques.length < 2) {
    console.log(`  ⚠️  ${f.padEnd(22)} ${marques.length} repère(s) — à couper à la main`)
    continue
  }
  // Le premier et le DERNIER : un plan peut contenir du noir au milieu (une
  // transition de l'app), et on ne veut surtout pas couper là-dessus.
  const debut = marques[0].fin
  const fin = marques[marques.length - 1].debut
  const duree = fin - debut
  if (duree <= 0.5) {
    console.log(`  ⚠️  ${f.padEnd(22)} intervalle vide (${duree.toFixed(1)}s)`)
    continue
  }

  const dest = join(NET, f)
  await run('ffmpeg', [
    '-v', 'error', '-y',
    '-ss', String(debut), '-to', String(fin), '-i', src,
    // On conserve les proportions et on remplit le reste du cadre. Les plans
    // d'app sont en 16:9, celui de la page de vente est en portrait — c'est
    // une page mobile, la filmer en paysage l'aurait montrée dans un coin.
    // `force_original_aspect_ratio=decrease` + `pad` vaut mieux qu'un
    // `scale=1920:1080` sec, qui l'aurait étirée sans prévenir.
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,' +
           'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0c0e12,format=yuv420p,fps=30',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-profile:v', 'high', '-level', '4.1', '-movflags', '+faststart',
    '-an', dest,
  ], { maxBuffer: 1 << 24 })

  console.log(`  ✓  ${f.padEnd(22)} ${duree.toFixed(1)}s   (${debut.toFixed(1)} → ${fin.toFixed(1)})`)
  ok++
}

console.log(`\n  ${ok}/${fichiers.length} plan(s) coupés dans out/film/coupes/\n`)
