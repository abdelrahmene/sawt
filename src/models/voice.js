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

export async function transcribe(audioPath) {
  if (!META.key) throw new Error('MODEL_API_KEY is required for transcription in live mode.')

  const form = new FormData()
  form.append('model', 'muse-voice-transcribe-1.0')
  form.append('file', new Blob([readFileSync(audioPath)]), basename(audioPath))

  const res = await fetch(`${META.base}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${META.key}` },
    body: form,
  })
  if (!res.ok) throw new Error(`transcribe ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = await res.json()
  return json.text ?? ''
}

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
