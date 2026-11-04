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

/* ── « branche ta propre app Meta » ───────────────────────────────────────
   Le panneau que le jury doit lire AVANT de voir « SIMULÉ » partout. Il
   existe parce que la conclusion inverse se tire toute seule : des surfaces
   mises en scène, donc la plateforme jamais touchée. Elle l'est — par
   src/meta-graph/index.js, depuis la ligne de commande — et ce panneau le dit
   sans qu'il faille ouvrir le README.

   Rien ici n'est recopié à la main. Tout vient de `platform` dans /api/meta,
   c'est-à-dire de la table dont le code construit ses chemins : un point de
   terminaison ne peut donc pas s'afficher ici sans être appelé, et le
   `status=PAUSED` montré est littéralement l'objet que le code fusionne.

   Aucun identifiant nouveau : tout est statique et `<details>` s'ouvre sans
   JavaScript. $() cherche dans le document entier, et cet écran en partage un
   avec sept autres. */

const mono = (s) => `<span class="chip mono" dir="ltr">${esc(s)}</span>`

// `live` / `replay` / `staged` arrivent en valeurs techniques du serveur : le
// code les compare, seul le libellé se traduit. Même règle que KIND_KEY.
const VAL_KEY = { live: 'meta.own.v.live', replay: 'meta.own.v.replay', staged: 'meta.own.v.staged' }
const val = (v) =>
  `<span class="chip ${v === 'live' ? 'ok' : v === 'staged' ? 'warn' : ''}">${esc(t(VAL_KEY[v] ?? v))}</span>`

const USE_KEY = {
  you: 'meta.own.use.you', path: 'meta.own.use.path',
  header: 'meta.own.use.header', url: 'meta.own.use.url',
}

const carteMode = (m, actif) => `
  <div class="card"><div class="body">
    <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      <b class="mono" dir="ltr" style="font-size:14px">${esc(m.id)}</b>
      ${actif ? `<span class="chip ok">${t('meta.own.modeNow')}</span>` : ''}
      ${m.default ? `<span class="chip info">${t('meta.own.isDefault')}</span>` : ''}
    </div>
    <dl class="kv">
      <dt>${t('meta.own.kv.models')}</dt><dd>${val(m.models)}</dd>
      <dt>${t('meta.own.kv.graph')}</dt><dd>${val(m.graph)}</dd>
      <dt>${t('meta.own.kv.screens')}</dt><dd>${val(m.screens)}</dd>
      <dt>${t('meta.own.kv.env')}</dt><dd>${m.env.length ? m.env.map(mono).join(' ') : t('meta.own.v.none')}</dd>
      <dt>${t('meta.own.kv.how')}</dt><dd>${mono(m.how)}</dd>
    </dl>
  </div></div>`

const ligneAppel = (c) => `
  <div class="card" style="margin-bottom:10px"><div class="body">
    <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-bottom:9px">
      ${mono(c.method)}
      <b style="font-size:13.5px">${esc(t(`meta.call.${c.key}`))}</b>
      ${c.forces ? `<span class="chip warn mono" dir="ltr">status=${esc(c.forces.status)}</span>` : ''}
    </div>
    <pre dir="ltr">${esc(c.real)}</pre>
    <dl class="kv" style="margin-top:11px">
      <dt>${t('meta.own.kv.perms')}</dt><dd>${c.scopes.map(mono).join(' ')}</dd>
      <dt>${t('meta.own.kv.needs')}</dt><dd>${c.env.map(mono).join(' ')}</dd>
      ${c.body ? `<dt>${t('meta.own.kv.body')}</dt><dd><pre dir="ltr">${esc(JSON.stringify(c.body))}</pre></dd>` : ''}
      <dt>${t('meta.own.kv.replay')}</dt>
      <dd>${mono(c.replay)}<div class="tiny">${esc(t('meta.own.recordedOn', { when: c.recorded }))}</div></dd>
    </dl>
    ${c.forces ? `<div class="why warn">${esc(t('meta.own.forcedWhy'))}</div>` : ''}
  </div></div>`

const ligneEnv = (e) => `
  <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;padding:9px 0;border-block-end:1px solid var(--line)">
    ${mono(e.name)}
    <span class="chip ${e.set ? 'ok' : ''}">${t(e.set ? 'meta.own.envSet' : 'meta.own.envMissing')}</span>
    <span class="tiny" style="flex:1 1 190px;min-width:0">${esc(t(USE_KEY[e.used_by] ?? e.used_by))}
      · ${t('meta.own.envRead')} <span class="mono" dir="ltr">${esc(e.read_by)}</span></span>
  </div>`

const ligneEnr = (r) => `
  <div style="padding:9px 0;border-block-end:1px solid var(--line)">
    <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">
      ${mono(r.key)}
      ${r.endpoint ? `<span class="mono tiny" dir="ltr">${esc(r.endpoint)}</span>` : ''}
    </div>
    <div class="tiny">${esc(t('meta.own.recordedOn', { when: r.recorded }))}${
      r.replayed_by ? ` · ${t('meta.own.recBy')} <span class="mono" dir="ltr">${esc(r.replayed_by)}</span>` : ''}</div>
  </div>`

/** @param replie  replie les trois modes : l'écran déconnecté garde le bouton
 *  bleu atteignable, l'écran connecté a la place de tout montrer. */
function panneauApp(pf, { replie = false } = {}) {
  if (!pf) return ''
  const modes = `<div class="grid-3">${pf.modes.map((m) => carteMode(m, m.id === pf.mode)).join('')}</div>`
  return `
  <h2 class="sec">${t('meta.own.title')}</h2>
  <div class="card metaown">
    <h3>${icon('link', 15)} ${t('meta.own.title')}
      <span class="chip ok mono" dir="ltr">mode: ${esc(pf.mode)}</span></h3>
    <div class="body">
      <p class="lead" style="margin:0 0 4px">${esc(t('meta.own.lead'))}</p>
      <div class="why warn">${esc(t('meta.own.warn'))}</div>

      ${replie
        ? `<details class="fold" style="margin-top:14px"><summary>${icon('grid', 15)} ${t('meta.own.modesTitle')}
             <span class="who mono" dir="ltr">${esc(pf.modes.map((m) => m.id).join(' · '))}</span></summary>
             <div class="body">${modes}</div></details>`
        : `<div style="margin-top:14px">${modes}</div>`}

      <details class="fold">
        <summary>${icon('eye', 15)} ${t('meta.own.callsTitle')}
          <span class="who mono" dir="ltr">${esc(pf.base)}/${esc(pf.graph_version)}</span></summary>
        <div class="body">
          <p class="tiny" style="margin:0 0 12px">${esc(t('meta.own.callsLead'))}</p>
          ${pf.calls.map(ligneAppel).join('')}
          <div class="why">${esc(t('meta.own.setupFoot'))}</div>
        </div>
      </details>

      <details class="fold">
        <summary>${icon('gear', 15)} ${t('meta.own.envTitle')}
          <span class="who">${pf.env.filter((e) => e.set).length}/${pf.env.length}</span></summary>
        <div class="body">
          ${pf.env.map(ligneEnv).join('')}
          <div class="why">${esc(t('meta.own.envFoot'))}</div>
        </div>
      </details>

      <details class="fold">
        <summary>${icon('clock', 15)} ${t('meta.own.recTitle')}
          <span class="who mono" dir="ltr">${esc(pf.fixtures)}</span></summary>
        <div class="body">
          <p class="tiny" style="margin:0 0 10px">${esc(t('meta.own.recLead'))}</p>
          ${pf.recordings.map(ligneEnr).join('')}
        </div>
      </details>

      <div class="why warn" style="margin-top:16px">
        <b>${esc(t('meta.own.gapTitle'))}</b><br>
        ${esc(t('meta.own.gap1'))}<br>
        ${esc(t('meta.own.gap2'))}<br>
        ${esc(t('meta.own.gap3'))}
      </div>
    </div>
  </div>`
}

/* ── step 0 ──────────────────────────────────────────────────────────────── */
function disconnected(root, c) {
  root.innerHTML = `<div class="page">
    <header>
      <div><h1>${t('meta.title')}</h1>
      <p>${t('meta.intro')}</p></div>
    </header>
    ${simbar(`<b>${t('meta.sim.flow.lead')}</b> ${t('meta.sim.flow.body')}`)}
    ${panneauApp(c.platform, { replie: true })}
    <h2 class="sec">${t('meta.sim.flow.lead')}</h2>
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
/* ── le mur de la Page ────────────────────────────────────────────────────
   Chargé APRÈS le reste de l'écran, dans son propre appel : la connexion,
   les actifs et les permissions s'affichent tout de suite, et le mur arrive
   derrière. Les mettre dans la même requête ferait attendre l'essentiel
   pour du décor.

   Ce qu'on montre et pourquoi : une publication programmée n'a AUCUN
   chiffre — elle n'est pas encore sortie. Afficher une portée estimée sous
   un post qui n'existe pas serait exactement la faute que le projet ne peut
   pas se permettre. Elle affiche son heure, rien d'autre. */
async function peindreMur(root) {
  const box = $('#wall', root)
  if (!box) return
  let d
  try { d = await api('/page') } catch (e) { box.innerHTML = `<div class="why bad">${esc(e.message)}</div>`; return }
  if (!d.connected) { box.innerHTML = ''; return }

  const st = d.stats
  const prog = d.posts.filter((p) => p.status === 'scheduled')
  const sortis = d.posts.filter((p) => p.status === 'published')

  box.innerHTML = `
    <div class="kpis" style="margin-bottom:16px">
      <div class="kpi"><div class="l">${t('meta.wall.posts')}</div><div class="v">${num(st.posts)}</div></div>
      <div class="kpi"><div class="l">${t('meta.wall.reach')}</div><div class="v">${num(st.reach)}</div></div>
      <div class="kpi"><div class="l">${t('meta.wall.likes')}</div><div class="v">${num(st.likes)}</div></div>
      <div class="kpi ${st.comments_open ? 'warn' : ''}"><div class="l">${t('meta.wall.open')}</div><div class="v">${num(st.comments_open)}</div></div>
    </div>

    <div class="card" style="margin-bottom:18px"><div class="body">
      <div class="seg" id="kindpick" style="margin-bottom:10px">
        <button data-k="post" class="on">${t('meta.wall.kind.post')}</button>
        <button data-k="story">${t('meta.wall.kind.story')}</button>
        <button data-k="reel">${t('meta.wall.kind.reel')}</button>
      </div>
      <textarea class="f" id="cap" rows="2" placeholder="${esc(t('meta.wall.caption'))}"></textarea>
      <div class="row" style="margin-top:10px">
        <div style="max-width:170px"><label class="f">${t('meta.wall.when')}</label>
          <select class="f" id="when">
            <option value="0">${t('meta.wall.now')}</option>
            <option value="3">${t('meta.wall.in', { n: 3 })}</option>
            <option value="14">${t('meta.wall.in', { n: 14 })}</option>
            <option value="24">${t('meta.wall.in', { n: 24 })}</option>
          </select></div>
        <button class="btn p" id="pub">${icon('bolt', 15)} ${t('meta.wall.publish')}</button>
      </div>
      <div class="why" style="margin-top:10px">${t('meta.wall.why')}</div>
    </div></div>

    ${prog.length ? `<h2 class="sec">${t('meta.wall.scheduled', { n: num(prog.length) })}</h2>
      ${prog.map((p) => `<div class="card"><div class="body" style="display:flex;gap:12px;align-items:baseline">
        <span class="chip mono">${esc(p.kind)}</span>
        <div style="flex:1;min-width:0">${esc(p.caption ?? '')}</div>
        <span class="chip">${t('meta.wall.inH', { n: num(Math.max(0, Math.round((p.scheduled_at - Date.now()) / 3600000))) })}</span>
      </div></div>`).join('')}` : ''}

    <h2 class="sec">${t('meta.wall.published')}</h2>
    ${sortis.map((p) => mur(p)).join('')}`

  for (const b of box.querySelectorAll('#kindpick button')) {
    b.onclick = () => { for (const x of box.querySelectorAll('#kindpick button')) x.classList.toggle('on', x === b) }
  }
  $('#pub', box).onclick = async () => {
    const caption = $('#cap', box).value.trim()
    if (!caption) return toast(t('meta.wall.needCaption'), true)
    const kind = box.querySelector('#kindpick button.on')?.dataset.k ?? 'post'
    const h = Number($('#when', box).value) || 0
    await api('/page/schedule', { method: 'POST', body: { kind, caption, in_hours: h } })
    toast(h ? t('meta.wall.scheduledToast') : t('meta.wall.publishedToast'))
    await refresh()
    peindreMur(root)
  }
  for (const b of box.querySelectorAll('[data-reply]')) {
    b.onclick = async () => {
      const zone = b.previousElementSibling
      const txt = zone.value.trim()
      if (!txt) return
      await api('/page/reply', { method: 'POST', body: { comment_id: Number(b.dataset.reply), text: txt } })
      await refresh()
      peindreMur(root)
    }
  }
}

/* Une publication et ce qu'on lui a écrit dessous.
   Le commentaire rendu au marchand garde SA question affichée et dit ce qui
   manque : c'est le seul endroit où il peut répondre lui-même, et le cacher
   reviendrait à perdre le client que l'agent a refusé d'inventer. */
const mur = (p) => `
  <div class="card"><div class="body">
    <div style="display:flex;gap:10px;align-items:baseline;margin-bottom:8px">
      <span class="chip mono">${esc(p.kind)}</span>
      <div style="flex:1;min-width:0;font-weight:600">${esc(p.caption ?? '')}</div>
      <span class="chip">${t('meta.wall.hoursAgo', { n: num(Math.round((Date.now() - p.published_at) / 3600000)) })}</span>
    </div>
    <div class="kpis" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi"><div class="l">${t('meta.wall.reach')}</div><div class="v">${num(p.reach)}</div></div>
      <div class="kpi"><div class="l">${t('meta.wall.likes')}</div><div class="v">${num(p.likes)}</div></div>
      <div class="kpi"><div class="l">${t('meta.wall.shares')}</div><div class="v">${num(p.shares)}</div></div>
      <div class="kpi"><div class="l">${t('meta.wall.saves')}</div><div class="v">${num(p.saves)}</div></div>
    </div>
    ${p.comments.length ? `<div class="coms">${p.comments.map((c) => `
      <div class="com ${esc(c.status)}">
        <b>${esc(c.person)}</b> <span>${esc(c.text)}</span>
        ${c.reply ? `<div class="rep">${c.by_ai ? `<span class="chip ok">${t('meta.wall.byAi')}</span> ` : ''}${esc(c.reply)}</div>` : ''}
        ${c.status === 'escalated' ? `<div class="need">${t('meta.wall.needs')} ${esc(c.needs ?? '')}</div>
          <textarea class="f" rows="1" placeholder="${esc(t('meta.wall.yourAnswer'))}"></textarea>
          <button class="btn sm" data-reply="${c.id}">${t('meta.wall.send')}</button>` : ''}
      </div>`).join('')}</div>` : ''}
  </div></div>`

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

    <!-- Juste sous la bande « SIMULÉ », et pas en bas de page : c'est la
         réponse à la question que cette bande vient de poser. -->
    ${panneauApp(c.platform)}

    <!-- Le compte tenait une carte entière pour trois lignes dont deux
         identifiants. Replié : on voit qui on est, et le jeton — la seule
         chose qu'on vient vraiment vérifier — s'ouvre d'un clic. -->
    <details class="fold">
      <summary>${icon('user', 15)} ${t('meta.card.account')}
        <span class="who">${esc(c.user_name)} · ${esc(biz.name ?? '')}</span>
        <span class="sim">${t('meta.sim')}</span></summary>
      <div class="body">
        <dl class="kv">
          <dt>${t('meta.kv.user')}</dt><dd>${esc(c.user_name)} · <span class="chip mono">${esc(c.user_id)}</span></dd>
          <dt>${t('meta.kv.business')}</dt><dd>${esc(biz.name ?? '—')} · <span class="chip mono">${esc(biz.id ?? '')}</span></dd>
          <dt>${t('meta.kv.token')}</dt><dd><span class="chip mono" style="word-break:break-all">${esc(c.token ?? '')}</span></dd>
        </dl>
        <div class="why">${t('meta.token.why')}</div>
      </div>
    </details>

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

    ${declined.length ? `<div class="why warn" style="margin-top:18px">
      <b>${t('meta.declined.label')}</b> ${esc(declined.join(', '))}.<br>
      ${t('meta.declined.why')}</div>` : ''}
    <details class="fold">
      <summary>${icon('check', 15)} ${t('meta.sec.perms')}
        <span class="who">${t('meta.grantedCount', { n: c.scopes.length })}</span></summary>
      <div class="body"><div style="display:flex;flex-wrap:wrap;gap:7px">
        ${c.scopes.map((s) => `<span class="chip ok mono">${esc(s)}</span>`).join('')}
        ${declined.map((s) => `<span class="chip bad mono">${esc(s)}</span>`).join('')}
      </div></div>
    </details>

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

    <h2 class="sec">${t('meta.sec.wall')}</h2>
    <div id="wall">${loading(t('meta.wall.loading'))}</div>

    <div id="graph-out" style="margin-top:22px"></div>
  </div>`

  peindreMur(root)

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
