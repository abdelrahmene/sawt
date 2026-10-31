// The shell: the rail, the router, and the one place that knows how many
// people are waiting.
//
// Each surface is its own module and mounts itself into its <section>. They
// share nothing but ui.js and the counts, which is why adding the Meta console
// did not disturb the chat.
import { $, el, icon, esc, api, toast } from './ui.js'

import * as chat from './chat.js'
import * as studio from './studio.js'
import * as meta from './meta.js'
import * as inbox from './inbox.js'
import * as campaigns from './campaigns.js'
import * as sites from './sites.js'
import * as settings from './settings.js'

const TABS = [
  { id: 'chat', label: 'Agent', ic: 'chat', mod: chat },
  { id: 'studio', label: 'Studio', ic: 'bolt', mod: studio },
  { id: 'sites', label: 'Sites', ic: 'globe', mod: sites, badge: (c) => c.pages },
  { id: 'campaigns', label: 'Pubs', ic: 'mega', mod: campaigns, badge: (c) => c.live, calm: true },
  { id: 'inbox', label: 'Messages', ic: 'inbox', mod: inbox, badge: (c) => c.inbox_open + c.inbox_stuck },
  { id: 'meta', label: 'Meta', ic: 'link', mod: meta },
  { id: 'settings', label: 'Réglages', ic: 'gear', mod: settings },
]

export let COUNTS = {}
let current = 'chat'

/* ── the rail ─────────────────────────────────────────────────────────────── */
function paintRail() {
  const nav = $('#tabs')
  nav.textContent = ''
  for (const t of TABS) {
    const b = el('button', `tab${t.id === current ? ' on' : ''}`)
    b.innerHTML = `${icon(t.ic, 21)}<span>${esc(t.label)}</span>`
    const n = t.badge?.(COUNTS) ?? 0
    // A dot that is not red unless something is actually waiting: an app that
    // alarms you about three landing pages you built on purpose teaches you to
    // ignore its badges.
    if (n > 0) b.append(el('span', `pip${t.calm || t.id !== 'inbox' ? ' calm' : ''}`, String(n > 99 ? '99+' : n)))
    if (t.id === 'meta' && COUNTS.connected) b.append(el('span', 'pip calm', '✓'))
    b.onclick = () => go(t.id)
    nav.append(b)
  }
}

export function go(id) {
  const tab = TABS.find((t) => t.id === id)
  if (!tab) return
  current = id
  for (const t of TABS) $(`#v-${t.id}`)?.classList.toggle('on', t.id === id)
  paintRail()
  location.hash = id
  try { tab.mod.mount?.($(`#v-${id}`)) } catch (e) { console.error(`[${id}]`, e); toast(e.message, true) }
}

/** Views call this after they change something that a badge counts. */
export async function refresh({ repaint = true } = {}) {
  try {
    const s = await api('/state')
    COUNTS = s.counts ?? {}
    $('#mode').textContent = s.mode ?? '—'
    $('#mode').title = `mode ${s.mode} · base ${s.db ?? ''}`

    // Le cerveau, toujours à l'écran. Un clic bascule — c'est la démonstration
    // la plus courte du chemin open-weights : on change, on reparle, ça marche.
    const brain = $('#brain')
    const open = s.provider === 'baseten'
    brain.textContent = open ? 'open' : 'meta'
    brain.classList.toggle('open', open)
    brain.title = `${s.provider_model ?? ''} — clique pour basculer`
    brain.onclick = async () => {
      brain.textContent = '…'
      try {
        const r = await api('/settings', { method: 'POST', body: { provider: open ? 'meta' : 'baseten' } })
        toast(`Cerveau : ${r.provider_model}`)
      } catch (e) { toast(e.message, true) }
      await refresh()
      if (current === 'settings') go('settings')
    }

    window.SAWT_STATE = s
    if (repaint) paintRail()
    return s
  } catch (e) {
    console.error('[state]', e)
    return null
  }
}

/* ── le thème ─────────────────────────────────────────────────────────────
   En haut du rail, sous l'orbe : c'est un réglage qu'on cherche du regard
   avant de commencer, pas une fois arrivé en bas. Clair par défaut.
   L'icône montre où l'on VA, pas où l'on est — un soleil quand on est dans
   le noir — parce qu'un bouton dit ce qu'il fait. */
{
  const b = $('#theme')
  const paint = () => {
    const nuit = document.documentElement.dataset.theme === 'nuit'
    b.innerHTML = icon(nuit ? 'sun' : 'moon', 17)
    b.title = nuit ? 'Passer en clair' : 'Passer en sombre'
    b.setAttribute('aria-label', b.title)
  }
  b.onclick = () => {
    const next = document.documentElement.dataset.theme === 'nuit' ? 'jour' : 'nuit'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('sawt.theme', next) } catch {}
    paint()
  }
  paint()
}

/* ── boot ─────────────────────────────────────────────────────────────────── */
paintRail()
const first = (location.hash || '#chat').slice(1)
const state = await refresh({ repaint: false })
chat.hydrate(state)
go(TABS.some((t) => t.id === first) ? first : 'chat')

addEventListener('hashchange', () => {
  const id = location.hash.slice(1)
  if (id && id !== current) go(id)
})

// One keyboard shortcut per surface, because a demo that needs a mouse to
// change screen loses three seconds every time.
addEventListener('keydown', (e) => {
  if (!e.altKey || e.ctrlKey || e.metaKey) return
  const i = Number(e.key) - 1
  if (TABS[i]) { e.preventDefault(); go(TABS[i].id) }
})
