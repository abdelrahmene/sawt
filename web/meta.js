// The Meta console: a staged "Continue with Facebook", then the Business
// Manager it unlocks.
//
// Why this screen exists at all. A judge running this project has no Facebook
// Page, no Business Manager and no ad account, and `ads_management` takes Meta
// weeks to approve — the organisers said plainly that a submission must be
// runnable without the judge connecting their own Meta account. A real OAuth
// button would therefore stop the demo at the first click.
//
// So the flow is staged, in the real order, asking for the real permission
// strings. What is NOT staged: the mark on every surface saying so, and the
// consequence of refusing an optional scope — decline instagram_basic and the
// Instagram account genuinely does not appear, because that is what would
// happen. Half-granted permissions are the single most common way a real
// integration half-works, and an agent that has never met one is untested.
import { $, el, esc, icon, api, toast, simbar, loading } from './ui.js'
// `num` vient d'i18n.js et pas d'ui.js : celui d'ui.js est figé en `fr-FR`, et
// un écran anglais qui affiche « 18 420 » à la française se trahit tout seul.
import { t, num } from './i18n.js'
import { go, refresh } from './app.js'

let chosen = new Set()

const AV = { page: 'page', instagram: 'instagram', adaccount: 'adaccount', pixel: 'pixel', catalog: 'catalog' }

// Le genre de ressource et le groupe de permissions arrivent du serveur en
// valeurs techniques, comparées dans le code — elles ne se traduisent pas.
// Ces tables ne portent donc que la CLÉ du libellé : `t()` est appelé au
// rendu, sinon la table figerait la langue du chargement de la page.
const KIND_KEY = {
  page: 'meta.kind.page', instagram: 'meta.kind.instagram', adaccount: 'meta.kind.adaccount',
  pixel: 'meta.kind.pixel', catalog: 'meta.kind.catalog',
}
const kindLabel = (kind) => (KIND_KEY[kind] ? t(KIND_KEY[kind]) : kind)

// `instagram` n'est pas dans la table : c'est une marque, elle s'affiche telle
// quelle, exactement comme avant.
const GROUP_KEY = { compte: 'meta.group.account', pages: 'meta.group.pages', 'publicité': 'meta.group.ads' }
const groupLabel = (g) => (GROUP_KEY[g] ? t(GROUP_KEY[g]) : g)

/** À quoi sert une permission. Le serveur l'envoie en français (`why`) ; le
 *  dictionnaire la traduit par nom de permission, et une permission ajoutée
 *  côté serveur et absente du dictionnaire garde son texte au lieu de montrer
 *  une clé au marchand. */
function whyOf(s) {
  const key = `meta.scope.${s.name}`
  const text = t(key)
  return text === key ? s.why : text
}

export async function mount(root) {
  root.innerHTML = `<div class="page">${loading(t('meta.loading.connect'))}</div>`
  let c
  try { c = await api('/meta') } catch (e) { root.innerHTML = `<div class="page"><div class="why bad">${esc(e.message)}</div></div>`; return }

  if (c.status === 'connected') return connected(root, c)
  if (c.status === 'permissions') return permissions(root, c)
  if (c.status === 'account') return account(root, c)
  return disconnected(root, c)
}

/* ── step 0 ──────────────────────────────────────────────────────────────── */
function disconnected(root, c) {
  root.innerHTML = `<div class="page">
    <header>
      <div><h1>${t('meta.title')}</h1>
      <p>${t('meta.intro')}</p></div>
    </header>
    ${simbar(`<b>${t('meta.sim.flow.lead')}</b> ${t('meta.sim.flow.body')}`)}
    <div class="consent">
      <div class="ch"><span class="logo">f</span><b>${t('meta.login.header')}</b><span class="sim" style="margin-inline-start:auto">${t('meta.sim')}</span></div>
      <div class="cb" style="text-align:center;padding:34px 24px">
        <div style="width:62px;height:62px;border-radius:50%;background:var(--fb);color:#fff;display:grid;place-items:center;font:800 34px Georgia,serif;margin:0 auto 18px">f</div>
        <h4>${t('meta.login.title')}</h4>
        <p class="lead">${t('meta.login.lead')}</p>
        <button class="btn fb" id="fb-start" style="padding:13px 26px;font-size:15px">
          ${icon('link', 16)} ${t('meta.login.cta')}
        </button>
      </div>
      <div class="cf"><span class="tiny">${t('meta.login.foot')}</span></div>
    </div>
  </div>`
  $('#fb-start').onclick = async () => {
    await api('/meta/login', { method: 'POST' })
    mount(root)
  }
}

/* ── step 1: which account ───────────────────────────────────────────────── */
function account(root, c) {
  const p = c.user_name ?? 'Yacine B.'
  root.innerHTML = `<div class="page">
    <header><div><h1>${t('meta.title')}</h1><p>${t('meta.step1')}</p></div></header>
    <div class="consent">
      <div class="ch"><span class="logo">f</span><b>Facebook</b><span class="sim" style="margin-inline-start:auto">${t('meta.sim')}</span></div>
      <div class="cb">
        <h4>${t('meta.account.title')}</h4>
        <p class="lead">${t('meta.account.lead')}</p>
        <div class="who" id="who">
          <span class="av">${esc(initialsOf(p))}</span>
          <div><div class="n">${esc(p)}</div><div class="e">y.benali@example.dz</div></div>
          <span style="margin-inline-start:auto;color:#8a8d91">${icon('check', 18)}</span>
        </div>
      </div>
      <div class="cf">
        <span class="tiny">${t('meta.account.foot')}</span>
        <button class="btn ghost sm" id="cancel">${t('meta.cancel')}</button>
        <button class="btn fb" id="next">${t('meta.continue')}</button>
      </div>
    </div>
  </div>`
  const next = async () => { await api('/meta/review', { method: 'POST' }); mount(root) }
  $('#who').onclick = next
  $('#next').onclick = next
  $('#cancel', root).onclick = async () => { await api('/meta/disconnect', { method: 'POST' }); mount(root) }
}

const initialsOf = (s) => String(s).split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)

/* ── step 2: the permissions ─────────────────────────────────────────────── */
function permissions(root, c) {
  // `c.scopes` on a connection is the list of permissions ALREADY granted —
  // which, on the screen that asks for them, is empty. The catalogue of what
  // can be asked for is a different field, and reading the wrong one rendered
  // a consent dialog with nothing to consent to.
  const scopes = c.scope_catalog?.length ? c.scope_catalog : []
  if (!scopes.length) return disconnected(root, c)
  if (!chosen.size) chosen = new Set(scopes.map((s) => s.name))

  const groups = [...new Set(scopes.map((s) => s.group))]
  root.innerHTML = `<div class="page">
    <header><div><h1>${t('meta.title')}</h1><p>${t('meta.step2')}</p></div></header>
    <div class="consent">
      <div class="ch"><span class="logo">f</span><b>${t('meta.perms.header')}</b><span class="sim" style="margin-inline-start:auto">${t('meta.sim')}</span></div>
      <div class="cb">
        <h4>${t('meta.perms.title')}</h4>
        <p class="lead">${t('meta.perms.lead')}</p>
        <div class="perms" id="perms">
          ${groups.map((g) => `
            <div class="req" style="padding:11px 8px 4px">${esc(groupLabel(g))}</div>
            ${scopes.filter((s) => s.group === g).map((s) => `
              <div class="perm" data-s="${esc(s.name)}">
                <span class="tick ${s.required ? 'lock on' : (chosen.has(s.name) ? 'on' : '')}">${icon('check', 13)}</span>
                <div class="w">
                  <div class="d">${esc(whyOf(s))}</div>
                  <div class="s">${esc(s.name)}${s.required ? ` · ${t('meta.perm.required')}` : ''}</div>
                </div>
              </div>`).join('')}`).join('')}
        </div>
      </div>
      <div class="cf">
        <span class="tiny">${t('meta.perms.foot1')}<br>${t('meta.perms.foot2')}</span>
        <button class="btn ghost sm" id="cancel">${t('meta.cancel')}</button>
        <button class="btn fb" id="grant">${t('meta.grant')}</button>
      </div>
    </div>
  </div>`

  for (const row of root.querySelectorAll('.perm')) {
    const name = row.dataset.s
    const s = scopes.find((x) => x.name === name)
    if (s?.required) continue
    row.onclick = () => {
      const tick = row.querySelector('.tick')
      if (chosen.has(name)) { chosen.delete(name); tick.classList.remove('on') }
      else { chosen.add(name); tick.classList.add('on') }
    }
  }

  $('#cancel', root).onclick = async () => { await api('/meta/disconnect', { method: 'POST' }); chosen = new Set(); mount(root) }
  $('#grant').onclick = async () => {
    const btn = $('#grant'); btn.disabled = true; btn.textContent = t('meta.granting')
    try {
      await api('/meta/grant', { method: 'POST', body: { granted: [...chosen] } })
      chosen = new Set()
      await refresh()
      toast(t('meta.toast.connected'))
      mount(root)
    } catch (e) { toast(e.message, true); btn.disabled = false; btn.textContent = t('meta.grant') }
  }
}

/* ── connected: the Business Manager ────────────────────────────────────── */
function connected(root, c) {
  const biz = c.business ?? {}
  const declined = c.declined ?? []

  root.innerHTML = `<div class="page">
    <header>
      <div><h1>${esc(biz.name ?? 'Business Manager')}</h1>
      <p>${t('meta.connectedAs', { name: `<b>${esc(c.user_name)}</b>` })} · ${t('meta.grantedCount', { n: c.scopes.length })}${
        declined.length ? ` · <span style="color:var(--bad)">${t('meta.declinedCount', { n: declined.length })}</span>` : ''}</p></div>
      <div class="actions">
        <button class="btn sm" id="graph">${icon('eye', 14)} ${t('meta.graphBtn')}</button>
        <button class="btn sm danger" id="off">${t('meta.disconnect')}</button>
      </div>
    </header>

    ${simbar(`<b>${t('meta.sim.env.lead')}</b> ${t('meta.sim.env.body')}`)}

    <div class="card">
      <h3>${icon('user', 15)} ${t('meta.card.account')}<span class="sim" style="margin-inline-start:auto">${t('meta.sim')}</span></h3>
      <div class="body">
        <dl class="kv">
          <dt>${t('meta.kv.user')}</dt><dd>${esc(c.user_name)} · <span class="chip mono">${esc(c.user_id)}</span></dd>
          <dt>${t('meta.kv.business')}</dt><dd>${esc(biz.name ?? '—')} · <span class="chip mono">${esc(biz.id ?? '')}</span></dd>
          <dt>${t('meta.kv.token')}</dt><dd><span class="chip mono" style="word-break:break-all">${esc(c.token ?? '')}</span></dd>
        </dl>
        <div class="why">${t('meta.token.why')}</div>
      </div>
    </div>

    <h2 class="sec">${t('meta.sec.assets')}</h2>
    <div class="assets">
      ${(c.assets ?? []).map((a) => `
        <div class="asset">
          <span class="av ${esc(AV[a.kind] ?? 'page')}">${esc(shortOf(a))}</span>
          <div style="min-width:0">
            <div class="n">${esc(a.name)}</div>
            <div class="k">${esc(kindLabel(a.kind))}</div>
            <div class="m">${esc(metaLine(a))}</div>
            <div class="id">${esc(a.external_id)}</div>
          </div>
        </div>`).join('')}
    </div>

    <h2 class="sec">${t('meta.sec.perms')}</h2>
    <div class="card"><div class="body">
      <div style="display:flex;flex-wrap:wrap;gap:7px">
        ${c.scopes.map((s) => `<span class="chip ok mono">${icon('check', 12)}${esc(s)}</span>`).join('')}
        ${declined.map((s) => `<span class="chip bad mono">${esc(s)}</span>`).join('')}
      </div>
      ${declined.length ? `<div class="why warn" style="margin-top:14px">
        <b>${t('meta.declined.label')}</b> ${esc(declined.join(', '))}.<br>
        ${t('meta.declined.why')}</div>` : ''}
    </div></div>

    <h2 class="sec">${t('meta.sec.surfaces')}</h2>
    <div class="grid-3">
      ${(c.surfaces ?? []).map((s) => `
        <div class="card"><div class="body">
          <div style="font-weight:650;font-size:14.5px">${esc(s.name)}</div>
          <div class="kpis" style="margin-top:12px;grid-template-columns:1fr 1fr">
            <div class="kpi"><div class="l">${t('meta.kpi.open')}</div><div class="v">${s.stats.open}</div></div>
            <div class="kpi"><div class="l">${t('meta.kpi.answered')}</div><div class="v">${s.stats.answered}</div></div>
          </div>
          ${s.stats.escalated ? `<div class="why warn" style="margin-top:10px">${t('meta.escalated', { n: s.stats.escalated })}</div>` : ''}
          <button class="btn sm go-inbox" style="margin-top:12px">${icon('inbox', 14)} ${t('meta.open')}</button>
        </div></div>`).join('')}
    </div>

    <div id="graph-out" style="margin-top:22px"></div>
  </div>`

  for (const b of root.querySelectorAll('.go-inbox')) b.onclick = () => go('inbox')

  $('#off').onclick = async () => {
    if (!confirm(t('meta.confirmOff'))) return
    await api('/meta/disconnect', { method: 'POST' })
    await refresh()
    mount(root)
  }

  // A simulated screen becomes verifiable the moment it shows the real shape
  // of the answer it is standing in for.
  $('#graph').onclick = async () => {
    const out = $('#graph-out')
    if (out.dataset.on) { out.innerHTML = ''; delete out.dataset.on; return }
    out.dataset.on = '1'
    out.innerHTML = loading(t('meta.loading.read'))
    const g = await api('/meta/graph')
    out.innerHTML = `<div class="card"><h3>${t('meta.graph.title')}
      <span class="sim" style="margin-inline-start:auto">${t('meta.graph.sim')}</span></h3>
      <div class="body">${Object.entries(g).map(([k, v]) =>
        `<div style="margin-bottom:13px"><div class="chip mono" style="margin-bottom:6px">${esc(k)}</div>
         <pre>${esc(JSON.stringify(v, null, 2))}</pre></div>`).join('')}</div></div>`
  }
}

const shortOf = (a) => a.kind === 'instagram' ? 'IG' : a.kind === 'adaccount' ? 'AD'
  : a.kind === 'pixel' ? 'PX' : a.kind === 'catalog' ? 'CT' : 'FB'

function metaLine(a) {
  const m = a.meta ?? {}
  if (a.kind === 'page') return `${t('meta.line.followers', { n: num(a.followers) })} · ${m.category ?? ''}${
    m.response_rate ? ` · ${t('meta.line.response', { pct: Math.round(m.response_rate * 100) })}` : ''}`
  if (a.kind === 'instagram') return `${t('meta.line.followers', { n: num(a.followers) })} · ${t('meta.line.linkedToPage')}`
  if (a.kind === 'adaccount') return `${a.currency} · ${m.timezone ?? ''} · ${m.funding ?? ''}`
  if (a.kind === 'pixel') return t('meta.line.events7d', { n: num(m.events_7d) })
  if (a.kind === 'catalog') return t('meta.line.products', { n: m.products ?? 0 })
  return ''
}
