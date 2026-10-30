// The thirty-minute question: do these models actually understand darija?
//
//   node bench/try-one.mjs bench/clips/01.m4a          # audio
//   node bench/try-one.mjs --text "شحال الثمن تاعو؟"   # text only, no audio needed
//
// Prints the transcript, then the intent and the entities — which is what
// actually decides a sale. A rough transcript that returns the right wilaya
// and the right size is a success; a perfect one that loses the wilaya is not.
import { existsSync } from 'node:fs'
import { transcribe, understand } from '../src/models/voice.js'
import { META, BASETEN, arg } from '../src/config.js'

const text = arg('text')
const file = process.argv.slice(2).find((a) => !a.startsWith('--') && a !== text)

if (!text && !file) {
  console.error('\n  node bench/try-one.mjs <audio-file>\n  node bench/try-one.mjs --text "..."\n')
  process.exit(1)
}
if (file && !existsSync(file)) {
  console.error(`\n  Not found: ${file}\n`)
  process.exit(1)
}

let heard = text
if (file) {
  if (!META.key) {
    console.error('\n  MODEL_API_KEY is required to transcribe audio. Put it in .env\n')
    process.exit(1)
  }
  console.log('')

  // Auto-detect is shown on purpose. Left to guess, the model does not return
  // broken darija — it returns fluent, confident, invented English. Seeing the
  // two side by side is the whole argument for pinning the language.
  const t1 = Date.now()
  const auto = await transcribe(file, { languageBias: null })
    .catch((e) => `FAILED ${e.message.slice(0, 80)}`)
  console.log(`  auto-detect   ${auto}`)
  console.log(`  ${' '.repeat(13)}${Date.now() - t1} ms\n`)

  const t2 = Date.now()
  heard = await transcribe(file)
  console.log(`  Arabic bias   ${heard}`)
  console.log(`  ${' '.repeat(13)}${Date.now() - t2} ms`)
}

console.log(`\n  heard  ${heard}\n`)

for (const provider of ['meta', 'baseten']) {
  const key = provider === 'meta' ? META.key : BASETEN.key
  if (!key) { console.log(`  ${provider.padEnd(9)} (no key, skipped)`); continue }
  const t0 = Date.now()
  try {
    const u = await understand(heard, { provider })
    console.log(
      `  ${provider.padEnd(9)} intent=${String(u.intent).padEnd(18)}` +
      `wilaya=${String(u.wilaya).padEnd(10)}commune=${String(u.commune).padEnd(12)}` +
      `qty=${String(u.quantity).padEnd(5)}size=${String(u.size).padEnd(6)}${Date.now() - t0} ms`
    )
    if (u.summary) console.log(`  ${' '.repeat(9)} ${u.summary}`)
  } catch (e) {
    console.log(`  ${provider.padEnd(9)} FAILED  ${e.message.slice(0, 120)}`)
  }
}
console.log('')
