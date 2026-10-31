// Ce que l'agent peut réellement faire sur les poids ouverts.
//
//   node bench/try-baseten.mjs
//
// « Ça marche sur Baseten » ne veut rien dire tant qu'on n'a pas répondu à
// trois questions, parce que l'agent tombe sans elles :
//   1. le modèle appelle-t-il des outils ? (toute la boucle en dépend)
//   2. les appelle-t-il correctement EN STREAMING ? (fragments par index)
//   3. voit-il une image ? (la fiche produit et la copie partent d'une photo)
//
// On mesure au lieu de supposer. Ce que ce script imprime finit dans le
// README : un tableau de capacités mesurées vaut mieux qu'une case cochée.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { BASETEN, ROOT } from '../src/config.js'

const TOOL = [{
  type: 'function',
  function: {
    name: 'ask_merchant',
    description: 'Ask for a detail you are missing. Never guess.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        missing: { type: 'string', description: 'size | quantity | wilaya | other' },
      },
      required: ['question', 'missing'],
    },
  },
}]

/**
 * Tester la vision sans rien supposer de l'image.
 *
 * Deux essais ratés avant celui-ci, et les deux fois c'est le TEST qui avait
 * tort, pas le modèle :
 *   · un PNG 1×1, question « quelle couleur ? » → « Blanc ». Un modèle qui
 *     jette l'image et devine répond pareil : la mesure ne distinguait rien.
 *   · une vraie photo, mais une liste de mots attendus écrite de mémoire
 *     (« chaussure, basket… ») → le modèle a répondu « Polo blanc », ce qui
 *     était EXACT, et mon test l'a compté en échec.
 *
 * D'où le test différentiel : la MÊME question sur DEUX images différentes.
 * Un modèle qui voit donne deux réponses différentes et spécifiques ; un
 * modèle qui ignore l'image donne deux fois la même chose. Plus besoin de
 * savoir à l'avance ce qu'il y a sur la photo.
 */
function deuxPhotos() {
  const out = join(ROOT, 'out')
  if (!existsSync(out)) return null
  const tous = readdirSync(out).filter((x) => /^(creative|scene)-.*\.png$/.test(x))
  if (tous.length < 2) return null
  // Deux fichiers éloignés dans la liste : plus de chance d'être deux produits
  // distincts plutôt que deux angles du même.
  const choisis = [tous[0], tous[tous.length - 1]]
  return choisis.map((f) => ({ nom: f, url: 'data:image/png;base64,' + readFileSync(join(out, f)).toString('base64') }))
}

const motsDe = (s) => new Set(String(s).toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2))

async function call(body, { stream = false } = {}) {
  const res = await fetch(`${BASETEN.base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${BASETEN.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: BASETEN.model, ...body }),
  })
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 220)}`)
  if (!stream) return res.json()

  const reader = res.body.getReader(), dec = new TextDecoder()
  let buf = '', content = '', reasoning = 0
  const calls = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() ?? ''
    for (const l of lines) {
      const t = l.trim()
      if (!t.startsWith('data:')) continue
      const p = t.slice(5).trim()
      if (p === '[DONE]') continue
      let j; try { j = JSON.parse(p) } catch { continue }
      const d = j.choices?.[0]?.delta
      if (!d) continue
      if (d.reasoning_content) reasoning += d.reasoning_content.length
      if (d.content) content += d.content
      for (const tc of d.tool_calls ?? []) {
        const i = tc.index ?? 0
        calls[i] ??= { name: '', args: '' }
        if (tc.function?.name) calls[i].name += tc.function.name
        if (tc.function?.arguments) calls[i].args += tc.function.arguments
      }
    }
  }
  return { content, reasoning, calls: calls.filter(Boolean) }
}

const out = []
const essai = async (nom, fn) => {
  const t0 = Date.now()
  try {
    const r = await fn()
    out.push({ nom, ok: r.ok, detail: r.detail, ms: Date.now() - t0 })
  } catch (e) {
    out.push({ nom, ok: false, detail: e.message.slice(0, 160), ms: Date.now() - t0 })
  }
}

if (!BASETEN.key) {
  console.error('BASETEN_API_KEY absent de .env — rien à mesurer.')
  process.exit(1)
}
console.log(`modèle : ${BASETEN.model}\nbase   : ${BASETEN.base}\n`)

await essai('1. chat simple', async () => {
  const j = await call({ messages: [{ role: 'user', content: 'Réponds exactement : OK' }], temperature: 0 })
  const m = j.choices?.[0]?.message ?? {}
  return { ok: !!m.content, detail: `content="${(m.content ?? '').trim().slice(0, 40)}"` +
    (m.reasoning_content ? ` · reasoning_content: ${m.reasoning_content.length} car. (séparé, donc content est propre)` : ' · pas de reasoning_content') }
})

await essai('2. darija', async () => {
  const j = await call({
    messages: [{ role: 'system', content: 'Tu réponds en darija algérienne, en lettres arabes, une phrase.' },
               { role: 'user', content: 'بشحال الصباط؟ قوله 4500 دج و الدفع عند الاستلام.' }],
    temperature: 0.4,
  })
  const c = (j.choices?.[0]?.message?.content ?? '').trim()
  return { ok: /[؀-ۿ]/.test(c), detail: c.slice(0, 90) || '(vide)' }
})

await essai('3. appel d outil (non streamé)', async () => {
  const j = await call({
    messages: [{ role: 'system', content: 'A missing detail is a question, never a guess. Use the tool.' },
               { role: 'user', content: 'Je veux commander les Adidas.' }],
    tools: TOOL, tool_choice: 'auto', temperature: 0,
  })
  const tc = j.choices?.[0]?.message?.tool_calls ?? []
  return { ok: tc.length > 0, detail: tc.length ? `${tc[0].function.name}(${tc[0].function.arguments.slice(0, 70)})` : 'aucun tool_call — la boucle de l agent ne peut pas tourner' }
})

await essai('4. appel d outil EN STREAMING', async () => {
  const r = await call({
    messages: [{ role: 'system', content: 'A missing detail is a question, never a guess. Use the tool.' },
               { role: 'user', content: 'Je veux commander les Adidas.' }],
    tools: TOOL, tool_choice: 'auto', temperature: 0, stream: true,
  }, { stream: true })
  const c = r.calls[0]
  let parse = 'arguments illisibles'
  if (c) { try { JSON.parse(c.args); parse = 'arguments JSON valides' } catch {} }
  return { ok: !!c && parse.startsWith('arguments JSON'), detail: c ? `${c.name} · ${parse} · reasoning ${r.reasoning} car.` : 'aucun tool_call en streaming' }
})

await essai('5. vision (test différentiel, 2 images)', async () => {
  const ph = deuxPhotos()
  if (!ph) return { ok: false, detail: 'moins de 2 images dans out/ — lance d abord des générations' }

  const decrire = async (p) => {
    const j = await call({
      messages: [{ role: 'user', content: [
        { type: 'text', text: 'Quel objet est photographié, et de quelle couleur ? Trois mots maximum.' },
        { type: 'image_url', image_url: { url: p.url } },
      ] }],
      temperature: 0,
    })
    return (j.choices?.[0]?.message?.content ?? '').trim()
  }

  const [a, b] = await Promise.all(ph.map(decrire))
  const ma = motsDe(a), mb = motsDe(b)
  const communs = [...ma].filter((w) => mb.has(w)).length
  const distinct = a.toLowerCase() !== b.toLowerCase() && communs < Math.min(ma.size, mb.size)
  return {
    ok: distinct && !!a && !!b,
    detail: `« ${a.slice(0, 28)} » vs « ${b.slice(0, 28)} »` +
      (distinct ? ' — réponses distinctes, le modèle lit bien les images' : ' — réponses identiques : l image est probablement ignorée'),
  }
})

console.log('\n| capacité | résultat | détail | durée |')
console.log('|---|---|---|---|')
for (const r of out) {
  console.log(`| ${r.nom} | ${r.ok ? '✅' : '❌'} | ${String(r.detail).replace(/\|/g, '/')} | ${(r.ms / 1000).toFixed(1)} s |`)
}

const bloquants = out.filter((r) => !r.ok && /outil/.test(r.nom))
console.log(bloquants.length
  ? `\n⚠ ${bloquants.length} capacité(s) manquante(s) sur le chemin critique de l'agent.`
  : "\nLa boucle de l'agent peut tourner entièrement sur les poids ouverts.")
