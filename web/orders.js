// Les commandes reçues.
//
// POURQUOI CET ÉCRAN MANQUAIT, ET POURQUOI C'EST GRAVE. L'app construisait
// des pages de vente avec un formulaire de commande, `/api/order` écrivait
// bien la ligne, `/api/orders` savait la relire — et aucun écran ne la
// montrait. Un marchand pouvait donc recevoir une commande sans jamais
// l'apprendre. Tout le circuit existait sauf sa dernière marche, celle où
// l'argent arrive.
//
// Ce que lit un marchand en paiement à la livraison, dans cet ordre : QUI a
// commandé, QUOI et en quelle taille, OÙ ça doit aller, et COMBIEN il
// encaissera à la porte. Le téléphone passe avant l'adresse parce que la
// première chose qu'il fait est d'appeler pour confirmer — en COD, un appel
// de confirmation évite un colis refusé, et un colis refusé coûte le retour.
import { $, el, esc, icon, api, loading, emptyState } from './ui.js'
import { t, num, money, lang } from './i18n.js'

const J = 86_400_000

/** Un montant isolé : « 15 900 DZD » se lit à l'envers dans un écran arabe. */
const sous = (n) => (n == null ? '—' : `<bdi dir="ltr">${money(n)}</bdi>`)

/** Le numéro reste toujours en lecture latine, quelle que soit la langue. */
const tel = (s) => (s ? `<bdi dir="ltr">${esc(s)}</bdi>` : '—')

function quand(ms) {
  const d = new Date(ms), n = new Date()
  const loc = lang() === 'ar' ? 'ar-DZ-u-nu-latn' : lang() === 'fr' ? 'fr-DZ' : 'en-GB'
  const heure = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === n.toDateString()) return `${t('orders.today')} ${heure}`
  if (d.toDateString() === new Date(n - J).toDateString()) return `${t('orders.yesterday')} ${heure}`
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' }) + ' ' + heure
}

export async function mount(root) {
  root.innerHTML = loading(t('orders.loading'))

  let d
  try { d = await api('/orders') } catch (e) {
    root.innerHTML = ''
    root.append(el('div', 'page', emptyState(t('orders.empty.title'), esc(e.message))))
    return
  }

  const liste = d.orders ?? []

  if (!liste.length) {
    root.innerHTML = `<div class="page">
      <header><div><h1>${esc(t('orders.head'))}</h1><p>${t('orders.lead')}</p></div></header>
      ${emptyState(t('orders.empty.title'), t('orders.empty.body'),
        `<button class="btn p" id="ord-to-sites">${t('orders.empty.cta')}</button>`)}
    </div>`
    $('#ord-to-sites', root)?.addEventListener('click', () => { location.hash = 'sites' })
    return
  }

  /* Trois chiffres, pas huit. Ce qui est arrivé aujourd'hui, ce que ça pèse
     en tout, et le panier moyen — celui qui dit s'il faut pousser une vente
     additionnelle ou pas. Le reste se lit dans le tableau. */
  const debutJour = new Date().setHours(0, 0, 0, 0)
  const aujourdhui = liste.filter((o) => o.at >= debutJour).length
  const total = liste.reduce((s, o) => s + (o.price ?? 0) * (o.qty ?? 1), 0)
  const panier = liste.length ? Math.round(total / liste.length) : null

  root.innerHTML = `<div class="page">
    <header>
      <div><h1>${esc(t('orders.head'))}</h1><p>${t('orders.lead')}</p></div>
    </header>

    <div class="kpis">
      <div class="kpi"><div class="l">${esc(t('orders.kpi.today'))}</div><div class="v">${num(aujourdhui)}</div></div>
      <div class="kpi"><div class="l">${esc(t('orders.kpi.all'))}</div><div class="v">${num(liste.length)}</div></div>
      <div class="kpi"><div class="l">${esc(t('orders.kpi.value'))}</div><div class="v">${sous(total)}</div>
        <div class="d">${t('orders.kpi.basket', { n: sous(panier) })}</div></div>
    </div>

    <h2 class="sec">${esc(t('orders.table'))}</h2>
    <div class="card"><table>
      <thead><tr>
        <th>${t('orders.th.when')}</th>
        <th>${t('orders.th.what')}</th>
        <th>${t('orders.th.who')}</th>
        <th>${t('orders.th.where')}</th>
        <th class="num">${t('orders.th.qty')}</th>
        <th class="num">${t('orders.th.total')}</th>
      </tr></thead>
      <tbody>${liste.map((o) => `
        <tr>
          <td class="dim">${esc(quand(o.at))}</td>
          <td>
            <b>${esc(o.product ?? '—')}</b>
            ${o.variant ? `<span class="chip mono">${esc(o.variant)}</span>` : ''}
            ${o.page_url ? `<div class="sub"><a href="${esc(o.page_url)}" target="_blank" rel="noopener">${t('orders.fromPage')}</a></div>` : ''}
          </td>
          <td>${esc(o.name ?? '—')}<div class="sub">${tel(o.phone)}</div></td>
          <td>${esc(o.wilaya ?? '—')}${o.commune ? `<div class="sub">${esc(o.commune)}</div>` : ''}</td>
          <td class="num">${num(o.qty ?? 1)}</td>
          <td class="num"><b>${sous((o.price ?? 0) * (o.qty ?? 1))}</b></td>
        </tr>`).join('')}</tbody>
    </table></div>

    <div class="why">${t('orders.cod')}</div>
  </div>`
}
