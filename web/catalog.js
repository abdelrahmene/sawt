// Le catalogue fournisseur : de vrais produits, leur coût, leur marge, et le
// bouton qui les fait entrer dans la boutique.
//
// Un écran de dropshipping ne se juge pas sur ses vignettes mais sur une
// seule question : « combien je gagne sur celui-là ». Donc la marge est le
// chiffre le plus gros de la carte, et elle est affichée PAR COMMANDE
// LIVRÉE — en paiement à la livraison, une commande passée n'est pas une
// commande payée, et un écran qui l'oublie promet des revenus qui n'existent
// pas.
import { $, $$, el, esc, api, toast, icon, money } from './ui.js'
import { t, lang, num } from './i18n.js'
import { refresh } from './app.js'

let data = null
let filtre = { category: null, q: '' }

const nom = (p) => p.name?.[lang()] ?? p.name?.en ?? p.id
const desc = (p) => p.blurb?.[lang()] ?? p.blurb?.en ?? ''

export async function mount(root) {
  root.innerHTML = `<div class="page"><header><div>
      <h1>${esc(t('catalog.title'))}</h1>
      <p>${esc(t('catalog.lead'))}</p>
    </div></header>
    <div class="card" style="padding:26px;text-align:center;color:var(--dim)">${esc(t('catalog.loading'))}</div>
  </div>`

  try {
    data = await api('/catalog')
  } catch (e) {
    root.querySelector('.card').textContent = e.message
    return
  }
  paint(root)
}

function paint(root) {
  const mine = new Set((data.imports ?? []).map((i) => i.product_id))
  const cats = data.categories ?? []

  root.innerHTML = `
    <div class="page">
      <header>
        <div>
          <h1>${esc(t('catalog.title'))}</h1>
          <p>${esc(t('catalog.lead'))}</p>
        </div>
      </header>

      <!-- Dire ce que c'est, une fois, en haut, sans s'excuser : un catalogue
           de démonstration modelé sur un vrai. La règle 2 du projet. -->
      <div class="staged">${esc(t('catalog.staged'))}</div>

      <div class="catbar">
        <input class="f" id="cq" type="search" placeholder="${esc(t('catalog.search'))}" value="${esc(filtre.q)}">
        <div class="chips">
          <button class="chip${filtre.category ? '' : ' on'}" data-cat="">${esc(t('catalog.all'))}</button>
          ${cats.map((c) => `<button class="chip${filtre.category === c.category ? ' on' : ''}" data-cat="${esc(c.category)}">${esc(t('catalog.cat.' + c.category))} <b>${c.n}</b></button>`).join('')}
        </div>
      </div>

      ${mine.size ? `<h2 class="sec">${esc(t('catalog.mine', { n: mine.size }))}</h2>
        <div class="prods">${(data.imports ?? []).map(carteImport).join('')}</div>` : ''}

      <h2 class="sec">${esc(t('catalog.browse'))}</h2>
      <div class="prods" id="grid">${(data.products ?? []).map((p) => carte(p, mine.has(p.id))).join('')}</div>
      ${data.products?.length ? '' : `<div class="card" style="padding:24px;color:var(--dim)">${esc(t('catalog.none'))}</div>`}
    </div>`

  const q = $('#cq', root)
  q.oninput = () => { filtre.q = q.value; reload(root) }
  for (const b of $$('.catbar .chip', root)) {
    b.onclick = () => { filtre.category = b.dataset.cat || null; reload(root) }
  }
  for (const b of $$('[data-import]', root)) b.onclick = () => ouvrir(root, b.dataset.import)
  for (const b of $$('[data-drop]', root)) b.onclick = () => retirer(root, b.dataset.drop)
}

async function reload(root) {
  const qs = new URLSearchParams()
  if (filtre.category) qs.set('category', filtre.category)
  if (filtre.q.trim()) qs.set('q', filtre.q.trim())
  try {
    data = await api(`/catalog${qs.toString() ? '?' + qs : ''}`)
    const keep = document.activeElement?.id
    paint(root)
    if (keep === 'cq') { const q = $('#cq', root); q.focus(); q.setSelectionRange(q.value.length, q.value.length) }
  } catch (e) { toast(e.message, true) }
}

/* ── une carte produit ────────────────────────────────────────────────────
   Trois nombres, dans l'ordre où un dropshippeur les lit : ce qu'il paie, ce
   qu'il encaisse, ce qui lui reste. Le dernier est le gros. */
const carte = (p, mine) => `
  <article class="prod${mine ? ' got' : ''}">
    <div class="shot">${p.image ? `<img src="${esc(p.image)}" alt="${esc(nom(p))}" loading="lazy">` : ''}
      ${p.stock < 15 ? `<span class="low">${esc(t('catalog.low', { n: p.stock }))}</span>` : ''}
    </div>
    <div class="body">
      <h3>${esc(nom(p))}</h3>
      <p class="blurb">${esc(desc(p))}</p>
      <div class="by">${esc(p.supplier)} · ${esc(t('catalog.cat.' + p.category))}</div>
      <div class="nums">
        <span><em>${esc(t('catalog.cost'))}</em>${money(p.supplier_cost)}</span>
        <span><em>${esc(t('catalog.price'))}</em>${money(p.min_selling)}</span>
        <span class="win"><em>${esc(t('catalog.margin'))}</em>${money(p.margin)} <b>${p.margin_pct}%</b></span>
      </div>
      <div class="sizes">${p.variants.map((v) => `<span${v.stock ? '' : ' class="out"'}>${esc(v.size)}<b>${num(v.stock)}</b></span>`).join('')}</div>
      ${mine
        ? `<button class="btn ghost" data-drop="${esc(p.id)}">${esc(t('catalog.remove'))}</button>`
        : `<button class="btn go" data-import="${esc(p.id)}">${esc(t('catalog.import'))}</button>`}
    </div>
  </article>`

const carteImport = (i) => `
  <article class="prod got">
    <div class="shot">${i.images?.[0] ? `<img src="${esc(i.images[0])}" alt="" loading="lazy">` : ''}</div>
    <div class="body">
      <h3>${esc(i.name?.[lang()] ?? i.name?.en ?? i.product_id)}</h3>
      <div class="by">${esc(i.supplier)}</div>
      <div class="nums">
        <span><em>${esc(t('catalog.cost'))}</em>${money(i.supplier_cost)}</span>
        <span><em>${esc(t('catalog.yours'))}</em>${money(i.selling)}</span>
        <span class="win"><em>${esc(t('catalog.margin'))}</em>${money(i.margin)} <b>${i.margin_pct}%</b></span>
      </div>
      <button class="btn ghost" data-drop="${esc(i.product_id)}">${esc(t('catalog.remove'))}</button>
    </div>
  </article>`

/* ── importer : le prix appartient au marchand ───────────────────────────
   Le prix conseillé n'est qu'un défaut. On montre la marge se recalculer à
   mesure qu'il tape, et on refuse en dessous du coût fournisseur — vendre à
   perte est une faute de frappe, pas une stratégie. */
function ouvrir(root, id) {
  const p = (data.products ?? []).find((x) => x.id === id)
  if (!p) return

  const back = el('div', 'sheet')
  back.innerHTML = `
    <div class="box">
      <h3>${esc(nom(p))}</h3>
      <p class="blurb">${esc(desc(p))}</p>
      <label class="lab">${esc(t('catalog.yourPrice'))}</label>
      <input class="f" id="px" type="number" inputmode="numeric" value="${p.min_selling}" min="${p.supplier_cost}" step="50">
      <div class="live" id="live"></div>
      <div class="acts">
        <button class="btn go" id="ok">${esc(t('catalog.confirm'))}</button>
        <button class="btn ghost" id="no">${esc(t('catalog.cancel'))}</button>
      </div>
    </div>`
  document.body.append(back)

  const px = $('#px', back), live = $('#live', back)
  const show = () => {
    const v = Math.round(Number(px.value) || 0)
    const m = v - p.supplier_cost
    live.className = `live${m < 0 ? ' bad' : ''}`
    live.innerHTML = m < 0
      ? esc(t('catalog.underCost', { n: num(p.supplier_cost - v) }))
      : `${esc(t('catalog.youKeep'))} <strong>${money(m)}</strong> ${esc(t('catalog.perDelivered'))}`
  }
  px.oninput = show
  show()

  const close = () => back.remove()
  $('#no', back).onclick = close
  back.onclick = (e) => { if (e.target === back) close() }
  $('#ok', back).onclick = async () => {
    try {
      const r = await api('/catalog/import', { method: 'POST', body: { product_id: id, selling: Number(px.value) } })
      close()
      toast(t('catalog.added', { name: nom(p) }))
      await refresh()
      await reload(root)
      void r
    } catch (e) { toast(e.message, true) }
  }
}

async function retirer(root, id) {
  try {
    await api('/catalog/remove', { method: 'POST', body: { product_id: id } })
    await refresh()
    await reload(root)
  } catch (e) { toast(e.message, true) }
}

void icon
