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

// POST /v1/asr/transcribe — multipart, a JSON `request` part and an `audio`
// part. WAV only: mono integer PCM at 16 or 24 kHz, 10 minutes and 32 MB max.
// Voice notes arrive as Opus/.ogg from WhatsApp and as AAC/.mp4 from
// Messenger, so convert first:
//
//   ffmpeg -i note.ogg -ar 16000 -ac 1 -c:a pcm_s16le note.wav
//
// ---------------------------------------------------------------------------
// MEASURED 30 Oct 2026 — one real 10.7 s WhatsApp voice note asking, in
// darija, for Adidas in size 40. The same file, the same settings, twice:
//
//   run 1  auto-detect   "السلام عليكم. كاين."
//          Arabic bias   "السلام عليكم ليه Adidas pointure quarante كاين?"
//   run 2  auto-detect   "As-salamu alaykum. Les Adidas Pointure quarante كاين."
//          Arabic bias   "السلام عليكم لي Adidas كاين"
//
// The two runs disagree in opposite directions, so NEITHER setting is reliably
// better on a single clip and no conclusion can be drawn from one sample.
//
// What is consistent is the shape of the failure: the model does not return
// broken darija, it silently DROPS the commercially decisive span — the brand,
// "pointure", the size. Nothing in the response says anything was dropped, so
// a shop built on this answers a question it never heard and never finds out.
// The size is exactly the token a seller cannot do without.
//
// That instability is why bench/ measures N clips with repeats and scores
// entity recall, not a transcript, and why the default below is a starting
// point to be measured rather than a finding.
// ---------------------------------------------------------------------------
const DEFAULT_LANGUAGE_BIAS = ['Arabic']

// Keyword biasing is deliberately OFF by default. Adding French plus 25 domain
// terms to the same clip recovered the content too, but duplicated the opening
// word ("السلامالسلام"). More biasing was measurably worse than the right
// biasing, so keywords stay opt-in and are measured per use case.
const DARIJA_KEYWORDS = [
  'شحال', 'الثمن', 'كاين', 'ماكانش', 'التوصيل', 'بوانتير', 'قياس', 'دينار', 'دج',
  'وهران', 'الجزائر', 'قسنطينة', 'عنابة', 'سطيف', 'البليدة', 'تيزي وزو', 'بجاية',
  'تلمسان', 'باتنة', 'سيدي بلعباس', 'مستغانم', 'بسكرة',
  'livraison', 'pointure', 'stop desk', 'commande',
]

export async function transcribe(audioPath, {
  languageBias = DEFAULT_LANGUAGE_BIAS,
  keywords = null,
  mode = 'PUSH_TO_TALK',
} = {}) {
  if (!META.key) throw new Error('MODEL_API_KEY is required for transcription in live mode.')

  const request = { model: 'muse-voice-transcribe-1.0', audioEncoding: 'WAV', mode }
  // null means "let the model detect the language" — the failure case above.
  if (languageBias?.length) request.languageBias = languageBias
  if (keywords?.length) request.keywords = keywords

  const form = new FormData()
  form.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }))
  form.append('audio', new Blob([readFileSync(audioPath)], { type: 'audio/wav' }), basename(audioPath))

  const res = await fetch(`${META.base}/asr/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${META.key}`, Accept: 'application/json' },
    body: form,
  })
  if (!res.ok) throw new Error(`transcribe ${res.status}: ${(await res.text()).slice(0, 300)}`)

  const json = await res.json()
  // PUSH_TO_TALK returns one `transcript`; DIARIZATION fills `turns` instead.
  if (json.turns?.length) {
    return json.turns.map((t) => (t.speaker ? `[${t.speaker}] ` : '') + (t.text ?? '')).join(' ').trim()
  }
  return json.transcript ?? ''
}

export { DARIJA_KEYWORDS, DEFAULT_LANGUAGE_BIAS }

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
