// One chat client for both providers. Meta's Model API and Baseten are both
// OpenAI-compatible, so switching is a base URL and a model name.
import { META, BASETEN, PROVIDER } from '../config.js'

const MODELS = {
  meta: { base: () => META.base, key: () => META.key, model: 'muse-spark-1.3' },
  baseten: { base: () => BASETEN.base, key: () => BASETEN.key, model: BASETEN.model },
}

export function provider(name = PROVIDER) {
  const p = MODELS[name]
  if (!p) throw new Error(`Unknown LLM provider: ${name}`)
  return p
}

export async function chat(messages, { tools, provider: name = PROVIDER, temperature = 0.3 } = {}) {
  const p = provider(name)
  if (!p.key()) {
    throw new Error(
      `No API key for provider "${name}". Run \`npm start\` for the credential-free replay, ` +
      `or copy .env.example to .env and add a key.`
    )
  }
  const body = { model: p.model, messages, temperature }
  if (tools?.length) { body.tools = tools; body.tool_choice = 'auto' }

  const res = await fetch(`${p.base()}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p.key()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${name} ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = await res.json()
  return json.choices?.[0]?.message ?? {}
}

// Muse Spark Open always reasons. Shipping its chain of thought to a customer
// would be a production incident, so the visible answer is isolated here.
const REASONING = /<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi

export function visibleAnswer(message) {
  if (!message) return ''
  if (typeof message.content === 'string') return message.content.replace(REASONING, '').trim()
  if (Array.isArray(message.content)) {
    return message.content
      .filter((c) => c.type === 'text' || typeof c.text === 'string')
      .map((c) => c.text || '')
      .join('')
      .replace(REASONING, '')
      .trim()
  }
  return ''
}
