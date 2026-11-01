// The landing studio: every knob on one side, the page on the other.
//
// The knobs come from the generator that already runs in real shops, because
// merchants asked for those one at a time and that beats anything invented
// here. Two of them did not come across — fabricated testimonials and a fake
// countdown — and rather than quietly dropping them the panel shows them at
// the bottom, switched off, with the reason. A merchant who looks for the
// testimonial option deserves to find out why it is not there, not to assume
// the tool forgot.
//
// The cost is printed before the button, not after the bill. Four section
// visuals are four muse-image calls, and someone three days from a deadline
// should be able to see that before clicking.
import { $, el, esc, icon, api, toast, loading, SESSION } from './ui.js'
import { refresh } from './app.js'
// Les chaînes sont dans `i18n/studio.js`, trois langues par clé, l'anglais par
// défaut : le jury du hackathon lit l'anglais, le marchand lit la darija.
// `money` était importé d'ui.js sans servir une seule fois ici — retiré. Les
// nombres passent par le `num()` de la couche i18n : le séparateur de milliers
// suit la langue au lieu d'être cloué au français.
import { t, num, pick } from './i18n.js'

let D = null          // the catalogue + current options, from the server
let O = {}            // what is selected right now
let form = { product: '', price_dzd: '', angle: '', notes: '' }

/* ── la vitrine ───────────────────────────────────────────────────────────
   On choisit un produit, on ne tape plus son nom.
   Taper « doudoune » à la main, c'est repartir sans la photo, sans le prix
   et sans la marge : la page se construisait alors sur un produit qui ne
   correspondait à rien de la boutique, et les scènes partaient d'une
   description au lieu d'une vraie image. Le choix remplit les trois champs
   d'un coup.
   « Plusieurs » construit une page par produit, à la suite — c'est le cas
   réel d'un marchand qui vient d'importer six articles d'un fournisseur. */
let several = false   // une page, ou une par produit
let caches = false    // vitrine repliée, pour dégager les réglages
let cherche = ''      // le filtre de recherche
const choisis = new Set()
let device = 'desk'
let preview = null    // url of the last page built
let vue = null        // l'identifiant de la page déjà adoptée (voir mount)
let building = false

/* L'aperçu s'appelle « studio-stage », surtout pas « stage ».
   index.html donne déjà ce nom-là au conteneur qui entoure tout l'appareil.
   Comme $() cherche dans le document entier, la recherche renvoyait ce
   conteneur, et paintPreview() réécrivait son contenu : barre du haut, rail,
   vues — tout disparaissait, et il ne restait que l'état vide du Studio,
   centré sur un écran blanc. Un simple clic sur Studio effaçait l'app. */
export async function mount(root) {
  if (!root.dataset.built) {
    root.innerHTML = `<div class="studio-l" id="sl">${loading(t('studio.loading'))}</div>
      <div class="studio-r">
        <div class="bar">
          <span class="t">${t('studio.preview')}</span>
          <span class="sim real">${t('studio.real')}</span>
          <div class="right">
            <select class="f sm" id="pagepick" style="max-width:190px"></select>
            <div class="seg" style="padding:3px">
              <button data-dev="phone">${t('studio.dev.phone')}</button>
              <button data-dev="desk">${t('studio.dev.desk')}</button>
            </div>
            <a class="btn sm" id="open" target="_blank" rel="noopener" style="display:none">${icon('ext', 14)} ${t('studio.open')}</a>
          </div>
        </div>
        <div class="stage" id="studio-stage"></div>
      </div>`
    root.dataset.built = '1'
    for (const b of root.querySelectorAll('[data-dev]')) {
      b.onclick = () => { device = b.dataset.dev; paintPreview() }
    }
  }
  paintBar(root)

  try { D = await api('/landing') } catch (e) {
    $('#sl').innerHTML = `<div class="why bad">${esc(e.message)}</div>`; return
  }
  O = D.options
  /* LA SYNCHRO.
     `preview = preview ?? …` ne s'exécutait qu'une fois : dès qu'une page
     avait été vue, le Studio gardait la sienne pour toujours. L'agent
     construisait une page dans la conversation, on passait au Studio, et
     l'écran montrait encore celle d'avant — sans rien dire. Les deux écrans
     affirmaient deux choses différentes sur la même boutique.

     On suit donc la page la plus RÉCENTE, mais seulement quand elle a
     changé : sinon un simple aller-retour entre deux écrans ramènerait de
     force le marchand sur la dernière page alors qu'il en regardait une
     autre exprès. `vue` retient ce qu'on a déjà adopté.

     Le formulaire, lui, n'est écrasé que s'il est vide : une page en cours
     de réglage ne doit pas être effacée parce que l'agent a travaillé à
     côté. */
  const derniere = D.pages?.[0]
  if (derniere && derniere.id !== vue) {
    vue = derniere.id
    preview = derniere.url
    if (!form.product) {
      form.product = derniere.product
      form.price_dzd = String(derniere.price_dzd ?? '')
      form.angle = derniere.angle ?? ''
    }
  }
  paintPages()
  paintPanel()
  paintPreview()
}

/* La liste des pages de la boutique, la plus récente en tête.
   Elle existe pour que « suivre la dernière page » ne veuille pas dire
   « cacher les autres » : le marchand voit tout ce qu'il a construit et
   revient où il veut, sans passer par l'écran Sites. */
function paintPages() {
  const sel = $('#pagepick'); if (!sel) return
  const pages = D.pages ?? []
  sel.style.display = pages.length > 1 ? '' : 'none'
  sel.innerHTML = pages
    .map((p) => `<option value="${esc(String(p.id))}"${p.id === vue ? ' selected' : ''}>${esc(p.product)}</option>`)
    .join('')
  sel.onchange = () => {
    const p = pages.find((x) => String(x.id) === sel.value)
    if (!p) return
    vue = p.id
    preview = p.url
    paintPreview()
  }
}

/* ── les libellés de la barre d'aperçu ────────────────────────────────────
   Le squelette de droite n'est bâti qu'une fois (`dataset.built`), sinon
   l'iframe se rechargerait à chaque fois qu'on revient sur l'écran. Mais
   app.js remonte l'écran courant quand la langue change, en comptant sur le
   fait qu'« un module réécrit son innerHTML en entrant » — une barre bâtie
   une seule fois resterait, elle, dans la langue du premier affichage.
   Mêmes nœuds, mêmes ids, mêmes gestionnaires : seuls les libellés sont
   réécrits. */
function paintBar(root) {
  $('.bar .t', root).textContent = t('studio.preview')
  $('.bar .sim', root).textContent = t('studio.real')
  const dev = { phone: 'studio.dev.phone', desk: 'studio.dev.desk' }
  for (const b of root.querySelectorAll('[data-dev]')) b.textContent = t(dev[b.dataset.dev])
  $('#open', root).innerHTML = `${icon('ext', 14)} ${t('studio.open')}`
}

/* ── the panel ───────────────────────────────────────────────────────────── */
/* Toutes les fiches de la vitrine, les miennes d'abord. Celles que le
   marchand a importées portent SON prix de vente ; les autres portent le
   prix conseillé du fournisseur, et le disent. */
const fiches = () => [...(D.showcase?.mine ?? []), ...(D.showcase?.offer ?? [])]

const fiche = (id) => fiches().find((p) => p.id === id)

function vitrine() {
  const tout = fiches()
  if (!tout.length) return ''
  const n = cherche.trim().toLowerCase()
  const vus = n ? tout.filter((p) => `${p.name} ${p.supplier ?? ''} ${p.category ?? ''}`.toLowerCase().includes(n)) : tout

  return `<div class="vitrine" id="vitrine">
    <div class="vt">
      <h2 class="sec" style="margin:0">${t('studio.showcase')}</h2>
      <div class="seg sm">
        <button data-mode="one" class="${several ? '' : 'on'}">${t('studio.showcase.one')}</button>
        <button data-mode="many" class="${several ? 'on' : ''}">${t('studio.showcase.many')}</button>
      </div>
      <button class="btn ghost sm" id="vt-hide">${caches ? t('studio.showcase.show') : t('studio.showcase.hide')}</button>
    </div>
    ${caches ? '' : `
      <input class="f sm" id="vt-q" placeholder="${esc(t('studio.showcase.search'))}" value="${esc(cherche)}">
      <div class="help">${t('studio.showcase.count', { n: num(vus.length), total: num(tout.length) })}</div>
      <div class="prodpick">
        ${vus.map((p) => {
          const on = several ? choisis.has(p.id) : form.product === p.name
          return `<button data-pid="${esc(p.id)}" class="${on ? 'on' : ''}" title="${esc(p.name)}">
            ${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : '<span class="noimg"></span>'}
            <span class="nm">${esc(p.name)}</span>
            <span class="pz"><bdi dir="ltr">${num(p.price)} DA</bdi></span>
            <span class="mg ${p.mine ? 'own' : ''}">${p.mine
              ? t('studio.showcase.mine', { m: num(p.margin) })
              : t('studio.showcase.offer', { m: num(p.margin) })}</span>
          </button>`
        }).join('')}
      </div>`}
  </div>`
}

function paintPanel() {
  const sl = $('#sl')
  sl.innerHTML = `
    <div style="margin-bottom:20px">
      <h1 style="font-size:19px;font-weight:700;letter-spacing:-.02em;margin:0">${t('studio.title')}</h1>
      <p style="color:var(--dim);font-size:13px;margin:5px 0 0">${t('studio.lede')}</p>
    </div>

    ${vitrine()}

    <div class="fset">
      <div class="lbl">${t('studio.product')}</div>
      <input class="f" id="f-product" placeholder="صباط رياضي Adidas" value="${esc(form.product)}">
    </div>
    <div class="row" style="margin-bottom:18px">
      <div><label class="f">${t('studio.price')}</label>
        <input class="f" id="f-price" type="number" min="0" step="50" value="${esc(form.price_dzd)}"></div>
      <div><label class="f">${t('studio.shop')}</label>
        <input class="f" id="f-shop" value="${esc(D.shop ?? '')}" placeholder="Sabat Dzair"></div>
    </div>
    <div class="fset">
      <div class="lbl">${t('studio.angle')} <span class="hint">${t('studio.angle.hint')}</span></div>
      <input class="f" id="f-angle" value="${esc(form.angle)}" placeholder="${esc(t('studio.angle.ph'))}">
    </div>

    ${D.photos.length ? `<div class="fset">
      <div class="lbl">${t('studio.photos')} <span class="hint">${t('studio.photos.hint')}</span></div>
      <div class="phpick" id="phpick">
        ${D.photos.map((p) => {
          const i = O.photos.indexOf(p.url)
          return `<button data-u="${esc(p.url)}" class="${i >= 0 ? 'on' : ''}" title="${esc(p.label)}">
            <img src="${esc(p.url)}" alt="" loading="lazy">
            ${i >= 0 ? `<span class="n">${i + 1}</span>` : ''}
            ${i === 0 ? `<span class="main">${t('studio.photos.main')}</span>` : ''}
          </button>`
        }).join('')}
      </div>
      <div class="help">${O.photos.length
        ? t('studio.photos.count', { n: num(O.photos.length) })
        : t('studio.photos.none')}</div>
    </div>` : `<div class="fset"><div class="why warn">${t('studio.photos.empty')}</div></div>`}

    <h2 class="sec" style="margin-top:26px">${t('studio.sec.settings')}</h2>
    <div id="knobs"></div>

    <h2 class="sec">${t('studio.sec.sections')}</h2>
    <div class="toggles" id="secs">
      ${D.sections.map((s) => `
        <div class="tog ${O.sections[s.k] ? 'on' : ''} ${s.locked ? 'lock' : ''}" data-k="${esc(s.k)}">
          <span class="sw"></span>
          <div><div class="n">${s.locked ? t('studio.sections.locked', { label: esc(pick(s.label)) }) : esc(pick(s.label))}</div>
            ${pick(s.why) ? `<div class="w">${esc(pick(s.why))}</div>` : ''}</div>
        </div>`).join('')}
    </div>

    <h2 class="sec">${t('studio.sec.refused')}</h2>
    <div class="toggles">
      ${D.refused.map((s) => `
        <div class="tog no"><span class="sw"></span>
          <div><div class="n">${esc(pick(s.label))}</div><div class="w">${esc(pick(s.why))}</div></div>
        </div>`).join('')}
    </div>

    <div class="fset" style="margin-top:22px">
      <div class="lbl">${t('studio.notes')} <span class="hint">${t('studio.notes.hint')}</span></div>
      <textarea class="f" id="f-notes" rows="3"
        placeholder="${esc(t('studio.notes.ph'))}">${esc(form.notes)}</textarea>
      <div class="help">${t('studio.notes.help')}</div>
    </div>

    <!-- Le pixel du marchand. Vide = aucun script Facebook sur la page : une
         page qui charge un pixel « pour la forme » ralentit le téléphone du
         client et ne mesure rien. -->
    <div class="fset" style="margin-top:18px">
      <div class="lbl">${t('studio.pixel')} <span class="hint">${t('studio.pixel.hint')}</span></div>
      <input class="f mono" id="f-pixel" inputmode="numeric" autocomplete="off"
        placeholder="${esc(t('studio.pixel.ph'))}" value="${esc(O.pixelId ?? '')}">
      <div class="help">${t('studio.pixel.help')}</div>
    </div>

    <div id="cost" class="help cost" style="margin:16px 0 10px"></div>
    <button class="btn p" id="build" style="width:100%;justify-content:center;padding:13px">
      ${icon('bolt', 16)} ${several && choisis.size > 1
        ? t('studio.build.many', { n: num(choisis.size) })
        : t('studio.build')}
    </button>
    <label class="tog" style="margin-top:8px" id="fresh-wrap">
      <span class="sw"></span>
      <div><div class="n">${t('studio.fresh')}</div>
        <div class="w">${t('studio.fresh.why')}</div></div>
    </label>
    <div id="prog"></div>`

  paintKnobs()
  paintCost()

  // field bindings
  const bind = (id, k, cast = (v) => v) => {
    const n = $(id); if (!n) return
    n.oninput = () => { form[k] = cast(n.value) }
  }
  bind('#f-product', 'product'); bind('#f-price', 'price_dzd')
  bind('#f-angle', 'angle'); bind('#f-notes', 'notes')

  // Le pixel va dans les RÉGLAGES, pas dans le formulaire du produit : il
  // appartient à la boutique et vaut pour toutes ses pages. Le serveur
  // revalide de toute façon — ici on se contente de ne garder que des
  // chiffres pendant la frappe.
  {
    const n = $('#f-pixel')
    if (n) n.oninput = () => {
      const v = n.value.replace(/\D/g, '').slice(0, 20)
      if (v !== n.value) n.value = v
      O.pixelId = v
      save()
    }
  }

  /* ── la vitrine ──────────────────────────────────────────────────────── */
  for (const b of sl.querySelectorAll('[data-mode]')) {
    b.onclick = () => { several = b.dataset.mode === 'many'; choisis.clear(); paintPanel() }
  }
  if ($('#vt-hide')) $('#vt-hide').onclick = () => { caches = !caches; paintPanel() }
  {
    // La recherche ne repeint que la grille : repeindre tout le panneau
    // ferait perdre le curseur à chaque lettre tapée.
    const q = $('#vt-q')
    if (q) q.oninput = () => {
      cherche = q.value
      const g = $('.prodpick')
      if (!g) return
      const tmp = document.createElement('div')
      tmp.innerHTML = vitrine()
      g.replaceWith(tmp.querySelector('.prodpick'))
      brancherFiches()
      $('#vt-q').focus()
    }
  }
  brancherFiches()

  for (const b of sl.querySelectorAll('#phpick button')) {
    b.onclick = () => {
      const u = b.dataset.u
      const i = O.photos.indexOf(u)
      if (i >= 0) O.photos.splice(i, 1); else O.photos.push(u)
      save(); paintPanel()
    }
  }

  // `tog` et pas `t` : `t` est maintenant la fonction de traduction, et une
  // boucle qui la masque ferait rendre un élément du DOM au premier `t('…')`
  // ajouté ici. Même boucle, mêmes gestionnaires — juste un nom qui ne mord pas.
  for (const tog of sl.querySelectorAll('#secs .tog')) {
    if (tog.classList.contains('lock')) continue
    tog.onclick = () => { O.sections[tog.dataset.k] = !O.sections[tog.dataset.k]; tog.classList.toggle('on'); save() }
  }

  let fresh = false
  $('#fresh-wrap').onclick = () => { fresh = !fresh; $('#fresh-wrap').classList.toggle('on', fresh) }
  $('#build').onclick = () => build(fresh)
}

/* Choisir une fiche remplit le formulaire : le nom, le prix de vente, et
   surtout LA PHOTO. C'est elle qui compte — les quatre scènes de la page
   partent d'elle, pas d'une description. Sans ce rattachement, le Studio
   demandait au marchand de retrouver sa propre photo dans une grille juste
   en dessous, et une page sur deux repartait avec celle du voisin. */
function choisir(p) {
  form.product = p.name
  form.price_dzd = String(p.price ?? '')
  if (p.images?.length) O.photos = p.images.slice(0, 4)
  else if (p.image) O.photos = [p.image]
  save()
}

function brancherFiches() {
  for (const b of document.querySelectorAll('#sl [data-pid]')) {
    b.onclick = () => {
      const p = fiche(b.dataset.pid)
      if (!p) return
      if (several) {
        if (choisis.has(p.id)) choisis.delete(p.id); else choisis.add(p.id)
        if (choisis.size === 1) choisir(p)
      } else {
        choisis.clear(); choisis.add(p.id); choisir(p)
      }
      paintPanel()
    }
  }
}

function paintKnobs() {
  const box = $('#knobs')
  box.textContent = ''
  for (const [k, spec] of Object.entries(D.catalogue)) {
    const f = el('div', 'fset')
    f.innerHTML = `<div class="lbl">${esc(pick(spec.label))}</div>
      <div class="seg">${spec.choices.map((c) =>
        `<button data-v="${esc(String(c.v))}" class="${c.v === O[k] ? 'on' : ''}">${esc(pick(c.label))}</button>`).join('')}</div>
      <div class="help"></div>`
    const help = f.querySelector('.help')
    const refreshHelp = () => {
      const c = spec.choices.find((x) => x.v === O[k])
      help.textContent = pick(c?.help)
      help.classList.toggle('cost', !!spec.cost)
    }
    for (const b of f.querySelectorAll('button')) {
      b.onclick = () => {
        const raw = b.dataset.v
        O[k] = spec.choices.find((c) => String(c.v) === raw).v
        for (const x of f.querySelectorAll('button')) x.classList.toggle('on', x === b)
        refreshHelp(); paintCost(); save()
        if (k === 'colorMode') paintPanel()
      }
    }
    refreshHelp()
    box.append(f)

    if (k === 'colorMode' && O.colorMode === 'impose') {
      const sw = el('div', 'swatch')
      sw.innerHTML = `<input type="color" value="${esc(O.color)}" aria-label="${esc(t('studio.color.aria'))}">
        <span class="chip mono">${esc(O.color)}</span>`
      const inp = sw.querySelector('input')
      inp.oninput = () => { O.color = inp.value; sw.querySelector('.chip').textContent = inp.value; save() }
      box.append(sw)
    }
  }
}

function paintCost() {
  const n = $('#cost'); if (!n) return
  const imgs = O.scenes === 0 ? 0 : O.scenes === 2 ? 2 : 4
  // En lot, le coût est celui d'UNE page multiplié par le nombre de
  // produits. L'afficher par page quand on en lance six, c'est annoncer le
  // sixième du prix à quelqu'un qui compte ses crédits.
  const lot = several && choisis.size ? choisis.size : 1
  // `imgs` ne vaut jamais 1 (0, 2 ou 4), donc le pluriel du français n'avait
  // qu'une seule issue : la clé le porte déjà, et l'arabe n'accorde pas pareil.
  n.textContent = imgs
    ? t('studio.cost.images', { n: num(imgs * lot), s: num((30 + imgs * 11) * lot) })
    : t('studio.cost.text')
}

let saveTimer
function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => api('/landing/defaults', { method: 'POST', body: O }).catch(() => {}), 400)
}

/* ── building ────────────────────────────────────────────────────────────── */
async function build(fresh) {
  if (building) return
  // Une page, ou une par produit choisi. La boucle est SÉQUENTIELLE : quatre
  // pages lancées ensemble, c'est seize appels d'image en parallèle, et la
  // liaison vers api.meta.ai lâche déjà une fois sur trois toute seule.
  const cibles = several && choisis.size
    ? [...choisis].map(fiche).filter(Boolean).map((p) => ({ product: p.name, price_dzd: String(p.price ?? '') }))
    : [{ product: form.product, price_dzd: form.price_dzd }]
  if (!cibles.length || !cibles[0].product.trim()) return toast(t('studio.need.product'), true)

  building = true
  const btn = $('#build')
  btn.disabled = true
  const prog = $('#prog')
  prog.innerHTML = '<div class="progress"></div>'
  const lines = []
  const step = (txt, state = 'now') => {
    lines.forEach((l) => l.classList.replace('now', 'done'))
    const n = el('div', `ln ${state}`, `<span class="dot"></span><span>${esc(txt)}</span>`)
    lines.push(n); prog.firstElementChild.append(n)
  }

  let fait = 0
  for (const cible of cibles) {
    if (cibles.length > 1) step(t('studio.batch.now', { name: cible.product, i: num(++fait), n: num(cibles.length) }))
    await lancer(cible, fresh, step)
  }
  if (cibles.length > 1) {
    step(t('studio.batch.done', { n: num(cibles.length) }), 'done')
    toast(t('studio.batch.done', { n: num(cibles.length) }))
  }
  btn.disabled = false
  building = false
}

/* Un produit, une page. Le flux de progression arrive en SSE, donc on lit le
   corps au fur et à mesure plutôt que d'attendre la fin : sur une page à
   quatre scènes, l'attente dépasse la minute et un écran figé pendant une
   minute passe pour une panne. */
async function lancer(cible, fresh, step) {
  const prog = $('#prog')
  try {
      const res = await fetch(`/api/landing/build?session=${SESSION}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...cible, shop: $('#f-shop').value.trim(), options: O, fresh }),
      })
    const reader = res.body.getReader(), dec = new TextDecoder()
    let buf = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const parts = buf.split('\n\n'); buf = parts.pop()
      for (const part of parts) {
        const line = part.replace(/^data: /, '').trim()
        if (!line) continue
        let e; try { e = JSON.parse(line) } catch { continue }

        if (e.type === 'progress') {
          if (e.phase === 'copy') step(t('studio.step.copy'))
          else if (e.phase === 'scenes') step(t('studio.step.scenes'))
          else if (e.phase === 'scene') step(t('studio.step.scene', { label: e.label, step: num(e.step), total: num(e.total) }))
        }
        if (e.type === 'done') {
          for (const l of prog.querySelectorAll('.ln.now')) l.classList.replace('now', 'done')
          const r = e.result
          const bits = [t('studio.done.size', { n: num(Math.round(r.bytes / 1024)) })]
          if (r.scenes?.length) bits.push(t('studio.done.scenes', { n: num(r.scenes.length) }))
          if (r.scenes_reused) bits.push(t('studio.done.reused', { n: num(r.scenes_reused) }))
          // Le débit, à la ligne suivante : le panneau annonçait un prix
          // au-dessus du bouton, il doit dire ce qui a VRAIMENT été pris.
          if (e.cost?.credits) bits.push(t('studio.done.cost', { n: num(e.cost.credits) }))
          step(t('studio.done.ready', { bits: bits.join(' · ') }), 'done')
          for (const f of r.scenes_failed ?? []) {
            prog.firstElementChild.append(el('div', 'ln', `<span class="dot"></span><span style="color:var(--warn)">${t('studio.done.failed', { slot: esc(f.slot), error: esc(f.error) })}</span>`))
          }
          vue = r.id ?? vue
          preview = r.url + '?t=' + Date.now()
          paintPreview()
          refresh()
          toast(t('studio.done.toast'))
        }
        if (e.type === 'error') {
          step(e.error, 'done')
          prog.firstElementChild.lastElementChild.style.color = 'var(--bad)'
          toast(e.error, true)
        }
      }
    }
  } catch (err) {
    toast(err.message, true)
  }
}

function paintPreview() {
  const stage = $('#studio-stage'); if (!stage) return
  const open = $('#open')
  for (const b of document.querySelectorAll('[data-dev]')) b.classList.toggle('on', b.dataset.dev === device)

  if (!preview) {
    stage.innerHTML = `<div class="empty" style="padding:60px 20px">
      <div class="big">◌</div><h3>${t('studio.empty.title')}</h3>
      <p>${t('studio.empty.body')}</p></div>`
    open.style.display = 'none'
    return
  }
  stage.classList.toggle('phone', device === 'phone')
  stage.innerHTML = `<iframe class="${device}" src="${esc(preview)}" title="${esc(t('studio.preview.frame'))}"></iframe>`
  open.href = preview
  open.style.display = ''
}
