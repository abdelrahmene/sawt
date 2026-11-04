// The conversation, and the canvas beside it.
//
// This was the whole app once. It is now one surface of six, and what it kept
// is the part that works: a bubble that grows token by token, a chip with a
// running clock so a three-minute build does not read as a freeze, the two
// readings of every voice note side by side, and buttons instead of a blank
// prompt.
import {
  $, el, esc, isArabic, icon, api, toast, zoom, frame, thumb, prov, SESSION, forgetSession,
} from './ui.js'
import { t, num, money as dinars } from './i18n.js'
import { go, refresh } from './app.js'

// Les nombres et les montants viennent d'i18n.js : ceux d'ui.js sont figés en
// fr-FR. Le `<bdi>` reste obligatoire — un prix dans un paragraphe arabe se
// fait réordonner par l'algorithme bidi (« 4 500 DZD » devient « DZD 500 4 »),
// et le tiret cadratin reste la réponse quand il n'y a pas de montant.
const money = (n) => (n == null ? '—' : `<bdi dir="ltr">${dinars(n)}</bdi>`)

const log = $('#log'), canvas = $('#canvas')

/* ── scrolling ────────────────────────────────────────────────────────────
   Auto-scroll only when the reader is already at the bottom. Yanking the view
   down while someone is looking at a creative three cards up is how you make
   a screen unusable — and it is what stopped him scrolling at all. */
const NEAR = 120
const atBottom = (n) => n.scrollHeight - n.scrollTop - n.clientHeight < NEAR
const toLatest = $('#tolatest')
function bottom(n) {
  if (atBottom(n)) { n.scrollTop = n.scrollHeight; if (n === canvas) toLatest.classList.remove('on') }
  else if (n === canvas) toLatest.classList.add('on')
}
toLatest.onclick = () => { canvas.scrollTo({ top: canvas.scrollHeight, behavior: 'smooth' }); toLatest.classList.remove('on') }
canvas.addEventListener('scroll', () => { if (atBottom(canvas)) toLatest.classList.remove('on') })

/* ── links in the model's prose ───────────────────────────────────────────
   The model writes markdown links and bare paths, and textContent rendered
   them as "[/out/lp-x.html](/out/lp-x.html)" — the one thing on screen the
   merchant most wants to click, printed as punctuation.
   Backticks matter here. The agent writes `/out/creative-x.png` in code
   quotes, and a character class that forgot the backtick swallowed the closing
   one into the href — every generated image opened a 404. */
const IS_IMG = /\.(png|jpe?g|webp|gif)$/i

// The model writes markdown, so the bubble has to read it. Three things only —
// bold, inline code and links — because that is all it actually uses, and a
// full markdown parser in here would be a dependency and a new class of bug.
// Before this, a reply listing four waiting customers came out as
// "**1. Rania S.** demande la pointure 43", asterisks and all.
function emphase(node, text) {
  const re = /\*\*([^*]+)\*\*|`([^`\n]+)`/g
  let last = 0, m
  while ((m = re.exec(text))) {
    if (m.index > last) node.append(text.slice(last, m.index))
    node.append(m[1] != null ? el('b', null, esc(m[1])) : el('code', null, esc(m[2])))
    last = re.lastIndex
  }
  if (last < text.length) node.append(text.slice(last))
}

function linkify(node, text) {
  node.textContent = ''
  const re = /(!?)\[([^\]]*)\]\((\/[^)\s]+|https?:\/\/[^)\s]+)\)|`?(\/out\/[^\s`<>"')]+|https?:\/\/[^\s`<>"')]+)`?/g
  let last = 0, m
  while ((m = re.exec(text))) {
    if (m.index > last) emphase(node, text.slice(last, m.index))
    const bang = m[1] === '!'
    const href = (m[3] ?? m[4]).replace(/[.,;:!?)\]]+$/, '')   // trailing punctuation is never part of a path
    const label = m[2] || href.replace(/^\/out\//, '')
    if (bang && IS_IMG.test(href)) {
      const img = Object.assign(new Image(), { src: href, alt: label, className: 'inline-img', loading: 'lazy' })
      img.onclick = () => zoom(href, label)
      node.append(img)
    } else {
      node.append(Object.assign(el('a', null, esc(label)), { href, target: '_blank', rel: 'noopener' }))
    }
    last = re.lastIndex
  }
  if (last < text.length) emphase(node, text.slice(last))
}

function say(who, text, cls) {
  // L'accueil disparaît dès le premier mot : il explique comment commencer,
  // il n'a plus rien à dire une fois qu'on a commencé.
  log.querySelector('.hello')?.remove()
  const n = el('div', `msg ${cls || who}`)
  linkify(n, String(text ?? ''))
  if (isArabic(text)) n.dir = 'rtl'
  log.append(n); bottom(log); return n
}

/* ── the two readings ─────────────────────────────────────────────────────
   Showing the words one of them lost is the single clearest thing this
   project has to say. */
function showHeard({ transcript, transcript_auto, understood }) {
  const words = (s) => new Set(String(s || '').toLowerCase().replace(/[.,?!؟]/g, ' ').split(/\s+/).filter(Boolean))
  const a = words(transcript_auto), p = words(transcript)
  const lostByAuto = [...p].filter((w) => !a.has(w))
  const lostByPinned = [...a].filter((w) => !p.has(w))

  const n = el('div', 'heard')
  n.append(el('b', null, t('chat.heard.title')))
  const row = (tag, cls, txt) => {
    const r = el('div', 'row')
    r.append(el('span', `tag ${cls}`, tag), el('span', 'txt', esc(txt ?? '—')))
    return r
  }
  if (transcript_auto) n.append(row('auto', 'a', transcript_auto))
  n.append(row('ar', 'p', transcript))

  if (lostByAuto.length || lostByPinned.length) {
    const gaps = []
    if (lostByPinned.length) gaps.push(t('chat.heard.lostByPinned', { words: lostByPinned.join(', ') }))
    if (lostByAuto.length) gaps.push(t('chat.heard.lostByAuto', { words: lostByAuto.join(', ') }))
    n.append(el('div', 'gap', '⚠ ' + esc(gaps.join('  ·  '))))
  }
  if (understood) {
    // `size`, `quantity` et `wilaya` sont les noms des champs manquants : ce
    // sont des clés que le code relit, elles s'affichent telles quelles.
    const miss = ['size', 'quantity', 'wilaya'].filter((k) => understood[k] == null)
    n.append(el('div', 'gap', miss.length
      ? t('chat.heard.intentMissing', { intent: esc(understood.intent), missing: miss.join(', ') })
      : t('chat.heard.intentFull', { intent: esc(understood.intent) })))
  }
  log.append(n); bottom(log)
}

/* ── choices ─────────────────────────────────────────────────────────────
   Once one is used the whole set greys out: a stale menu from three turns ago
   sends the agent somewhere it has already been. */
function showChoices({ question, choices }) {
  const list = choices ?? []
  // Dès qu'un choix engage de l'argent, le menu devient un point de contrôle.
  const spend = list.find((c) => c.kind === 'caution')
  if (spend) return showCheckpoint(question, list, spend)

  const n = el('div', 'choices')
  if (question) {
    const q = el('div', 'q', esc(question))
    if (isArabic(question)) q.dir = 'rtl'
    n.append(q)
  }
  for (const c of list) {
    const b = el('button', c.kind === 'primary' ? 'primary' : c.kind === 'caution' ? 'caution' : '', esc(c.label))
    if (isArabic(c.label)) b.dir = 'rtl'
    b.onclick = () => { n.classList.add('spent'); send(c.send) }
    n.append(b)
  }
  log.append(n); bottom(log)
}

/* ── le point de contrôle ─────────────────────────────────────────────────
   La règle « ne jamais dépenser sans instruction claire » vivait dans le
   prompt de l'agent et nulle part à l'écran : « Lance à 2000 par jour » et
   « Montre-moi les angles » avaient exactement la même tête, la même taille,
   la même couleur. C'est le motif qui s'est imposé partout en 2026 chez les
   agents qui engagent quelque chose pour quelqu'un — l'agent prépare, puis
   s'arrête et attend une main humaine. Ici la bande fait trois choses :
   elle dit qu'on est à un arrêt, elle colore UNIQUEMENT le bouton qui
   engage, et elle garantit une sortie même quand l'agent n'en propose pas. */
function showCheckpoint(question, list, spend) {
  const n = el('div', 'ckpt')
  const h = el('div', 'h',
    `<span class="beat"></span><span class="t">${t('chat.ckpt.title')}</span><span class="sim">${t('chat.badge.sim')}</span>`)
  const b = el('div', 'b')
  if (question) {
    const q = el('div', 'q', esc(question))
    if (isArabic(question)) q.dir = 'rtl'
    b.append(q)
  }
  const acts = el('div', 'acts')
  const mk = (c, cls) => {
    const btn = el('button', cls, esc(c.label))
    if (isArabic(c.label)) btn.dir = 'rtl'
    btn.onclick = () => { n.classList.add('spent'); send(c.send) }
    return btn
  }
  acts.append(mk(spend, 'go'))
  for (const c of list) if (c !== spend) acts.append(mk(c, ''))
  // Une porte de sortie, toujours. Un point de contrôle dont les trois
  // boutons avancent n'est pas un point de contrôle.
  if (!list.some((c) => /annul|pas maintenant|plus tard|ne pas|non merci|arrêt/i.test(c.label))) {
    const out = el('button', 'out', t('chat.ckpt.notNow'))
    out.onclick = () => { n.classList.add('spent'); send(t('chat.ckpt.notNowSend')) }
    acts.append(out)
  }
  b.append(acts, el('div', 'foot', t('chat.ckpt.foot')))
  n.append(h, b)
  log.append(n); bottom(log)
}

/* ── le résultat, dans le fil ─────────────────────────────────────────────
   Le motif qui revient partout dans les interfaces d'agents de 2026 : ce
   qu'on vient de produire s'affiche LÀ OÙ on l'a demandé. Jusqu'ici tout
   partait dans la colonne de droite, et une réponse comme « Photo refaite »
   obligeait le marchand à chercher ailleurs ce qu'il venait de demander.
   La carte de droite reste — elle garde l'historique et les détails — mais
   la conversation ne renvoie plus à plus tard. */
const INLINE = {
  restyle_photo: (r) => (r.photos ?? []).map((p) => ({ url: p.url, label: p.look })),
  generate_creatives: (r) => (r.creatives ?? []).map((c) => ({ url: c.url, label: c.angle })),
  build_landing_page: (r) => (r.url ? [{ page: r.url, label: r.product }] : []),
  build_site: (r) => [
    ...(r.home ? [{ page: r.home, label: t('chat.label.home') }] : []),
    ...(r.pages ?? []).map((p) => ({ page: p.url, label: p.product })),
  ],
  build_storefront: (r) => (r.url ? [{ page: r.url, label: r.shop_name }] : []),
}

/* Par quoi chaque chose a été produite. Écrit à la main et non déduit : le
   marchand a le droit de savoir que la découpe vient de sam-3.1 et le
   rhabillage de muse-image, et un jury a le droit de le vérifier. En rejeu
   aucun modèle n'est appelé — le dire est le minimum. */
const MADE_BY = {
  restyle_photo: 'sam-3.1 → muse-image-1.0',
  generate_creatives: 'sam-3.1 → muse-image-1.0',
  build_landing_page: 'muse-spark-1.3 → HTML',
  build_site: 'muse-spark-1.3 → HTML',
  build_storefront: 'muse-spark-1.3 → HTML',
}

function inline(name, result) {
  const items = INLINE[name]?.(result ?? {}) ?? []
  if (!items.length) return
  const n = el('div', 'inline-out')
  for (const it of items.slice(0, 6)) {
    if (it.page) {
      const a = Object.assign(el('a', 'page', `${icon('ext', 13)}<span>${esc(it.label ?? t('chat.label.page'))}</span>`),
        { href: it.page, target: '_blank', rel: 'noopener' })
      n.append(a)
    } else {
      const f = el('figure')
      const img = Object.assign(new Image(), { src: it.url, alt: it.label ?? '', loading: 'lazy' })
      img.onclick = () => zoom(it.url, it.label)
      f.append(img, el('figcaption', null, esc(it.label ?? '')))
      n.append(f)
    }
  }
  log.append(n)
  const by = MADE_BY[name]
  if (by) {
    const replay = (window.SAWT_STATE?.mode ?? '') === 'replay'
    const w = el('div')
    w.innerHTML = prov(replay ? t('chat.prov.replay', { by }) : by, 'real')
    log.append(w.firstElementChild)
  }
  bottom(log)
}

/* ── cards on the canvas ─────────────────────────────────────────────────── */
function card(title, { real, sim, note } = {}) {
  const c = el('div', 'card')
  const h = el('h3', null, esc(title))
  if (real) h.append(el('span', 'sim real', t('chat.badge.real')))
  else if (sim) h.append(el('span', 'sim', t('chat.badge.sim')))
  else if (note) h.append(el('span', 'chip', esc(note)))
  const b = el('div', 'body')
  c.append(h, b)
  clearEmpty()
  canvas.append(c); bottom(canvas)
  return b
}
const clearEmpty = () => $('#canvas-empty')?.remove()

function photoGrid() {
  clearEmpty()
  const existing = canvas.querySelector('.card.photos .thumbs')
  if (existing) return existing
  const body = card(t('chat.card.photos'), { real: true })
  body.parentElement.classList.add('photos')
  const g = el('div', 'thumbs')
  body.append(g)
  return g
}

// One malformed artifact must not take the screen down with it. Replaying a
// conversation means replaying data written by older code, and the first time
// that happened the whole app rendered blank on a single undefined field.
/* Le débit, écrit SOUS ce qu'il a payé.
   Pas dans un relevé qu'on irait chercher ailleurs : le marchand voit la
   page, et juste en dessous ce qu'elle lui a coûté, avec le détail des
   appels. Une action gratuite — lire la boîte, ouvrir le catalogue —
   n'affiche rien du tout plutôt qu'un « 0 crédit » qui ferait douter. */
function ligneCout(cost) {
  if (!cost?.credits) return null
  const detail = cost.lines
    .map((l) => t('chat.cost.line', { n: num(l.n), model: l.model }))
    .join(' · ')
  return el('div', 'cost-line',
    `<b>−${num(cost.credits)}</b> ${esc(t('chat.cost.credits'))}` +
    `<span>${detail}</span>`)
}

/* id -> photo, lu dans le catalogue. Une seule requête pour toute la
   session : la promesse est mise en cache, pas le résultat, donc dix cartes
   rendues en rafale partagent le même appel. */
let catalogue = null
const photos = () => (catalogue ??= api('/catalog')
  .then((d) => new Map((d.products ?? []).map((p) => [p.id, p.image])))
  .catch(() => new Map()))

function remplirPhotos(racine) {
  const vides = [...racine.querySelectorAll('img[data-pid]')]
  if (!vides.length) return
  photos().then((m) => {
    for (const img of vides) {
      const u = m.get(img.dataset.pid)
      if (u) { img.src = u; img.removeAttribute('data-pid') }
      else img.closest('.shot')?.classList.add('vide')
    }
  })
}

function renderArtifact(a) {
  try { renderArtifactInner(a) } catch (e) {
    console.error('[artifact]', a?.name, e)
    const b = card(a?.name ?? t('chat.label.artifact'), {})
    b.append(el('div', 'why warn',
      `${t('chat.artifact.stale')}<br>
       <span style="color:var(--dim)">${esc(e.message)}</span>`))
    if (a?.result?.url) {
      b.append(Object.assign(el('a', null, t('chat.artifact.openAnyway')),
        { href: a.result.url, target: '_blank', rel: 'noopener' }))
    }
  }
  // Collé à la dernière carte posée, quelle qu'elle soit : chaque branche
  // n'a donc pas à y penser, et une branche ajoutée demain l'aura aussi.
  const ligne = ligneCout(a?.cost)
  if (ligne) canvas.lastElementChild?.querySelector('.body')?.append(ligne)
}

function renderArtifactInner({ name, args, result, simulated, real }) {
  if (result?.error) {
    const b = card(name, {})
    b.append(el('div', 'why bad', esc(result.error)))
    if (result.needs === 'connect_meta') {
      const btn = el('button', 'btn p', `${icon('link', 15)} ${t('chat.meta.connectBtn')}`)
      btn.onclick = () => go('meta')
      b.append(el('div', null, '').appendChild(btn).parentElement)
    }
    return
  }

  /* ── le catalogue fournisseur, en images ───────────────────────────────
     Ce résultat tombait dans l'affichage JSON de repli : dix produits en
     accolades et en guillemets. Un dropshippeur ne choisit pas un produit
     sur une ligne de JSON — il le choisit en le voyant, et il décide sur
     la marge. Les deux manquaient à l'écran alors que le serveur les
     envoyait déjà. */
  /* Les photos manquantes d'un artefact ancien.
     Un artefact est enregistré tel quel et rejoué des semaines plus tard.
     Ceux d'avant le 01/11/2026 n'ont pas de champ `image` — l'outil ne le
     renvoyait pas — donc la conversation se rouvrait avec des cadres gris
     là où il y avait eu des produits. Le catalogue est de toute façon la
     source de vérité pour les photos : on va la chercher là, une seule fois
     pour toute la page, et on remplit après coup. Si le produit a disparu
     du catalogue, le cadre reste vide et c'est honnête. */
  if (name === 'browse_catalog') {
    const b = card(t('chat.card.catalog', { n: result.count ?? 0 }), { sim: simulated })
    // La MÊME carte que l'écran Catalogue, pas une deuxième à entretenir :
    // mêmes classes, donc le jour où l'une change, l'autre suit.
    const g = el('div', 'prods')
    for (const p of result.products ?? []) {
      const c = el('article', 'prod')
      c.innerHTML = `
        <div class="shot">${p.image
          ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
          : `<img data-pid="${esc(p.id)}" alt="${esc(p.name)}" loading="lazy">`}</div>
        <div class="body">
          <h3>${esc(p.name)}</h3>
          <div class="by">${esc(p.supplier ?? '')}</div>
          <div class="nums">
            <span><em>${esc(t('chat.catalog.cost'))}</em>${dinars(p.supplier_cost)}</span>
            <span><em>${esc(t('chat.catalog.price'))}</em>${dinars(p.recommended_price)}</span>
            <span class="win"><em>${esc(t('chat.catalog.marginLbl'))}</em>${dinars(p.margin_per_order)} <b>${num(p.margin_pct)}%</b></span>
          </div>
          <div class="sizes">${String(p.sizes ?? '').split(',').filter(Boolean)
            .map((s) => `<span>${esc(s.trim())}</span>`).join('')}</div>
        </div>`
      // Choisir se fait en PARLANT à l'agent, pas en appelant l'outil nous-
      // mêmes : c'est lui qui connaît le prix de vente à proposer et qui doit
      // garder la main sur ce qui entre dans la boutique.
      const btn = el('button', 'btn go', t('chat.catalog.sell'))
      btn.onclick = () => send(t('chat.catalog.sellMsg', { name: p.name }))
      c.querySelector('.body').append(btn)
      g.append(c)
    }
    b.append(g)
    remplirPhotos(g)
    if (result.say) b.append(el('div', 'why', esc(result.say)))
    return
  }

  if (name === 'import_product') {
    const b = card(t('chat.card.imported', { name: result.name?.en ?? result.product_id ?? '' }), { real: true })
    const g = el('div', 'thumbs')
    for (const u of (result.images ?? []).slice(0, 3)) g.append(thumb(u, ''))
    if (g.childElementCount) b.append(g)
    else if (result.product_id) {
      // Artefact ancien : la photo se retrouve par l'identifiant.
      const seul = el('div', 'thumbs')
      seul.innerHTML = `<figure><img data-pid="${esc(result.product_id)}" alt="" loading="lazy"></figure>`
      b.append(seul); remplirPhotos(seul)
    }
    b.append(el('div', 'why',
      t('chat.imported.money', {
        price: `<b>${dinars(result.selling)}</b>`,
        cost: dinars(result.supplier_cost),
        margin: `<b>${dinars(result.margin)}</b>`,
        pct: num(result.margin_pct),
      })))
    const go2 = el('button', 'btn go', t('chat.imported.next'))
    go2.onclick = () => send(t('chat.imported.nextMsg', { name: result.name?.en ?? result.product_id }))
    b.append(go2)
    return
  }

  if (name === 'marketing_angles') {
    const b = card(t('chat.card.angles'))
    for (const a of result.angles ?? []) {
      b.append(el('div', 'why', `<b>${esc(a.name)}</b><br>${esc(a.claim)}<br><span style="color:var(--dim)">${esc(a.visual)}</span>`))
    }
    return
  }

  if (name === 'restyle_photo') {
    const b = card(t('chat.card.restyle', { product: result.product ?? '' }), { real: true })
    const g = el('div', 'thumbs')
    if (result.source_photo) g.append(thumb(result.source_photo, t('chat.restyle.yourPhoto')))
    if (result.isolated?.url) g.append(thumb(result.isolated.url, t('chat.restyle.cutout')))
    for (const p of result.photos ?? []) g.append(thumb(p.url, p.look))
    b.append(g)
    if (result.note) b.append(el('div', 'why', esc(result.note)))
    // L'avertissement de marque passe avant tout le reste : c'est le compte
    // publicitaire du marchand qui est en jeu.
    if (result.brand_risk) {
      b.append(el('div', 'why warn',
        `<b>${t('chat.restyle.brandTitle')}</b><br>${esc(result.brand_risk.seen)}<br>` +
        `<span style="color:var(--dim)">${t('chat.restyle.brandNote')}</span>`))
    }
    return
  }

  if (name === 'generate_creatives') {
    const b = card(t('chat.card.creatives'), { real: true })
    const g = el('div', 'thumbs')
    for (const c of result.creatives ?? []) g.append(thumb(c.url, c.angle))
    b.append(g)
    if (result.subject) b.append(el('div', 'why', t('chat.creatives.subject', { subject: `<b>${esc(result.subject)}</b>` })))
    // Le détourage est la partie que le marchand ne devine pas tout seul :
    // on lui dit quelle part de SA photo était du décor.
    const iso = result.isolated
    if (iso?.url) {
      const d = el('div', 'why')
      d.innerHTML = t('chat.creatives.iso', { model: '<b>sam-3.1</b>', gain: esc(iso.gain ?? '') }) +
        `<br><span style="color:var(--dim)">${esc(iso.from)}</span>`
      const im = Object.assign(new Image(), { src: iso.url, className: 'inline-img', loading: 'lazy' })
      im.onclick = () => zoom(iso.url, t('chat.creatives.isoAlt'))
      d.append(im)
      b.append(d)
    } else if (iso?.failed) {
      b.append(el('div', 'why warn',
        t('chat.creatives.isoFailed', { model: '<b>sam-3.1</b>', why: esc(iso.failed) }) + `<br>${esc(iso.from)}`))
    }
    if (result.headline_ar) {
      b.append(el('div', 'why', t('chat.creatives.headline', { text: `<b dir="rtl">${esc(result.headline_ar)}</b>` })))
    }
    return
  }

  if (name === 'build_site') {
    const b = card(t('chat.card.site', { shop: result.shop_name }), { real: true })
    if (result.home) b.append(frame(result.home))
    const list = el('div', 'plist')
    if (result.home) {
      list.append(Object.assign(el('a', null,
        `<span>${t('chat.label.home')}</span><span class="px">${t('chat.site.count', { n: num(result.count) })}</span>`),
        { href: result.home, target: '_blank' }))
    }
    for (const p of result.pages ?? []) {
      list.append(Object.assign(
        el('a', null, `<span>${esc(p.product)}</span><span class="px">${money(p.price_dzd)}</span>`),
        { href: p.url, target: '_blank' }))
    }
    b.append(el('div', 'why', result.host
      ? t('chat.site.onlineAt', { host: `<b>${esc(result.host)}</b>` })
      : t('chat.site.realFiles')), list)
    for (const f of result.failed ?? []) {
      b.append(el('div', 'why bad', t('chat.site.failed', { product: esc(f.product), error: esc(f.error) })))
    }
    const btn = el('button', 'btn sm', `${icon('globe', 14)} ${t('chat.site.manageDomain')}`)
    btn.onclick = () => go('sites')
    b.append(el('div', null).appendChild(btn).parentElement)
    return
  }

  if (name === 'build_landing_page' || name === 'build_storefront') {
    const b = card(name === 'build_storefront'
      ? t('chat.card.storefront', { shop: result.shop_name })
      : t('chat.card.landing', { product: result.product }), { real: true })
    b.append(frame(result.url, true))
    const bits = [t('chat.landing.kb', { n: num(Math.round(result.bytes / 1024)) })]
    if (result.scenes?.length) bits.push(t('chat.landing.scenes', { n: num(result.scenes.length) }))
    if (result.sections) {
      const s = result.sections
      bits.push(t('chat.landing.sections', { benefits: s.benefits, features: s.features, steps: s.steps, faq: s.faq }))
    }
    b.append(el('div', 'why', `${t('chat.landing.made')}<br>${esc(bits.join(' · '))}`))
    for (const f of result.scenes_failed ?? []) {
      b.append(el('div', 'why warn', t('chat.landing.sceneFailed', { slot: esc(f.slot), error: esc(f.error) })))
    }
    /* La page est entrée dans une boutique : on le dit ici, et on y emmène.
       Le marchand voyait sa page dans le chat et un écran Sites vide juste
       à côté — il n'avait aucune raison d'aller l'y chercher. */
    if (result.site_id && result.shop) {
      b.append(el('div', 'why', t('chat.landing.inShop', { shop: `<b>${esc(result.shop)}</b>` })))
      const vers = el('div')
      const btn = el('button', 'btn sm', `${icon('globe', 14)} ${t('chat.landing.seeShop')}`)
      btn.onclick = () => go('sites')
      vers.append(btn)
      b.append(vers)
    }
    return
  }

  if (name === 'connect_meta') {
    const b = card(t('chat.card.connectMeta'), { sim: true })
    b.append(el('div', 'why warn', esc(result.because ?? '') + '<br><b>' + esc(result.note) + '</b>'))
    const btn = el('button', 'btn fb',
      `${icon('link', 15)} ${result.already ? t('chat.meta.already') : t('chat.meta.continueFb')}`)
    btn.onclick = () => go('meta')
    b.append(btn)
    return
  }

  if (name === 'read_inbox') {
    const b = card(t('chat.card.inbox', { n: num(result.count) }), { sim: true })
    if (!result.threads?.length) { b.append(el('div', 'why', t('chat.inbox.nobody'))); return }
    // `tbl` et plus `t` : `t()` est la fonction de traduction, et une variable
    // du même nom la masquait dans tout ce bloc.
    const tbl = el('table', null,
      `<tr><th>${t('chat.inbox.th.person')}</th><th>${t('chat.inbox.th.channel')}</th>` +
      `<th>${t('chat.inbox.th.asked')}</th><th class="num">${t('chat.inbox.th.ago')}</th></tr>`)
    for (const x of result.threads) {
      const tr = el('tr', x.status === 'needs_merchant' ? 'worst' : '')
      tr.innerHTML = `<td>${esc(x.person)}</td><td>${esc(x.channel)}</td>` +
        `<td dir="rtl" style="font-family:var(--arabic)">${esc(String(x.asked ?? '').slice(0, 70))}</td>` +
        `<td class="num">${t('chat.minutes', { n: num(x.minutes_ago) })}</td>`
      tbl.append(tr)
    }
    b.append(tbl)
    const btn = el('button', 'btn sm', `${icon('inbox', 14)} ${t('chat.inbox.open')}`)
    btn.onclick = () => go('inbox')
    b.append(el('div', null).appendChild(btn).parentElement)
    return
  }

  // The refusals are the point, so they get the loudest treatment on screen.
  if (name === 'answer_inbox') {
    const b = card(t('chat.card.answers', { summary: result.summary ?? '' }), { note: t('chat.answers.note') })
    for (const a of result.answered ?? []) {
      const d = el('div', 'why')
      d.innerHTML = `<b>${esc(a.person)}</b> · ${esc(a.channel)}<br>` +
        `<span dir="rtl" style="font-family:var(--arabic);color:var(--dim)">${esc(a.asked ?? '')}</span><br>` +
        `<span dir="rtl" style="font-family:var(--arabic)">${esc(a.reply)}</span>` +
        (a.ms ? `<br><span style="color:var(--faint);font-size:12px">${a.ms} ms</span>` : '')
      b.append(d)
    }
    for (const e of result.escalated ?? []) {
      const d = el('div', 'why warn')
      d.innerHTML = `<b>${esc(e.person ?? '#' + e.id)}</b> — <b>${t('chat.answers.onPurpose')}</b><br>` +
        (e.asked ? `<span dir="rtl" style="font-family:var(--arabic);color:#6e4104">${esc(e.asked)}</span><br>` : '') +
        (e.need_from_merchant
          ? t('chat.answers.needsYou', { need: `<b>${esc(e.need_from_merchant)}</b>` })
          : esc(e.error ?? ''))
      b.append(d)
    }
    if (result.note) b.append(el('div', 'why', esc(result.note)))
    const btn = el('button', 'btn sm', `${icon('inbox', 14)} ${t('chat.answers.openThreads')}`)
    btn.onclick = () => go('inbox')
    b.append(el('div', null).appendChild(btn).parentElement)
    return
  }

  if (name === 'configure_campaign') {
    const b = card(t('chat.card.campaign', { name: result.name }), { sim: true })
    const dl = el('dl', 'kv')
    const put = (k, v) => dl.append(el('dt', null, k), el('dd', null, v))
    put('id', `#${result.id} · ${esc(result.ext_id ?? '')}`)
    put(t('chat.campaign.objective'), esc(result.objective))
    put(t('chat.campaign.dailyBudget'), money(result.daily_budget_dzd))
    put(t('chat.campaign.targeting'), t('chat.campaign.targetingValue', {
      geo: esc(result.geo.join(', ')), min: result.age_min, max: result.age_max, genders: esc(result.genders),
    }))
    put(t('chat.campaign.placements'), esc(result.placements.join(', ')))
    put(t('chat.campaign.creatives'), String(result.ads?.length ?? 0))
    put(t('chat.campaign.status'), esc(result.status))
    b.append(dl)
    // Two shapes have existed: the old single {endpoint, body} and the
    // current {campaign, adset}. A conversation saved before the change must
    // still replay — a screen that blanks because of last week's data is a
    // screen nobody trusts with this week's.
    const ap = result.api_payload ?? {}
    const parts = ap.campaign ? [ap.campaign, ap.adset].filter(Boolean) : ap.endpoint ? [ap] : []
    if (parts.length) {
      b.append(el('div', 'why', t('chat.campaign.exactRequest')))
      b.append(el('pre', null, esc(parts.map((x) => `${x.endpoint}\n${JSON.stringify(x.body, null, 2)}`).join('\n\n'))))
    }
    const btn = el('button', 'btn sm', `${icon('chart', 14)} ${t('chat.campaign.seeInAds')}`)
    btn.onclick = () => go('campaigns')
    b.append(el('div', null).appendChild(btn).parentElement)
    return
  }

  if (name === 'launch_campaign') {
    const b = card(t('chat.card.launch'), { sim: true })
    // `ACTIVE` est le statut que lit le simulateur : il reste tel quel.
    b.append(el('div', result.refused ? 'why warn' : 'why', result.refused
      ? `<b>${t('chat.launch.refused')}</b> — ${esc(result.reason)}`
      : `<b>ACTIVE</b> · ${t('chat.launch.noSpend')}`))
    return
  }

  if (name === 'simulate_days' || name === 'campaign_results') {
    const b = card(t('chat.card.results', { n: result.days ?? 0 }), { sim: true })
    if (!result.rows?.length) { b.append(el('div', 'why', esc(result.note ?? t('chat.results.nothing')))); return }
    // `tot` et plus `t` : voir plus haut, `t()` traduit.
    const tot = result.totals
    const k = el('div', 'kpis')
    k.innerHTML =
      `<div class="kpi"><div class="l">${t('chat.kpi.spent')}</div><div class="v">${money(tot.spend_dzd)}</div></div>` +
      `<div class="kpi"><div class="l">${t('chat.kpi.orders')}</div><div class="v">${num(tot.orders)}</div></div>` +
      `<div class="kpi"><div class="l">${t('chat.kpi.costPerOrder')}</div><div class="v">${money(tot.cost_per_order_dzd)}</div></div>` +
      `<div class="kpi"><div class="l">${t('chat.kpi.clicks')}</div><div class="v">${num(tot.clicks)}</div></div>`
    b.append(k)

    const tbl = el('table', null,
      `<tr><th>${t('chat.results.th.creative')}</th><th>${t('chat.results.th.placement')}</th>` +
      `<th class="num">${t('chat.results.th.spend')}</th><th class="num">${t('chat.results.th.clicks')}</th>` +
      `<th class="num">${t('chat.results.th.orders')}</th><th class="num">${t('chat.results.th.cpo')}</th></tr>`)
    result.rows.forEach((r, i) => {
      const tr = el('tr', (i === 0 ? 'best ' : i === result.rows.length - 1 ? 'worst ' : '') + (r.status === 'PAUSED' ? 'off' : ''))
      tr.innerHTML = `<td>${esc(r.angle ?? r.ad_ext)}</td><td>${esc(r.placement_label)}</td>` +
        `<td class="num">${money(r.spend_dzd)}</td><td class="num">${num(r.clicks)}</td>` +
        `<td class="num">${num(r.orders)}</td><td class="num">${money(r.cost_per_order_dzd)}</td>`
      tbl.append(tr)
    })
    b.append(el('div', 'why', `<b>${esc(result.note)}</b>`), tbl)
    return
  }

  if (name === 'adjust_campaign') {
    const b = card(t('chat.card.decision'), { sim: true })
    b.append(el('div', 'why', `<b>${esc(result.applied.action)}</b>${result.applied.target ? ' → ' + esc(result.applied.target) : ''}<br>${esc(result.applied.because)}`))
    return
  }

  if (name === 'add_domain') {
    const b = card(t('chat.card.domain', { host: result.host }), { real: true })
    b.append(el('div', 'why',
      t('chat.domain.status', { status: `<b>${esc(result.status)}</b>`, label: esc(result.state_label ?? '') })))
    if (result.records?.length) {
      const d = el('div', 'dns')
      for (const r of result.records) {
        d.innerHTML += `<div class="rec"><span class="ty">${esc(r.type)}</span><span>${esc(r.name)}</span><span>${esc(r.value)}</span></div>`
      }
      b.append(el('div', 'why', t('chat.domain.addAtRegistrar')), d)
    }
    const btn = el('button', 'btn sm', `${icon('globe', 14)} ${t('chat.domain.manage')}`)
    btn.onclick = () => go('sites')
    b.append(el('div', null).appendChild(btn).parentElement)
    return
  }

  if (name === 'show_meta_setup') {
    const b = card(t('chat.card.metaSetup'))
    b.append(el('pre', null, esc(result.guide)))
    return
  }

  // Anything new, shown raw rather than silently dropped.
  const b = card(name, { sim: simulated, real })
  b.append(el('pre', null, esc(JSON.stringify(result, null, 2).slice(0, 2000))))
}

/* ── live step chips ─────────────────────────────────────────────────────
   A site takes minutes. Without a clock the screen reads as frozen, and the
   first thing anyone does with a frozen screen is reload it. */
// Les deux tables gardent des CLÉS et non des phrases : elles sont construites
// une seule fois à l'import, et une phrase figée là resterait dans la langue du
// chargement même après un changement de langue. La traduction se fait au
// moment où le chip s'affiche.
const LABEL = {
  build_site: 'chat.step.site', build_landing_page: 'chat.step.landing',
  generate_creatives: 'chat.step.creatives', marketing_angles: 'chat.step.angles',
  configure_campaign: 'chat.step.campaign', launch_campaign: 'chat.step.launch',
  campaign_results: 'chat.step.results', adjust_campaign: 'chat.step.decide',
  simulate_days: 'chat.step.days', read_inbox: 'chat.step.inbox',
  answer_inbox: 'chat.step.answer', connect_meta: 'chat.step.connect',
  add_domain: 'chat.step.domain', show_meta_setup: 'chat.step.metaSetup',
  propose_choices: '', ask_merchant: '',
}
const PHASE = {
  copy: 'chat.phase.copy', scenes: 'chat.phase.scenes', scene: 'chat.phase.scene',
  page: 'chat.phase.page', home: 'chat.phase.home',
}

function newStep(label) {
  const n = el('div', 'step')
  const txt = el('span', null, label)
  const sub = el('span', 'sub')
  // L'horloge s'appelait `t`, et `t` est maintenant la fonction de traduction :
  // la garder masquerait le traducteur dans toute cette fonction.
  const horloge = el('span', 't', '0s')
  n.append(el('span', 'spin'), txt, sub, horloge)
  const t0 = Date.now()
  const tick = setInterval(() => { horloge.textContent = Math.round((Date.now() - t0) / 1000) + 's' }, 1000)
  log.append(n); bottom(log)
  return {
    node: n,
    label: (s) => { txt.textContent = s },
    sub: (s) => { sub.textContent = s ? `· ${s}` : '' },
    done() { clearInterval(tick); n.classList.add('done'); sub.textContent = '' },
    drop() { clearInterval(tick); n.remove() },
  }
}

/* ── talking to the agent ────────────────────────────────────────────────── */
let busy = false
export async function send(input) {
  if (busy || !input?.trim()) return
  busy = true
  document.body.classList.add('busy')
  say('me', input)

  let step = newStep(t('chat.step.thinking'))
  const bubbles = new Map()
  let openedMeta = false

  try {
    const res = await fetch(`/api/chat?session=${SESSION}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
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

        if (e.type === 'say:start') { bubbles.set(e.id, el('div', 'msg bot live')); continue }
        if (e.type === 'say:delta') {
          const b = bubbles.get(e.id); if (!b) continue
          if (!b.isConnected) step.node.before(b)        // first token: show it
          b.textContent += e.text
          if (isArabic(b.textContent)) b.dir = 'rtl'
          bottom(log)
          continue
        }
        if (e.type === 'say:end') {
          const b = bubbles.get(e.id)
          if (b) {
            b.classList.remove('live')
            if (!b.textContent.trim()) b.remove()
            else linkify(b, b.textContent)              // only once the text has stopped moving
          }
          continue
        }
        if (e.type === 'tool:start') {
          const l = LABEL[e.name]
          if (l) { step.label(t(l)); step.sub('') }
          continue
        }
        if (e.type === 'progress') {
          // Une phase que la table ne connaît pas s'affiche telle qu'elle vient
          // du serveur, comme avant.
          const ph = PHASE[e.phase] ? t(PHASE[e.phase]) : e.phase ?? ''
          step.sub([e.step && e.total ? `${e.step}/${e.total}` : '', ph, e.label ?? ''].filter(Boolean).join(' '))
          continue
        }
        if (e.type === 'tool:end') {
          if (e.name === 'ask_merchant') { step.drop(); say('bot', e.result.question, 'ask'); step = newStep(t('chat.step.thinking')) }
          else if (e.name === 'propose_choices') showChoices(e.result)
          else {
            step.done(); inline(e.name, e.result); renderArtifact(e); step = newStep(t('chat.step.thinking'))
            // A tool can ask the SCREEN to move. Consent is the obvious case:
            // the agent cannot click through a permission dialog on the
            // merchant's behalf, which is the entire point of consent.
            if (e.result?.open === 'meta_login' && !e.result.already && !openedMeta) {
              openedMeta = true
              setTimeout(() => go('meta'), 700)
            }
          }
          continue
        }
        if (e.type === 'done') { refresh(); continue }
        if (e.type === 'error') say('bot', '⚠ ' + e.error, 'ask')
      }
    }
  } catch (err) {
    // Une coupure réseau n'est pas une question de l'agent. L'afficher dans
    // le style « il lui manque quelque chose » laissait croire qu'il
    // attendait une réponse, alors que c'est le serveur qui est tombé.
    const n = el('div', 'msg offline')
    n.innerHTML = `<b>${t('chat.offline.title')}</b> ` +
      t('chat.offline.body', { cmd: '<code>npm start</code>' }) +
      `<br><span style="opacity:.7">${esc(err.message)}</span>`
    const b = el('button', 'btn sm', t('chat.retry'))
    b.onclick = () => { n.remove(); send(input) }
    n.append(document.createElement('br'), b)
    log.append(n); bottom(log)
  }

  step.drop()
  document.body.classList.remove('busy')
  busy = false
  refresh()
}

/* ── la voix, dessinée ────────────────────────────────────────────────────
   Le produit s'appelle « la voix ». Un micro qui ne montre rien pendant
   qu'on parle, c'est un bouton sur lequel on doute — surtout en darija, où
   le marchand ne sait pas encore si on le comprend. Les barres bougent avec
   SA voix, en direct, depuis le même flux que l'enregistrement : rien de
   décoratif, c'est la mesure du signal qui part au modèle. */
const wave = $('#wave')
const wctx = wave.getContext('2d')
let analyser = null, raf = 0

function dessinerOnde() {
  if (!analyser) return
  const n = analyser.frequencyBinCount
  const data = new Uint8Array(n)
  analyser.getByteFrequencyData(data)

  const dpr = Math.min(devicePixelRatio || 1, 2)
  const W = wave.clientWidth, H = wave.clientHeight
  if (wave.width !== W * dpr) { wave.width = W * dpr; wave.height = H * dpr }
  wctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  wctx.clearRect(0, 0, W, H)

  const barres = Math.floor(W / 6)
  const styles = getComputedStyle(document.documentElement)
  const vif = styles.getPropertyValue('--accent').trim() || '#0d7a5f'
  for (let i = 0; i < barres; i++) {
    // Les graves portent la voix : on échantillonne le bas du spectre.
    const v = data[Math.floor((i / barres) * n * 0.55)] / 255
    const h = Math.max(2, v * v * H * 0.92)
    wctx.fillStyle = vif
    wctx.globalAlpha = 0.25 + v * 0.75
    wctx.beginPath()
    wctx.roundRect(i * 6 + 1, (H - h) / 2, 3, h, 2)
    wctx.fill()
  }
  wctx.globalAlpha = 1
  raf = requestAnimationFrame(dessinerOnde)
}

function arreterOnde() {
  cancelAnimationFrame(raf)
  analyser = null
  wctx.clearRect(0, 0, wave.width, wave.height)
  document.body.classList.remove('listening')
}

const mic = $('#mic')
let rec = null, chunks = [], audioCtx = null

async function startRec() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    rec = new MediaRecorder(stream)
    chunks = []

    try {
      audioCtx ??= new AudioContext()
      if (audioCtx.state === 'suspended') await audioCtx.resume()
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.72
      audioCtx.createMediaStreamSource(stream).connect(analyser)
      document.body.classList.add('listening')
      dessinerOnde()
    } catch (e) {
      // Pas d'onde, mais l'enregistrement doit marcher quand même.
      console.warn('[onde]', e.message)
    }
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      arreterOnde()
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunks, { type: 'audio/webm' })
      if (blob.size < 1200) return
      const step = newStep(t('chat.step.listening'))
      document.body.classList.add('busy')
      let r
      try {
        r = await fetch(`/api/voice?session=${SESSION}&ext=webm`, { method: 'POST', body: blob }).then((x) => x.json())
      } catch (e) { r = { error: e.message } }
      step.drop()
      document.body.classList.remove('busy')
      if (r.error) return say('bot', '⚠ ' + r.error, 'ask')
      showHeard(r)
      send(r.transcript)
    }
    rec.start(); mic.classList.add('on')
  } catch (e) { arreterOnde(); say('bot', '⚠ ' + t('chat.mic.unavailable', { error: e.message })) }
}
const stopRec = () => { if (rec?.state === 'recording') rec.stop(); else arreterOnde(); rec = null; mic.classList.remove('on') }

mic.addEventListener('pointerdown', (e) => { e.preventDefault(); startRec() })
mic.addEventListener('pointerup', stopRec)
mic.addEventListener('pointerleave', stopRec)

/* ── photos ──────────────────────────────────────────────────────────────── */
$('#photo').onclick = () => $('#file').click()
$('#file').onchange = async (e) => {
  for (const f of e.target.files) {
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const step = newStep(t('chat.step.photo'))
    document.body.classList.add('busy')
    let r
    try {
      r = await fetch(`/api/photo?session=${SESSION}&ext=${ext}`, { method: 'POST', body: f }).then((x) => x.json())
    } catch (err) { r = { error: err.message } }
    step.drop()
    document.body.classList.remove('busy')
    if (r.error) { say('bot', '⚠ ' + r.error, 'ask'); continue }

    const d = r.described ?? {}
    photoGrid().append(thumb(r.url, d.product || f.name))

    // What it saw, said out loud. A merchant who watches the agent describe
    // their own shirt stops wondering whether it is really looking.
    if (d.product) {
      const lines = [t('chat.photo.see', { product: d.product }), d.details].filter(Boolean)
      // « bonne » est la valeur que rend le modèle de vision quand rien ne
      // cloche : c'est une valeur comparée, elle ne se traduit pas.
      if (d.photo_quality && d.photo_quality !== 'bonne') lines.push(t('chat.photo.quality', { quality: d.photo_quality }))
      say('bot', lines.join('\n'))
      if (d.caution) say('bot', `⚠ ${d.caution}`, 'ask')
    }
  }
  e.target.value = ''
}

// Le composeur grandit avec ce qu'on écrit, comme partout ailleurs. Sans ça,
// une consigne de quatre lignes se tape dans une fente d'une ligne.
const ta = $('#text')
const pousse = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 170) + 'px' }
ta.addEventListener('input', pousse)
ta.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    const v = ta.value
    ta.value = ''
    pousse()
    send(v)
  }
})

$('#reset').onclick = async () => {
  if (!confirm(t('chat.reset.confirm'))) return
  await api('/reset', { method: 'POST' }).catch(() => {})
  forgetSession()
  location.reload()
}

/* ── restore ─────────────────────────────────────────────────────────────── */
/* ── l'accueil d'une conversation neuve ───────────────────────────────────
   Une zone de saisie vide avec « parle-moi en darija » ne dit pas ce qu'on
   peut demander. Le marchand regarde le micro et ne sait pas par où
   commencer — et la première chose qu'il tape décide s'il reste.

   Quatre cartes, pas douze : ce sont les quatre choses que l'app fait
   vraiment de bout en bout. Chacune porte UNE phrase d'exemple, et taper
   dessus l'envoie telle quelle — donc on apprend en faisant, pas en lisant
   un mode d'emploi. Les illustrations sont dessinées en SVG dans le code :
   aucune image à charger, l'écran est complet avant le premier octet du
   réseau, et ça marche sans connexion.

   L'animation est décalée carte par carte. Ce n'est pas de la décoration :
   quatre blocs qui apparaissent ensemble se lisent comme un mur, quatre qui
   arrivent l'un après l'autre se lisent comme une liste. 60 ms d'écart
   suffisent, et `prefers-reduced-motion` les supprime toutes. */
const CARTES = [
  { ic: 'grid', k: 'sell' },
  { ic: 'bolt', k: 'page' },
  { ic: 'mega', k: 'ads' },
  { ic: 'inbox', k: 'answer' },
]

/* ── LE TABLEAU DU MATIN ──────────────────────────────────────────────────
   L'app s'ouvrait sur une zone de saisie. Toutes les réponses étaient
   dedans — l'argent dans le Studio, les campagnes dans Ads, les clients
   dans Messages — mais il fallait savoir où cliquer. Un marchand qui ouvre
   son commerce le matin ne veut pas naviguer : il veut savoir ce qu'il a
   dépensé hier, ce qui tourne, ce que ça rapporte, et qui attend.

   Deux colonnes et une règle qui ne bouge pas : à gauche ce qui est COMPTÉ
   pour de vrai (les crédits, appel de modèle par appel de modèle), à droite
   ce qui est MIS EN SCÈNE (la régie publicitaire). Les additionner dans un
   même « total dépensé » serait exactement le chiffre simulé qui ressemble
   à une mesure — et ce tableau est le premier écran, donc l'endroit où la
   confusion coûterait le plus cher.

   Il est en tête de la conversation, pas en barre fixe : on le lit en
   arrivant, puis il remonte quand on parle. Une barre qui ne part jamais
   vole de la place à ce pour quoi on est venu. */
export async function tableau() {
  let b
  try { b = await api('/board') } catch { return }
  const rien = !b.simulated.campaigns && !b.real.credits_spent && !b.yesterday
  if (rien) return                       // boutique neuve : l'accueil suffit

  log.querySelector('.board')?.remove()
  const n = el('div', 'board')
  const a = b.simulated.top[0]?.analysis
  const sens = a?.trend == null ? '' : a.trend > 0 ? 'up' : 'down'

  n.innerHTML = `
    <div class="bhead">
      <span class="bt">${esc(t('chat.board.title'))}</span>
      ${b.yesterday ? `<span class="bago">${esc(t('chat.board.yesterday', {
        spend: dinars(b.yesterday.spend_dzd), orders: num(b.yesterday.orders) }))}</span>` : ''}
    </div>

    <div class="bcols">
      <div class="bcol">
        <div class="bl">${esc(t('chat.board.real'))}</div>
        <div class="bv">${num(b.real.credits_left)}<small> ${esc(t('chat.board.credits'))}</small></div>
        <div class="bs">${esc(t('chat.board.usd', { spent: b.real.usd_spent, pack: b.real.usd_pack }))}</div>
      </div>
      <div class="bcol ads">
        <div class="bl">${esc(t('chat.board.ads'))} <span class="sim">${esc(t('chat.badge.sim'))}</span></div>
        <!-- Le montant porte son unité : « DA » en dur ici affichait des
             dinars dans un écran qui parlait dollars partout ailleurs. Et un
             suffixe en petit n'a aucun sens pour une monnaie dont le symbole
             est un PRÉFIXE — « $246 » ne se coupe pas en deux. -->
        <div class="bv">${money(b.simulated.spend_dzd)}</div>
        <div class="bs">${esc(t('chat.board.orders', {
          n: num(b.simulated.orders),
          cpo: b.simulated.cost_per_order ? dinars(b.simulated.cost_per_order) : '—' }))}</div>
      </div>
    </div>

    ${b.simulated.campaigns ? `<div class="bcamps">
      ${b.simulated.top.map((c) => `
        <button class="bcamp" data-go="campaigns">
          <span class="st ${esc(c.status.toLowerCase())}"></span>
          <span class="nm">${esc(c.name)}</span>
          <span class="cp">${c.analysis?.cost_per_order ? money(c.analysis.cost_per_order) : '—'}</span>
          ${c.analysis?.trend != null ? `<span class="tr ${c.analysis.trend > 0 ? 'up' : 'down'}">${c.analysis.trend > 0 ? '+' : ''}${num(c.analysis.trend)}%</span>` : ''}
        </button>`).join('')}
    </div>` : ''}

    ${a?.verdict ? `<div class="bverdict ${esc(sens)}">${esc(t('chat.board.verdict.' + a.verdict, {
      name: b.simulated.top[0].name,
      cpo: dinars(a.cost_per_order),
      trend: Math.abs(a.trend ?? 0),
      best: a.best?.placement ?? '—', bestCost: a.best ? dinars(a.best.per_order) : '—',
      worst: a.worst?.placement ?? '—', worstCost: a.worst?.per_order ? dinars(a.worst.per_order) : '—',
    }))}</div>` : ''}

    ${a?.verdict === 'wearing' ? `<button class="btn p sm bfix" data-say="${esc(t('chat.board.fix.say', { name: b.simulated.top[0].name }))}">${esc(t('chat.board.fix'))}</button>` : ''}`

  for (const x of n.querySelectorAll('[data-go]')) x.onclick = () => go(x.dataset.go)
  for (const x of n.querySelectorAll('[data-say]')) x.onclick = () => send(x.dataset.say)
  log.prepend(n)

  /* Le navigateur ANCRE le défilement : insérer du contenu au-dessus de la
     zone visible décale `scrollTop` d'autant, pour que ce qu'on lisait ne
     bouge pas. C'est le bon comportement au milieu d'une conversation — et
     le mauvais à l'ouverture, où ça coupait le haut du tableau de 205 px
     alors que c'est justement la première chose à voir.
     Donc : on remonte, mais SEULEMENT si rien n'a encore été dit. */
  if (!log.querySelector('.msg')) log.scrollTop = 0
}

export function accueil() {
  if (log.querySelector('.hello')) return
  const h = el('div', 'hello')
  h.innerHTML = `
    <div class="horb"><span></span></div>
    <h2>${esc(t('chat.hello.title'))}</h2>
    <p>${esc(t('chat.hello.lede'))}</p>
    <div class="hgrid">
      ${CARTES.map((c, i) => `
        <button class="hcard" data-say="${esc(t(`chat.hello.${c.k}.say`))}" style="animation-delay:${60 * i}ms">
          <span class="hic">${icon(c.ic, 22)}</span>
          <b>${esc(t(`chat.hello.${c.k}.title`))}</b>
          <span class="hw">${esc(t(`chat.hello.${c.k}.what`))}</span>
          <span class="hsay">${esc(t(`chat.hello.${c.k}.say`))}</span>
        </button>`).join('')}
    </div>
    <p class="hfoot">${esc(t('chat.hello.foot'))}</p>`
  for (const b of h.querySelectorAll('[data-say]')) b.onclick = () => send(b.dataset.say)
  log.append(h)
}

export function hydrate(state) {
  const timeline = state?.timeline
  // Le tableau d'abord, dans les deux cas : c'est le premier écran, qu'il y
  // ait une conversation en cours ou pas.
  tableau()
  // Conversation neuve : on explique au lieu de laisser un écran blanc.
  if (!timeline?.length) return accueil()
  clearEmpty()
  // Only the most recent menu is still live; the earlier ones were answered.
  const lastChoices = timeline.map((e) => e.k).lastIndexOf('choices')
  timeline.forEach((e, i) => {
    try {
      if (e.k === 'me') say('me', e.text)
      else if (e.k === 'bot') say('bot', e.text)
      else if (e.k === 'ask') say('bot', e.text, 'ask')
      else if (e.k === 'heard') showHeard(e)
      else if (e.k === 'photo') photoGrid().append(thumb(e.url, e.described?.product ?? ''))
      else if (e.k === 'choices') {
        showChoices(e)
        if (i !== lastChoices) log.lastElementChild.classList.add('spent')
      } else if (e.k === 'artifact') { inline(e.name, e.result); renderArtifact(e) }
    } catch (err) { console.error('[replay]', e?.k, err) }
  })
  requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; canvas.scrollTop = canvas.scrollHeight })
}

export function mount() {
  requestAnimationFrame(() => { log.scrollTop = log.scrollHeight })
}
