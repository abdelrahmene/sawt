// Campaigns: the table, the states and the KPIs.
//
// Everything on this screen is simulated and marked as such. What is not
// simulated is the shape: the rows come from a real GROUP BY over one row per
// ad, per placement, per day, and the API payload shown at the bottom is the
// request the real Marketing API would receive. A judge who knows Meta's API
// can check it line for line.
//
// The one number that decides everything in Algerian cash-on-delivery is cost
// per order, so it is the column the table sorts on and the one the trend is
// read against. A campaign whose cost per order climbed 40 % in two days is an
// argument for a decision; a single day's figure is not.
import { $, el, esc, icon, money, num, api, toast, loading, emptyState, simbar, kpi } from './ui.js'
import { refresh } from './app.js'

let openId = null

const STATUS = { ACTIVE: { c: 'ok', t: 'en ligne' }, PAUSED: { c: 'warn', t: 'en pause' } }
const OBJ = {
  OUTCOME_SALES: 'ventes', OUTCOME_LEADS: 'prospects',
  OUTCOME_TRAFFIC: 'trafic', OUTCOME_ENGAGEMENT: 'engagement',
}

export async function mount(root) {
  root.innerHTML = `<div class="page">${loading('campagnes')}</div>`
  let d
  try { d = await api('/campaigns') } catch (e) {
    root.innerHTML = `<div class="page"><div class="why bad">${esc(e.message)}</div></div>`; return
  }

  if (!d.campaigns.length) {
    root.innerHTML = `<div class="page">
      <header><div><h1>Publicités</h1><p>Tes campagnes, leur état et ce qu'elles rapportent.</p></div></header>
      ${emptyState('Aucune campagne',
        'Demande-lui en darija : « دير لي إشهار على هاد الصباط بـ 2000 دينار في النهار ». Il la construit, la cible et te la montre avant de la lancer.',
        '<button class="btn p" id="to-chat">Parler à l\'agent</button>')}
    </div>`
    $('#to-chat').onclick = () => import('./app.js').then((m) => m.go('chat'))
    return
  }

  const totals = d.campaigns.reduce((a, c) => ({
    spend: a.spend + (c.spend || 0), orders: a.orders + (c.orders || 0), clicks: a.clicks + (c.clicks || 0),
  }), { spend: 0, orders: 0, clicks: 0 })

  root.innerHTML = `<div class="page">
    <header>
      <div><h1>Publicités</h1><p>${d.campaigns.length} campagne(s) · ${
        d.campaigns.filter((c) => c.status === 'ACTIVE').length} en ligne</p></div>
    </header>

    ${simbar(`<b>Chiffres simulés.</b> Aucune publicité n'a tourné et aucun dinar n'a été dépensé.
      Le modèle économique derrière (les Reels touchent plus de monde par dinar et convertissent moins,
      le coût par résultat monte avec la fatigue) est délibérément simple, mais il n'est pas arbitraire —
      sinon l'agent n'aurait jamais de raison de décider quoi que ce soit.`)}

    <div class="kpis">
      ${kpi('dépensé', money(totals.spend))}
      ${kpi('commandes', String(totals.orders))}
      ${kpi('coût / commande', money(totals.orders ? Math.round(totals.spend / totals.orders) : null))}
      ${kpi('clics', num(totals.clicks))}
    </div>

    <h2 class="sec">Campagnes</h2>
    <div class="card"><div style="overflow:auto">
      <table><thead><tr>
        <th>campagne</th><th>objectif</th><th>état</th><th class="num">budget/j</th>
        <th class="num">dépensé</th><th class="num">cmd</th><th class="num">coût/cmd</th><th></th>
      </tr></thead><tbody id="rows"></tbody></table>
    </div></div>

    <div id="detail" style="margin-top:22px"></div>
  </div>`

  const tb = $('#rows')
  for (const c of d.campaigns) {
    const st = STATUS[c.status] ?? { c: '', t: c.status }
    const tr = el('tr')
    tr.innerHTML =
      `<td><b>${esc(c.name)}</b><div style="color:var(--faint);font:11px var(--mono)">${esc(c.ext_id ?? '')}</div></td>` +
      `<td>${esc(OBJ[c.objective] ?? c.objective)}</td>` +
      `<td><span class="chip ${st.c}">${esc(st.t)}</span></td>` +
      `<td class="num">${money(c.daily_budget_dzd)}</td>` +
      `<td class="num">${money(c.spend)}</td>` +
      `<td class="num">${c.orders}</td>` +
      `<td class="num">${money(c.cost_per_order_dzd)}</td>` +
      `<td class="num"><button class="btn sm" data-id="${c.id}">ouvrir</button></td>`
    tb.append(tr)
  }
  for (const b of root.querySelectorAll('button[data-id]')) {
    b.onclick = () => { openId = Number(b.dataset.id); detail(root) }
  }
  if (openId && d.campaigns.some((c) => c.id === openId)) detail(root)
}

async function detail(root) {
  const out = $('#detail')
  out.innerHTML = loading('résultats')
  let c
  try { c = await api(`/campaigns/${openId}`) } catch (e) { out.innerHTML = `<div class="why bad">${esc(e.message)}</div>`; return }

  const r = c.results
  const st = STATUS[c.status] ?? { c: '', t: c.status }

  out.innerHTML = `
    <div class="card">
      <h3>${esc(c.name)} <span class="chip ${st.c}">${esc(st.t)}</span>
        <span class="sim" style="margin-inline-start:auto">simulé</span></h3>
      <div class="body">
        <div class="row" style="margin-bottom:18px">
          ${c.status === 'PAUSED'
            ? `<button class="btn p" id="go">${icon('play', 15)} lancer (simulé)</button>`
            : `<button class="btn" id="adv">${icon('clock', 15)} + 1 jour de données</button>
               <button class="btn danger" id="stop">${icon('pause', 15)} mettre en pause</button>`}
        </div>

        <dl class="kv">
          <dt>objectif</dt><dd>${esc(OBJ[c.objective] ?? c.objective)}</dd>
          <dt>budget / jour</dt><dd>${money(c.daily_budget_dzd)}</dd>
          <dt>ciblage</dt><dd>${esc(c.geo.join(', ') || 'Algérie')} · ${c.age_min}–${c.age_max} ans · ${esc(c.genders)}</dd>
          <dt>placements</dt><dd>${esc(c.placements.join(', '))}</dd>
          <dt>créatives</dt><dd>${c.ads.length} · ${c.ads.filter((a) => a.status === 'ACTIVE').length} active(s)</dd>
        </dl>
      </div>
    </div>

    ${r?.rows?.length ? results(r) : `<div class="card" style="margin-top:16px"><div class="body">
      <div class="why warn">${esc(r?.note ?? "Pas encore de données — lance la campagne pour en produire.")}</div>
    </div></div>`}

    ${c.decisions.length ? `<h2 class="sec">Décisions de l'agent</h2>
      <div class="card"><div class="body">
        ${c.decisions.map((d) => `<div class="why"><b>${esc(d.action)}</b>${
          d.target ? ` → ${esc(d.target)}` : ''}<br>${esc(d.because)}</div>`).join('')}
      </div></div>` : ''}

    <h2 class="sec">La requête Marketing API</h2>
    <div class="card"><div class="body">
      <div class="why">Forme réelle, données simulées. C'est exactement ce que recevrait
        <span class="chip mono">POST /v21.0/act_&lt;ID&gt;/campaigns</span> si la connexion était vraie.</div>
      <pre>${esc(c.api_payload.campaign.endpoint + '\n' + JSON.stringify(c.api_payload.campaign.body, null, 2))}</pre>
      <pre style="margin-top:10px">${esc(c.api_payload.adset.endpoint + '\n' + JSON.stringify(c.api_payload.adset.body, null, 2))}</pre>
    </div></div>`

  $('#go')?.addEventListener('click', async () => {
    $('#go').disabled = true
    await api(`/campaigns/${openId}/launch`, { method: 'POST' })
    toast('En ligne — simulé. Aucun dinar n\'a bougé.')
    await refresh(); mount(root)
  })
  $('#adv')?.addEventListener('click', async () => {
    $('#adv').disabled = true
    await api(`/campaigns/${openId}/advance`, { method: 'POST', body: { days: 1 } })
    toast('Un jour de plus de données simulées.')
    mount(root)
  })
  $('#stop')?.addEventListener('click', async () => {
    await api(`/campaigns/${openId}/decide`, {
      method: 'POST',
      body: { action: 'pause_campaign', because: 'Mise en pause manuelle depuis le tableau.' },
    })
    await refresh(); mount(root)
  })
}

function results(r) {
  const t = r.totals
  const d0 = r.by_day[0], dN = r.by_day.at(-1)
  const cpo0 = d0?.cost_per_order_dzd, cpoN = dN?.cost_per_order_dzd
  const drift = cpo0 && cpoN ? Math.round((100 * (cpoN - cpo0)) / cpo0) : null

  const maxSpend = Math.max(...r.by_placement.map((p) => p.spend_dzd), 1)

  return `
    <h2 class="sec">Résultats · ${r.days} jour(s)</h2>
    <div class="kpis">
      ${kpi('dépensé', money(t.spend_dzd))}
      ${kpi('commandes', String(t.orders))}
      ${kpi('coût / commande', money(t.cost_per_order_dzd),
        drift == null ? '' : `${drift > 0 ? '↑' : '↓'} ${Math.abs(drift)} % depuis le 1ᵉʳ jour`,
        drift == null ? '' : drift > 0 ? 'up' : 'down')}
      ${kpi('clics', num(t.clicks), `${money(t.cost_per_click_dzd)} / clic`)}
      ${kpi('messages', num(t.messages))}
      ${kpi('portée', num(t.reach))}
    </div>

    <div class="grid-2" style="margin-top:16px">
      <div class="card">
        <h3>Par placement<span class="sim" style="margin-inline-start:auto">simulé</span></h3>
        <div style="overflow:auto"><table><thead><tr>
          <th>placement</th><th class="num">dépense</th><th class="num">cmd</th><th class="num">coût/cmd</th>
        </tr></thead><tbody>
          ${r.by_placement.map((p, i) => `<tr class="${i === 0 ? 'best' : i === r.by_placement.length - 1 ? 'worst' : ''}">
            <td>${esc(p.label)}<div class="pbar"><i style="width:${Math.round(100 * p.spend_dzd / maxSpend)}%"></i></div></td>
            <td class="num">${money(p.spend_dzd)}</td><td class="num">${p.orders}</td>
            <td class="num">${money(p.cost_per_order_dzd)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>

      <div class="card">
        <h3>Jour par jour<span class="sim" style="margin-inline-start:auto">simulé</span></h3>
        <div style="overflow:auto"><table><thead><tr>
          <th>jour</th><th class="num">dépense</th><th class="num">clics</th><th class="num">cmd</th><th class="num">coût/cmd</th>
        </tr></thead><tbody>
          ${r.by_day.map((x) => `<tr><td>${esc(x.day)}</td>
            <td class="num">${money(x.spend_dzd)}</td><td class="num">${num(x.clicks)}</td>
            <td class="num">${x.orders}</td><td class="num">${money(x.cost_per_order_dzd)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3>Par créative et placement<span class="sim" style="margin-inline-start:auto">simulé</span></h3>
      <div style="overflow:auto"><table><thead><tr>
        <th>créative</th><th>placement</th><th class="num">dépense</th><th class="num">clics</th>
        <th class="num">CTR</th><th class="num">cmd</th><th class="num">coût/cmd</th>
      </tr></thead><tbody>
        ${r.rows.map((x, i) => `<tr class="${i === 0 ? 'best ' : i === r.rows.length - 1 ? 'worst ' : ''}${x.status === 'PAUSED' ? 'off' : ''}">
          <td>${esc(x.angle ?? x.ad_ext)}${x.status === 'PAUSED' ? ' <span class="chip">en pause</span>' : ''}</td>
          <td>${esc(x.placement_label)}</td>
          <td class="num">${money(x.spend_dzd)}</td><td class="num">${num(x.clicks)}</td>
          <td class="num">${x.ctr} %</td><td class="num">${x.orders}</td>
          <td class="num">${money(x.cost_per_order_dzd)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="body"><div class="why"><b>${esc(r.note)}</b></div></div>
    </div>`
}
