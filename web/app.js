const $ = (s) => document.querySelector(s)
const log = $('#log'), canvas = $('#canvas')

// The session id outlives the tab, and the server keeps the screen's timeline
// beside the model's history. Reloading a page mid-build used to throw away an
// afternoon of generated pages; now it replays them.
const KEY = 'sawt.session'
let SESSION = localStorage.getItem(KEY)
if (!SESSION) { SESSION = Math.random().toString(36).slice(2); localStorage.setItem(KEY, SESSION) }

const el = (tag, cls, html) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (html != null) n.innerHTML = html
  return n
}
const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
const isArabic = (s) => /[؀-ۿ]/.test(s || '')

// Auto-scroll only when the reader is already at the bottom. Yanking the view
// down while someone is looking at a creative three cards up is how you make a
// screen unusable — and it is what stopped him scrolling at all.
const NEAR = 120
const atBottom = (n) => n.scrollHeight - n.scrollTop - n.clientHeight < NEAR
const toLatest = $('#tolatest')
function bottom(n) {
  if (atBottom(n)) { n.scrollTop = n.scrollHeight; if (n === canvas) toLatest.classList.remove('on') }
  else if (n === canvas) toLatest.classList.add('on')
}
toLatest.onclick = () => { canvas.scrollTo({ top: canvas.scrollHeight, behavior: 'smooth' }); toLatest.classList.remove('on') }
canvas.addEventListener('scroll', () => { if (atBottom(canvas)) toLatest.classList.remove('on') })

/* ── lightbox ───────────────────────────────────────────────────────────── */
const lb = $('#lightbox'), lbImg = lb.querySelector('img')
const zoom = (src, alt) => { lbImg.src = src; lbImg.alt = alt ?? ''; lb.classList.add('on') }
lb.onclick = () => lb.classList.remove('on')
addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.classList.remove('on') })

// A preview with a way out: an iframe you cannot open in a real tab is a
// screenshot, and these pages are meant to be used.
function frame(url) {
  const wrap = el('div', 'frame')
  wrap.title = 'ouvrir la page'
  const f = el('iframe'); f.src = url; f.loading = 'lazy'
  const a = Object.assign(el('a', 'open', 'ouvrir ↗'), { href: url, target: '_blank', rel: 'noopener' })
  wrap.onclick = () => window.open(url, '_blank', 'noopener')
  wrap.append(f, a)
  return wrap
}

// Every generated image is clickable, and openable on its own.
function thumb(src, caption) {
  const f = el('figure')
  const img = Object.assign(new Image(), { src, alt: caption ?? '', loading: 'lazy' })
  img.onclick = () => zoom(src, caption)
  const cap = el('figcaption')
  cap.append(el('span', null, esc(caption ?? '')))
  cap.append(Object.assign(el('a', null, 'ouvrir ↗'), { href: src, target: '_blank', rel: 'noopener' }))
  f.append(img, cap)
  return f
}

function say(who, text, cls) {
  const n = el('div', `msg ${cls || who}`)
  n.textContent = text
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

// One photo card that grows, rather than a new card per upload.
function photoGrid() {
  clearEmpty()
  const existing = canvas.querySelector('.card.photos .grid')
  if (existing) return existing
  const body = card('Photos produit', { real: true })
  body.parentElement.classList.add('photos')
  const g = el('div', 'grid')
  body.append(g)
  return g
}

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
    for (const c of result.creatives ?? []) g.append(thumb(c.url, c.angle))
    b.append(g)
    if (result.subject) b.append(el('div', 'why', `d'après ce qu'il a vu : <b>${esc(result.subject)}</b>`))
    if (result.headline_ar) b.append(el('div', 'why', `titre incrusté : <b dir="rtl">${esc(result.headline_ar)}</b>`))
    return
  }

  if (name === 'build_site') {
    const b = card(`Site — ${result.shop_name}`, { real: true })
    b.append(frame(result.home))
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
    b.append(frame(result.url), el('div', 'why', `${Math.round(result.bytes / 1024)} Ko générés par muse-spark`))
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

/* ── live step chips ────────────────────────────────────────────────────── */
// A site takes minutes. Without a clock the screen reads as frozen, and the
// first thing anyone does with a frozen screen is reload it.
const LABEL = {
  build_site: 'construit le site', build_landing_page: 'écrit la page',
  generate_creatives: 'dessine les visuels', marketing_angles: 'cherche les angles',
  configure_campaign: 'prépare la campagne', launch_campaign: 'lance la campagne',
  campaign_results: 'lit les résultats', adjust_campaign: 'décide',
  show_meta_setup: 'prépare la marche à suivre', propose_choices: '', ask_merchant: '',
}

function newStep(label) {
  const n = el('div', 'step')
  const txt = el('span', null, label)
  const sub = el('span', 'sub')
  const t = el('span', 't', '0s')
  n.append(el('span', 'spin'), txt, sub, t)
  const t0 = Date.now()
  const tick = setInterval(() => { t.textContent = Math.round((Date.now() - t0) / 1000) + 's' }, 1000)
  log.append(n); bottom(log)
  return {
    node: n,
    label: (s) => { txt.textContent = s },
    sub: (s) => { sub.textContent = s ? `· ${s}` : '' },
    done() { clearInterval(tick); n.classList.add('done'); sub.textContent = '' },
    drop() { clearInterval(tick); n.remove() },
  }
}

/* ── talking to the agent ───────────────────────────────────────────────── */
let busy = false
async function send(input) {
  if (busy || !input?.trim()) return
  busy = true
  document.body.classList.add('busy')
  say('me', input)

  let step = newStep('réfléchit')
  const bubbles = new Map()   // model-turn id -> bubble element

  try {
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

        if (e.type === 'say:start') {
          const b = el('div', 'msg bot live'); b.textContent = ''
          bubbles.set(e.id, b)
          continue
        }
        if (e.type === 'say:delta') {
          const b = bubbles.get(e.id); if (!b) continue
          if (!b.isConnected) { step.node.before(b) }     // first token: show it
          b.textContent += e.text
          if (isArabic(b.textContent)) b.dir = 'rtl'
          bottom(log)
          continue
        }
        if (e.type === 'say:end') {
          const b = bubbles.get(e.id)
          if (b) { b.classList.remove('live'); if (!b.textContent.trim()) b.remove() }
          continue
        }
        if (e.type === 'tool:start') {
          const l = LABEL[e.name]
          if (l) { step.label(l); step.sub('') }
          continue
        }
        if (e.type === 'progress') {
          step.sub(`${e.step}/${e.total} ${e.phase === 'home' ? 'accueil' : e.label ?? ''}`)
          continue
        }
        if (e.type === 'tool:end') {
          if (e.name === 'ask_merchant') { step.drop(); say('bot', e.result.question, 'ask'); step = newStep('réfléchit') }
          else if (e.name === 'propose_choices') showChoices(e.result)
          else { step.done(); renderArtifact(e); step = newStep('réfléchit') }
          continue
        }
        if (e.type === 'error') say('bot', '⚠ ' + e.error, 'ask')
      }
    }
  } catch (err) {
    say('bot', '⚠ connexion interrompue : ' + err.message, 'ask')
  }

  step.drop()
  document.body.classList.remove('busy')
  busy = false
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
      const step = newStep('écoute')
      document.body.classList.add('busy')
      let r
      try {
        r = await fetch('/api/voice?ext=webm', { method: 'POST', body: blob }).then((x) => x.json())
      } catch (e) { r = { error: e.message } }
      step.drop()
      document.body.classList.remove('busy')
      if (r.error) return say('bot', '⚠ ' + r.error, 'ask')
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
    const step = newStep('regarde la photo')
    document.body.classList.add('busy')
    let r
    try {
      r = await fetch(`/api/photo?session=${SESSION}&ext=${ext}`, { method: 'POST', body: f }).then((x) => x.json())
    } catch (err) { r = { error: err.message } }
    step.drop()
    document.body.classList.remove('busy')
    if (r.error) { say('bot', '⚠ ' + r.error, 'ask'); continue }

    const d = r.described ?? {}
    photoGrid().append(thumb(r.url, d.product || f.name))

    // What it saw, said out loud. A merchant who watches the agent describe
    // their own shirt stops wondering whether it is really looking.
    if (d.product) {
      const lines = [`Je vois : ${d.product}.`, d.details].filter(Boolean)
      if (d.photo_quality && d.photo_quality !== 'bonne') lines.push(`Photo : ${d.photo_quality}`)
      say('bot', lines.join('\n'))
      if (d.caution) say('bot', `⚠ ${d.caution}`, 'ask')
    }
  }
  e.target.value = ''
}

/* ── text ───────────────────────────────────────────────────────────────── */
$('#text').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const v = e.target.value; e.target.value = ''; send(v) }
})

/* ── restore ────────────────────────────────────────────────────────────── */
function replay(timeline) {
  if (!timeline?.length) return
  clearEmpty()
  // Only the most recent menu is still live; the earlier ones were answered.
  const lastChoices = timeline.map((e) => e.k).lastIndexOf('choices')
  timeline.forEach((e, i) => {
    if (e.k === 'me') say('me', e.text)
    else if (e.k === 'bot') say('bot', e.text)
    else if (e.k === 'ask') say('bot', e.text, 'ask')
    else if (e.k === 'heard') showHeard(e)
    else if (e.k === 'photo') {
      const g = photoGrid()
      g.append(thumb(e.url, e.described?.product ?? ''))
    } else if (e.k === 'choices') {
      showChoices(e)
      if (i !== lastChoices) log.lastElementChild.classList.add('spent')
    } else if (e.k === 'artifact') renderArtifact(e)
  })
  requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; canvas.scrollTop = canvas.scrollHeight })
}

$('#reset').onclick = async () => {
  if (!confirm('Effacer cette conversation et repartir de zéro ?')) return
  await fetch(`/api/reset?session=${SESSION}`, { method: 'POST' }).catch(() => {})
  localStorage.removeItem(KEY)
  location.reload()
}

fetch(`/api/state?session=${SESSION}`).then((r) => r.json()).then((s) => {
  $('#mode').textContent = s.mode
  replay(s.timeline)
}).catch(() => {})
