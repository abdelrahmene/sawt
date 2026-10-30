const $ = (s) => document.querySelector(s)
const log = $('#log'), canvas = $('#canvas')
const SESSION = Math.random().toString(36).slice(2)

const el = (tag, cls, html) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (html != null) n.innerHTML = html
  return n
}
const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
const isArabic = (s) => /[؀-ۿ]/.test(s || '')
const bottom = (n) => { n.scrollTop = n.scrollHeight }

function say(who, text, cls) {
  const n = el('div', `msg ${cls || who}`, esc(text))
  if (isArabic(text)) n.dir = 'rtl'
  log.append(n); bottom(log); return n
}

// The two readings of the same voice note, side by side. Showing the words one
// of them lost is the single clearest thing this project has to say.
function showHeard({ transcript, transcript_auto, understood }) {
  const words = (s) => new Set(String(s || '').toLowerCase().replace(/[.,?!؟]/g, ' ').split(/\s+/).filter(Boolean))
  const a = words(transcript_auto), p = words(transcript)
  const lostByAuto = [...p].filter((w) => !a.has(w))
  const lostByPinned = [...a].filter((w) => !p.has(w))

  const n = el('div', 'heard')
  n.append(el('b', null, 'ce que le modèle a entendu'))
  const row = (tag, cls, txt) => {
    const r = el('div', 'row')
    r.append(el('span', `tag ${cls}`, tag), el('span', 'txt', esc(txt ?? '—')))
    return r
  }
  if (transcript_auto) n.append(row('auto', 'a', transcript_auto))
  n.append(row('ar', 'p', transcript))

  if (lostByAuto.length || lostByPinned.length) {
    const gaps = []
    if (lostByPinned.length) gaps.push(`« ar » a perdu : ${lostByPinned.join(', ')}`)
    if (lostByAuto.length) gaps.push(`« auto » a perdu : ${lostByAuto.join(', ')}`)
    n.append(el('div', 'gap', '⚠ ' + esc(gaps.join('  ·  '))))
  }
  if (understood) {
    const miss = ['size', 'quantity', 'wilaya'].filter((k) => understood[k] == null)
    n.append(el('div', 'gap', `intent = ${esc(understood.intent)}` +
      (miss.length ? `  ·  manquant : ${miss.join(', ')}` : '  ·  rien ne manque')))
  }
  log.append(n); bottom(log)
}

// Buttons the merchant taps instead of typing. Once one is used the whole set
// greys out: a stale menu from three turns ago sends the agent somewhere it
// has already been.
function showChoices({ question, choices }) {
  const n = el('div', 'choices')
  if (question) {
    const q = el('div', 'q', esc(question))
    if (isArabic(question)) q.dir = 'rtl'
    n.append(q)
  }
  for (const c of choices ?? []) {
    const b = el('button', c.kind === 'primary' ? 'primary' : c.kind === 'caution' ? 'caution' : '', esc(c.label))
    if (isArabic(c.label)) b.dir = 'rtl'
    b.onclick = () => { n.classList.add('spent'); send(c.send) }
    n.append(b)
  }
  log.append(n); bottom(log)
}

/* ── cards ──────────────────────────────────────────────────────────────── */
function card(title, { real, sim } = {}) {
  const c = el('div', 'card')
  const h = el('h3', null, esc(title))
  if (real) h.append(el('span', 'badge real', 'réel'))
  if (sim) h.append(el('span', 'badge sim', 'simulé'))
  const b = el('div', 'body')
  c.append(h, b); canvas.append(c); bottom(canvas)
  return b
}
const clearEmpty = () => { const e = canvas.querySelector('.empty'); if (e) e.remove() }

const money = (n) => (n == null ? '—' : Number(n).toLocaleString('fr-FR') + ' DA')

function renderArtifact({ name, args, result, simulated, real }) {
  clearEmpty()
  if (result?.error) { card(name, {}).append(el('pre', null, esc(result.error))); return }

  if (name === 'marketing_angles') {
    const b = card('Angles marketing')
    for (const a of result.angles ?? []) {
      const d = el('div', 'why', `<b>${esc(a.name)}</b><br>${esc(a.claim)}<br><span style="color:var(--dim)">${esc(a.visual)}</span>`)
      b.append(d)
    }
    return
  }

  if (name === 'generate_creatives') {
    const b = card('Créatives', { real: true })
    const g = el('div', 'grid')
    for (const c of result.creatives ?? []) {
      const f = el('figure')
      f.append(Object.assign(new Image(), { src: c.url, alt: c.angle }), el('figcaption', null, esc(c.angle)))
      g.append(f)
    }
    b.append(g)
    if (result.headline_ar) b.append(el('div', 'why', `titre incrusté : <b dir="rtl">${esc(result.headline_ar)}</b>`))
    return
  }

  if (name === 'build_site') {
    const b = card(`Site — ${result.shop_name}`, { real: true })
    const f = el('iframe'); f.src = result.home; f.loading = 'lazy'
    b.append(f)
    const list = el('div', 'pages')
    list.append(Object.assign(el('a', null, `<span>🏠 accueil</span><span class="price">${result.count} produits</span>`), { href: result.home, target: '_blank' }))
    for (const p of result.pages ?? []) {
      list.append(Object.assign(
        el('a', null, `<span>${esc(p.product)}</span><span class="price">${money(p.price_dzd)}</span>`),
        { href: p.url, target: '_blank' }
      ))
    }
    b.append(el('div', 'why', 'Chaque page est un vrai fichier, générée par muse-spark. Clique pour l\'ouvrir.'), list)
    for (const f2 of result.failed ?? []) b.append(el('pre', null, `⚠ ${esc(f2.product)} : ${esc(f2.error)}`))
    return
  }

  if (name === 'build_landing_page' || name === 'build_storefront') {
    const b = card(name === 'build_storefront' ? `Vitrine — ${result.shop_name}` : `Landing — ${result.product}`, { real: true })
    const f = el('iframe'); f.src = result.url; f.loading = 'lazy'
    b.append(f, el('div', 'why', `<a href="${result.url}" target="_blank">ouvrir en vrai</a> · ${Math.round(result.bytes / 1024)} Ko générés par muse-spark`))
    return
  }

  if (name === 'configure_campaign') {
    const b = card(`Campagne — ${result.name}`, { sim: true })
    const dl = el('dl', 'kv')
    const put = (k, v) => dl.append(el('dt', null, k), el('dd', null, esc(v)))
    put('objectif', result.objective)
    put('budget / jour', money(result.daily_budget_dzd))
    put('ciblage', `${result.geo.join(', ')} · ${result.age_min}-${result.age_max} ans · ${result.genders}`)
    put('placements', result.placements.join(', '))
    put('statut', result.status)
    b.append(dl)
    b.append(el('div', 'why', 'La requête exacte que recevrait la Marketing API :'))
    b.append(el('pre', null, esc(result.api_payload.endpoint + '\n' + JSON.stringify(result.api_payload.body, null, 2))))
    return
  }

  if (name === 'launch_campaign') {
    const b = card('Lancement', { sim: true })
    b.append(el('div', 'why', result.refused
      ? `<b style="color:var(--warn)">refusé</b> — ${esc(result.reason)}`
      : `<b>ACTIVE</b> · aucune dépense réelle, rien n'est parti chez Meta.`))
    return
  }

  if (name === 'campaign_results') {
    const b = card(`Résultats · ${result.window_hours ?? 24} h`, { sim: true })
    if (!result.rows) { b.append(el('pre', null, esc(result.note ?? ''))); return }
    const t = result.totals
    b.append(el('div', 'why', `${money(t.spend_dzd)} dépensés · ${t.orders} commandes · <b>${money(t.cost_per_order_dzd)} / commande</b>`))
    const tbl = el('table', null,
      '<tr><th>créative</th><th>placement</th><th>dépense</th><th>clics</th><th>cmd</th><th>coût/cmd</th></tr>')
    result.rows.forEach((r, i) => {
      const tr = el('tr', i === 0 ? 'best' : i === result.rows.length - 1 ? 'worst' : '')
      tr.innerHTML = `<td>${esc(r.creative)}</td><td>${esc(r.placement)}</td>` +
        `<td class="num">${money(r.spend_dzd)}</td><td class="num">${r.clicks}</td>` +
        `<td class="num">${r.orders}</td><td class="num">${money(r.cost_per_order_dzd)}</td>`
      tbl.append(tr)
    })
    b.append(tbl)
    return
  }

  if (name === 'adjust_campaign') {
    const b = card('Décision', { sim: true })
    b.append(el('div', 'why', `<b>${esc(result.applied.action)}</b>${result.applied.target ? ' → ' + esc(result.applied.target) : ''}<br>${esc(result.applied.because)}`))
    return
  }

  if (name === 'show_meta_setup') {
    const b = card('Connecter ta propre app Meta')
    b.append(el('pre', null, esc(result.guide)))
    return
  }
}

/* ── talking to the agent ───────────────────────────────────────────────── */
let busy = false
async function send(input) {
  if (busy || !input?.trim()) return
  busy = true
  say('me', input)
  const step = el('div', 'step live')
  step.append(el('span', 'dot'), el('span', null, 'réfléchit…'))
  log.append(step); bottom(log)

  const res = await fetch(`/api/chat?session=${SESSION}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  })
  const reader = res.body.getReader(), dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const parts = buf.split('\n\n'); buf = parts.pop()
    for (const part of parts) {
      const line = part.replace(/^data: /, '').trim()
      if (!line) continue
      let e; try { e = JSON.parse(line) } catch { continue }
      if (e.type === 'say' && e.text) say('bot', e.text)
      if (e.type === 'tool:start') step.lastChild.textContent = e.name.replace(/_/g, ' ') + '…'
      if (e.type === 'tool:end') {
        if (e.name === 'ask_merchant') say('bot', e.result.question, 'ask')
        else if (e.name === 'propose_choices') showChoices(e.result)
        else renderArtifact(e)
      }
      if (e.type === 'error') say('bot', '⚠ ' + e.error)
    }
  }
  step.remove(); busy = false
}

/* ── voice: hold to talk ────────────────────────────────────────────────── */
const mic = $('#mic')
let rec = null, chunks = []

async function startRec() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    rec = new MediaRecorder(stream)
    chunks = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunks, { type: 'audio/webm' })
      if (blob.size < 1200) return
      const step = say('bot', 'écoute…')
      const r = await fetch('/api/voice?ext=webm', { method: 'POST', body: blob }).then((x) => x.json())
      step.remove()
      if (r.error) return say('bot', '⚠ ' + r.error)
      showHeard(r)
      send(r.transcript)
    }
    rec.start(); mic.classList.add('on')
  } catch (e) { say('bot', '⚠ micro indisponible : ' + e.message) }
}
const stopRec = () => { if (rec?.state === 'recording') rec.stop(); rec = null; mic.classList.remove('on') }

mic.addEventListener('pointerdown', (e) => { e.preventDefault(); startRec() })
mic.addEventListener('pointerup', stopRec)
mic.addEventListener('pointerleave', stopRec)

/* ── photos ─────────────────────────────────────────────────────────────── */
$('#photo').onclick = () => $('#file').click()
$('#file').onchange = async (e) => {
  for (const f of e.target.files) {
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const r = await fetch(`/api/photo?session=${SESSION}&ext=${ext}`, { method: 'POST', body: f }).then((x) => x.json())
    clearEmpty()
    const b = canvas.querySelector('.card.photos')?.querySelector('.grid') ?? (() => {
      const body = card('Photos produit', { real: true })
      body.parentElement.classList.add('photos')
      const g = el('div', 'grid'); body.append(g); return g
    })()
    const fig = el('figure')
    fig.append(Object.assign(new Image(), { src: r.url }), el('figcaption', null, esc(f.name)))
    b.append(fig)
  }
  e.target.value = ''
}

/* ── text ───────────────────────────────────────────────────────────────── */
$('#text').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const v = e.target.value; e.target.value = ''; send(v) }
})

fetch(`/api/state?session=${SESSION}`).then((r) => r.json()).then((s) => { $('#mode').textContent = s.mode })
