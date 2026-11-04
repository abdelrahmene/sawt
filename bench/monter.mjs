// Le montage : assemble les plans coupés et les cartons en un seul film.
//
// PARTI PRIS. Pas de narration — la voix de synthèse disponible ici est
// datée, et une mauvaise voix coûte plus cher que pas de voix. Le récit est
// donc porté par des cartons typographiques, et le seul son du film est la
// vraie note vocale en darija : du silence autour d'une voix humaine la rend
// plus forte qu'un commentaire continu.
//
// L'ACCÉLÉRATION EST AFFICHÉE. La construction d'une page prend une minute
// pour de vrai. On la montre en quinze secondes, avec le facteur écrit à
// l'écran. Faire croire que c'est instantané serait un mensonge ; accélérer
// en le disant est ce que fait toute démonstration honnête.
//
// LES COUPES SONT DES FONDUS AU NOIR de huit images. Un enchaîné sur dix-huit
// segments demande une chaîne `xfade` fragile ; un court fondu à chaque bout
// donne le même liant et se concatène sans risque.
//
//   node bench/monter.mjs
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT } from '../src/config.js'

const run = promisify(execFile)
const C = join(ROOT, 'out', 'film', 'coupes')
const T = join(ROOT, 'out', 'film', 'segments')
const SORTIE = join(ROOT, 'out', 'sawt-demo.mp4')
mkdirSync(T, { recursive: true })

/** La durée d'un fichier, en secondes. */
async function duree(f) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', f])
  return Number(stdout.trim())
}

/* Le déroulé. `v` accélère (1 = temps réel), `de`/`a` découpent dans la
   source, `note` s'affiche en bas à droite quand on accélère. */
const PLAN = [
  { f: 'carte-01.mp4' },
  { f: '01-board.mp4',    v: 1.15 },
  { f: 'carte-02.mp4' },
  { f: '02-catalogue.mp4', v: 1.3 },
  { f: 'carte-03.mp4' },
  // La voix : transcription puis réponse de l'agent, à peine accélérée —
  // c'est le temps réel qui dit que le modèle réfléchit vraiment.
  { f: '03-sequence.mp4', de: 0,  a: 32,  v: 1.4, son: 'voix' },
  { f: 'carte-04.mp4' },
  // La construction : une minute de travail réel, montrée en quinze secondes.
  { f: '03-sequence.mp4', de: 32, a: 96.5, v: 4.2, note: 'x4' },
  { f: '05-page.mp4',     v: 1.5 },
  { f: 'carte-05.mp4' },
  { f: '06-sites.mp4',    v: 1.2 },
  { f: 'carte-06.mp4' },
  { f: '07-clients.mp4',  v: 1.6, note: 'x1.6' },
  { f: 'carte-07.mp4' },
  { f: '08-refus.mp4',    v: 1.6, note: 'x1.6' },
  { f: 'carte-08.mp4' },
  { f: '09-journal.mp4',  v: 1.3 },
  { f: 'carte-09.mp4' },
]

const manquants = [...new Set(PLAN.map((p) => p.f))].filter((f) => !existsSync(join(C, f)))
if (manquants.length) {
  console.error(`\n  Plans manquants dans out/film/coupes :\n    ${manquants.join('\n    ')}\n`)
  process.exit(1)
}

const POLICE = 'C\\:/Windows/Fonts/segoeui.ttf'
const liste = []
let total = 0
console.log('')

for (const [i, p] of PLAN.entries()) {
  const src = join(C, p.f)
  const nom = String(i + 1).padStart(2, '0')
  const dest = join(T, `${nom}.mp4`)
  const vitesse = p.v ?? 1

  const coupe = []
  if (p.de != null) coupe.push('-ss', String(p.de))
  if (p.a != null) coupe.push('-to', String(p.a))

  const dispo = (p.a ?? await duree(src)) - (p.de ?? 0)
  const finale = dispo / vitesse

  const filtres = [`setpts=${(1 / vitesse).toFixed(5)}*PTS`]
  // Le facteur d'accélération, écrit à l'écran. Discret mais lisible : c'est
  // une mention honnête, pas un argument de vente.
  if (p.note) {
    filtres.push(
      `drawtext=fontfile='${POLICE}':text='${p.note}':fontcolor=white@0.55:fontsize=30:` +
      `box=1:boxcolor=black@0.35:boxborderw=14:x=w-tw-46:y=h-th-40`)
  }
  // Huit images de fondu à chaque bout : le liant entre deux segments.
  filtres.push('fade=t=in:st=0:d=0.27', `fade=t=out:st=${Math.max(0, finale - 0.27).toFixed(2)}:d=0.27`)

  await run('ffmpeg', ['-v', 'error', '-y', ...coupe, '-i', src,
    '-vf', filtres.join(','), '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p', '-r', '30', dest,
  ], { maxBuffer: 1 << 24 })

  liste.push({ fichier: dest, debut: total, duree: finale, son: p.son })
  total += finale
  console.log(`  ${nom}  ${p.f.padEnd(18)} ${dispo.toFixed(1)}s ÷${vitesse} → ${finale.toFixed(1)}s` +
    `   (à ${Math.floor(total / 60)}:${String(Math.floor(total % 60)).padStart(2, '0')})`)
}

// — concaténation —
const manif = join(T, 'liste.txt')
writeFileSync(manif, liste.map((s) => `file '${s.fichier.replace(/\\/g, '/')}'`).join('\n'), 'utf8')
const muet = join(T, 'muet.mp4')
await run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', manif,
  '-c', 'copy', muet], { maxBuffer: 1 << 24 })

// — le son : du silence, et la vraie note vocale à sa place —
const voix = join(ROOT, 'out', 'uploads', 'voice-mvwgn89j.wav')
const seg = liste.find((s) => s.son === 'voix')
if (existsSync(voix) && seg) {
  // Elle démarre deux secondes après le début du segment : le temps que
  // l'œil se pose sur l'écran avant que la voix parte.
  const retard = Math.round((seg.debut + 2) * 1000)
  await run('ffmpeg', ['-v', 'error', '-y', '-i', muet, '-i', voix,
    '-filter_complex',
    `[1:a]adelay=${retard}|${retard},volume=1.6,apad[v];` +
    `anullsrc=channel_layout=stereo:sample_rate=48000[s];` +
    `[s][v]amix=inputs=2:duration=first:dropout_transition=0[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-shortest', '-movflags', '+faststart', SORTIE], { maxBuffer: 1 << 24 })
} else {
  await run('ffmpeg', ['-v', 'error', '-y', '-i', muet,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-c:v', 'copy', '-c:a', 'aac', '-shortest', '-movflags', '+faststart', SORTIE],
    { maxBuffer: 1 << 24 })
  console.log('\n  ⚠️  note vocale introuvable — film muet')
}

rmSync(muet, { force: true })
const d = await duree(SORTIE)
console.log(`\n  ▸ out/sawt-demo.mp4 — ${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, '0')}\n`)
