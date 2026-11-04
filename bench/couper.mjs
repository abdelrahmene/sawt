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

/* Le dossier des rushes se donne en premier argument, parce qu'il y en a
   maintenant deux : `out/film` est la première série, `out/film2` celle
   refaite en anglais avec les sous-titres. Il était écrit en dur, donc
   `node bench/couper.mjs out/film2/10-clients.mp4` répondait « aucun plan » —
   il cherchait un plan nommé « out/film2/10-clients.mp4 » dans `out/film`.
     node bench/couper.mjs                     tous les plans de out/film2
     node bench/couper.mjs 10-clients          un seul
     node bench/couper.mjs out/film 03         un autre dossier, un seul plan */
const args = process.argv.slice(2)
const dossier = args[0] && /[\\/]/.test(args[0]) ? args.shift() : 'out/film2'
const BRUT = join(ROOT, ...dossier.split(/[\\/]/))
const NET = join(BRUT, 'coupes')
mkdirSync(NET, { recursive: true })

// Un nom de fichier complet passé par erreur reste utilisable : on n'en garde
// que le nom, et le dossier vient du chemin.
const seul = args[0]?.replace(/\.mp4$/i, '').split(/[\\/]/).pop()

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

if (!fichiers.length) { console.log(`\n  Aucun plan dans ${dossier}${seul ? ` pour « ${seul} »` : ''}.\n`); process.exit(0) }

console.log('')
let ok = 0
for (const f of fichiers) {
  const src = join(BRUT, f)
  const marques = await noirs(src)

  if (!marques.length) {
    console.log(`  ⚠️  ${f.padEnd(22)} aucun repère — à couper à la main`)
    continue
  }

  /* UN SEUL REPÈRE, ET IL EST À LA FIN. C'est le cas quand l'enregistreur
     n'a pas encore capté d'image au moment où le repère d'ouverture est posé :
     il dure 0,8 s, la mise en route du screencast peut être plus longue. On
     garde alors tout depuis le début et on coupe sur la fermeture. Le plan a
     un peu de battement en tête, ce qui vaut mieux que de refaire la prise. */
  const seulEtTardif = marques.length === 1 && marques[0].debut > 2
  if (marques.length < 2 && !seulEtTardif) {
    console.log(`  ⚠️  ${f.padEnd(22)} 1 repère, et il est au début — à couper à la main`)
    continue
  }
  // Le premier et le DERNIER : un plan peut contenir du noir au milieu (une
  // transition de l'app), et on ne veut surtout pas couper là-dessus.
  const debut = seulEtTardif ? 0 : marques[0].fin
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

console.log(`\n  ${ok}/${fichiers.length} plan(s) coupés dans ${dossier}/coupes/\n`)
