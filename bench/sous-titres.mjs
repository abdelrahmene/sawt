/**
 * Les sous-titres sont gravés ICI, pas dans le navigateur.
 *
 * POURQUOI. La première méthode posait une barre `position:fixed` dans la page
 * juste avant de filmer. Mesuré sur les quatorze plans : trois seulement l'ont
 * enregistrée. Elle était pourtant dans le DOM, visible à la capture d'écran,
 * et absente de la vidéo — l'enregistreur du navigateur ne capte pas de façon
 * fiable un calque ajouté après le début de la prise. Et sur la page de vente,
 * qui est en largeur mobile, la barre sortait étroite et coupée en trois
 * lignes.
 *
 * Graver en post rend trois choses : la même typographie sur tous les plans,
 * des minutages que je choisis après avoir vu le plan au lieu de les deviner
 * pendant, et un texte qui se corrige sans refilmer.
 *
 *   node bench/sous-titres.mjs            tous les plans
 *   node bench/sous-titres.mjs 04         un seul
 *
 * Entrée  : out/film2/coupes/*.mp4
 * Sortie  : out/film2/titres/*.mp4
 */
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT } from '../src/config.js'

const run = promisify(execFile)
const SRC = join(ROOT, 'out', 'film2', 'coupes')
const OUT = join(ROOT, 'out', 'film2', 'titres')
mkdirSync(OUT, { recursive: true })

/* ── les cartons ───────────────────────────────────────────────────────────
   [début, durée, kicker, grande ligne, petite ligne]
   Les secondes sont celles du plan DÉJÀ coupé : le plan commence exactement
   quand l'action commence, puisque la coupe tombe sur le repère noir. */
export const CARTONS = {
  '01-board': [
    [0.3, 5.2, 'What this is',
      'A business runs on ads. Running ads is a profession.',
      'This agent is that profession — for anyone who does not have it.'],
    [5.8, 4.6, 'One instruction',
      'The merchant says what they want. In their own language.',
      'No campaign manager, no ad account training, no agency.'],
    [10.6, 4.0, 'Already running',
      'Yesterday it spent $17.84 and it is telling you so.',
      'The board is live from the first second, not after a setup wizard.'],
  ],
  '02-meta': [
    [0.3, 6.0, 'It plugs into a real Meta app',
      'This connects to a Meta app you created yourself.',
      'App ID, secret and redirect URI go in .env — then this flow is the real one.'],
    [6.8, 7.5, 'Thirteen permissions, named',
      'public_profile · pages_show_list · pages_messaging · ads_management …',
      'Real Graph API scope names. A judge can check every one against Meta’s docs.'],
    [14.8, 7.0, 'And it says what it is',
      'The badge reads SIMULATED, because here no real token is issued.',
      'With your own app credentials the same screen drives the real Graph API.'],
    [22.3, 8.0, 'What it refuses to do',
      'A feature you decline really is unavailable — not faked behind your back.',
      'The greyed permissions are the ones the basics genuinely need.'],
    [30.8, 8.0, 'Five assets granted',
      'A Facebook Page, an Instagram account, an ad account, a pixel, a catalogue.',
      'From here the agent works through the Marketing and Graph APIs.'],
  ],
  '03-catalogue': [
    [0.3, 5.6, 'Nothing to sell yet?',
      'Most people who want to start have no product and no supplier.',
      'So the agent opens a supplier catalogue and does the arithmetic.'],
    [6.2, 5.4, 'Cost, price, margin',
      'Your cost, the recommended price, and what you actually keep per order.',
      'In dollars, so the number means something outside Algeria too.'],
    [12.0, 4.6, 'Pick one and it is yours',
      'The product enters the shop with its photos and its real price.',
      'That is the whole onboarding.'],
  ],
  '04-photo-creatifs': [
    [0.3, 6.4, 'The hard part',
      'He has one photo of his bag. Taken on a phone, in a café.',
      'That is what a real merchant has. Not a studio — a phone and bad light.'],
    [7.2, 7.0, 'Meta SAM 3.1 looks first',
      'It cuts the bag out of the café before generating anything.',
      'The ad is then built around HIS object, not around a description of one.'],
    [15.0, 8.0, 'Then Meta image generation',
      'Three different shots: a packshot, the bag worn, a macro on the strap.',
      'Same bag, same woven strap, same zip. Three photographs that never existed.'],
    [24.0, 7.5, 'It says what it could not do',
      'The café background was busy, so the cut-out was not clean.',
      'It tells him, and offers to re-shoot the photo rather than hide it.'],
    [74.0, 8.0, 'The text is drawn by code',
      'Headline, price and call to action are composited on a canvas.',
      'Never by the image model: it reorders digits, and a wrong price is a refused parcel.'],
    [83.0, 7.5, 'Two placements, every time',
      '4:5 for the feed. 9:16 for Reels and Stories.',
      'A creative the ad system crops loses its text, so each one is composed on its own.'],
    [92.0, 8.0, 'What an ad looks like here',
      'Brand, headline, $31.11, “Pay on delivery”, and a button.',
      'This is the thing a merchant could not make alone, and the reason any of it sells.'],
  ],
  '05-page-boutique': [
    [0.3, 6.2, 'Now it needs somewhere to land',
      'An ad without a page is money spent on a click that goes nowhere.',
      'So the agent writes the sales page itself.'],
    [7.0, 7.0, 'Written by Meta Llama',
      'Headline, proof, objections, FAQ — written for this product.',
      'Not a template with the name swapped in: the arguments are about this bag.'],
    [15.0, 7.0, 'And the photos are his',
      'The page is built from the shots generated out of his own photo.',
      'The product on the page is the product in the parcel.'],
    [23.0, 7.5, 'Price, delivery, payment',
      '$31.11, 58 wilayas, cash on delivery, order form at the bottom.',
      'The three facts an Algerian buyer asks for before anything else.'],
    [36.0, 8.0, 'It is a real file',
      'A page you can open, share and send traffic to — not a preview.',
      'It lives at its own address from the moment it is written.'],
    [50.0, 9.0, 'In under a minute',
      'Product chosen, page written, photos placed, shop attached.',
      'The part that used to need a designer, a copywriter and a developer.'],
  ],
  '06-campagne': [
    [0.3, 6.0, 'Now the campaign',
      'Algiers, Oran, Constantine. Men and women, 18 to 45.',
      'Facebook feed and Instagram Reels. 2,000 DA a day.'],
    [6.6, 5.6, 'Configured end to end',
      'Objective, audience, geography, placements, budget, creatives.',
      'Every field a Meta campaign needs — filled from one sentence.'],
    [12.6, 4.2, 'Nothing is guessed',
      'The budget is the one he said. The product is the one he sells.',
      ''],
  ],
  '07-lancement': [
    [0.3, 6.5, 'It does not launch by itself',
      'The campaign is built, then stopped at PAUSED.',
      'An agent that starts spending without being asked is not a feature.'],
    [7.2, 6.8, 'It asks, in plain words',
      'It shows the budget, the audience and the creatives, then waits.',
      'Launch is a human decision, every time.'],
    [14.4, 6.0, 'Then it goes live',
      'On an explicit yes, the campaign flips to ACTIVE.',
      'Here that is staged and labelled SIMULATED — with your own app it is not.'],
  ],
  '08-analyse-decision': [
    [0.3, 6.5, 'Days later, it reads back',
      'Spend, orders, cost per order, placement by placement.',
      'Not a dashboard it shows you — numbers it reads for itself.'],
    [7.2, 7.0, 'It finds the pattern',
      'Instagram Reels costs $12.27 an order. Facebook feed costs $7.27.',
      'Same product, same week, same budget — a difference worth acting on.'],
    [14.6, 6.5, 'And it says so first',
      'It explains what it found before it proposes to change anything.',
      'The merchant can disagree while there is still money to save.'],
    [21.5, 6.0, 'This is the part nobody does',
      'Reading your own campaign every day is the job of an ad buyer.',
      'It is also the reason most small campaigns quietly lose money.'],
  ],
  '09-pause-scale': [
    [0.3, 6.0, 'Acting on what it found',
      'It read six days of its own numbers. Now it acts.',
      'The trench coat is burning money. The bag is paying for itself.'],
    [6.6, 8.5, 'Two campaigns, two directions',
      'One instruction stops one campaign and funds the other.',
      'Both go through the Marketing API — staged here, and labelled SIMULATED.'],
    [15.5, 9.5, 'And it writes down why',
      '“0 orders in 2 days while spending $18.52/day — campaign fatigued.”',
      'Not “budget changed”: the number that made it the right call.'],
  ],
  '11-darija': [
    [0.3, 5.6, 'One last thing',
      'Everything you have seen was driven in English.',
      'But the merchant is in Algeria, and this is not how he talks.'],
    [6.2, 7.5, 'His own words',
      'He holds the mic and speaks darija. Here, typed — the same path.',
      '“How are today’s orders? And how much did we spend on ads?”'],
    [14.2, 7.0, 'No translation step',
      'It reads the darija directly and goes to its own records.',
      'Orders today, ad spend today — read, not guessed.'],
    [21.6, 8.0, 'And it answers in darija',
      'He asked in darija. It answers in darija, in dollars, with real numbers.',
      'Every other word in this product is English. The person sets the language.'],
  ],
  '12-boutique': [
    [0.3, 6.0, 'The shop itself',
      'An ad needs somewhere to land. So it builds the shop.',
      'Not a template — HTML written for this shop by Meta Llama, in one pass.'],
    [6.6, 9.5, 'Writing the storefront',
      'Shop name, the product cards, the photos, the prices, the order form.',
      'Each photo is matched to its product by code — never by the model.'],
    [16.5, 7.0, 'Built, and reachable',
      'One sentence in. A shop at a real address out.',
      'He never opened an editor, never picked a template, never wrote a line.'],
    [24.0, 4.5, 'dar-ennour.sawt.dz',
      'Four products, four photos, four prices. Live.',
      ''],
  ],
  /* Le 10 n'est pas ici : il a été filmé avec la barre posée dans la page,
     elle s'est enregistrée correctement, et elle a la même typographie. Le
     regraver dessus ferait deux bandeaux superposés. */
  /* Le parcours client est coupé en deux parce qu'il se regarde en deux
     formats : la vitrine est une page de bureau, la page de vente est une
     page mobile. Les filmer au même cadrage donnait une colonne étroite
     perdue au milieu d'un 16:9. */
  '13a-vitrine': [
    [0.3, 6.5, 'What the customer sees',
      'The shop the agent just wrote. Four products, four different photos.',
      'The first is the merchant’s own phone photo — matched to it by code.'],
    [7.2, 6.5, 'One currency, everywhere',
      '$31.11 · $40.00 · $92.59 · $118. Cash on delivery, all 58 wilayas.',
      'The same figures the agent quotes in chat and to customers on Messenger.'],
  ],
  '13b-commande': [
    [0.3, 6.5, 'The sales page',
      'Meta Llama wrote this page for this product, and it opens on a phone.',
      'Headline, proof, objections, FAQ — not a template with the name swapped in.'],
    [7.2, 6.5, 'Its own argument',
      'Why someone would buy THIS bag, in sentences written for it.',
      'Built from the shots generated out of his own photo.'],
    [14.2, 6.5, 'The objections it answers',
      'Is the leather real? How long is delivery? What if I refuse it at the door?',
      'The three questions that decide a cash-on-delivery sale.'],
    [21.2, 7.0, 'The order form',
      'Name, phone, wilaya, commune. That is the whole checkout.',
      'No account, no password, no card — this is how Algeria actually buys online.'],
    [29.0, 7.5, 'She pays at the door',
      'Nothing is taken from her now. She pays the courier, or she refuses.',
      'Which is why a wrong price or a wrong photo costs a real parcel.'],
    [37.5, 8.0, 'Order placed',
      'Confirmed in English, because the shop is in English.',
      'Photo → ads → shop → order. One circuit, one session, nothing stubbed.'],
  ],
  '14-recu-journal': [
    [0.3, 7.0, 'It arrived',
      'The order is in the merchant’s dashboard, seconds later.',
      'Same product, same price, same session — $31.11, the figure on the ad.'],
    [7.6, 6.5, 'Orders, not revenue',
      'The screen says it itself: nothing is paid until the parcel is handed over.',
      'A tool that called this “revenue” would be lying to the person using it.'],
    [14.6, 7.0, 'And the whole trail',
      'Every decision the agent took, with the number that justified it.',
      'What it found, what it decided, what it spent, what it refused.'],
    [22.2, 8.0, 'Nothing happens off the record',
      'The merchant can read back every move — and disagree with any of them.',
      'That is what makes it an agent you can hand a budget to.'],
  ],
}

/* ── ASS ───────────────────────────────────────────────────────────────────
   Les couleurs ASS s'écrivent &HAABBGGRR : alpha, bleu, vert, rouge. C'est
   l'inverse du web, et c'est la seule erreur qu'on fait deux fois. */
const COUL = {
  vert: '&H0099D334',   // #34D399
  blanc: '&H00FFFFFF',
  gris: '&H00AFA39C',   // #9CA3AF
}
const BANDE_Y = 812      // haut de la bande, sur 1080

const esc = (s) => String(s ?? '').replace(/\{/g, '(').replace(/\}/g, ')')
const tc = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  const sec = (s % 60).toFixed(2).padStart(5, '0')
  return `${h}:${String(m).padStart(2, '0')}:${sec}`
}

export function ass(cartons) {
  const lignes = [
    '[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1920', 'PlayResY: 1080',
    'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,'
      + ' Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline,'
      + ' Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // Alignment 2 = bas centré. Pas de contour : le texte est sur une bande.
    `Style: Sub,Segoe UI,54,${COUL.blanc},${COUL.blanc},&H00000000,&H00000000,`
      + '0,0,0,0,100,100,0,0,1,0,0,2,80,80,52,1',
    // La bande est un dessin, donc ancrée en haut à gauche et sans marge.
    'Style: Bande,Segoe UI,54,&H00000000,&H00000000,&H00000000,&H00000000,'
      + '0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ]

  for (const [debut, duree, kicker, grand, petit] of cartons) {
    const fin = debut + duree
    // La bande : un rectangle plein, légèrement transparent, derrière le texte.
    lignes.push(
      `Dialogue: 0,${tc(debut)},${tc(fin)},Bande,,0,0,0,,`
      + `{\\fad(220,220)\\an7\\pos(0,0)\\p1\\c&H0A0E12&\\alpha&H10&\\bord0\\shad0}`
      + `m 0 ${BANDE_Y} l 1920 ${BANDE_Y} 1920 1080 0 1080{\\p0}`)

    // Le texte : kicker, grande ligne, petite ligne. `\fsp` écarte les lettres
    // du kicker, ce que `drawtext` ne sait pas faire — d'où libass et pas lui.
    const corps = [
      `{\\fs30\\b1\\fsp5\\c${COUL.vert}}${esc(kicker.toUpperCase())}{\\r}`,
      `{\\fs54\\b1\\c${COUL.blanc}}${esc(grand)}{\\r}`,
      petit ? `{\\fs44\\c${COUL.gris}}${esc(petit)}{\\r}` : null,
    ].filter(Boolean).join('\\N')
    lignes.push(`Dialogue: 1,${tc(debut)},${tc(fin)},Sub,,0,0,0,,{\\fad(220,220)}${corps}`)
  }
  return lignes.join('\n') + '\n'
}

/* ── gravure ─────────────────────────────────────────────────────────────── */
const seul = process.argv[2]
const plans = readdirSync(SRC)
  .filter((f) => f.endsWith('.mp4'))
  .filter((f) => !seul || f.startsWith(seul))
  .sort()

if (!plans.length) { console.log(`\n  Aucun plan dans out/film2/coupes.\n`); process.exit(0) }

console.log('')
let ok = 0
for (const f of plans) {
  const nom = f.replace(/\.mp4$/, '')
  const cartons = CARTONS[nom]
  if (!cartons) { console.log(`  ·  ${nom.padEnd(22)} pas de carton — copié tel quel`) }

  const assPath = join(OUT, `${nom}.ass`)
  writeFileSync(assPath, ass(cartons ?? []), 'utf8')

  /* ⚠️ LE CHEMIN DU .ASS NE PASSE PAS DANS UN FILTRE SOUS WINDOWS.
     « C: » contient deux-points, et le parseur de filtres s'en sert pour
     séparer les options : `subtitles=C:/...` devient l'option `/...` du
     filtre et ffmpeg répond « Error applying option 'original_size' ».
     L'échapper marche selon la version de ffmpeg et le shell, donc on ne
     l'échappe pas : on lance ffmpeg DEPUIS le dossier et on ne lui donne
     que le nom du fichier. Aucun caractère à échapper, aucune version à
     deviner. */
  await run('ffmpeg', [
    '-v', 'error', '-y', '-i', join(SRC, f),
    '-vf', `subtitles=${nom}.ass`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
    f,
  ], { cwd: OUT, maxBuffer: 1 << 24 })

  console.log(`  ✓  ${nom.padEnd(22)} ${(cartons ?? []).length} carton(s)`)
  ok++
}
console.log(`\n  ${ok}/${plans.length} plan(s) sous-titrés dans out/film2/titres/\n`)
