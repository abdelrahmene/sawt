// The conversation, and the canvas beside it.
//
// This was the whole app once. It is now one surface of six, and what it kept
// is the part that works: a bubble that grows token by token, a chip with a
// running clock so a three-minute build does not read as a freeze, the two
// readings of every voice note side by side, and buttons instead of a blank
// prompt.
import {
  $, el, esc, isArabic, icon, money, num, api, toast, zoom, frame, thumb, SESSION, forgetSession,
} from './ui.js'
import { go, refresh } from './app.js'

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
  n.append(el('b', null, 'ce que le modèle a entendu'))
  const row = (tag, cls, txt) => {
    const r = el('div', 'row')
    r.append(el('span', `tag ${cls}`, tag), el('span', 'txt', esc(txt ?? '—')))
    return r
  }
  if (transcript_auto) n.append(row('auto', 'a', transcript_auto))
  n.append(row('ar', 'p', transcript))

  if (lostByAuto.length || lostByPinned.length) {
    const gaps = []
    if (lostByPinned.length) gaps.push(`« ar » a perdu : ${lostByPinned.join(', ')}`)
    if (lostByAuto.length) gaps.push(`« auto » a perdu : ${lostByAuto.join(', ')}`)
    n.append(el('div', 'gap', '⚠ ' + esc(gaps.join('  ·  '))))
  }
  if (understood) {
    const miss = ['size', 'quantity', 'wilaya'].filter((k) => understood[k] == null)
    n.append(el('div', 'gap', `intent = ${esc(understood.intent)}` +
      (miss.length ? `  ·  manquant : ${miss.join(', ')}` : '  ·  rien ne manque')))
  }
  log.append(n); bottom(log)
}

/* ── choices ─────────────────────────────────────────────────────────────
   Once one is used the whole set greys out: a stale menu from three turns ago
   sends the agent somewhere it has already been. */
function showChoices({ question, choices }) {
  const n = el('div', 'choices')
  if (question) {
    const q = el('div', 'q', esc(question))
    if (isArabic(question)) q.dir = 'rtl'
    n.append(q)
  }
  for (const c of choices ?? []) {
    const b = el('button', c.kind === 'primary' ? 'primary' : c.kind === 'caution' ? 'caution' : '', esc(c.label))
    if (isArabic(c.label)) b.dir = 'rtl'
    b.onclick = () => { n.classList.add('spent'); send(c.send) }
    n.append(b)
  }
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
    ...(r.home ? [{ page: r.home, label: 'accueil' }] : []),
    ...(r.pages ?? []).map((p) => ({ page: p.url, label: p.product })),
  ],
  build_storefront: (r) => (r.url ? [{ page: r.url, label: r.shop_name }] : []),
}

function inline(name, result) {
  const items = INLINE[name]?.(result ?? {}) ?? []
  if (!items.length) return
  const n = el('div', 'inline-out')
  for (const it of items.slice(0, 6)) {
    if (it.page) {
      const a = Object.assign(el('a', 'page', `${icon('ext', 13)}<span>${esc(it.label ?? 'page')}</span>`),
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
  log.append(n); bottom(log)
}

/* ── cards on the canvas ─────────────────────────────────────────────────── */
function card(title, { real, sim, note } = {}) {
  const c = el('div', 'card')
  const h = el('h3', null, esc(title))
  if (real) h.append(el('span', 'sim real', 'réel'))
  else if (sim) h.append(el('span', 'sim', 'simulé'))
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
  const body = card('Photos produit', { real: true })
  body.parentElement.classList.add('photos')
  const g = el('div', 'thumbs')
  body.append(g)
  return g
}

// One malformed artifact must not take the screen down with it. Replaying a
// conversation means replaying data written by older code, and the first time
// that happened the whole app rendered blank on a single undefined field.
function renderArtifact(a) {
  try { return renderArtifactInner(a) } catch (e) {
    console.error('[artifact]', a?.name, e)
    const b = card(a?.name ?? 'artefact', {})
    b.append(el('div', 'why warn',
      `Cet élément vient d'une version précédente et ne s'affiche plus tel quel.<br>
       <span style="color:var(--dim)">${esc(e.message)}</span>`))
    if (a?.result?.url) {
      b.append(Object.assign(el('a', null, 'ouvrir quand même ↗'),
        { href: a.result.url, target: '_blank', rel: 'noopener' }))
    }
  }
}

function renderArtifactInner({ name, args, result, simulated, real }) {
  if (result?.error) {
    const b = card(name, {})
    b.append(el('div', 'why bad', esc(result.error)))
    if (result.needs === 'connect_meta') {
      const btn = el('button', 'btn p', `${icon('link', 15)} Connecter Facebook`)
      btn.onclick = () => go('meta')
      b.append(el('div', null, '').appendChild(btn).parentElement)
    }
    return
  }

  if (name === 'marketing_angles') {
    const b = card('Angles marketing')
    for (const a of result.angles ?? []) {
      b.append(el('div', 'why', `<b>${esc(a.name)}</b><br>${esc(a.claim)}<br><span style="color:var(--dim)">${esc(a.visual)}</span>`))
    }
    return
  }

  if (name === 'restyle_photo') {
    const b = card(`Photo refaite — ${result.product ?? ''}`, { real: true })
    const g = el('div', 'thumbs')
    if (result.source_photo) g.append(thumb(result.source_photo, 'ta photo'))
    if (result.isolated?.url) g.append(thumb(result.isolated.url, `détouré · sam-3.1`))
    for (const p of result.photos ?? []) g.append(thumb(p.url, p.look))
    b.append(g)
    if (result.note) b.append(el('div', 'why', esc(result.note)))
    // L'avertissement de marque passe avant tout le reste : c'est le compte
    // publicitaire du marchand qui est en jeu.
    if (result.brand_risk) {
      b.append(el('div', 'why warn',
        `<b>Marque visible sur la photo.</b><br>${esc(result.brand_risk.seen)}<br>` +
        `<span style="color:var(--dim)">Le rendu ne la rend pas plus lisible que sur ton original — mais une pub Meta avec un logo sans autorisation ferme le compte.</span>`))
    }
    return
  }

  if (name === 'generate_creatives') {
    const b = card('Créatives', { real: true })
    const g = el('div', 'thumbs')
    for (const c of result.creatives ?? []) g.append(thumb(c.url, c.angle))
    b.append(g)
    if (result.subject) b.append(el('div', 'why', `d'après ce qu'il a vu : <b>${esc(result.subject)}</b>`))
    // Le détourage est la partie que le marchand ne devine pas tout seul :
    // on lui dit quelle part de SA photo était du décor.
    const iso = result.isolated
    if (iso?.url) {
      const d = el('div', 'why')
      d.innerHTML = `<b>sam-3.1</b> a détouré le produit avant de dessiner — ${esc(iso.gain ?? '')}.<br>` +
        `<span style="color:var(--dim)">${esc(iso.from)}</span>`
      const im = Object.assign(new Image(), { src: iso.url, className: 'inline-img', loading: 'lazy' })
      im.onclick = () => zoom(iso.url, 'produit détouré')
      d.append(im)
      b.append(d)
    } else if (iso?.failed) {
      b.append(el('div', 'why warn', `<b>sam-3.1</b> n'a pas pu détourer : ${esc(iso.failed)}.<br>${esc(iso.from)}`))
    }
    if (result.headline_ar) b.append(el('div', 'why', `titre incrusté : <b dir="rtl">${esc(result.headline_ar)}</b>`))
    return
  }

  if (name === 'build_site') {
    const b = card(`Site — ${result.shop_name}`, { real: true })
    if (result.home) b.append(frame(result.home))
    const list = el('div', 'plist')
    if (result.home) {
      list.append(Object.assign(el('a', null, `<span>accueil</span><span class="px">${result.count} produits</span>`),
        { href: result.home, target: '_blank' }))
    }
    for (const p of result.pages ?? []) {
      list.append(Object.assign(
        el('a', null, `<span>${esc(p.product)}</span><span class="px">${money(p.price_dzd)}</span>`),
        { href: p.url, target: '_blank' }))
    }
    b.append(el('div', 'why', result.host
      ? `En ligne sur <b>${esc(result.host)}</b> — chaque page est un vrai fichier. Clique pour l'ouvrir.`
      : "Chaque page est un vrai fichier. Clique pour l'ouvrir."), list)
    for (const f of result.failed ?? []) b.append(el('div', 'why bad', `${esc(f.product)} : ${esc(f.error)}`))
    const btn = el('button', 'btn sm', `${icon('globe', 14)} gérer le domaine`)
    btn.onclick = () => go('sites')
    b.append(el('div', null).appendChild(btn).parentElement)
    return
  }

  if (name === 'build_landing_page' || name === 'build_storefront') {
    const b = card(name === 'build_storefront' ? `Vitrine — ${result.shop_name}` : `Landing — ${result.product}`, { real: true })
    b.append(frame(result.url, true))
    const bits = [`${Math.round(result.bytes / 1024)} Ko`]
    if (result.scenes?.length) bits.push(`${result.scenes.length} visuel(s) de section générés par muse-image`)
    if (result.sections) {
      const s = result.sections
      bits.push(`${s.benefits} bénéfices · ${s.features} détails · ${s.steps} étapes · ${s.faq} FAQ`)
    }
    b.append(el('div', 'why', `Texte écrit par muse-spark, visuels par muse-image, mise en page par le code.<br>${esc(bits.join(' · '))}`))
    for (const f of result.scenes_failed ?? []) {
      b.append(el('div', 'why warn', `visuel « ${esc(f.slot)} » non généré : ${esc(f.error)} — la section reste sans image.`))
    }
    return
  }

  if (name === 'connect_meta') {
    const b = card('Connexion Facebook', { sim: true })
    b.append(el('div', 'why warn', esc(result.because ?? '') + '<br><b>' + esc(result.note) + '</b>'))
    const btn = el('button', 'btn fb', `${icon('link', 15)} ${result.already ? 'déjà connecté — voir' : 'Continuer avec Facebook'}`)
    btn.onclick = () => go('meta')
    b.append(btn)
    return
  }

  if (name === 'read_inbox') {
    const b = card(`Boîte de réception — ${result.count} en attente`, { sim: true })
    if (!result.threads?.length) { b.append(el('div', 'why', 'Personne n\'attend.')); return }
    const t = el('table', null, '<tr><th>client</th><th>canal</th><th>a demandé</th><th class="num">il y a</th></tr>')
    for (const x of result.threads) {
      const tr = el('tr', x.status === 'needs_merchant' ? 'worst' : '')
      tr.innerHTML = `<td>${esc(x.person)}</td><td>${esc(x.channel)}</td>` +
        `<td dir="rtl" style="font-family:var(--arabic)">${esc(String(x.asked ?? '').slice(0, 70))}</td>` +
        `<td class="num">${x.minutes_ago} min</td>`
      t.append(tr)
    }
    b.append(t)
    const btn = el('button', 'btn sm', `${icon('inbox', 14)} ouvrir la boîte`)
    btn.onclick = () => go('inbox')
    b.append(el('div', null).appendChild(btn).parentElement)
    return
  }

  // The refusals are the point, so they get the loudest treatment on screen.
  if (name === 'answer_inbox') {
    const b = card(`Réponses clients — ${result.summary ?? ''}`, { note: 'réponse réelle · page simulée' })
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
      d.innerHTML = `<b>${esc(e.person ?? '#' + e.id)}</b> — <b>pas répondu, et c'est voulu</b><br>` +
        (e.asked ? `<span dir="rtl" style="font-family:var(--arabic);color:#6e4104">${esc(e.asked)}</span><br>` : '') +
        (e.need_from_merchant ? `il lui faut de toi : <b>${esc(e.need_from_merchant)}</b>` : esc(e.error ?? ''))
      b.append(d)
    }
    if (result.note) b.append(el('div', 'why', esc(result.note)))
    const btn = el('button', 'btn sm', `${icon('inbox', 14)} voir les conversations`)
    btn.onclick = () => go('inbox')
    b.append(el('div', null).appendChild(btn).parentElement)
    return
  }

  if (name === 'configure_campaign') {
    const b = card(`Campagne — ${result.name}`, { sim: true })
    const dl = el('dl', 'kv')
    const put = (k, v) => dl.append(el('dt', null, k), el('dd', null, v))
    put('id', `#${result.id} · ${esc(result.ext_id ?? '')}`)
    put('objectif', esc(result.objective))
    put('budget / jour', money(result.daily_budget_dzd))
    put('ciblage', `${esc(result.geo.join(', '))} · ${result.age_min}-${result.age_max} ans · ${esc(result.genders)}`)
    put('placements', esc(result.placements.join(', ')))
    put('créatives', String(result.ads?.length ?? 0))
    put('statut', esc(result.status))
    b.append(dl)
    // Two shapes have existed: the old single {endpoint, body} and the
    // current {campaign, adset}. A conversation saved before the change must
    // still replay — a screen that blanks because of last week's data is a
    // screen nobody trusts with this week's.
    const ap = result.api_payload ?? {}
    const parts = ap.campaign ? [ap.campaign, ap.adset].filter(Boolean) : ap.endpoint ? [ap] : []
    if (parts.length) {
      b.append(el('div', 'why', 'La requête exacte que recevrait la Marketing API :'))
      b.append(el('pre', null, esc(parts.map((x) => `${x.endpoint}\n${JSON.stringify(x.body, null, 2)}`).join('\n\n'))))
    }
    const btn = el('button', 'btn sm', `${icon('chart', 14)} voir dans Pubs`)
    btn.onclick = () => go('campaigns')
    b.append(el('div', null).appendChild(btn).parentElement)
    return
  }

  if (name === 'launch_campaign') {
    const b = card('Lancement', { sim: true })
    b.append(el('div', result.refused ? 'why warn' : 'why', result.refused
      ? `<b>refusé</b> — ${esc(result.reason)}`
      : `<b>ACTIVE</b> · aucune dépense réelle, rien n'est parti chez Meta.`))
    return
  }

  if (name === 'simulate_days' || name === 'campaign_results') {
    const b = card(`Résultats — ${result.days ?? 0} jour(s)`, { sim: true })
    if (!result.rows?.length) { b.append(el('div', 'why', esc(result.note ?? 'rien à lire'))); return }
    const t = result.totals
    const k = el('div', 'kpis')
    k.innerHTML =
      `<div class="kpi"><div class="l">dépensé</div><div class="v">${money(t.spend_dzd)}</div></div>` +
      `<div class="kpi"><div class="l">commandes</div><div class="v">${t.orders}</div></div>` +
      `<div class="kpi"><div class="l">coût / commande</div><div class="v">${money(t.cost_per_order_dzd)}</div></div>` +
      `<div class="kpi"><div class="l">clics</div><div class="v">${num(t.clicks)}</div></div>`
    b.append(k)

    const tbl = el('table', null,
      '<tr><th>créative</th><th>placement</th><th class="num">dépense</th><th class="num">clics</th><th class="num">cmd</th><th class="num">coût/cmd</th></tr>')
    result.rows.forEach((r, i) => {
      const tr = el('tr', (i === 0 ? 'best ' : i === result.rows.length - 1 ? 'worst ' : '') + (r.status === 'PAUSED' ? 'off' : ''))
      tr.innerHTML = `<td>${esc(r.angle ?? r.ad_ext)}</td><td>${esc(r.placement_label)}</td>` +
        `<td class="num">${money(r.spend_dzd)}</td><td class="num">${num(r.clicks)}</td>` +
        `<td class="num">${r.orders}</td><td class="num">${money(r.cost_per_order_dzd)}</td>`
      tbl.append(tr)
    })
    b.append(el('div', 'why', `<b>${esc(result.note)}</b>`), tbl)
    return
  }

  if (name === 'adjust_campaign') {
    const b = card('Décision', { sim: true })
    b.append(el('div', 'why', `<b>${esc(result.applied.action)}</b>${result.applied.target ? ' → ' + esc(result.applied.target) : ''}<br>${esc(result.applied.because)}`))
    return
  }

  if (name === 'add_domain') {
    const b = card(`Domaine — ${result.host}`, { real: true })
    b.append(el('div', 'why', `statut : <b>${esc(result.status)}</b> — ${esc(result.state_label ?? '')}`))
    if (result.records?.length) {
      const d = el('div', 'dns')
      for (const r of result.records) {
        d.innerHTML += `<div class="rec"><span class="ty">${esc(r.type)}</span><span>${esc(r.name)}</span><span>${esc(r.value)}</span></div>`
      }
      b.append(el('div', 'why', 'À ajouter chez ton registrar. La vérification ensuite est une vraie requête DNS.'), d)
    }
    const btn = el('button', 'btn sm', `${icon('globe', 14)} gérer les domaines`)
    btn.onclick = () => go('sites')
    b.append(el('div', null).appendChild(btn).parentElement)
    return
  }

  if (name === 'show_meta_setup') {
    const b = card('Connecter ta propre app Meta')
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
const LABEL = {
  build_site: 'construit le site', build_landing_page: 'écrit la page',
  generate_creatives: 'dessine les visuels', marketing_angles: 'cherche les angles',
  configure_campaign: 'prépare la campagne', launch_campaign: 'lance la campagne',
  campaign_results: 'lit les résultats', adjust_campaign: 'décide',
  simulate_days: 'avance les jours', read_inbox: 'lit la boîte',
  answer_inbox: 'répond aux clients', connect_meta: 'ouvre la connexion',
  add_domain: 'attache le domaine', show_meta_setup: 'prépare la marche à suivre',
  propose_choices: '', ask_merchant: '',
}
const PHASE = { copy: 'texte', scenes: 'visuels', scene: 'visuel', page: 'page', home: 'accueil' }

function newStep(label) {
  const n = el('div', 'step')
  const txt = el('span', null, label)
  const sub = el('span', 'sub')
  const t = el('span', 't', '0s')
  n.append(el('span', 'spin'), txt, sub, t)
  const t0 = Date.now()
  const tick = setInterval(() => { t.textContent = Math.round((Date.now() - t0) / 1000) + 's' }, 1000)
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

  let step = newStep('réfléchit')
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
          if (l) { step.label(l); step.sub('') }
          continue
        }
        if (e.type === 'progress') {
          const ph = PHASE[e.phase] ?? e.phase ?? ''
          step.sub([e.step && e.total ? `${e.step}/${e.total}` : '', ph, e.label ?? ''].filter(Boolean).join(' '))
          continue
        }
        if (e.type === 'tool:end') {
          if (e.name === 'ask_merchant') { step.drop(); say('bot', e.result.question, 'ask'); step = newStep('réfléchit') }
          else if (e.name === 'propose_choices') showChoices(e.result)
          else {
            step.done(); inline(e.name, e.result); renderArtifact(e); step = newStep('réfléchit')
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
    n.innerHTML = `<b>Connexion au serveur perdue.</b> Ce n'est pas l'agent : rien n'a été perdu, ` +
      `la conversation est en base. Relance <code>npm start</code> puis réessaie.` +
      `<br><span style="opacity:.7">${esc(err.message)}</span>`
    const b = el('button', 'btn sm', 'réessayer')
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
      const step = newStep('écoute')
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
  } catch (e) { arreterOnde(); say('bot', '⚠ micro indisponible : ' + e.message) }
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
    const step = newStep('regarde la photo')
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
      const lines = [`Je vois : ${d.product}.`, d.details].filter(Boolean)
      if (d.photo_quality && d.photo_quality !== 'bonne') lines.push(`Photo : ${d.photo_quality}`)
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
  if (!confirm('Effacer cette conversation et repartir de zéro ?')) return
  await api('/reset', { method: 'POST' }).catch(() => {})
  forgetSession()
  location.reload()
}

/* ── restore ─────────────────────────────────────────────────────────────── */
export function hydrate(state) {
  const timeline = state?.timeline
  if (!timeline?.length) return
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
