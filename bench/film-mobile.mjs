/**
 * Le film mobile : 1080×1920, tout piloté depuis le chat de l'agent.
 *
 * POURQUOI UN SCRIPT À PART. Le premier film était en 16:9 et montrait des
 * écrans. Celui-ci est au format du téléphone du marchand et ne montre qu'une
 * chose : la conversation. C'est là que tout se fait, donc c'est là qu'il faut
 * regarder. Les sous-titres se gravent au même endroit qu'avant — en post,
 * avec libass — mais la bande est plus haute parce qu'un 9:16 a de la place
 * en bas et pas sur les côtés.
 *
 *   node bench/film-mobile.mjs
 *
 * Entrée  : out/m/coupes/*.mp4      Sortie : out/sawt-mobile-3min.mp4
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT } from '../src/config.js'

const run = promisify(execFile)
const SRC = join(ROOT, 'out', 'm', 'coupes')
const TMP = join(ROOT, 'out', 'm', 'seg')
mkdirSync(TMP, { recursive: true })

const V = '&H0099D334', B = '&H00FFFFFF', G = '&H00AFA39C'
const BANDE = 1430   // haut de la bande, sur 1920

/* [début, durée, kicker, grande ligne, petite ligne] — secondes du plan coupé. */
const CARTONS = {
  '01-board': [
    [0.3, 6.6, 'What this is', 'A business runs on ads.\\NRunning ads is a profession.',
      'This agent is that profession —\\Nfor anyone who does not have it.'],
    [7.2, 6.8, 'And it is already running', 'Yesterday it spent $19.23.\\NIt is telling you so, unasked.',
      '“The trench coat is wearing out:\\N$7.70 an order, up 272%.”'],
  ],
  '02-creatifs': [
    [0.3, 9.0, 'One sentence', '“Make three ad creatives for the\\Nwool overcoat, in English.”',
      'That is the whole instruction.\\NEverything after this is the agent.'],
    [10.0, 10.0, 'SAM 3.1 looks first', 'It cuts the coat out of the\\Ncatalogue photo before generating.',
      'The ad is built around THAT object —\\Nnot a description of one.'],
    [21.0, 10.0, 'Then Meta image generation', 'Three angles, three photographs\\Nthat never existed.',
      'Same coat, same collar, same cut.'],
    [55.0, 11.0, 'The text is drawn by code', 'Brand, headline, $118,\\N“Pay on delivery”, a button.',
      'Never by the image model:\\Nit reorders digits, and a wrong\\Nprice is a refused parcel.'],
    [67.0, 11.0, 'Two placements, every time', '4:5 for the feed.\\N9:16 for Reels and Stories.',
      'A creative the ad system crops\\Nloses its text.'],
  ],
  '03-boutique': [
    [0.3, 9.0, 'Now the shop', '“Build my shop in English,\\Ncash on delivery, all three products.”', ''],
    [10.0, 11.0, 'Written, not assembled', 'Meta Llama writes the storefront\\Nand one sales page per product.',
      'Headline, proof, objections, FAQ —\\Nfor these products, not a template.'],
    [36.0, 12.0, 'Live, at a real address', 'dar-ennour.sawt.dz',
      '$40 · $92.59 · $118 — one currency,\\Nthe same the agent quotes everywhere.'],
    [50.0, 12.0, 'He never opened an editor', 'No template, no theme, no builder.',
      'One sentence in. A shop out.'],
  ],
  '04-campagne': [
    [0.3, 9.0, 'The campaign', '“Algiers and Blida, women 25 to 45,\\NFacebook feed and Instagram Reels,\\N2000 DA a day.”', ''],
    [10.0, 9.0, 'It does not launch by itself', 'Built, then stopped at PAUSED.',
      'An agent that starts spending\\Nwithout being asked is not a feature.'],
    [20.0, 11.0, 'It asks, then goes live', 'On an explicit yes — and only then.',
      'Staged here and labelled SIMULATED.\\NWith your own Meta app it is not.'],
  ],
  '05-decision': [
    [0.3, 10.0, 'Days later, it reads back', '“Look at my campaigns and tell me\\Nwhat to do about them.”',
      'Spend, orders, cost per order —\\Nper campaign, per placement.'],
    [11.0, 11.0, 'It finds the pattern', 'The new coat returns an order at 269 DA.\\NThe trench coat costs 1,214.',
      'Same week. Same shop.'],
    [50.0, 12.0, 'Then it acts', 'It pauses the one that bleeds\\Nand redraws its creatives.',
      'Because the cost climbed 417% —\\Nthat is wear, not bad targeting,\\Nand more budget only spends faster.'],
    [66.0, 13.0, 'And it writes down why', 'Every change is recorded with the\\Nnumber that justified it.',
      'Not “budget changed”.\\NThe merchant can read back every\\Nmove — and disagree with any of them.'],
  ],
}

const TITRES = {
  ouverture: { duree: 7.5, l: [
    ['fs40', V, 'SAWT · صوت'],
    ['fs78', B, 'Run a business'], ['fs78', B, 'by talking to it.'],
    ['fs50', G, 'Find a product. Shoot the ads.'],
    ['fs50', G, 'Build the shop. Launch the campaign.'],
    ['fs50', G, 'Answer the customers.'],
    ['fs46', V, 'All of it, with Meta’s own AI models.'],
  ] },
  fin: { duree: 8.5, l: [
    ['fs40', V, 'WHAT YOU JUST SAW'],
    ['fs64', B, 'One sentence in.'],
    ['fs64', B, 'A shop, three ads and a'], ['fs64', B, 'live campaign out.'],
    ['fs48', G, 'Starting a business no longer takes'],
    ['fs48', G, 'capital or a product. It takes knowing'],
    ['fs48', G, 'how to run ads — and that is a profession.'],
    ['fs54', V, 'This agent is that profession.'],
    ['fs38', G, 'github.com/abdelrahmene/sawt'],
  ] },
}

const MONTAGE = [
  { titre: 'ouverture' },
  { plan: '01-board' },
  { plan: '02-creatifs', de: 0, a: 20 },
  { plan: '02-creatifs', de: 54, a: 74 },
  { plan: '03-boutique', de: 0, a: 21 },
  { plan: '03-boutique', de: 48, a: 62 },
  { plan: '04-campagne', de: 0, a: 31 },
  { plan: '05-decision', de: 0, a: 22 },
  { plan: '05-decision', de: 49, a: 75 },
  { titre: 'fin' },
]

const tc = (s) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:`
  + (s % 60).toFixed(2).padStart(5, '0')
const esc = (s) => String(s ?? '').replace(/[{}]/g, '')

const entete = (styles) => [
  '[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1080', 'PlayResY: 1920',
  'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '', '[V4+ Styles]',
  'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,'
    + ' Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline,'
    + ' Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  ...styles, '', '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
]

function assPlan(cartons) {
  const L = entete([
    `Style: Sub,Segoe UI,46,${B},${B},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,44,44,46,1`,
    'Style: Bande,Segoe UI,46,&H00000000,&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1',
  ])
  for (const [d, dur, k, g, p] of cartons) {
    const f = d + dur
    L.push(`Dialogue: 0,${tc(d)},${tc(f)},Bande,,0,0,0,,{\\fad(220,220)\\an7\\pos(0,0)\\p1`
      + `\\c&H0A0E12&\\alpha&H0E&\\bord0\\shad0}m 0 ${BANDE} l 1080 ${BANDE} 1080 1920 0 1920{\\p0}`)
    const corps = [
      `{\\fs28\\b1\\fsp4\\c${V}}${esc(k.toUpperCase())}{\\r}`,
      `{\\fs50\\b1\\c${B}}${esc(g)}{\\r}`,
      p ? `{\\fs40\\c${G}}${esc(p)}{\\r}` : null,
    ].filter(Boolean).join('\\N')
    L.push(`Dialogue: 1,${tc(d)},${tc(f)},Sub,,0,0,0,,{\\fad(220,220)}${corps}`)
  }
  return L.join('\n') + '\n'
}

async function carton(nom, i) {
  const { duree, l } = TITRES[nom]
  const corps = l.map(([fs, c, t]) => `{\\${fs}\\c${c}${/fs(7|6)/.test(fs) ? '\\b1' : ''}}${esc(t)}{\\r}`).join('\\N')
  const L = entete([`Style: T,Segoe UI,50,${B},${B},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,70,70,0,1`])
  L.push(`Dialogue: 0,0:00:00.00,${tc(duree)},T,,0,0,0,,{\\fad(400,400)}${corps}`)
  const base = `t-${i}-${nom}`
  writeFileSync(join(TMP, `${base}.ass`), L.join('\n') + '\n', 'utf8')
  await run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi',
    '-i', `color=c=0x07090C:s=1080x1920:r=30:d=${duree}`,
    '-vf', `subtitles=${base}.ass,fade=t=in:st=0:d=0.4,fade=t=out:st=${duree - .5}:d=0.5`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-an',
    `${base}.mp4`], { cwd: TMP, maxBuffer: 1 << 24 })
  return join(TMP, `${base}.mp4`)
}

async function extrait(plan, de, a, i) {
  const base = `s-${String(i).padStart(2, '0')}-${plan}`
  writeFileSync(join(TMP, `${base}.ass`), assPlan(CARTONS[plan] ?? []), 'utf8')
  const args = ['-v', 'error', '-y']
  if (de != null) args.push('-ss', String(de))
  args.push('-i', join(SRC, `${plan}.mp4`))
  const duree = a != null ? a - (de ?? 0) : null
  if (duree) args.push('-t', String(duree))
  // Le décalage remet les minutages des cartons à l'origine de l'extrait.
  const dec = de ? `,setpts=PTS+${de}/TB` : ''
  const fondu = duree
    ? `fade=t=in:st=${de ?? 0}:d=0.2,fade=t=out:st=${(de ?? 0) + duree - .25}:d=0.25`
    : 'fade=t=in:st=0:d=0.2'
  args.push('-vf', `setpts=PTS-STARTPTS${dec},subtitles=${base}.ass,${fondu},`
    + `setpts=PTS-STARTPTS,fps=30,format=yuv420p,scale=1080:1920`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', `${base}.mp4`)
  await run('ffmpeg', args, { cwd: TMP, maxBuffer: 1 << 24 })
  return join(TMP, `${base}.mp4`)
}

const morceaux = []
console.log('')
for (const [i, e] of MONTAGE.entries()) {
  morceaux.push(e.titre ? await carton(e.titre, i) : await extrait(e.plan, e.de, e.a, i))
  process.stdout.write('.')
}
const liste = join(TMP, 'liste.txt')
writeFileSync(liste, morceaux.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n') + '\n', 'utf8')
const sortie = join(ROOT, 'out', 'sawt-mobile-3min.mp4')
await run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', liste,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-an', sortie], { maxBuffer: 1 << 24 })
const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
  '-of', 'csv=p=0', sortie])
const d = Number(stdout.trim())
console.log(`\n  ✓  out/sawt-mobile-3min.mp4 — ${Math.floor(d / 60)} min ${String(Math.round(d % 60)).padStart(2, '0')} s`
  + `  (${morceaux.length} segments, 1080×1920)\n`)
rmSync(TMP, { recursive: true, force: true })
