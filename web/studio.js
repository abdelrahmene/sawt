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
import { $, el, esc, icon, money, api, toast, loading, SESSION } from './ui.js'
import { refresh } from './app.js'

let D = null          // the catalogue + current options, from the server
let O = {}            // what is selected right now
let form = { product: '', price_dzd: '', angle: '', notes: '' }
let device = 'desk'
let preview = null    // url of the last page built
let building = false

export async function mount(root) {
  if (!root.dataset.built) {
    root.innerHTML = `<div class="studio-l" id="sl">${loading('studio')}</div>
      <div class="studio-r">
        <div class="bar">
          <span class="t">Aperçu</span>
          <span class="sim real">réel</span>
          <div class="right">
            <div class="seg" style="padding:3px">
              <button data-dev="phone">téléphone</button>
              <button data-dev="desk">bureau</button>
            </div>
            <a class="btn sm" id="open" target="_blank" rel="noopener" style="display:none">${icon('ext', 14)} ouvrir</a>
          </div>
        </div>
        <div class="stage" id="stage"></div>
      </div>`
    root.dataset.built = '1'
    for (const b of root.querySelectorAll('[data-dev]')) {
      b.onclick = () => { device = b.dataset.dev; paintPreview() }
    }
  }

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

/* ── the panel ───────────────────────────────────────────────────────────── */
function paintPanel() {
  const sl = $('#sl')
  sl.innerHTML = `
    <div style="margin-bottom:20px">
      <h1 style="font-size:19px;font-weight:700;letter-spacing:-.02em;margin:0">Studio landing</h1>
      <p style="color:var(--dim);font-size:13px;margin:5px 0 0">
        Le modèle écrit le texte et dessine les visuels. La mise en page, elle, est du code —
        donc elle est la même à chaque fois.</p>
    </div>

    <div class="fset">
      <div class="lbl">Produit</div>
      <input class="f" id="f-product" placeholder="صباط رياضي Adidas" value="${esc(form.product)}">
    </div>
    <div class="row" style="margin-bottom:18px">
      <div><label class="f">Prix (DA)</label>
        <input class="f" id="f-price" type="number" min="0" step="50" value="${esc(form.price_dzd)}"></div>
      <div><label class="f">Boutique</label>
        <input class="f" id="f-shop" value="${esc(D.shop ?? '')}" placeholder="Sabat Dzair"></div>
    </div>
    <div class="fset">
      <div class="lbl">Angle <span class="hint">la raison d'acheter, en une phrase</span></div>
      <input class="f" id="f-angle" value="${esc(form.angle)}" placeholder="La qualité se voit, et tu paies à la livraison">
    </div>

    ${D.photos.length ? `<div class="fset">
      <div class="lbl">Photos de référence <span class="hint">la 1ʳᵉ est la principale</span></div>
      <div class="phpick" id="phpick">
        ${D.photos.map((p) => {
          const i = O.photos.indexOf(p.url)
          return `<button data-u="${esc(p.url)}" class="${i >= 0 ? 'on' : ''}" title="${esc(p.label)}">
            <img src="${esc(p.url)}" alt="" loading="lazy">
            ${i >= 0 ? `<span class="n">${i + 1}</span>` : ''}
            ${i === 0 ? '<span class="main">principale</span>' : ''}
          </button>`
        }).join('')}
      </div>
      <div class="help">${O.photos.length
        ? `${O.photos.length} sélectionnée(s). Reclique pour retirer.`
        : "Aucune sélection : il prendra les créatives puis les photos de la session, dans cet ordre."}</div>
    </div>` : `<div class="fset"><div class="why warn">Aucune photo dans cette session.
      Envoie-en une à l'agent, ou génère des créatives — une page sans produit ne vend rien.</div></div>`}

    <h2 class="sec" style="margin-top:26px">Réglages</h2>
    <div id="knobs"></div>

    <h2 class="sec">Sections</h2>
    <div class="toggles" id="secs">
      ${D.sections.map((s) => `
        <div class="tog ${O.sections[s.k] ? 'on' : ''} ${s.locked ? 'lock' : ''}" data-k="${esc(s.k)}">
          <span class="sw"></span>
          <div><div class="n">${esc(s.label)}${s.locked ? ' · toujours là' : ''}</div>
            ${s.why ? `<div class="w">${esc(s.why)}</div>` : ''}</div>
        </div>`).join('')}
    </div>

    <h2 class="sec">Ce qu'on n'ajoutera pas</h2>
    <div class="toggles">
      ${D.refused.map((s) => `
        <div class="tog no"><span class="sw"></span>
          <div><div class="n">${esc(s.label)}</div><div class="w">${esc(s.why)}</div></div>
        </div>`).join('')}
    </div>

    <div class="fset" style="margin-top:22px">
      <div class="lbl">Consigne libre <span class="hint">facultatif</span></div>
      <textarea class="f" id="f-notes" rows="3"
        placeholder="Ce que le marchand sait et que le modèle ne peut pas voir : la matière, la garantie, le délai réel…">${esc(form.notes)}</textarea>
      <div class="help">Il suivra la consigne — sauf si elle lui demande d'affirmer un fait
        qu'il ne peut pas vérifier. Ça, il refusera.</div>
    </div>

    <div id="cost" class="help cost" style="margin:16px 0 10px"></div>
    <button class="btn p" id="build" style="width:100%;justify-content:center;padding:13px">
      ${icon('bolt', 16)} Générer la page
    </button>
    <label class="tog" style="margin-top:8px" id="fresh-wrap">
      <span class="sw"></span>
      <div><div class="n">Redessiner les visuels</div>
        <div class="w">Par défaut, les visuels déjà sur le disque sont réutilisés — rebâtir une page
          ne doit pas recoûter quatre générations d'images.</div></div>
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

  for (const b of sl.querySelectorAll('#phpick button')) {
    b.onclick = () => {
      const u = b.dataset.u
      const i = O.photos.indexOf(u)
      if (i >= 0) O.photos.splice(i, 1); else O.photos.push(u)
      save(); paintPanel()
    }
  }

  for (const t of sl.querySelectorAll('#secs .tog')) {
    if (t.classList.contains('lock')) continue
    t.onclick = () => { O.sections[t.dataset.k] = !O.sections[t.dataset.k]; t.classList.toggle('on'); save() }
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
    f.innerHTML = `<div class="lbl">${esc(spec.label)}</div>
      <div class="seg">${spec.choices.map((c) =>
        `<button data-v="${esc(String(c.v))}" class="${c.v === O[k] ? 'on' : ''}">${esc(c.label)}</button>`).join('')}</div>
      <div class="help"></div>`
    const help = f.querySelector('.help')
    const refreshHelp = () => {
      const c = spec.choices.find((x) => x.v === O[k])
      help.textContent = c?.help ?? ''
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
      sw.innerHTML = `<input type="color" value="${esc(O.color)}" aria-label="couleur principale">
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
  n.textContent = imgs
    ? `Coût : 1 appel texte + ${imgs} image${imgs > 1 ? 's' : ''} · environ ${30 + imgs * 11} s`
    : 'Coût : 1 appel texte · environ 25 s'
}

let saveTimer
function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => api('/landing/defaults', { method: 'POST', body: O }).catch(() => {}), 400)
}

/* ── building ────────────────────────────────────────────────────────────── */
async function build(fresh) {
  if (building) return
  if (!form.product.trim()) return toast('Il manque le nom du produit.', true)
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
          if (e.phase === 'copy') step('le modèle écrit le texte…')
          else if (e.phase === 'scenes') step('il dessine les visuels…')
          else if (e.phase === 'scene') step(`visuel « ${e.label} » · ${e.step}/${e.total}`)
        }
        if (e.type === 'done') {
          lines.forEach((l) => l.classList.replace('now', 'done'))
          const r = e.result
          const bits = [`${Math.round(r.bytes / 1024)} Ko`]
          if (r.scenes?.length) bits.push(`${r.scenes.length} visuel(s)`)
          if (r.scenes_reused) bits.push(`${r.scenes_reused} réutilisé(s)`)
          step(`prête — ${bits.join(' · ')}`, 'done')
          for (const f of r.scenes_failed ?? []) {
            prog.firstElementChild.append(el('div', 'ln', `<span class="dot"></span><span style="color:var(--warn)">visuel « ${esc(f.slot)} » non généré : ${esc(f.error)}</span>`))
          }
          preview = r.url + '?t=' + Date.now()
          paintPreview()
          refresh()
          toast('Page générée.')
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
      <div class="big">◌</div><h3>Rien à montrer encore</h3>
      <p>Règle les paramètres à gauche, puis génère. La page apparaîtra ici, et ce sera
         un vrai fichier que tu peux ouvrir, envoyer ou héberger.</p></div>`
    open.style.display = 'none'
    return
  }
  stage.classList.toggle('phone', device === 'phone')
  stage.innerHTML = `<iframe class="${device}" src="${esc(preview)}" title="aperçu"></iframe>`
  open.href = preview
  open.style.display = ''
}
