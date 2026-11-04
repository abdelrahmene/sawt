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
  /* Mêmes paliers de défilement que le 06, pour la même raison. Ici deux
     colonnes bougent : la conversation à gauche, les artefacts à droite. */
  '04-photo-creatifs': [
    [0.3, 8.2, 'The hard part',
      'He has one photo of his bag. Taken on a phone, in a café.',
      'That is what a real merchant has. Not a studio — a phone and bad light.'],
    [8.8, 8.4, 'It says what it could not do',
      'SAM 3.1 looked, and the café background was too busy to cut the bag out cleanly.',
      'It says so, and offers to re-shoot the photo — instead of quietly pretending.'],
    [17.6, 8.2, 'Three angles, written for this bag',
      'Hands-free everyday carry · compact but fits essentials · woven strap detail.',
      'Not slogans. Three reasons someone would buy this particular object.'],
    [26.0, 9.0, 'The text is drawn by code',
      'Brand, headline, $31.11, “Pay on delivery”, and a button.',
      'Composited on a canvas — never by the image model, which reorders digits.'],
    [35.2, 12.0, 'Two placements, every time',
      '4:5 for the feed. 9:16 for Reels and Stories. Both carry the price.',
      'A creative the ad system crops loses its text, so each one is composed on its own.'],
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
  /* Campagne, lancement, analyse et décision sont maintenant UN seul plan.
     Les trois précédents montraient la même vue que le 04 : le défilement
     n'avait pas suivi l'action, et personne ne s'en était aperçu avant de
     regarder le montage. Refilmer en défilant dans l'historique coûte une
     prise et aucun appel de modèle — les échanges étaient déjà là, en
     anglais, bien écrits. */
  '06-campagne': [
    [0.3, 8.2, 'The campaign, from one sentence',
      '“Algiers, Oran, Constantine. 18 to 45. Facebook feed and Instagram Reels. 2,000 DA a day.”',
      'That is everything the merchant says. The agent fills in the rest.'],
    /* Les bornes suivent les PALIERS DE DÉFILEMENT du plan, pas une grille
       régulière : 0, 8,6, 17,6, 25,8, 34, 42,2, 50,4. Un carton calé sur une
       grille annonçait la mise en pause pendant que l'écran montrait déjà le
       lancement — le jury lit le texte et voit autre chose. */
    [8.8, 8.4, 'Configured end to end, and stopped',
      'Objective Sales, daily budget, geography, age, placements, landing page, three creatives.',
      'Then it stops at PAUSED and asks. An agent that spends unasked is not a feature.'],
    [17.8, 7.6, 'It asks, then goes live',
      'On an explicit yes — and only then — the campaign flips to ACTIVE.',
      'Staged here and labelled SIMULATED. With your own Meta app it is not.'],
    [26.0, 7.6, 'What “active” means here',
      'Targeting, placements and the landing page, all linked and running.',
      'No money moves until a real Meta app is connected. The screen says so.'],
    [34.0, 8.0, 'Days later, it reads back',
      'Spend, orders, cost per order — campaign by campaign, placement by placement.',
      'Not a dashboard it shows you. Numbers it reads for itself.'],
    [42.2, 7.8, 'And it finds the pattern',
      'The bag returns an order at $3.61. The trench coat costs $9.93 and is getting worse.',
      'Same week, same budget, same shop.'],
    [50.4, 9.4, 'Then it acts, and writes down why',
      'It pauses the trench coat and funds the bag — in one instruction.',
      '“0 orders in 2 days while spending $18.52/day.” Not “budget changed.”'],
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
