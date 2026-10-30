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
  process.stdout.write('\n  transcribing with muse-voice-transcribe-1.0 … ')
  const t0 = Date.now()
  heard = await transcribe(file)
  console.log(`${Date.now() - t0} ms`)
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
