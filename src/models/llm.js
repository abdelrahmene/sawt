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

/**
 * The same call, streamed.
 *
 * Generating a site is three sequential model calls. Without streaming the
 * merchant stares at a still screen for minutes and concludes it has crashed —
 * which is what happened the first time we watched it. Tokens arriving as they
 * are produced is not decoration; it is the difference between "working" and
 * "broken" to anyone who is not reading the logs.
 *
 * `onDelta` receives visible text only. `onReasoning` receives the chain of
 * thought when a provider exposes it, so the UI can show that it is thinking
 * without ever showing a customer what it thought.
 */
export async function chatStream(messages, { tools, provider: name = PROVIDER, temperature = 0.3, onDelta, onReasoning } = {}) {
  const p = provider(name)
  if (!p.key()) throw new Error(`No API key for provider "${name}".`)

  const body = { model: p.model, messages, temperature, stream: true }
  if (tools?.length) { body.tools = tools; body.tool_choice = 'auto' }

  const res = await fetch(`${p.base()}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p.key()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${name} ${res.status}: ${(await res.text()).slice(0, 300)}`)

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let content = ''
  const calls = []

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const payload = t.slice(5).trim()
      if (payload === '[DONE]') continue
      let json
      try { json = JSON.parse(payload) } catch { continue }
      const d = json.choices?.[0]?.delta
      if (!d) continue

      if (d.reasoning_content) onReasoning?.(d.reasoning_content)
      if (typeof d.content === 'string' && d.content) {
        content += d.content
        onDelta?.(d.content)
      }
      // Tool calls arrive in fragments keyed by index; the arguments are a
      // JSON string assembled across many deltas.
      for (const tc of d.tool_calls ?? []) {
        const i = tc.index ?? 0
        calls[i] ??= { id: tc.id, type: 'function', function: { name: '', arguments: '' } }
        if (tc.id) calls[i].id = tc.id
        if (tc.function?.name) calls[i].function.name += tc.function.name
        if (tc.function?.arguments) calls[i].function.arguments += tc.function.arguments
      }
    }
  }

  return { role: 'assistant', content, tool_calls: calls.filter(Boolean).length ? calls.filter(Boolean) : undefined }
}

// Muse Spark Open always reasons, and shipping its chain of thought to a
// customer would be a production incident.
//
// Verified 30 Oct 2026 on Baseten: the reasoning comes back in a SEPARATE
// `reasoning_content` field, so `content` is already clean there — a trivial
// "reply with OK" returned six sentences of deliberation in that field and the
// bare "OK" in `content`. The tag stripping below is kept for providers that
// inline it instead, because being wrong about this once means a customer
// reads the model thinking out loud about them.
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
