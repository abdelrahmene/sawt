// Darija voice notes in, structured commerce intent out.
//
// Two paths on purpose:
//   - muse-voice-transcribe-1.0 through the Meta Model API
//   - muse-spark-open on Baseten, which accepts audio directly and needs no Meta account
//
// What matters commercially is not the transcript. Darija has no standard
// spelling, so word error rate is meaningless. What decides a sale is the
// INTENT and the ENTITIES — see bench/.
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { META } from '../config.js'
import { chat, visibleAnswer } from './llm.js'

// Left on auto-detect, a darija voice note does not come back as bad darija.
// It comes back as confident, fluent, invented ENGLISH — the model hedges
// towards the language it knows best and writes a plausible sentence that was
// never spoken. Observed on the very first clip we tried: a question about
// leather shoes was returned as "Say, Michael, could I get a model car?".
//
// So the language is pinned, and a prompt of domain vocabulary is passed to
// bias the decoder towards the words that actually occur in Algerian commerce.
// `bench/run.mjs --auto` measures how much this is worth.
const DARIJA_HINT = [
  'محادثة تجارية بالدارجة الجزائرية بين زبون وبائع.',
  'كلمات متوقعة: الثمن، شحال، بزاف، كاين، ماكانش، التوصيل، الدار، بوانتير، قياس، دينار، دج.',
  'ولايات: الجزائر، وهران، قسنطينة، عنابة، سطيف، البليدة، تيزي وزو، بجاية، تلمسان، باتنة.',
  'Mots français fréquents dans la phrase : livraison, pointure, taille, commande, stop desk.',
].join(' ')

export async function transcribe(audioPath, { language = 'ar', prompt = DARIJA_HINT } = {}) {
  if (!META.key) throw new Error('MODEL_API_KEY is required for transcription in live mode.')

  const form = new FormData()
  form.append('model', 'muse-voice-transcribe-1.0')
  form.append('file', new Blob([readFileSync(audioPath)]), basename(audioPath))
  // language = null means "let it auto-detect", which is the failure case above.
  if (language) form.append('language', language)
  if (prompt) form.append('prompt', prompt)

  const res = await fetch(`${META.base}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${META.key}` },
    body: form,
  })
  if (!res.ok) throw new Error(`transcribe ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = await res.json()
  return json.text ?? ''
}

export { DARIJA_HINT }

const INTENTS = [
  'price', 'sizes', 'availability', 'delivery_time', 'delivery_cost',
  'objection_quality', 'order', 'cancel', 'complaint', 'other',
]

const SYSTEM = `You read messages from Algerian customers written or spoken in darija
(a mix of Arabic, French and Berber, in Arabic or Latin script).
Return ONLY a JSON object, no prose, with exactly these keys:
  "intent"   one of: ${INTENTS.join(', ')}
  "wilaya"   the Algerian wilaya mentioned, or null
  "commune"  the commune mentioned, or null
  "quantity" integer or null
  "size"     the size or shoe size mentioned, or null
  "summary"  one short sentence in French`

export async function understand(text, opts = {}) {
  const msg = await chat(
    [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }],
    { temperature: 0, ...opts }
  )
  const raw = visibleAnswer(msg)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return { intent: 'other', wilaya: null, commune: null, quantity: null, size: null, summary: raw }
  try {
    return JSON.parse(match[0])
  } catch {
    return { intent: 'other', wilaya: null, commune: null, quantity: null, size: null, summary: raw }
  }
}

export { INTENTS }
