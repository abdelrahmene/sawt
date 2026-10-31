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

let surfaceId = null, threadId = null, cache = null

const CHANNEL = { comment: 'commentaire', messenger: 'Messenger', instagram_dm: 'DM Instagram' }
const STATUS = {
  open: { c: 'warn', t: 'en attente' },
  answered: { c: 'ok', t: 'répondu' },
  needs_merchant: { c: 'bad', t: 'à toi de répondre' },
}

export async function mount(root) {
  root.innerHTML = `<div class="page">${loading('boîte de réception')}</div>`
  let d
  try { d = await api('/inbox') } catch (e) {
    root.innerHTML = `<div class="page"><div class="why bad">${esc(e.message)}</div></div>`; return
  }
  cache = d

  if (!d.surfaces?.length) {
    root.innerHTML = `<div class="page">
      <header><div><h1>Messages</h1><p>Commentaires et messages privés de tes clients.</p></div></header>
      ${emptyState('Aucune page connectée',
        "Connecte ta page Facebook et ton Instagram, et les commentaires et messages arriveront ici.",
        '<button class="btn p" id="to-meta">Connecter Facebook</button>')}
    </div>`
    $('#to-meta').onclick = () => import('./app.js').then((m) => m.go('meta'))
    return
  }

  if (!surfaceId || !d.surfaces.some((s) => s.id === surfaceId)) surfaceId = d.surfaces[0].id
  paint(root)
}

function paint(root) {
  const d = cache
  const threads = d.threads.filter((t) => t.asset === surfaceId)
  if (!threadId || !threads.some((t) => t.id === threadId)) threadId = threads[0]?.id ?? null

  root.innerHTML = `<div class="inbox">
    <div class="surf">
      <h4>Surfaces</h4>
      ${d.surfaces.map((s) => `
        <button data-s="${s.id}" class="${s.id === surfaceId ? 'on' : ''}">
          <span class="av ${s.kind === 'instagram' ? 'ig' : 'fb'}"
                style="background:${s.kind === 'instagram' ? 'linear-gradient(135deg,#f58529,#dd2a7b 55%,#8134af)' : 'linear-gradient(135deg,#1877f2,#0a4fa8)'}">${
            s.kind === 'instagram' ? 'IG' : 'FB'}</span>
          <span class="n" style="min-width:0">${esc(s.name)}
            <span class="s" style="display:block">${s.stats.total} conversation(s)</span></span>
          ${s.stats.open ? `<span class="pip">${s.stats.open}</span>` : ''}
        </button>`).join('')}
      <div style="margin-top:16px;padding:0 6px">
        <div class="sim">simulé</div>
        <p style="font-size:11.5px;color:var(--faint);line-height:1.6;margin-top:9px">
          Clients et messages écrits pour la démonstration. Aucun vrai client,
          aucune vraie page.</p>
      </div>
    </div>

    <div class="tlist">
      <div class="h">${threads.length} conversation(s)
        <button class="btn sm p" id="all">${icon('bolt', 14)} tout traiter</button>
      </div>
      <div class="scroll" id="tl"></div>
    </div>

    <div class="tview" id="tv"></div>
  </div>`

  for (const b of root.querySelectorAll('.surf button[data-s]')) {
    b.onclick = () => { surfaceId = Number(b.dataset.s); threadId = null; paint(root) }
  }
  $('#all').onclick = () => answerAll(root, threads.filter((t) => t.status === 'open').map((t) => t.id))

  const tl = $('#tl')
  if (!threads.length) tl.innerHTML = `<div class="empty" style="padding:30px 18px"><p>Rien ici.</p></div>`
  for (const t of threads) {
    const st = STATUS[t.status] ?? STATUS.open
    const n = el('div', `t${t.id === threadId ? ' on' : ''}`)
    n.innerHTML = `
      <span class="av">${esc(initials(t.person))}</span>
      <div class="top"><span class="who">${esc(t.person)}</span><span class="when">${esc(ago(t.last_at))}</span></div>
      <div>
        <div class="txt">${esc(String(t.last_text ?? '').slice(0, 80))}</div>
        <div class="meta">
          <span class="chip">${esc(CHANNEL[t.channel] ?? t.channel)}</span>
          <span class="chip ${st.c}">${esc(st.t)}</span>
          ${t.n_ai ? `<span class="chip ok">${t.n_ai} IA</span>` : ''}
        </div>
      </div>`
    n.onclick = () => { threadId = t.id; paint(root) }
    tl.append(n)
  }

  openThread(root)
}

async function openThread(root) {
  const tv = $('#tv')
  if (!threadId) { tv.innerHTML = emptyState('Choisis une conversation', 'Les messages apparaîtront ici.'); return }
  tv.innerHTML = loading('conversation')

  let t
  try { t = await api(`/inbox/${threadId}`) } catch (e) { tv.innerHTML = `<div class="why bad">${esc(e.message)}</div>`; return }

  const st = STATUS[t.status] ?? STATUS.open
  tv.innerHTML = `
    <div class="h">
      <span class="av">${esc(initials(t.person))}</span>
      <div><div class="n">${esc(t.person)}</div>
        <div class="s">${esc(CHANNEL[t.channel] ?? t.channel)} · ${esc(ago(t.last_at))}</div></div>
      <div class="right">
        <span class="chip ${st.c}">${esc(st.t)}</span>
        <button class="btn sm p" id="ai">${icon('bolt', 14)} répondre avec l'IA</button>
      </div>
    </div>
    <div class="tbody" id="tb"></div>
    <div class="tfoot">
      <input class="f" id="mytext" placeholder="Réponds toi-même…" dir="auto">
      <button class="btn" id="mysend">${icon('send', 15)}</button>
    </div>`

  const tb = $('#tb')
  if (t.post_text) tb.append(el('div', 'post', esc(t.post_text)))
  for (const m of t.messages) tb.append(bubble(m))
  if (t.status === 'needs_merchant' && t.subject) {
    tb.append(el('div', 'escal', `
      <b>${icon('alert', 15)} Il n'a pas répondu, et c'est voulu.</b>
      La réponse exigeait un fait qu'il n'a pas. Plutôt que d'inventer, il te la rend.
      <div class="need">Il lui faut de toi : ${esc(t.subject)}</div>`))
  }
  tb.scrollTop = tb.scrollHeight

  $('#ai').onclick = () => answerOne(root, t.id)
  const mine = async () => {
    const v = $('#mytext').value.trim()
    if (!v) return
    $('#mytext').value = ''
    await api(`/inbox/${t.id}/reply`, { method: 'POST', body: { text: v } })
    await reload(root)
  }
  $('#mysend').onclick = mine
  $('#mytext').addEventListener('keydown', (e) => { if (e.key === 'Enter') mine() })
}

function bubble(m) {
  const who = m.author === 'customer' ? 'client' : m.author === 'agent' ? 'Sawt' : 'toi'
  const n = el('div', `bub ${m.author}`)
  n.innerHTML = `<span class="by">${esc(who)}${
    m.by_ai ? ` · ${esc(m.model ?? 'IA')}${m.ms ? ` · ${m.ms} ms` : ''}` : ''}</span>${esc(m.text)}`
  return n
}

async function answerOne(root, id) {
  const btn = $('#ai')
  if (btn) { btn.disabled = true; btn.innerHTML = `${icon('clock', 14)} rédige…` }
  try {
    const r = await api(`/inbox/${id}/answer`, { method: 'POST' })
    toast(r.draft.can_answer
      ? `Répondu en ${r.draft.ms} ms.`
      : `Pas répondu — il te faut : ${r.draft.missing}`, !r.draft.can_answer)
    await reload(root)
  } catch (e) { toast(e.message, true); if (btn) { btn.disabled = false; btn.innerHTML = `${icon('bolt', 14)} répondre avec l'IA` } }
}

async function answerAll(root, ids) {
  if (!ids.length) return toast('Personne n\'attend.')
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
  toast(`${ok} répondus, ${esc_} renvoyés à toi.`, esc_ > ok)
  await reload(root)
}

async function reload(root) {
  cache = await api('/inbox')
  await refresh()
  paint(root)
}
