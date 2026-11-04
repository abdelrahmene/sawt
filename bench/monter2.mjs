/**
 * Le montage : deux versions du même film, depuis les mêmes plans sous-titrés.
 *
 *   sawt-3min.mp4      ce qu'on envoie. Trois minutes, rien qui traîne.
 *   sawt-complet.mp4   le parcours entier, pour qui veut tout voir.
 *
 * PARTI PRIS. Pas de narration : la voix de synthèse disponible ici est datée,
 * et une mauvaise voix coûte plus cher que pas de voix. Le récit est porté par
 * les sous-titres déjà gravés, et le silence autour d'eux les rend lisibles.
 *
 * LES BORNES TOMBENT SUR LES CARTONS. Couper au milieu d'un sous-titre, c'est
 * une phrase qui disparaît à mi-mot. Chaque extrait commence et finit donc sur
 * une frontière de carton, reprise de `bench/sous-titres.mjs`.
 *
 * LES COUPES SONT DES FONDUS AU NOIR de six images. Un enchaîné sur quinze
 * segments demande une chaîne `xfade` fragile ; un court fondu à chaque bout
 * donne le même liant et se concatène sans risque.
 *
 *   node bench/monter2.mjs            les deux
 *   node bench/monter2.mjs 3min       une seule
 */
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT } from '../src/config.js'

const run = promisify(execFile)
const PLANS = join(ROOT, 'out', 'film2', 'titres')
const TMP = join(ROOT, 'out', 'film2', 'segments')
mkdirSync(TMP, { recursive: true })

/* ── les cartons de titre ─────────────────────────────────────────────────
   Sur noir, pleine page. Ils disent au jury ce qu'il va voir avant qu'il le
   voie : c'était la première demande — « AU DÉPART il faut bien expliquer ce
   que fait cette solution ». */
const TITRES = {
  ouverture: {
    duree: 7,
    lignes: [
      ['fs36', '&H0099D334&', 'SAWT · صوت'],
      ['fs76', '&H00FFFFFF&', 'Run an online business by talking to it.'],
      ['fs50', '&H00AFA39C&', 'Find a product. Shoot the ads. Build the shop.'],
      ['fs50', '&H00AFA39C&', 'Launch the campaign. Answer the customers. Take the orders.'],
      ['fs44', '&H0099D334&', 'All of it, with Meta’s own AI models.'],
    ],
  },
  fin: {
    duree: 8,
    lignes: [
      ['fs36', '&H0099D334&', 'WHAT YOU JUST SAW'],
      ['fs64', '&H00FFFFFF&', 'One photo in. A shop, three ads, a live campaign,'],
      ['fs64', '&H00FFFFFF&', 'nine answered customers and a paid order out.'],
      ['fs46', '&H00AFA39C&', 'Starting a business no longer takes capital or a product.'],
      ['fs46', '&H00AFA39C&', 'It takes knowing how to run ads — and that is a profession.'],
      ['fs52', '&H0099D334&', 'This agent is that profession.'],
      ['fs36', '&H00AFA39C&', 'github.com/abdelrahmene/sawt · open source'],
    ],
  },
}

/* ── le montage de trois minutes ──────────────────────────────────────────
   `de`/`a` sont en secondes DANS le plan coupé, pris sur les frontières de
   cartons de `bench/sous-titres.mjs`. */
const COURT = [
  { titre: 'ouverture' },
  { plan: '01-board', de: 0, a: 10.5 },        // ce que c'est
  { plan: '02-meta', de: 0, a: 14.5 },         // une vraie app Meta
  { plan: '04-photo-creatifs', de: 0, a: 8.6 },    // sa photo, prise au téléphone
  { plan: '04-photo-creatifs', de: 26, a: 35 },    // l'affiche finie, prix dessus
  { plan: '13a-vitrine', de: 0, a: 13.5 },     // la boutique que voit la cliente
  { plan: '06-campagne', de: 0, a: 17.6 },     // la campagne, construite et mise en pause
  { plan: '06-campagne', de: 34, a: 42.2 },    // des jours plus tard, il relit ses chiffres
  { plan: '06-campagne', de: 50.4, a: 60.3 },  // il agit, et note pourquoi
  { plan: '10-clients', de: 0, a: 14 },        // les clients
  { plan: '13b-commande', de: 21, a: 28.4 },   // le formulaire
  { plan: '13b-commande', de: 37.3, a: 46 },   // la commande passée
  { plan: '14-recu-journal', de: 0, a: 14.3 }, // elle arrive
  { plan: '11-darija', de: 14, a: 29.6 },      // et il parle darija
  { titre: 'fin' },
]

/* ── le parcours complet ──────────────────────────────────────────────────
   Tous les plans dans l'ordre, moins le temps mort du 04 : la génération des
   trois images prend quarante secondes pendant lesquelles rien ne bouge à
   l'écran. On montre l'avant et l'après, pas l'attente. */
const LONG = [
  { titre: 'ouverture' },
  { plan: '01-board' },
  { plan: '02-meta' },
  { plan: '03-catalogue' },
  { plan: '04-photo-creatifs' },
  { plan: '05-page-boutique' },
  { plan: '12-boutique' },
  { plan: '13a-vitrine' },
  { plan: '13b-commande' },
  { plan: '06-campagne' },
  { plan: '10-clients' },
  { plan: '14-recu-journal' },
  { plan: '11-darija' },
  { titre: 'fin' },
]

const tc = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return `${h}:${String(m).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}`
}

/** Un carton plein écran, en vidéo, depuis une source noire et libass. */
async function carton(nom, i) {
  const { duree, lignes } = TITRES[nom]
  const corps = lignes
    .map(([fs, c, txt]) => `{\\${fs}\\c${c}${fs === 'fs76' || fs === 'fs64' ? '\\b1' : ''}}`
      + String(txt).replace(/[{}]/g, '') + '{\\r}')
    .join('\\N')
  const ass = [
    '[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1920', 'PlayResY: 1080',
    'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,'
      + ' Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline,'
      + ' Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // Alignment 5 = centré au milieu de l'image.
    'Style: T,Segoe UI,54,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,'
      + '0,0,0,0,100,100,0,0,1,0,0,5,120,120,0,1',
    '', '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    `Dialogue: 0,0:00:00.00,${tc(duree)},T,,0,0,0,,{\\fad(400,400)}${corps}`,
  ].join('\n') + '\n'

  const base = `titre-${i}-${nom}`
  writeFileSync(join(TMP, `${base}.ass`), ass, 'utf8')
  const sortie = `${base}.mp4`
  await run('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'lavfi', '-i', `color=c=0x07090C:s=1920x1080:r=30:d=${duree}`,
    '-vf', `subtitles=${base}.ass,fade=t=in:st=0:d=0.4,fade=t=out:st=${duree - 0.5}:d=0.5`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-an',
    sortie,
  ], { cwd: TMP, maxBuffer: 1 << 24 })
  return join(TMP, sortie)
}

/** Un extrait d'un plan, avec un court fondu de chaque côté. */
async function extrait(plan, de, a, i) {
  const src = join(PLANS, `${plan}.mp4`)
  if (!existsSync(src)) throw new Error(`Plan introuvable : ${plan}`)
  const sortie = join(TMP, `seg-${String(i).padStart(2, '0')}-${plan}.mp4`)
  const args = ['-v', 'error', '-y']
  if (de != null) args.push('-ss', String(de))
  args.push('-i', src)
  if (a != null) args.push('-t', String(a - (de ?? 0)))
  const duree = a != null ? a - (de ?? 0) : null
  // Six images de fondu : assez pour lier, trop peu pour qu'on le remarque.
  const fondu = duree
    ? `fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, duree - 0.25)}:d=0.25`
    : 'fade=t=in:st=0:d=0.2'
  args.push('-vf', `${fondu},fps=30,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', sortie)
  await run('ffmpeg', args, { maxBuffer: 1 << 24 })
  return sortie
}

async function monter(nom, plan) {
  const morceaux = []
  for (const [i, e] of plan.entries()) {
    morceaux.push(e.titre ? await carton(e.titre, i) : await extrait(e.plan, e.de, e.a, i))
    process.stdout.write('.')
  }
  const liste = join(TMP, `liste-${nom}.txt`)
  writeFileSync(liste, morceaux.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n') + '\n', 'utf8')
  const sortie = join(ROOT, 'out', `sawt-${nom}.mp4`)
  await run('ffmpeg', [
    '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', liste,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', sortie,
  ], { maxBuffer: 1 << 24 })
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', sortie])
  const d = Number(stdout.trim())
  console.log(`\n  ✓  out/sawt-${nom}.mp4 — ${Math.floor(d / 60)} min ${String(Math.round(d % 60)).padStart(2, '0')} s`
    + `  (${morceaux.length} segments)`)
}

const quoi = process.argv[2]
console.log('')
if (!quoi || quoi === '3min') await monter('3min', COURT)
if (!quoi || quoi === 'complet') await monter('complet', LONG)
rmSync(TMP, { recursive: true, force: true })
console.log('')
