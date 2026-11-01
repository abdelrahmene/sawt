// The inbox. Comments and Messenger on one screen, the way Business Suite
// puts them, and the agent answering in darija beside them.
//
// The refusals are the feature. Three of the seeded threads cannot be answered
// without the merchant — stock for a size, the fee for a wilaya, where an
// existing parcel is — and the screen gives those the loudest treatment it
// has, because every other AI customer-service demo answers them anyway and
// a confident wrong "yes, size 43 is available" is a refused delivery, 700 DA
// of return shipping and a customer who never comes back.
import { $, el, esc, icon, ago, initials, api, toast, loading, emptyState, simbar } from './ui.js'
import { refresh } from './app.js'
import { t, num } from './i18n.js'

let surfaceId = null, threadId = null, cache = null

// Les deux tables portent la CLÉ et plus le libellé, et `t()` est appelé au
// moment du rendu : résolues à l'import, elles resteraient dans la langue du
// chargement même après une bascule.
//
// Les clés comparées dans le code — `comment`, `messenger`, `instagram_dm`,
// `open`, `answered`, `needs_merchant` — ne sont pas traduisibles : elles
// viennent de la base et elles y restent.
const CHANNEL = { comment: 'inbox.channel.comment', messenger: 'inbox.channel.messenger', instagram_dm: 'inbox.channel.dm' }
const channel = (c) => (CHANNEL[c] ? t(CHANNEL[c]) : c)
const STATUS = {
  open: { c: 'warn', k: 'inbox.status.open' },
  answered: { c: 'ok', k: 'inbox.status.answered' },
  needs_merchant: { c: 'bad', k: 'inbox.status.needs' },
}

export async function mount(root) {
  root.innerHTML = `<div class="page">${loading(t('inbox.loading'))}</div>`
  let d
  try { d = await api('/inbox') } catch (e) {
    root.innerHTML = `<div class="page"><div class="why bad">${esc(e.message)}</div></div>`; return
  }
  cache = d

  if (!d.surfaces?.length) {
    root.innerHTML = `<div class="page">
      <header><div><h1>${t('inbox.title')}</h1><p>${t('inbox.sub')}</p></div></header>
      ${emptyState(t('inbox.empty.title'),
        t('inbox.empty.body'),
        `<button class="btn p" id="to-meta">${t('inbox.empty.cta')}</button>`)}
    </div>`
    $('#to-meta').onclick = () => import('./app.js').then((m) => m.go('meta'))
    return
  }

  if (!surfaceId || !d.surfaces.some((s) => s.id === surfaceId)) surfaceId = d.surfaces[0].id
  paint(root)
}

function paint(root) {
  const d = cache
  const threads = d.threads.filter((th) => th.asset === surfaceId)
  if (!threadId || !threads.some((th) => th.id === threadId)) threadId = threads[0]?.id ?? null

  root.innerHTML = `<div class="inbox">
    <div class="surf">
      <h4>${t('inbox.surfaces')}</h4>
      ${d.surfaces.map((s) => `
        <button data-s="${s.id}" class="${s.id === surfaceId ? 'on' : ''}">
          <span class="av ${s.kind === 'instagram' ? 'ig' : 'fb'}"
                style="background:${s.kind === 'instagram' ? 'linear-gradient(135deg,#f58529,#dd2a7b 55%,#8134af)' : 'linear-gradient(135deg,#1877f2,#0a4fa8)'}">${
            s.kind === 'instagram' ? 'IG' : 'FB'}</span>
          <span class="n" style="min-width:0">${esc(s.name)}
            <span class="s" style="display:block">${t('inbox.conversations', { n: num(s.stats.total) })}</span></span>
          ${s.stats.open ? `<span class="pip">${s.stats.open}</span>` : ''}
        </button>`).join('')}
      <div style="margin-top:16px;padding:0 6px">
        <div class="sim">${t('inbox.sim')}</div>
        <p style="font-size:11.5px;color:var(--faint);line-height:1.6;margin-top:9px">
          ${t('inbox.sim.body')}</p>
      </div>
    </div>

    <div class="tlist">
      <div class="h">${t('inbox.conversations', { n: num(threads.length) })}
        <button class="btn sm p" id="all">${icon('bolt', 14)} ${t('inbox.answerAll')}</button>
      </div>
      <div class="scroll" id="tl"></div>
    </div>

    <div class="tview" id="tv"></div>
  </div>`

  for (const b of root.querySelectorAll('.surf button[data-s]')) {
    b.onclick = () => { surfaceId = Number(b.dataset.s); threadId = null; paint(root) }
  }
  $('#all').onclick = () => answerAll(root, threads.filter((th) => th.status === 'open').map((th) => th.id))

  const tl = $('#tl')
  if (!threads.length) tl.innerHTML = `<div class="empty" style="padding:30px 18px"><p>${t('inbox.none')}</p></div>`
  for (const th of threads) {
    const st = STATUS[th.status] ?? STATUS.open
    const n = el('div', `t${th.id === threadId ? ' on' : ''}`)
    n.innerHTML = `
      <span class="av">${esc(initials(th.person))}</span>
      <div class="top"><span class="who">${esc(th.person)}</span><span class="when">${esc(ago(th.last_at))}</span></div>
      <div>
        <div class="txt">${esc(String(th.last_text ?? '').slice(0, 80))}</div>
        <div class="meta">
          <span class="chip">${esc(channel(th.channel))}</span>
          <span class="chip ${st.c}">${esc(t(st.k))}</span>
          ${th.n_ai ? `<span class="chip ok">${t('inbox.aiCount', { n: num(th.n_ai) })}</span>` : ''}
        </div>
      </div>`
    n.onclick = () => { threadId = th.id; paint(root) }
    tl.append(n)
  }

  openThread(root)
}

async function openThread(root) {
  const tv = $('#tv')
  if (!threadId) { tv.innerHTML = emptyState(t('inbox.pick.title'), t('inbox.pick.body')); return }
  tv.innerHTML = loading(t('inbox.loading.thread'))

  let th
  try { th = await api(`/inbox/${threadId}`) } catch (e) { tv.innerHTML = `<div class="why bad">${esc(e.message)}</div>`; return }

  const st = STATUS[th.status] ?? STATUS.open
  tv.innerHTML = `
    <div class="h">
      <span class="av">${esc(initials(th.person))}</span>
      <div><div class="n">${esc(th.person)}</div>
        <div class="s">${esc(channel(th.channel))} · ${esc(ago(th.last_at))}</div></div>
      <div class="right">
        <span class="chip ${st.c}">${esc(t(st.k))}</span>
        <button class="btn sm p" id="ai">${icon('bolt', 14)} ${t('inbox.answerAI')}</button>
      </div>
    </div>
    <div class="tbody" id="tb"></div>
    <div class="tfoot">
      <input class="f" id="mytext" placeholder="${esc(t('inbox.myReply'))}" dir="auto">
      <button class="btn" id="mysend">${icon('send', 15)}</button>
    </div>`

  const tb = $('#tb')
  if (th.post_text) tb.append(el('div', 'post', esc(th.post_text)))
  for (const m of th.messages) tb.append(bubble(m))
  if (th.status === 'needs_merchant' && th.subject) {
    tb.append(el('div', 'escal', `
      <b>${icon('alert', 15)} ${t('inbox.escal.title')}</b>
      ${t('inbox.escal.body')}
      <div class="need">${t('inbox.escal.need', { what: esc(th.subject) })}</div>`))
  }
  tb.scrollTop = tb.scrollHeight

  $('#ai').onclick = () => answerOne(root, th.id)
  const mine = async () => {
    const v = $('#mytext').value.trim()
    if (!v) return
    $('#mytext').value = ''
    await api(`/inbox/${th.id}/reply`, { method: 'POST', body: { text: v } })
    await reload(root)
  }
  $('#mysend').onclick = mine
  $('#mytext').addEventListener('keydown', (e) => { if (e.key === 'Enter') mine() })
}

function bubble(m) {
  const who = m.author === 'customer' ? t('inbox.who.customer') : m.author === 'agent' ? 'Sawt' : t('inbox.who.you')
  const n = el('div', `bub ${m.author}`)
  n.innerHTML = `<span class="by">${esc(who)}${
    m.by_ai ? ` · ${esc(m.model ?? t('inbox.who.ai'))}${m.ms ? ` · ${num(m.ms)} ms` : ''}` : ''}</span>${esc(m.text)}`
  return n
}

async function answerOne(root, id) {
  const btn = $('#ai')
  if (btn) { btn.disabled = true; btn.innerHTML = `${icon('clock', 14)} ${t('inbox.writing')}` }
  try {
    const r = await api(`/inbox/${id}/answer`, { method: 'POST' })
    toast(r.draft.can_answer
      ? t('inbox.toast.answered', { ms: num(r.draft.ms) })
      : t('inbox.toast.missing', { what: r.draft.missing }), !r.draft.can_answer)
    await reload(root)
  } catch (e) { toast(e.message, true); if (btn) { btn.disabled = false; btn.innerHTML = `${icon('bolt', 14)} ${t('inbox.answerAI')}` } }
}

async function answerAll(root, ids) {
  if (!ids.length) return toast(t('inbox.toast.nobody'))
  const btn = $('#all')
  btn.disabled = true
  let ok = 0, esc_ = 0
  for (const [i, id] of ids.entries()) {
    btn.innerHTML = `${icon('clock', 14)} ${i + 1}/${ids.length}`
    try {
      const r = await api(`/inbox/${id}/answer`, { method: 'POST' })
      r.draft.can_answer ? ok++ : esc_++
    } catch { esc_++ }
  }
  toast(t('inbox.toast.batch', { ok: num(ok), back: num(esc_) }), esc_ > ok)
  await reload(root)
}

async function reload(root) {
  cache = await api('/inbox')
  await refresh()
  paint(root)
}
