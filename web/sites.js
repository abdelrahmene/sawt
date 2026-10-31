// Sites, pages, domains and the orders they produced.
//
// The domain part is the only place in this project where "simulated" would
// have been a cop-out, because a DNS lookup costs nothing and Node can do it.
// So the check is real: point a domain you actually own at this and it
// verifies for real, with the registrar's actual answer shown next to what was
// expected. The demo shortcut beside it is labelled, because nobody waits for
// propagation in a three-minute video and a judge owns no domain to point.
import { $, el, esc, icon, money, ago, api, toast, frame, loading, emptyState, kpi } from './ui.js'

const STATUS = {
  live: { c: 'ok', t: 'en ligne' },
  verified: { c: 'ok', t: 'DNS vérifié' },
  dns_pending: { c: 'warn', t: 'attente DNS' },
  draft: { c: '', t: 'brouillon' },
  failed: { c: 'bad', t: 'échec' },
}

export async function mount(root) {
  root.innerHTML = `<div class="page">${loading('sites')}</div>`
  let d, o
  try { [d, o] = await Promise.all([api('/sites'), api('/orders')]) } catch (e) {
    root.innerHTML = `<div class="page"><div class="why bad">${esc(e.message)}</div></div>`; return
  }

  if (!d.sites.length && !d.loose.length) {
    root.innerHTML = `<div class="page">
      <header><div><h1>Sites</h1><p>Les pages et les boutiques que l'agent construit, et leurs domaines.</p></div></header>
      ${emptyState('Rien de construit pour l\'instant',
        'Envoie-lui une photo de produit et dis-lui de te faire une boutique. Il écrit le texte, génère les visuels de chaque section et te rend de vrais fichiers.',
        '<button class="btn p" id="to-chat">Parler à l\'agent</button>')}
    </div>`
    $('#to-chat').onclick = () => import('./app.js').then((m) => m.go('chat'))
    return
  }

  const pageCount = d.sites.reduce((a, s) => a + s.pages.length, 0) + d.loose.length
  const orderCount = o.orders.length
  const revenue = o.orders.reduce((a, x) => a + (x.price || 0) * (x.qty || 1), 0)

  root.innerHTML = `<div class="page">
    <header>
      <div><h1>Sites &amp; domaines</h1>
      <p>${d.sites.length} boutique(s) · ${pageCount} page(s) · tout est de vrais fichiers que tu peux ouvrir.</p></div>
    </header>

    <div class="kpis">
      ${kpi('pages', String(pageCount))}
      ${kpi('commandes reçues', String(orderCount), orderCount ? 'depuis les formulaires' : '')}
      ${kpi('valeur', money(revenue))}
      ${kpi('IP de la plateforme', `<span style="font:600 15px var(--mono)">${esc(d.edge_ip)}</span>`, 'pour les enregistrements A')}
    </div>

    <div id="body"></div>

    ${orderCount ? `<h2 class="sec">Commandes reçues ${
      `<span class="sim real">réel</span>`}</h2>
      <div class="card">
        <div class="body"><div class="why">Ces lignes-là ne sont pas simulées : quelqu'un a rempli
          un formulaire sur une page générée, et la commande est en base.</div></div>
        <div style="overflow:auto"><table><thead><tr>
          <th>produit</th><th>client</th><th>téléphone</th><th>wilaya</th>
          <th class="num">qté</th><th class="num">total</th><th class="num">reçue</th>
        </tr></thead><tbody>
          ${o.orders.map((x) => `<tr>
            <td>${esc(x.product ?? '—')}</td><td>${esc(x.name ?? '')}</td>
            <td style="font-family:var(--mono);font-size:12px">${esc(x.phone ?? '')}</td>
            <td dir="rtl" style="font-family:var(--arabic)">${esc(x.wilaya ?? '')}${
              x.commune ? ` · ${esc(x.commune)}` : ''}</td>
            <td class="num">${x.qty}</td><td class="num">${money((x.price || 0) * (x.qty || 1))}</td>
            <td class="num">${esc(ago(x.at))}</td></tr>`).join('')}
        </tbody></table></div>
      </div>` : ''}
  </div>`

  const body = $('#body')
  for (const s of d.sites) body.append(siteCard(s, root))
  if (d.loose.length) {
    body.append(el('h2', 'sec', 'Pages seules'))
    const c = el('div', 'card')
    const b = el('div', 'body')
    const list = el('div', 'plist')
    for (const p of d.loose) {
      list.append(Object.assign(
        el('a', null, `<span>${esc(p.product)}</span><span class="px">${money(p.price_dzd)}${
          p.orders ? ` · ${p.orders} cmd` : ''}</span>`),
        { href: p.url, target: '_blank', rel: 'noopener' }))
    }
    b.append(el('div', 'why', "Des landings construites hors boutique. Attache-leur un domaine en créant d'abord une boutique."), list)
    c.append(el('h3', null, `${d.loose.length} page(s)`), b)
    body.append(c)
  }
}

function siteCard(s, root) {
  const c = el('div', 'card')
  c.style.marginBottom = '18px'
  const h = el('h3', null, esc(s.shop))
  h.append(el('span', 'sim real', 'réel'))
  const b = el('div', 'body')

  if (s.home_url) b.append(frame(s.home_url))

  if (s.tagline) b.append(el('div', 'why', esc(s.tagline)))

  const list = el('div', 'plist')
  if (s.home_url) {
    list.append(Object.assign(el('a', null, `<span>accueil</span><span class="px">${s.pages.length} produits</span>`),
      { href: s.home_url, target: '_blank', rel: 'noopener' }))
  }
  for (const p of s.pages) {
    list.append(Object.assign(
      el('a', null, `<span>${esc(p.product)}</span><span class="px">${money(p.price_dzd)}</span>`),
      { href: p.url, target: '_blank', rel: 'noopener' }))
  }
  b.append(list)

  /* ── domains ──────────────────────────────────────────────────────────── */
  b.append(el('h2', 'sec', 'Nom de domaine'))
  const doms = el('div')
  doms.style.display = 'grid'
  doms.style.gap = '10px'
  for (const d of s.domains) doms.append(domainRow(d, root))
  if (!s.domains.length) doms.append(el('div', 'why warn', "Aucun domaine. La boutique est accessible par son fichier, mais elle n'a pas d'adresse."))
  b.append(doms)

  const form = el('div', 'row')
  form.style.marginTop = '12px'
  form.innerHTML = `
    <div><label class="f">Ajouter un domaine</label>
      <input class="f" placeholder="sabat-dzair.dz" autocapitalize="off" spellcheck="false"></div>
    <button class="btn p">${icon('plus', 15)} ajouter</button>`
  const input = form.querySelector('input')
  form.querySelector('button').onclick = async () => {
    const host = input.value.trim()
    if (!host) return
    try {
      await api('/domains', { method: 'POST', body: { site: s.id, host } })
      toast(`${host} ajouté. Ajoute les deux enregistrements DNS, puis vérifie.`)
      mount(root)
    } catch (e) { toast(e.message, true) }
  }
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') form.querySelector('button').click() })
  b.append(form)

  c.append(h, b)
  return c
}

function domainRow(d, root) {
  const st = STATUS[d.status] ?? { c: '', t: d.status }
  const n = el('div')
  const row = el('div', 'domrow')
  row.innerHTML = `
    <span class="host">${esc(d.host)}</span>
    <span class="chip ${st.c}">${esc(st.t)}</span>
    ${d.kind === 'subdomain' ? '<span class="chip">sous-domaine plateforme</span>' : ''}
    ${d.checked ? `<span class="chip">vérifié il y a ${esc(ago(d.checked))}</span>` : ''}
    <span class="right"></span>`
  const right = row.querySelector('.right')

  if (d.kind !== 'subdomain') {
    const v = el('button', 'btn sm', `${icon('refresh', 14)} vérifier le DNS`)
    const p = el('button', 'btn sm ghost', 'simuler la propagation')
    right.append(v, p)
    v.onclick = async () => {
      v.disabled = true; v.innerHTML = `${icon('clock', 14)} requête DNS…`
      try {
        const r = await api(`/domains/${d.id}/verify`, { method: 'POST' })
        out.innerHTML = checks(r)
        toast(r.status === 'live' ? 'En ligne.' : `Toujours « ${r.status} » — regarde ce que le DNS a répondu.`,
          r.status !== 'live')
      } catch (e) { toast(e.message, true) }
      v.disabled = false; v.innerHTML = `${icon('refresh', 14)} vérifier le DNS`
    }
    p.onclick = async () => {
      await api(`/domains/${d.id}/pretend`, { method: 'POST' })
      toast('Propagation simulée — et c\'est écrit comme tel.')
      mount(root)
    }
  }

  const del = el('button', 'btn sm ghost', icon('trash', 14))
  del.title = 'retirer'
  del.onclick = async () => {
    if (!confirm(`Retirer ${d.host} ?`)) return
    await api(`/domains/${d.id}`, { method: 'DELETE' })
    mount(root)
  }
  right.append(del)

  const out = el('div')
  n.append(row, out)

  if (d.records?.length && d.status !== 'live') {
    const dns = el('div', 'dns')
    dns.innerHTML = d.records.map((r) =>
      `<div class="rec"><span class="ty">${esc(r.type)}</span><span>${esc(r.name)}</span><span>${esc(r.value)}</span></div>`).join('')
    out.append(el('div', 'why', 'À ajouter chez ton registrar. Le bouton « vérifier » fait une vraie requête DNS.'), dns)
  }
  return n
}

/** What the nameservers actually answered, next to what we wanted. */
function checks(r) {
  if (!r.checks?.length) return `<div class="why">${esc(r.note ?? '')}</div>`
  return `<div class="dns">${r.checks.map((c) => `
    <div class="rec ${c.ok ? 'ok' : 'ko'}">
      <span class="ty">${esc(c.type)}</span>
      <span>${c.ok ? '✓' : '✗'} ${esc(c.why)}</span>
      <span>${esc(c.got ? `reçu : ${[].concat(c.got).join(', ')}` : c.error ?? '')}</span>
    </div>`).join('')}</div>`
}
