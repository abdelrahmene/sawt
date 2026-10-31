// Shared bits every view needs. No framework: the whole app is five modules
// and a stylesheet, which is also why it opens instantly on a bad connection.

export const $ = (s, root = document) => root.querySelector(s)
export const $$ = (s, root = document) => [...root.querySelectorAll(s)]

export const el = (tag, cls, html) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (html != null) n.innerHTML = html
  return n
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export const isArabic = (s) => /[؀-ۿ]/.test(s || '')

// A price inside a right-to-left paragraph gets reordered by the bidi
// algorithm: "4 500 DA" renders as "DA 500 4". The isolate is the fix, and it
// belongs everywhere a number meets Arabic — not only on the landing page.
export const num = (n) => Number(n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ')
export const money = (n) => (n == null ? '—' : `<bdi dir="ltr">${num(n)} DA</bdi>`)
export const pct = (n) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n}%`)

export function ago(ms) {
  if (!ms) return ''
  const m = Math.round((Date.now() - ms) / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h`
  return `${Math.round(h / 24)} j`
}

export const initials = (s) =>
  String(s ?? '?').replace(/[^\p{L}\s.@]/gu, '').split(/[\s.@]+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('') || '?'

/* ── icons ────────────────────────────────────────────────────────────────
   Inline so the app has its icons with no network and no icon font. */
const PATHS = {
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 9.1 9.1 0 0 1-3.6-.7L3 21l1.9-5.1A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/>',
  mega: '<path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M17 8.5a5 5 0 0 1 0 7"/>',
  inbox: '<path d="M3 13h4l1.6 2.6h6.8L17 13h4"/><path d="M3 13l2.6-7.4A1.5 1.5 0 0 1 7 4.6h10a1.5 1.5 0 0 1 1.4 1L21 13v4.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/>',
  link: '<path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10.5a4 4 0 0 0-5.7 0L5.5 13.3a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.4v.2"/>',
  bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  play: '<path d="M7 4.5l12 7.5-12 7.5z"/>',
  pause: '<path d="M8.5 5v14M15.5 5v14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  ext: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  refresh: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 20v-6M12.5 20V8M17 20v-9"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  send: '<path d="M4 12l16-7-7 16-2.5-6.5z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
}

export const icon = (name, size = 18) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] ?? PATHS.check}</svg>`

/* ── the session ─────────────────────────────────────────────────────────── */
const KEY = 'sawt.session'
export let SESSION = localStorage.getItem(KEY)
if (!SESSION) { SESSION = Math.random().toString(36).slice(2); localStorage.setItem(KEY, SESSION) }
export const forgetSession = () => localStorage.removeItem(KEY)

/* ── the API ─────────────────────────────────────────────────────────────── */
export async function api(path, { method = 'GET', body } = {}) {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`/api${path}${sep}session=${SESSION}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : {} } catch { data = { error: text.slice(0, 200) } }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

/* ── toast ───────────────────────────────────────────────────────────────── */
let toastTimer
export function toast(msg, bad = false) {
  const n = $('#toast')
  if (!n) return
  n.textContent = msg
  n.classList.toggle('bad', !!bad)
  n.classList.add('on')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => n.classList.remove('on'), bad ? 5200 : 3000)
}

/* ── lightbox ────────────────────────────────────────────────────────────── */
export function zoom(src, alt = '') {
  const lb = $('#lightbox')
  lb.querySelector('img').src = src
  lb.querySelector('img').alt = alt
  lb.classList.add('on')
}
addEventListener('DOMContentLoaded', () => {
  const lb = $('#lightbox')
  if (lb) lb.onclick = () => lb.classList.remove('on')
})
addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#lightbox')?.classList.remove('on') })

/* ── small shared renderers ──────────────────────────────────────────────── */

/** A preview with a way out: an iframe you cannot open in a real tab is a
 *  screenshot, and these pages are meant to be used. */
export function frame(url, tall = false) {
  const wrap = el('div', `frame${tall ? ' tall' : ''}`)
  wrap.title = 'ouvrir la page'
  const f = el('iframe')
  f.src = url
  f.loading = 'lazy'
  const a = Object.assign(el('a', 'open', `ouvrir ${icon('ext', 13)}`), { href: url, target: '_blank', rel: 'noopener' })
  wrap.onclick = () => window.open(url, '_blank', 'noopener')
  wrap.append(f, a)
  return wrap
}

export function thumb(src, caption) {
  const f = el('figure')
  const img = Object.assign(new Image(), { src, alt: caption ?? '', loading: 'lazy' })
  img.onclick = () => zoom(src, caption)
  const cap = el('figcaption')
  cap.append(el('span', null, esc(caption ?? '')))
  cap.append(Object.assign(el('a', null, 'ouvrir ↗'), { href: src, target: '_blank', rel: 'noopener' }))
  f.append(img, cap)
  return f
}

export const simbar = (html) => `<div class="simbar">${icon('alert', 17)}<div>${html}</div></div>`

export const loading = (what = 'chargement') =>
  `<div class="loading"><span class="spin"></span>${esc(what)}…</div>`

export const emptyState = (title, text, action = '') =>
  `<div class="empty"><div class="big">◌</div><h3>${esc(title)}</h3><p>${text}</p>${action}</div>`

/** La ligne de provenance : par quoi une chose a été produite, et si c'est
 *  mesuré ou simulé. C'est un atome et pas trois variantes recopiées, parce
 *  qu'elle doit être identique sous une image, sous une page et sous un
 *  chiffre de campagne — tout l'enjeu du projet est qu'un écran simulé ne
 *  puisse jamais passer pour une mesure. */
export const prov = (by, kind = 'real') =>
  `<div class="prov"><span class="by">${esc(by)}</span>` +
  `<span class="k ${kind === 'sim' ? 'sim' : 'real'}">${kind === 'sim' ? 'simulé' : 'réel'}</span></div>`

export const kpi = (label, value, detail = '', dir = '') =>
  `<div class="kpi"><div class="l">${esc(label)}</div><div class="v">${value}</div>${
    detail ? `<div class="d ${dir}">${detail}</div>` : ''}</div>`
