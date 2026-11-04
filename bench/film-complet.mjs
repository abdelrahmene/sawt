/**
 * Le film de soumission : toutes les étapes, sous-titres HORS de l'image.
 *
 * POURQUOI CELUI-CI EXISTE. Les deux premiers posaient le texte PAR-DESSUS
 * l'interface : lisible, mais il mangeait le bas de chaque écran — justement
 * là où se trouvent le compositeur, les boutons et les totaux. Ici l'image de
 * l'app occupe le haut du cadre et le texte vit dans une bande qui lui est
 * réservée, en dessous. Rien n'est recouvert, et le juré lit sans arbitrer
 * entre le texte et ce qu'il décrit.
 *
 * L'app passe de 1920×1080 à 1472×828 : elle a été filmée avec un zoom de 1,5,
 * donc elle reste plus grosse à l'écran qu'un navigateur ordinaire malgré la
 * réduction.
 *
 * La musique est SYNTHÉTISÉE ici, pas empruntée : quatre sinusoïdes tenues en
 * la mineur, un trémolo lent, un filtre passe-bas et un écho. Zéro droit à
 * demander, zéro fichier à embarquer, et ça ne couvre pas la lecture.
 *
 *   node bench/film-complet.mjs
 *
 * Entrée  : out/film2/coupes/*.mp4   (sans sous-titres incrustés)
 * Sortie  : out/sawt-final.mp4
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT } from '../src/config.js'

const run = promisify(execFile)
const SRC = join(ROOT, 'out', 'film2', 'coupes')
const TMP = join(ROOT, 'out', 'film2', 'fin')
mkdirSync(TMP, { recursive: true })

const V = '&H0099D334', B = '&H00FFFFFF', G = '&H00AFA39C'
const HAUT = 828          // hauteur de l'image de l'app
const LARGE = 1472        // largeur correspondante, en 16:9

/* Les plans, dans l'ordre du récit. `de`/`a` sont des secondes du plan coupé.
   `cartons` : [début relatif à `de`, durée, kicker, grande ligne, petite ligne] */
const FILM = [
  { titre: 'ouverture' },

  { plan: '01-board', de: 0, a: 14.9, cartons: [
    [0.2, 7.0, 'What this is', 'A business runs on ads — and running ads is a profession.',
      'This agent is that profession, for anyone who does not have it.'],
    [7.4, 7.2, 'Already running', 'It opens on a shop that is already live and already spending.',
      'Yesterday: $17.84 spent, and it tells you so before you ask.'],
  ] },

  { plan: '02-meta', de: 0, a: 24, cartons: [
    [0.2, 7.5, 'Step 1 — Continue with Facebook', 'It connects to a Meta app you created yourself.',
      'App ID, secret and redirect URI in .env, and this flow is the real one.'],
    [8.0, 8.0, 'Thirteen permissions, named', 'public_profile · pages_show_list · pages_messaging · ads_management …',
      'Real Graph API scope names. A judge can check every one against Meta’s docs.'],
    [16.4, 7.4, 'And it says what it is', 'The badge reads SIMULATED, because no real token is issued here.',
      'Refuse a permission and the feature it unlocks really disappears.'],
  ] },

  { plan: '03-catalogue', de: 0, a: 17.4, cartons: [
    [0.2, 8.0, 'Step 2 — Nothing to sell yet?', 'A supplier catalogue is inside the app, with the arithmetic done.',
      'Your cost, the price, and what you actually keep on each order.'],
    [8.6, 8.6, 'Pick one and it is yours', 'The product enters the shop with its photos and its real price.',
      'That is the entire onboarding.'],
  ] },

  { plan: '04-photo-creatifs', de: 0, a: 17.5, cartons: [
    [0.2, 8.2, 'Step 3 — One photo, taken on a phone', 'A dark leather bag, shot in a café. That is what a merchant has.',
      'Not a studio: a phone, bad light and a busy background.'],
    [8.6, 8.6, 'Meta SAM 3.1 looks first', 'It cuts the bag out before anything is generated —',
      'so the ad is built around HIS object, not a description of one.'],
  ] },
  { plan: '04-photo-creatifs', de: 26, a: 44, cartons: [
    [0.2, 8.6, 'Then Meta image generation', 'Brand, headline, $31.11, “Pay on delivery”, and a button.',
      'Three photographs of his bag that never existed.'],
    [9.0, 8.8, 'The text is drawn by code', 'Headline and price are composited on a canvas, never by the model.',
      'An image model reorders digits — and a wrong price is a refused parcel.'],
  ] },

  { plan: '05-page-boutique', de: 0, a: 21, cartons: [
    [0.2, 7.0, 'Step 4 — The landing page', 'An ad without a page is money spent on a click that goes nowhere.',
      'So Meta Llama writes the sales page itself.'],
    [7.4, 6.8, 'Written for this product', 'Headline, proof, objections, FAQ — about this bag.',
      'Not a template with the name swapped in.'],
    [14.6, 6.2, 'And it is a real file', 'A page you can open, share and send traffic to.',
      'Not a preview — it lives at its own address.'],
  ] },

  { plan: '12-boutique', de: 6, a: 24, cartons: [
    [0.2, 8.6, 'Step 5 — The shop itself', 'Shop name, product cards, photos, prices, order form.',
      'HTML written for this shop in one pass. No template, no builder.'],
    [9.0, 8.8, 'Each photo matched by code', 'The merchant’s own phone photo goes on his own product.',
      'Never by the model: a card showing the neighbour’s article is a refused parcel.'],
  ] },

  { plan: '13a-vitrine', de: 0, a: 13.6, cartons: [
    [0.2, 6.6, 'What the customer sees', 'Four products, four different photos, live at dar-ennour.sawt.dz.', ''],
    [7.0, 6.4, 'One currency, everywhere', '$31.11 · $40.00 · $92.59 · $118 — cash on delivery, all 58 wilayas.',
      'The same figures the agent quotes in chat and to customers on Messenger.'],
  ] },

  { plan: '06-campagne', de: 0, a: 26, cartons: [
    [0.2, 8.4, 'Step 6 — The campaign, from one sentence',
      '“Algiers, Oran, Constantine. 18 to 45. Feed and Reels. 2,000 DA a day.”',
      'That is all the merchant says. The agent fills in the rest.'],
    [8.8, 8.4, 'Configured end to end', 'Objective, budget, geography, age, placements, landing page, creatives.',
      'Then it stops at PAUSED and asks.'],
    [17.6, 8.0, 'It does not launch by itself', 'On an explicit yes — and only then — it flips to ACTIVE.',
      'An agent that starts spending without being asked is not a feature.'],
  ] },
  { plan: '06-campagne', de: 34, a: 60.5, cartons: [
    [0.2, 8.0, 'Step 7 — Days later, it reads back',
      'Spend, orders, cost per order — campaign by campaign, placement by placement.',
      'Not a dashboard it shows you. Numbers it reads for itself.'],
    [8.4, 7.8, 'It finds the pattern', 'The bag returns an order at $3.61. The trench coat costs $9.93.',
      'Same week, same budget, same shop.'],
    [16.4, 9.8, 'Then it acts, and writes down why',
      'It pauses the one that bleeds and funds the one that works.',
      '“0 orders in 2 days while spending $18.52/day.” Not “budget changed”.'],
  ] },

  { plan: '10-clients', de: 0, a: 22, cartons: [
    [0.2, 7.0, 'Step 8 — The customers', 'Messages and comments arrive on the Page all day.',
      'Messenger, Instagram, and the comments under every post.'],
    [7.4, 7.2, 'Each in their own language', 'Eight customers wrote in English. One wrote in darija.',
      'It answers each one in the language they used.'],
    [15.0, 6.8, 'And here it refuses', '“Is the black one still in stock?” — it does not know.',
      'So it hands the thread back and names the one fact it needs.'],
  ] },

  { plan: '13b-commande', de: 20, a: 38, cartons: [
    [0.2, 8.6, 'Step 9 — A customer orders', 'Name, phone, wilaya, commune. That is the whole checkout.',
      'No account, no password, no card.'],
    [9.0, 8.8, 'She pays at the door', 'Nothing is taken now. She pays the courier, or she refuses.',
      'Which is why a wrong price or a wrong photo costs a real parcel.'],
  ] },

  { plan: '14-recu-journal', de: 0, a: 18, cartons: [
    [0.2, 8.6, 'Step 10 — The order lands', 'Seconds later it is in the merchant’s dashboard.',
      'Same product, same price, same session — $31.11, the figure on the ad.'],
    [9.0, 8.8, 'Orders, not revenue', 'The screen says so itself: nothing is paid until the parcel is handed over.',
      'A tool that called this “revenue” would be lying to the person using it.'],
  ] },
  { plan: '14-recu-journal', de: 20, a: 31.8, cartons: [
    [0.2, 11.4, 'Nothing happens off the record',
      'Every decision, with the number that justified it, in one timeline.',
      'What it found, what it decided, what it spent, what it refused.'],
  ] },

  { plan: '11-darija', de: 14, a: 29.5, cartons: [
    [0.2, 7.4, 'And he does not speak English', 'He holds the mic and speaks darija. Here, typed — the same path.',
      '“How are today’s orders? And how much did we spend on ads?”'],
    [7.8, 7.5, 'It answers in darija', 'No translation step. It reads darija and goes to its own records.',
      'Everything else in this product is English. The person sets the language.'],
  ] },

  { titre: 'fin' },
]

const TITRES = {
  ouverture: { duree: 8, l: [
    ['fs40', V, 'SAWT · صوت'],
    ['fs80', B, 'Run an online business by talking to it.'],
    ['fs50', G, 'Find a product. Shoot the ads. Write the page.'],
    ['fs50', G, 'Build the shop. Launch the campaign.'],
    ['fs50', G, 'Answer the customers. Take the orders.'],
    ['fs46', V, 'All of it, with Meta’s own AI models.'],
  ] },
  fin: { duree: 9, l: [
    ['fs40', V, 'WHAT YOU JUST SAW'],
    ['fs66', B, 'One photo in. A shop, three ads, a live campaign,'],
    ['fs66', B, 'nine answered customers and a paid order out.'],
    ['fs48', G, 'Starting a business no longer takes capital or a product.'],
    ['fs48', G, 'It takes knowing how to run ads — and that is a profession.'],
    ['fs56', V, 'This agent is that profession.'],
    ['fs38', G, 'github.com/abdelrahmene/sawt · Meta Model API · SAM 3.1 · open source'],
  ] },
}

const tc = (s) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:`
  + (s % 60).toFixed(2).padStart(5, '0')
const esc = (s) => String(s ?? '').replace(/[{}]/g, '')

const entete = (styles) => [
  '[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1920', 'PlayResY: 1080',
  'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '', '[V4+ Styles]',
  'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,'
    + ' Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline,'
    + ' Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  ...styles, '', '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
]

/** Les cartons, dans la bande RÉSERVÉE sous l'image. Rien ne recouvre l'app. */
function assPlan(cartons) {
  const L = entete([
    // Alignment 8 = haut centré ; la marge du haut place le texte dans la bande.
    `Style: Sub,Segoe UI,44,${B},${B},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,8,90,90,${HAUT + 22},1`,
  ])
  for (const [d, dur, k, g, p] of cartons) {
    const corps = [
      `{\\fs26\\b1\\fsp4\\c${V}}${esc(k.toUpperCase())}{\\r}`,
      `{\\fs44\\b1\\c${B}}${esc(g)}{\\r}`,
      p ? `{\\fs36\\c${G}}${esc(p)}{\\r}` : null,
    ].filter(Boolean).join('\\N')
    L.push(`Dialogue: 1,${tc(d)},${tc(d + dur)},Sub,,0,0,0,,{\\fad(200,200)}${corps}`)
  }
  return L.join('\n') + '\n'
}

async function carton(nom, i) {
  const { duree, l } = TITRES[nom]
  const corps = l.map(([fs, c, t]) => `{\\${fs}\\c${c}${/fs(8|7|6)/.test(fs) ? '\\b1' : ''}}${esc(t)}{\\r}`).join('\\N')
  const L = entete([`Style: T,Segoe UI,50,${B},${B},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,100,100,0,1`])
  L.push(`Dialogue: 0,0:00:00.00,${tc(duree)},T,,0,0,0,,{\\fad(400,400)}${corps}`)
  const base = `t-${i}-${nom}`
  writeFileSync(join(TMP, `${base}.ass`), L.join('\n') + '\n', 'utf8')
  await run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi',
    '-i', `color=c=0x07090C:s=1920x1080:r=30:d=${duree}`,
    '-vf', `subtitles=${base}.ass,fade=t=in:st=0:d=0.4,fade=t=out:st=${duree - 0.5}:d=0.5`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-an',
    `${base}.mp4`], { cwd: TMP, maxBuffer: 1 << 24 })
  return join(TMP, `${base}.mp4`)
}

async function extrait(e, i) {
  const base = `s-${String(i).padStart(2, '0')}-${e.plan}`
  writeFileSync(join(TMP, `${base}.ass`), assPlan(e.cartons ?? []), 'utf8')
  const duree = e.a - e.de
  // L'app en haut, la bande de texte dessous. `pad` crée la bande ; elle est
  // peinte par la couleur de fond, donc elle n'existe que pour le texte.
  const vf = [
    `scale=${LARGE}:${HAUT}:flags=lanczos`,
    `pad=1920:1080:(ow-iw)/2:0:color=0x07090C`,
    `subtitles=${base}.ass`,
    `fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, duree - 0.25)}:d=0.25`,
    'fps=30,format=yuv420p',
  ].join(',')
  await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(e.de), '-t', String(duree),
    '-i', join(SRC, `${e.plan}.mp4`), '-vf', vf,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', `${base}.mp4`],
    { cwd: TMP, maxBuffer: 1 << 24 })
  return join(TMP, `${base}.mp4`)
}

/* ── le montage ──────────────────────────────────────────────────────────── */
console.log('')
const morceaux = []
for (const [i, e] of FILM.entries()) {
  morceaux.push(e.titre ? await carton(e.titre, i) : await extrait(e, i))
  process.stdout.write('.')
}
const liste = join(TMP, 'liste.txt')
writeFileSync(liste, morceaux.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n') + '\n', 'utf8')
const muet = join(TMP, 'muet.mp4')
await run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', liste,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-an', muet],
  { maxBuffer: 1 << 24 })

const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
  '-of', 'csv=p=0', muet])
const duree = Number(stdout.trim())

/* ── la musique ──────────────────────────────────────────────────────────── */
// La mineur tenu : A2, E3, A3, C4. Un trémolo très lent, un passe-bas pour
// enlever la dureté des sinus, un écho court pour la profondeur, et un volume
// bas : elle doit porter le film, pas se faire remarquer.
const notes = [110, 164.81, 220, 261.63]
const src = notes.map((f) => `sine=frequency=${f}:duration=${Math.ceil(duree)}`)
// L'entrée 0 est la vidéo muette ; les sinus commencent à 1.
const mix = notes.map((_, i) => `[${i + 1}:a]volume=${[0.30, 0.17, 0.13, 0.09][i]}[a${i}]`).join(';')
const chaine = `${mix};${notes.map((_, i) => `[a${i}]`).join('')}amix=inputs=4:normalize=0,`
  + 'tremolo=f=0.11:d=0.35,lowpass=f=900,aecho=0.8:0.85:320|540:0.28|0.2,'
  + `volume=0.16,afade=t=in:st=0:d=3,afade=t=out:st=${Math.max(0, duree - 5)}:d=5`

const sortie = join(ROOT, 'out', 'sawt-final.mp4')
await run('ffmpeg', ['-v', 'error', '-y', '-i', muet,
  ...src.flatMap((s) => ['-f', 'lavfi', '-i', s]),
  '-filter_complex', chaine + '[mus]', '-map', '0:v', '-map', '[mus]',
  '-shortest', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
  '-movflags', '+faststart', sortie], { maxBuffer: 1 << 24 })

const { stdout: d2 } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
  '-of', 'csv=p=0', sortie])
const f = Number(d2.trim())
console.log(`\n  ✓  out/sawt-final.mp4 — ${Math.floor(f / 60)} min ${String(Math.round(f % 60)).padStart(2, '0')} s`
  + `  (${morceaux.length} segments · 1920×1080 · sous-titres hors image · musique)\n`)
rmSync(TMP, { recursive: true, force: true })
