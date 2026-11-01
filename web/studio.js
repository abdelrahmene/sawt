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
let device = 'desk'
let preview = null    // url of the last page built
let building = false

export async function mount(root) {
  if (!root.dataset.built) {
    root.innerHTML = `<div class="studio-l" id="sl">${loading(t('studio.loading'))}</div>
      <div class="studio-r">
        <div class="bar">
          <span class="t">${t('studio.preview')}</span>
          <span class="sim real">${t('studio.real')}</span>
          <div class="right">
            <div class="seg" style="padding:3px">
              <button data-dev="phone">${t('studio.dev.phone')}</button>
              <button data-dev="desk">${t('studio.dev.desk')}</button>
            </div>
            <a class="btn sm" id="open" target="_blank" rel="noopener" style="display:none">${icon('ext', 14)} ${t('studio.open')}</a>
          </div>
        </div>
        <div class="stage" id="stage"></div>
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
  if (!form.product && D.pages?.[0]) {
    form.product = D.pages[0].product
    form.price_dzd = String(D.pages[0].price_dzd ?? '')
    form.angle = D.pages[0].angle ?? ''
    preview = preview ?? D.pages[0].url
  }
  paintPanel()
  paintPreview()
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
function paintPanel() {
  const sl = $('#sl')
  sl.innerHTML = `
    <div style="margin-bottom:20px">
      <h1 style="font-size:19px;font-weight:700;letter-spacing:-.02em;margin:0">${t('studio.title')}</h1>
      <p style="color:var(--dim);font-size:13px;margin:5px 0 0">${t('studio.lede')}</p>
    </div>

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
      ${icon('bolt', 16)} ${t('studio.build')}
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
  // `imgs` ne vaut jamais 1 (0, 2 ou 4), donc le pluriel du français n'avait
  // qu'une seule issue : la clé le porte déjà, et l'arabe n'accorde pas pareil.
  n.textContent = imgs
    ? t('studio.cost.images', { n: num(imgs), s: num(30 + imgs * 11) })
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
  if (!form.product.trim()) return toast(t('studio.need.product'), true)
  building = true
  const btn = $('#build')
  btn.disabled = true
  const prog = $('#prog')
  const lines = []
  const step = (txt, state = 'now') => {
    lines.forEach((l) => l.classList.replace('now', 'done'))
    const n = el('div', `ln ${state}`, `<span class="dot"></span><span>${esc(txt)}</span>`)
    lines.push(n); prog.firstElementChild.append(n)
  }
  prog.innerHTML = '<div class="progress"></div>'

  try {
    const res = await fetch(`/api/landing/build?session=${SESSION}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, shop: $('#f-shop').value.trim(), options: O, fresh }),
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
          lines.forEach((l) => l.classList.replace('now', 'done'))
          const r = e.result
          const bits = [t('studio.done.size', { n: num(Math.round(r.bytes / 1024)) })]
          if (r.scenes?.length) bits.push(t('studio.done.scenes', { n: num(r.scenes.length) }))
          if (r.scenes_reused) bits.push(t('studio.done.reused', { n: num(r.scenes_reused) }))
          step(t('studio.done.ready', { bits: bits.join(' · ') }), 'done')
          for (const f of r.scenes_failed ?? []) {
            prog.firstElementChild.append(el('div', 'ln', `<span class="dot"></span><span style="color:var(--warn)">${t('studio.done.failed', { slot: esc(f.slot), error: esc(f.error) })}</span>`))
          }
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
  btn.disabled = false
  building = false
}

function paintPreview() {
  const stage = $('#stage'); if (!stage) return
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
