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
import { $, el, esc, icon, num, api, toast, simbar, loading } from './ui.js'
import { go, refresh } from './app.js'

let chosen = new Set()

const AV = { page: 'page', instagram: 'instagram', adaccount: 'adaccount', pixel: 'pixel', catalog: 'catalog' }
const KIND_FR = {
  page: 'Page Facebook', instagram: 'Compte Instagram', adaccount: 'Compte publicitaire',
  pixel: 'Pixel', catalog: 'Catalogue produits',
}

export async function mount(root) {
  root.innerHTML = `<div class="page">${loading('connexion')}</div>`
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
      <div><h1>Connexions Meta</h1>
      <p>Pour écrire aux clients, publier et lancer des pubs, Sawt a besoin de l'accès
         à ta page Facebook, à ton Instagram et à ton compte publicitaire.</p></div>
    </header>
    ${simbar(`<b>Flux de connexion simulé.</b> Aucune vraie application Meta, aucun vrai compte, aucun
      jeton utilisable. C'est voulu : le projet doit tourner chez un juré qui n'a ni page ni compte
      publicitaire. Les permissions demandées sont en revanche les vraies, telles que la Graph API
      les nomme.`)}
    <div class="consent">
      <div class="ch"><span class="logo">f</span><b>Se connecter avec Facebook</b><span class="sim" style="margin-inline-start:auto">simulé</span></div>
      <div class="cb" style="text-align:center;padding:34px 24px">
        <div style="width:62px;height:62px;border-radius:50%;background:var(--fb);color:#fff;display:grid;place-items:center;font:800 34px Georgia,serif;margin:0 auto 18px">f</div>
        <h4>Sawt voudrait accéder à ton compte</h4>
        <p class="lead">Tu choisiras ensuite exactement ce que tu accordes, permission par permission.</p>
        <button class="btn fb" id="fb-start" style="padding:13px 26px;font-size:15px">
          ${icon('link', 16)} Continuer avec Facebook
        </button>
      </div>
      <div class="cf"><span class="tiny">Rien n'est envoyé à Meta. Aucune donnée ne quitte cette machine.</span></div>
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
    <header><div><h1>Connexions Meta</h1><p>Étape 1 sur 2 — le compte.</p></div></header>
    <div class="consent">
      <div class="ch"><span class="logo">f</span><b>Facebook</b><span class="sim" style="margin-inline-start:auto">simulé</span></div>
      <div class="cb">
        <h4>Continuer en tant que…</h4>
        <p class="lead">Sawt recevra ton nom, ta photo de profil et ton adresse e-mail.</p>
        <div class="who" id="who">
          <span class="av">${esc(initialsOf(p))}</span>
          <div><div class="n">${esc(p)}</div><div class="e">y.benali@example.dz</div></div>
          <span style="margin-inline-start:auto;color:#8a8d91">${icon('check', 18)}</span>
        </div>
      </div>
      <div class="cf">
        <span class="tiny">Compte fictif, créé pour la démonstration.</span>
        <button class="btn ghost sm" id="cancel">Annuler</button>
        <button class="btn fb" id="next">Continuer</button>
      </div>
    </div>
  </div>`
  const next = async () => { await api('/meta/review', { method: 'POST' }); mount(root) }
  $('#who').onclick = next
  $('#next').onclick = next
  $('#cancel').onclick = async () => { await api('/meta/disconnect', { method: 'POST' }); mount(root) }
}

const initialsOf = (s) => String(s).split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)

/* ── step 2: the permissions ─────────────────────────────────────────────── */
function permissions(root, c) {
  const scopes = c.scopes ?? []
  if (!chosen.size) chosen = new Set(scopes.map((s) => s.name))

  const groups = [...new Set(scopes.map((s) => s.group))]
  root.innerHTML = `<div class="page">
    <header><div><h1>Connexions Meta</h1><p>Étape 2 sur 2 — ce que tu accordes.</p></div></header>
    <div class="consent">
      <div class="ch"><span class="logo">f</span><b>Sawt demande ces autorisations</b><span class="sim" style="margin-inline-start:auto">simulé</span></div>
      <div class="cb">
        <h4>Choisis ce que Sawt peut faire</h4>
        <p class="lead">Les permissions grisées sont nécessaires au fonctionnement de base.
          Les autres sont facultatives — refuse-en une et la fonction correspondante sera
          réellement indisponible, pas mimée.</p>
        <div class="perms" id="perms">
          ${groups.map((g) => `
            <div class="req" style="padding:11px 8px 4px">${esc(g)}</div>
            ${scopes.filter((s) => s.group === g).map((s) => `
              <div class="perm" data-s="${esc(s.name)}">
                <span class="tick ${s.required ? 'lock on' : (chosen.has(s.name) ? 'on' : '')}">${icon('check', 13)}</span>
                <div class="w">
                  <div class="d">${esc(s.why)}</div>
                  <div class="s">${esc(s.name)}${s.required ? ' · requis' : ''}</div>
                </div>
              </div>`).join('')}`).join('')}
        </div>
      </div>
      <div class="cf">
        <span class="tiny">Un jeton factice est émis.<br>Il est inutilisable sur la Graph API, et son texte le dit.</span>
        <button class="btn ghost sm" id="cancel">Annuler</button>
        <button class="btn fb" id="grant">Autoriser</button>
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

  $('#cancel').onclick = async () => { await api('/meta/disconnect', { method: 'POST' }); chosen = new Set(); mount(root) }
  $('#grant').onclick = async () => {
    const btn = $('#grant'); btn.disabled = true; btn.textContent = 'Autorisation…'
    try {
      await api('/meta/grant', { method: 'POST', body: { granted: [...chosen] } })
      chosen = new Set()
      await refresh()
      toast('Connecté. La page, Instagram et le compte publicitaire sont disponibles.')
      mount(root)
    } catch (e) { toast(e.message, true); btn.disabled = false; btn.textContent = 'Autoriser' }
  }
}

/* ── connected: the Business Manager ────────────────────────────────────── */
function connected(root, c) {
  const biz = c.business ?? {}
  const declined = c.declined ?? []

  root.innerHTML = `<div class="page">
    <header>
      <div><h1>${esc(biz.name ?? 'Business Manager')}</h1>
      <p>Connecté en tant que <b>${esc(c.user_name)}</b> · ${c.scopes.length} permission(s) accordée(s)${
        declined.length ? ` · <span style="color:var(--bad)">${declined.length} refusée(s)</span>` : ''}</p></div>
      <div class="actions">
        <button class="btn sm" id="graph">${icon('eye', 14)} réponse Graph</button>
        <button class="btn sm danger" id="off">déconnecter</button>
      </div>
    </header>

    ${simbar(`<b>Environnement simulé.</b> Cette connexion, cette page, ce compte publicitaire et les
      clients de la boîte de réception sont fictifs — rien n'est envoyé à Meta. Ce qui est réel :
      la darija que le modèle écrit, les visuels qu'il génère et les pages qu'il construit.`)}

    <div class="card">
      <h3>${icon('user', 15)} Compte · jeton<span class="sim" style="margin-inline-start:auto">simulé</span></h3>
      <div class="body">
        <dl class="kv">
          <dt>utilisateur</dt><dd>${esc(c.user_name)} · <span class="chip mono">${esc(c.user_id)}</span></dd>
          <dt>business</dt><dd>${esc(biz.name ?? '—')} · <span class="chip mono">${esc(biz.id ?? '')}</span></dd>
          <dt>jeton</dt><dd><span class="chip mono" style="word-break:break-all">${esc(c.token ?? '')}</span></dd>
        </dl>
        <div class="why">Le jeton dit lui-même ce qu'il est. Un jeton de démonstration qui
          ressemble à un vrai est la seule façon de finir par en croire un.</div>
      </div>
    </div>

    <h2 class="sec">Ressources</h2>
    <div class="assets">
      ${(c.assets ?? []).map((a) => `
        <div class="asset">
          <span class="av ${esc(AV[a.kind] ?? 'page')}">${esc(shortOf(a))}</span>
          <div style="min-width:0">
            <div class="n">${esc(a.name)}</div>
            <div class="k">${esc(KIND_FR[a.kind] ?? a.kind)}</div>
            <div class="m">${esc(metaLine(a))}</div>
            <div class="id">${esc(a.external_id)}</div>
          </div>
        </div>`).join('')}
    </div>

    <h2 class="sec">Permissions</h2>
    <div class="card"><div class="body">
      <div style="display:flex;flex-wrap:wrap;gap:7px">
        ${c.scopes.map((s) => `<span class="chip ok mono">${icon('check', 12)}${esc(s)}</span>`).join('')}
        ${declined.map((s) => `<span class="chip bad mono">${esc(s)}</span>`).join('')}
      </div>
      ${declined.length ? `<div class="why warn" style="margin-top:14px">
        <b>Refusées :</b> ${esc(declined.join(', '))}.<br>
        Ce n'est pas décoratif — ce que ces permissions ouvrent est réellement absent de l'app,
        et l'agent doit le nommer au lieu de faire semblant.</div>` : ''}
    </div></div>

    <h2 class="sec">Surfaces à gérer</h2>
    <div class="grid-3">
      ${(c.surfaces ?? []).map((s) => `
        <div class="card"><div class="body">
          <div style="font-weight:650;font-size:14.5px">${esc(s.name)}</div>
          <div class="kpis" style="margin-top:12px;grid-template-columns:1fr 1fr">
            <div class="kpi"><div class="l">en attente</div><div class="v">${s.stats.open}</div></div>
            <div class="kpi"><div class="l">répondus</div><div class="v">${s.stats.answered}</div></div>
          </div>
          ${s.stats.escalated ? `<div class="why warn" style="margin-top:10px">${s.stats.escalated} renvoyé(s) au marchand</div>` : ''}
          <button class="btn sm go-inbox" style="margin-top:12px">${icon('inbox', 14)} ouvrir</button>
        </div></div>`).join('')}
    </div>

    <div id="graph-out" style="margin-top:22px"></div>
  </div>`

  for (const b of root.querySelectorAll('.go-inbox')) b.onclick = () => go('inbox')

  $('#off').onclick = async () => {
    if (!confirm('Déconnecter ? La boîte de réception et les ressources disparaîtront.')) return
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
    out.innerHTML = loading('lecture')
    const g = await api('/meta/graph')
    out.innerHTML = `<div class="card"><h3>Ce que la vraie Graph API renverrait
      <span class="sim" style="margin-inline-start:auto">forme réelle · données simulées</span></h3>
      <div class="body">${Object.entries(g).map(([k, v]) =>
        `<div style="margin-bottom:13px"><div class="chip mono" style="margin-bottom:6px">${esc(k)}</div>
         <pre>${esc(JSON.stringify(v, null, 2))}</pre></div>`).join('')}</div></div>`
  }
}

const shortOf = (a) => a.kind === 'instagram' ? 'IG' : a.kind === 'adaccount' ? 'AD'
  : a.kind === 'pixel' ? 'PX' : a.kind === 'catalog' ? 'CT' : 'FB'

function metaLine(a) {
  const m = a.meta ?? {}
  if (a.kind === 'page') return `${num(a.followers)} abonnés · ${m.category ?? ''}${m.response_rate ? ` · réponse ${Math.round(m.response_rate * 100)} %` : ''}`
  if (a.kind === 'instagram') return `${num(a.followers)} abonnés · lié à la page`
  if (a.kind === 'adaccount') return `${a.currency} · ${m.timezone ?? ''} · ${m.funding ?? ''}`
  if (a.kind === 'pixel') return `${num(m.events_7d)} évènements / 7 j`
  if (a.kind === 'catalog') return `${m.products ?? 0} produits`
  return ''
}
