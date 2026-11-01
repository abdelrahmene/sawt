// The shell: the rail, the router, and the one place that knows how many
// people are waiting.
//
// Each surface is its own module and mounts itself into its <section>. They
// share nothing but ui.js and the counts, which is why adding the Meta console
// did not disturb the chat.
import { $, $$, el, icon, esc, api, toast } from './ui.js'
import { t, num, lang, setLang, LANGS, applyDocument, onLang } from './i18n.js'

import * as chat from './chat.js'
import * as catalog from './catalog.js'
import * as studio from './studio.js'
import * as meta from './meta.js'
import * as inbox from './inbox.js'
import * as campaigns from './campaigns.js'
import * as sites from './sites.js'
import * as settings from './settings.js'

// Le libellé est une CLÉ, plus une chaîne : le rail se repeint dans la langue
// du moment sans qu'on retouche ce tableau.
const TABS = [
  { id: 'chat', key: 'tab.chat', ic: 'chat', mod: chat },
  { id: 'catalog', key: 'tab.catalog', ic: 'grid', mod: catalog, badge: (c) => c.imported, calm: true },
  { id: 'studio', key: 'tab.studio', ic: 'bolt', mod: studio },
  { id: 'sites', key: 'tab.sites', ic: 'globe', mod: sites, badge: (c) => c.pages, calm: true },
  { id: 'campaigns', key: 'tab.campaigns', ic: 'mega', mod: campaigns, badge: (c) => c.live, calm: true },
  { id: 'inbox', key: 'tab.inbox', ic: 'inbox', mod: inbox, badge: (c) => c.inbox_open + c.inbox_stuck },
  { id: 'meta', key: 'tab.meta', ic: 'link', mod: meta, badge: (c) => c.comments_open },
  { id: 'settings', key: 'tab.settings', ic: 'gear', mod: settings },
]

export let COUNTS = {}
/* Qui veut être prévenu quand les compteurs bougent.
   Le rail se repeint déjà dans refresh(), mais la cloche vit à côté et
   n'avait aucun moyen de savoir. Plutôt que de lui faire relire l'état
   pour elle seule, on prévient. */
const abonnes = []
export const onCounts = (fn) => { abonnes.push(fn); return fn }
let current = 'chat'

/* ── the rail ─────────────────────────────────────────────────────────────── */
function paintRail() {
  const nav = $('#tabs')
  nav.textContent = ''
  for (const tab of TABS) {
    const b = el('button', `tab${tab.id === current ? ' on' : ''}`)
    b.innerHTML = `${icon(tab.ic, 21)}<span>${esc(t(tab.key))}</span>`
    const n = tab.badge?.(COUNTS) ?? 0
    // A dot that is not red unless something is actually waiting: an app that
    // alarms you about three landing pages you built on purpose teaches you to
    // ignore its badges.
    if (n > 0) b.append(el('span', `pip${tab.calm || tab.id !== 'inbox' ? ' calm' : ''}`, String(n > 99 ? '99+' : n)))
    if (tab.id === 'meta' && COUNTS.connected) b.append(el('span', 'pip calm', '✓'))
    b.onclick = () => go(tab.id)
    nav.append(b)
  }
}

export function go(id) {
  const tab = TABS.find((x) => x.id === id)
  if (!tab) return
  current = id
  for (const x of TABS) $(`#v-${x.id}`)?.classList.toggle('on', x.id === id)
  paintRail()
  location.hash = id
  if (id === 'chat') seenWork()
  try { tab.mod.mount?.($(`#v-${id}`)) } catch (e) { console.error(`[${id}]`, e); toast(e.message, true) }
  gardeIds()
}

/* ── le garde-fou des identifiants ────────────────────────────────────────
   Pourquoi ce bout de code existe : le Studio nommait son aperçu « stage »,
   un nom que index.html donne déjà au conteneur de tout l'appareil. $()
   cherche dans le document entier et renvoie le PREMIER trouvé, donc peindre
   l'aperçu réécrivait le contenu de la coque : barre du haut, rail, vues —
   tout disparaissait. Deux autres doublons dormaient à côté : les Réglages
   enregistraient « language: "" » parce qu'ils lisaient le bouton EN/AR/FR
   de la barre du haut, et le bouton d'état vide des Campagnes ne faisait
   rien parce que celui des Sites portait le même nom et passait avant.

   Aucun de ces trois-là n'a levé d'erreur. C'est précisément pour ça qu'il
   faut les faire crier : chaque vue est montée dans le document commun, donc
   un nom choisi dans un module peut en percuter un autre à tout moment. */
const criees = new Set()
function gardeIds() {
  const vus = new Map()
  for (const n of $$('[id]')) vus.set(n.id, (vus.get(n.id) ?? 0) + 1)
  for (const [nom, n] of vus) {
    if (n < 2 || criees.has(nom)) continue
    criees.add(nom)
    console.error(`[ids] « ${nom} » apparaît ${n} fois dans le document — $('#${nom}') ne verra que le premier.`)
    toast(`Identifiant en double : ${nom}`, true)
  }
}

/** Views call this after they change something that a badge counts. */
export async function refresh({ repaint = true } = {}) {
  try {
    const s = await api('/state')
    COUNTS = s.counts ?? {}
    $('#mode').textContent = s.mode ?? '—'
    $('#mode').title = `mode ${s.mode} · base ${s.db ?? ''}`

    /* Le solde. Il baisse pendant la démonstration, et c'est le but : on
       voit ce que chaque page coûte au moment où on la fabrique. La pastille
       passe à l'orange sous 15 % — pas plus tôt, sinon elle crie pour rien. */
    const cr = $('#credits')
    const w = s.credits
    if (cr && w) {
      cr.textContent = `${num(w.left)} cr`
      cr.classList.toggle('low', w.left < w.pack * 0.15)
      cr.title = t('shell.creditsTitle', {
        left: num(w.left), pack: num(w.pack), usd: num(w.usd), spent: num(w.spent),
      })
      cr.setAttribute('aria-label', cr.title)
    }

    // Le cerveau, toujours à l'écran. Un clic bascule — c'est la démonstration
    // la plus courte du chemin open-weights : on change, on reparle, ça marche.
    const brain = $('#brain')
    const open = s.provider === 'baseten'
    brain.textContent = open ? 'open' : 'meta'
    brain.classList.toggle('open', open)
    brain.title = `${s.provider_model ?? ''} — ${t('shell.brainSwap')}`
    brain.onclick = async () => {
      brain.textContent = '…'
      try {
        const r = await api('/settings', { method: 'POST', body: { provider: open ? 'meta' : 'baseten' } })
        toast(t('shell.brainNow', { model: r.provider_model }))
      } catch (e) { toast(e.message, true) }
      await refresh()
      if (current === 'settings') go('settings')
    }

    window.SAWT_STATE = s
    for (const fn of abonnes) { try { fn(COUNTS) } catch (e) { console.error('[counts]', e) } }
    if (repaint) paintRail()
    return s
  } catch (e) {
    console.error('[state]', e)
    return null
  }
}

/* ── les chaînes statiques de index.html ──────────────────────────────────
   Trois attributs suffisent pour toute la coque : le texte, le placeholder et
   l'infobulle. Les écrans, eux, passent par t() dans leur propre module. */
function paintStatic() {
  for (const n of $$('[data-i18n]')) n.textContent = t(n.dataset.i18n)
  for (const n of $$('[data-i18n-ph]')) n.placeholder = t(n.dataset.i18nPh)
  for (const n of $$('[data-i18n-title]')) {
    n.title = t(n.dataset.i18nTitle)
    n.setAttribute('aria-label', n.title)
  }
}

/* ── la langue ────────────────────────────────────────────────────────────
   Anglais par défaut, parce que la soumission se juge en anglais. Le bouton
   fait tourner les trois : un marchand n'ouvre pas un menu déroulant, il
   tape une fois. Le code de langue EST l'étiquette — « EN », « AR », « FR »
   se lisent dans n'importe quelle langue. */
{
  const b = $('#lang')
  const paint = () => { b.textContent = lang().toUpperCase() }
  b.onclick = () => {
    const i = LANGS.findIndex((l) => l.code === lang())
    setLang(LANGS[(i + 1) % LANGS.length].code)
  }
  paint()
  onLang(() => {
    paint()
    paintStatic()
    paintRail()
    // L'écran courant se redessine : chaque module réécrit son innerHTML en
    // entrant, donc un simple remontage suffit — sauf le chat, dont le
    // remontage rejouerait la conversation depuis le début.
    if (current !== 'chat') { try { TABS.find((x) => x.id === current)?.mod.mount?.($(`#v-${current}`)) } catch {} }
    refresh()
  })
}

/* ── le thème ─────────────────────────────────────────────────────────────
   Dans la barre du haut : c'est un réglage qu'on cherche du regard avant de
   commencer. Clair par défaut. L'icône montre où l'on VA, pas où l'on est —
   un soleil quand on est dans le noir — parce qu'un bouton dit ce qu'il fait. */
{
  const b = $('#theme')
  const paint = () => {
    const nuit = document.documentElement.dataset.theme === 'nuit'
    b.innerHTML = icon(nuit ? 'sun' : 'moon', 17)
    b.title = t(nuit ? 'shell.toLight' : 'shell.toDark')
    b.setAttribute('aria-label', b.title)
  }
  b.onclick = () => {
    const next = document.documentElement.dataset.theme === 'nuit' ? 'jour' : 'nuit'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('sawt.theme', next) } catch {}
    paint()
  }
  paint()
  onLang(paint)
}

/* ── la cloche ────────────────────────────────────────────────────────────
   Une pastille rouge dit « il y a trois choses ». Elle ne dit jamais
   lesquelles, ni quand, ni quoi faire — et une pastille sans récit, on
   apprend à l'ignorer en deux jours. Celle-ci s'ouvre sur les événements
   datés, et chaque ligne emmène sur la chose dont elle parle.

   Les notifications ne sont PAS relues en boucle : elles arrivent avec
   l'état, qui est déjà rafraîchi après chaque action. Une app qui
   interroge son serveur toutes les cinq secondes pour un compteur à zéro
   use la batterie du marchand pour rien. */
{
  const b = $('#bell')
  const box = $('#notifs')

  const paint = () => {
    b.innerHTML = icon('bell', 17)
    const n = COUNTS.notifs ?? 0
    if (n) b.append(el('span', 'dot', n > 9 ? '9+' : String(n)))
    b.title = t('shell.notifs')
    b.setAttribute('aria-label', b.title)
  }

  const close = () => { box.hidden = true }
  addEventListener('click', (e) => {
    if (!box.hidden && !box.contains(e.target) && e.target !== b && !b.contains(e.target)) close()
  })

  b.onclick = async (e) => {
    e.stopPropagation()
    if (!box.hidden) return close()
    box.hidden = false
    box.innerHTML = `<div class="loading">${t('shell.notifs.loading')}</div>`
    let d
    try { d = await api('/notifications') } catch { box.innerHTML = ''; return close() }
    box.innerHTML = d.items.length
      ? d.items.map((n) => `<button class="nrow${n.seen ? '' : ' new'}" data-goto="${esc(n.goto ?? '')}">
          <span class="k">${esc(n.kind)}</span>
          <span class="tt">${esc(n.title)}</span>
          ${n.body ? `<span class="bb">${esc(n.body)}</span>` : ''}
        </button>`).join('')
      : `<div class="nempty">${t('shell.notifs.empty')}</div>`
    for (const r of box.querySelectorAll('[data-goto]')) {
      r.onclick = () => { close(); if (r.dataset.goto) go(r.dataset.goto) }
    }
    // Ouvrir, c'est avoir vu. On éteint la pastille ici et pas au clic sur
    // une ligne : sinon la pastille survit à la lecture et ment.
    await api('/notifications/seen', { method: 'POST', body: {} }).catch(() => {})
    await refresh()
  }

  paint()
  onLang(paint)
  onCounts(paint)
}

/* ── téléphone ou bureau ──────────────────────────────────────────────────
   Le téléphone est la coque par défaut : c'est l'appareil du marchand, et
   c'est celle où l'on doit trouver les défauts avant le jury. Le bureau reste
   accessible d'un bouton pour les tableaux denses. */
{
  const b = $('#shelltog')
  const paint = () => {
    const phone = document.documentElement.dataset.shell !== 'desk'
    // L'icône montre où l'on VA, pas où l'on est — même règle que le thème :
    // un bouton dit ce qu'il fait. En coque téléphone il affiche un écran de
    // bureau, et inversement.
    b.innerHTML = icon(phone ? 'monitor' : 'phone', 17)
    b.title = t(phone ? 'shell.toDesk' : 'shell.toPhone')
    b.setAttribute('aria-label', b.title)
  }
  b.onclick = () => {
    const next = document.documentElement.dataset.shell === 'desk' ? 'phone' : 'desk'
    document.documentElement.dataset.shell = next
    try { localStorage.setItem('sawt.shell', next) } catch {}
    paint()
    syncPane()
  }
  paint()
  onLang(paint)
}

/* ── les deux volets de l'agent, sur téléphone ────────────────────────────
   La conversation et l'atelier ne tiennent pas côte à côte sur 390 px. Ils
   occupent la même case et ce sélecteur bascule. La pastille compte ce que
   l'agent a produit pendant qu'on regardait la conversation : sans elle, une
   page générée pendant qu'on lit une réponse n'existe pour personne. */
let unseen = 0
const view = $('#v-chat')
const pane = el('div', 'pane')
const bTalk = el('button', 'on')
const bWork = el('button')
pane.append(bTalk, bWork)
view.prepend(pane)

function paintPane() {
  bTalk.textContent = t('shell.pane.talk')
  bWork.innerHTML = esc(t('shell.pane.work')) + (unseen ? `<span class="pip">${unseen}</span>` : '')
  const work = view.dataset.pane === 'work'
  bTalk.classList.toggle('on', !work)
  bWork.classList.toggle('on', work)
}
function showPane(which) {
  view.dataset.pane = which
  if (which === 'work') { unseen = 0 }
  paintPane()
}
const seenWork = () => { if (view.dataset.pane === 'work') { unseen = 0; paintPane() } }
function syncPane() {
  if (!view.dataset.pane) view.dataset.pane = 'talk'
  paintPane()
}
bTalk.onclick = () => showPane('talk')
bWork.onclick = () => showPane('work')
onLang(paintPane)

// Ce que l'agent dépose dans l'atelier, pendant qu'on lit ailleurs.
new MutationObserver((muts) => {
  if (document.documentElement.dataset.shell === 'desk') return
  if (view.dataset.pane === 'work' || !view.classList.contains('on')) return
  const added = muts.reduce((n, m) => n + [...m.addedNodes].filter((x) => x.nodeType === 1 && x.classList?.contains('card')).length, 0)
  if (added) { unseen += added; paintPane() }
}).observe($('#canvas'), { childList: true })

/* ── boot ─────────────────────────────────────────────────────────────────── */
applyDocument()
paintStatic()
syncPane()
paintRail()
const first = (location.hash || '#chat').slice(1)
const state = await refresh({ repaint: false })
chat.hydrate(state)
go(TABS.some((x) => x.id === first) ? first : 'chat')

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
