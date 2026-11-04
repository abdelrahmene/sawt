// Darija comprehension benchmark.
//
// Not word error rate. Darija has no standard orthography — it mixes Arabic,
// French and Berber and is written in two scripts, so WER punishes spelling
// choices that no two Algerians agree on anyway.
//
// What is measured instead is what decides a sale:
//   intent accuracy   — did it understand what the customer wants?
//   entity accuracy   — did it get the wilaya, the commune, the quantity, the size?
//
// A rough transcript that returns the right wilaya and the right size is a
// commercial success. A perfect transcript that loses the wilaya is worthless.
//
// ⚠️ DEUX BANCS, PAS UN — et c'est le piège dans lequel celui-ci est tombé.
//
// Il lisait truth.jsonl, passait `c.text` à understand(), et imprimait
// « n = 3 clips ». Il ne touchait JAMAIS bench/clips/ et n'appelait JAMAIS
// transcribe() : il mesurait la compréhension d'un darija ÉCRIT, en donnant
// au modèle la transcription parfaite qu'on prétendait tester. La moitié
// vocale d'un projet qui s'appelle « la voix » n'était pas mesurée, et le
// tableau destiné au README affirmait le contraire.
//
// Maintenant : quand un clip existe pour un cas, on le transcrit d'abord et
// la compréhension part de CE texte-là — donc le chiffre inclut ce que
// l'oreille a perdu. Quand il n'existe pas, on retombe sur le texte de
// référence, et la colonne `heard` le dit à la ligne près. Un banc qui ne
// peut pas distinguer les deux ne vaut pas la peine d'être lu.
//
//   node bench/run.mjs                    # all providers in .env
//   node bench/run.mjs --provider meta
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { understand, transcribe } from '../src/models/voice.js'
import { sameWilaya } from '../src/dz/wilayas.js'
import { arg } from '../src/config.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const TRUTH = join(HERE, 'truth.jsonl')
const CLIPS = join(HERE, 'clips')

if (!existsSync(TRUTH)) {
  console.error(`\n  Missing ${TRUTH}\n  Add one JSON object per line — see bench/README.md\n`)
  process.exit(1)
}

const cases = readFileSync(TRUTH, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('//'))
  .map((l) => JSON.parse(l))

const ENTITIES = ['wilaya', 'commune', 'quantity', 'size']
const norm = (v) =>
  v === null || v === undefined ? null : String(v).trim().toLowerCase().replace(/\s+/g, ' ')

// « Oran » et « وهران » sont la même ville. Le banc comparait les chaînes et
// notait donc le modèle sur un choix d'alphabet : cinq appels identiques,
// quatre « Oran », un « وهران », et une colonne qui passait de 100 % à 0 %
// d'un lancement à l'autre. La wilaya se compare par son NUMÉRO officiel.
const egal = (champ, attendu, obtenu) =>
  champ === 'wilaya' ? sameWilaya(attendu, obtenu) : norm(attendu) === norm(obtenu)

// Le clip d'un cas, s'il a été enregistré. Le nom vient de truth.jsonl, et
// l'extension n'est pas imposée : on enregistre avec ce qu'on a sous la main.
const clipDe = (c) => {
  const noms = c.clip
    ? [c.clip, ...['m4a', 'mp3', 'wav', 'ogg', 'webm'].map((e) => c.clip.replace(/\.[^.]+$/, '.' + e))]
    : []
  for (const n of noms) {
    const p = join(CLIPS, n)
    if (existsSync(p)) return p
  }
  return null
}

const providers = arg('provider') ? [arg('provider')] : ['meta', 'baseten']
const results = []
let entendus = 0

for (const provider of providers) {
  let intentOk = 0
  const entityOk = Object.fromEntries(ENTITIES.map((e) => [e, { ok: 0, seen: 0 }]))
  let failed = 0
  let heard = 0

  for (const [i, c] of cases.entries()) {
    process.stdout.write(`\r  ${provider}  ${i + 1}/${cases.length}   `)
    let got
    try {
      // La vraie chaîne quand l'audio est là : oreille d'abord, compréhension
      // ensuite, sur ce que l'oreille a rendu. Si la transcription échoue on
      // compte le cas comme perdu plutôt que de le sauver avec le texte de
      // référence — ce serait exactement le mensonge qu'on vient de corriger.
      const clip = clipDe(c)
      let texte = c.text
      if (clip) {
        // ⚠️ `transcribe()` rend UNE CHAÎNE, pas un objet (src/models/voice.js:90-93) :
        // elle joint les tours de parole, ou retombe sur `json.transcript`. Ce banc
        // lisait `.text` dessus, donc `undefined ?? ''` — chaîne vide — donc le cas
        // partait dans `failed` juste en dessous. TOUT cas pourvu d'un clip était
        // compté en échec, et personne ne l'avait vu parce que `bench/clips/` n'a
        // jamais existé. Le tableau promis au README aurait annoncé zéro entendu.
        //
        // Les deux autres appelants la traitaient déjà correctement comme une chaîne
        // (src/server.js:320, bench/try-one.mjs:37) — ce banc était le seul à se
        // tromper, et c'était celui dont le résultat allait être publié.
        texte = (await transcribe(clip)) ?? ''
        if (typeof texte !== 'string') texte = String(texte ?? '')
        if (!texte.trim()) { failed++; continue }
        heard++
      }
      got = await understand(texte, { provider })
    } catch (e) {
      failed++
      continue
    }
    if (norm(got.intent) === norm(c.intent)) intentOk++
    for (const e of ENTITIES) {
      if (c[e] === null || c[e] === undefined) continue
      entityOk[e].seen++
      if (egal(e, c[e], got[e])) entityOk[e].ok++
    }
  }

  const n = cases.length - failed
  entendus = Math.max(entendus, heard)
  results.push({
    provider,
    n,
    failed,
    heard,
    intent: n ? (100 * intentOk) / n : 0,
    entities: Object.fromEntries(
      ENTITIES.map((e) => [e, entityOk[e].seen ? (100 * entityOk[e].ok) / entityOk[e].seen : null])
    ),
  })
}

process.stdout.write('\r' + ' '.repeat(40) + '\r')

const pct = (v) => (v === null ? '  —  ' : `${v.toFixed(1)}%`.padStart(6))

// Le titre dit exactement ce qui a été mesuré. C'est tout l'enjeu : un
// tableau collé dans le README est une affirmation, et une affirmation que
// le dépôt ne soutient pas coûte plus cher que pas de tableau du tout.
const quoi = entendus === cases.length ? 'from audio'
  : entendus === 0 ? 'from WRITTEN darija — no clip recorded, the ear is NOT measured'
  : `${entendus} of ${cases.length} from audio, the rest from written darija`
console.log(`\n  Darija understanding — n = ${cases.length} cases, ${quoi}\n`)
console.log(`  ${'provider'.padEnd(12)}${'heard'.padStart(7)}${'intent'.padStart(8)}${ENTITIES.map((e) => e.padStart(10)).join('')}${'failed'.padStart(9)}`)
console.log(`  ${'─'.repeat(12 + 7 + 8 + 10 * ENTITIES.length + 9)}`)
for (const r of results) {
  console.log(
    `  ${r.provider.padEnd(12)}${String(r.heard).padStart(7)}${pct(r.intent).padStart(8)}` +
    ENTITIES.map((e) => pct(r.entities[e]).padStart(10)).join('') +
    `${String(r.failed).padStart(9)}`
  )
}

if (entendus < cases.length) {
  const manque = cases.filter((c) => !clipDe(c)).map((c) => c.clip ?? '?')
  console.log(`\n  ⚠ ${manque.length} clip(s) missing from bench/clips/ — these rows were`)
  console.log(`    scored on the reference transcript, so they say nothing about the ear:`)
  console.log(`    ${manque.join(' ')}`)
}
if (cases.length < 20) {
  console.log(`\n  ⚠ truth.jsonl holds ${cases.length} case(s). The README table is meant to`)
  console.log(`    rest on 20 — below that, one mistake moves a column by 30 points.`)
}
console.log(`\n  Paste this table into the README. Regenerate with \`npm run bench\`.\n`)
