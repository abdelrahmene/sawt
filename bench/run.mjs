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
//   node bench/run.mjs                    # all providers in .env
//   node bench/run.mjs --provider meta
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { understand } from '../src/models/voice.js'
import { arg } from '../src/config.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const TRUTH = join(HERE, 'truth.jsonl')

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

const providers = arg('provider') ? [arg('provider')] : ['meta', 'baseten']
const results = []

for (const provider of providers) {
  let intentOk = 0
  const entityOk = Object.fromEntries(ENTITIES.map((e) => [e, { ok: 0, seen: 0 }]))
  let failed = 0

  for (const [i, c] of cases.entries()) {
    process.stdout.write(`\r  ${provider}  ${i + 1}/${cases.length}   `)
    let got
    try {
      got = await understand(c.text, { provider })
    } catch (e) {
      failed++
      continue
    }
    if (norm(got.intent) === norm(c.intent)) intentOk++
    for (const e of ENTITIES) {
      if (c[e] === null || c[e] === undefined) continue
      entityOk[e].seen++
      if (norm(got[e]) === norm(c[e])) entityOk[e].ok++
    }
  }

  const n = cases.length - failed
  results.push({
    provider,
    n,
    failed,
    intent: n ? (100 * intentOk) / n : 0,
    entities: Object.fromEntries(
      ENTITIES.map((e) => [e, entityOk[e].seen ? (100 * entityOk[e].ok) / entityOk[e].seen : null])
    ),
  })
}

process.stdout.write('\r' + ' '.repeat(40) + '\r')

const pct = (v) => (v === null ? '  —  ' : `${v.toFixed(1)}%`.padStart(6))
console.log(`\n  Darija comprehension — n = ${cases.length} clips\n`)
console.log(`  ${'provider'.padEnd(12)}${'intent'.padStart(8)}${ENTITIES.map((e) => e.padStart(10)).join('')}${'failed'.padStart(9)}`)
console.log(`  ${'─'.repeat(12 + 8 + 10 * ENTITIES.length + 9)}`)
for (const r of results) {
  console.log(
    `  ${r.provider.padEnd(12)}${pct(r.intent).padStart(8)}` +
    ENTITIES.map((e) => pct(r.entities[e]).padStart(10)).join('') +
    `${String(r.failed).padStart(9)}`
  )
}
console.log(`\n  Paste this table into the README. Regenerate with \`npm run bench\`.\n`)
