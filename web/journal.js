// L'écran « journal » : ce que l'agent a trouvé, décidé et fait, dans l'ordre.
//
// POURQUOI CET ÉCRAN EXISTE. Tous les autres écrans montrent un ÉTAT — le
// budget actuel, la boîte actuelle, les pages actuelles. Aucun ne montrait le
// MOUVEMENT. Une campagne passait de 3 000 à 2 000 DZD et l'écran affichait
// 2 000 : vrai, et inutile. Qui a baissé ? Sur quoi ? Pourquoi maintenant ?
// Un pilote automatique qui n'explique pas ses gestes n'est pas un assistant,
// c'est une boîte noire qui dépense ton argent.
//
// Ce qu'on affiche ici était déjà en base depuis le début — `decisions` garde
// même le « because » que l'agent a écrit au moment d'agir. Il n'y avait pas
// de fonctionnalité à inventer, seulement un écran à poser dessus.
//
// DEUX PARTIS PRIS :
//
//   · La raison est CITÉE, pas traduite. L'étiquette de l'action se dit dans
//     la langue de l'écran ; la phrase de l'agent reste dans la sienne, entre
//     guillemets. C'est la phrase sur laquelle le marchand décide de lui faire
//     confiance — la réécrire après coup serait lui faire dire autre chose.
//
//   · L'écran RESTE VIVANT. Il redemande ce qui est arrivé depuis la dernière
//     entrée connue, et ne redessine que ça. Les nouvelles lignes entrent par
//     le haut avec un marqueur visible, parce qu'une chose qui apparaît sans
//     se signaler, personne ne la voit.
import { $, el, esc, icon, api, toast, loading, emptyState } from './ui.js'
import { t, num, money, lang } from './i18n.js'

/* L'état de l'écran vit ici et pas dans le DOM : le filtre et le point de
   reprise doivent survivre à un repaint, pas à un changement d'onglet. */
let filtre = 'all'
let dernier = 0          // l'instant de l'entrée la plus récente déjà affichée
let battement = null     // le minuteur du direct
let enDirect = true

const J = 86_400_000

/** Un montant, isolé en bidi — « 4 500 DZD » se lit « DZD 500 4 » sans ça. */
const sous = (n) => (n == null ? '—' : `<bdi dir="ltr">${money(n)}</bdi>`)

/** L'heure seule : la date est déjà portée par le séparateur de journée. */
const heure = (ms) =>
  new Date(ms).toLocaleTimeString(lang() === 'ar' ? 'ar-DZ' : lang() === 'fr' ? 'fr-DZ' : 'en-GB',
    { hour: '2-digit', minute: '2-digit' })

/** Aujourd'hui / hier / la date — un repère, pas un horodatage complet. */
function jourLabel(ms) {
  const d = new Date(ms), n = new Date()
  const meme = (a, b) => a.toDateString() === b.toDateString()
  if (meme(d, n)) return t('journal.day.today')
  if (meme(d, new Date(n - J))) return t('journal.day.yesterday')
  return d.toLocaleDateString(lang() === 'ar' ? 'ar-DZ' : lang() === 'fr' ? 'fr-DZ' : 'en-GB',
    { day: 'numeric', month: 'long' })
}

/* ── la phrase d'une entrée ──────────────────────────────────────────────
   Chaque nature a sa forme. On tombe sur une forme générique quand le code
   d'action est inconnu, plutôt que d'afficher une clé de dictionnaire en
   plein écran : un libellé brut vaut mieux qu'un « journal.act.xyz ». */
function phrase(e) {
  const nom = esc(e.campaign_name ?? '')
  switch (e.kind) {
    case 'decision': {
      const k = `journal.act.${e.action}`
      const s = t(k, { name: nom, action: e.action })
      return s === k ? t('journal.act.other', { name: nom, action: esc(e.action) }) : s
    }
    case 'built': {
      const what = esc(e.detail ?? '')
      if (e.unit === 'creative') return t('journal.built.creative', { n: e.n ?? 1 })
      if (e.unit && what) return t(`journal.built.${e.unit}`, { what })
      return t('journal.built.other', { action: esc(e.action) })
    }
    case 'answered':
      return t(e.action === 'comment' ? 'journal.answer.comment' : 'journal.answer.dm',
        { who: esc(e.person ?? '') })
    case 'handed_back':
      return t('journal.handed', { who: esc(e.person ?? '') })
    case 'launched':
      return t('journal.launched', { name: nom, budget: sous(e.daily_budget_dzd) })
    case 'notified':
      return t('journal.notified', { title: esc(e.title ?? '') })
    case 'spent':
      return t('journal.spent', { name: nom, spend: sous(e.spend_dzd), orders: num(e.orders ?? 0) })
    default:
      return esc(e.action ?? e.kind)
  }
}

/** La ligne secondaire : la citation, la question, le coût. */
function dessous(e) {
  const bouts = []
  if (e.because) {
    bouts.push(`<div class="jwhy"><span class="jtag">${t('journal.because')}</span>
      <q dir="auto">${esc(e.because)}</q></div>`)
  }
  if (e.kind === 'answered' && e.text) {
    const q = e.question ? `<span class="jq" dir="auto">${esc(e.question)}</span>` : ''
    bouts.push(`<div class="jwhy">${q}<q dir="auto">${esc(e.text)}</q></div>`)
  }
  if (e.kind === 'handed_back') {
    const q = e.question ? `<span class="jq" dir="auto">${esc(e.question)}</span>` : ''
    bouts.push(`<div class="jwhy">${q}<span class="jtag">${t('journal.handed.why')}</span>
      ${esc(e.needs ?? '')}</div>`)
  }
  if (e.kind === 'spent' && e.cost_per_order != null) {
    bouts.push(`<div class="jwhy">${t('journal.spent.each', { cost: sous(e.cost_per_order) })}</div>`)
  }
  return bouts.join('')
}

/* Une icône par nature : on lit la colonne avant de lire les mots. */
const ICONE = {
  decision: 'bolt', built: 'grid', answered: 'chat', handed_back: 'alert',
  launched: 'mega', notified: 'bell', spent: 'chart',
}

/** Une entrée, en un noeud. `fraiche` ajoute le marqueur d'arrivée. */
function ligne(e, fraiche = false) {
  const n = el('div', `jrow k-${e.kind}${fraiche ? ' fresh' : ''}`)
  const lien = e.href
    ? `<a class="jopen" href="${esc(e.href)}" target="_blank" rel="noopener">${t('journal.built.open')}</a>`
    : ''
  const cout = e.cost_credits
    ? `<span class="jcost">${t('journal.cost', { n: num(e.cost_credits) })}</span>`
    : ''
  // La pastille « SIMULÉ » n'est pas décorative : elle sépare ce qui a été
  // compté de ce qui a été mis en scène, sur chaque ligne, sans exception.
  const sim = e.simulated ? '<span class="sim">SIMULÉ</span>' : ''
  n.innerHTML = `
    <div class="jwhen">${heure(e.at)}</div>
    <div class="jmark">${icon(ICONE[e.kind] ?? 'check', 15)}</div>
    <div class="jbody">
      <div class="jline">${phrase(e)} ${sim} ${cout} ${lien}</div>
      ${dessous(e)}
    </div>`
  return n
}

/** Le fil, groupé par journée. */
function fil(entrees) {
  const frag = document.createDocumentFragment()
  let jour = null
  for (const e of entrees) {
    const d = new Date(e.at).toDateString()
    if (d !== jour) {
      jour = d
      frag.append(el('div', 'jday', esc(jourLabel(e.at))))
    }
    frag.append(ligne(e))
  }
  return frag
}

/* ── le direct ───────────────────────────────────────────────────────────
   On ne redemande pas tout : on demande ce qui est arrivé APRÈS la dernière
   entrée connue. Deux raisons — le réseau d'un marchand à Oran n'est pas une
   fibre, et surtout une liste entièrement redessinée perd la position de
   lecture et n'a aucun moyen de montrer ce qui vient d'arriver. */
async function battre(root) {
  // Un écran démonté ne doit pas continuer à parler au serveur. Sans ce
  // garde-fou, changer d'onglet laisse un minuteur vivant pour toujours.
  if (!root.isConnected) { arreter(); return }
  if (!enDirect) return
  let d
  try { d = await api(`/journal?since=${dernier}`) } catch { return }
  const neuves = (d.entries ?? []).filter((e) => e.at > dernier)
  if (!neuves.length) return

  const liste = $('#jr-list', root)
  if (!liste) { arreter(); return }
  dernier = neuves[0].at

  // Les nouvelles arrivent par le haut, sous le séparateur du jour courant,
  // et portent `fresh` le temps qu'on les remarque.
  const visibles = filtre === 'all' ? neuves : neuves.filter((e) => e.kind === filtre)
  for (const e of visibles.slice().reverse()) liste.prepend(ligne(e, true))
  if (visibles.length) {
    const cpt = $('#jr-new', root)
    if (cpt) {
      cpt.textContent = t('journal.new', { n: num(visibles.length) })
      cpt.classList.add('on')
      setTimeout(() => cpt.classList.remove('on'), 4000)
    }
  }
}

function arreter() {
  if (battement) { clearInterval(battement); battement = null }
}

/* ── l'écran ─────────────────────────────────────────────────────────────── */
export async function mount(root) {
  arreter()
  root.innerHTML = loading(t('journal.loading'))

  let d
  try {
    d = await api('/journal')
  } catch (e) {
    root.innerHTML = ''
    root.append(el('div', 'page', emptyState(t('journal.empty.title'), esc(e.message))))
    return
  }

  const entrees = d.entries ?? []
  const a = d.activity ?? { counts: {} }
  dernier = entrees[0]?.at ?? 0

  if (!entrees.length) {
    root.innerHTML = `<div class="page">
      <header><div><h1>${esc(t('journal.head'))}</h1><p>${t('journal.lead')}</p></div></header>
      ${emptyState(t('journal.empty.title'), t('journal.empty.body'),
        `<button class="btn p" id="jr-to-chat">${t('journal.empty.cta')}</button>`)}
    </div>`
    $('#jr-to-chat', root)?.addEventListener('click', () => { location.hash = 'chat' })
    return
  }

  const c = a.counts ?? {}
  const compte = (n, k) => (n ? `<b>${num(n)}</b> ${t(k)}` : null)
  const resume = [
    compte(c.decisions, 'journal.sum.decisions'),
    compte(c.built, 'journal.sum.built'),
    compte(c.answered, 'journal.sum.answered'),
    compte(c.handed_back, 'journal.sum.handed'),
  ].filter(Boolean).join(' · ')

  const chip = (k) =>
    `<button class="jchip${filtre === k ? ' on' : ''}" data-k="${k}">${t(`journal.filter.${k}`)}</button>`

  root.innerHTML = `<div class="page jpage">
    <header>
      <div>
        <h1>${esc(t('journal.head'))}</h1>
        <p>${t('journal.lead')}</p>
      </div>
      <div class="jlive">
        <button class="jbeat${enDirect ? ' on' : ''}" id="jr-beat">
          <span class="jpulse"></span>${t(enDirect ? 'journal.live' : 'journal.paused')}
        </button>
        <span class="jnew" id="jr-new"></span>
      </div>
    </header>
    ${resume ? `<div class="jsum">${resume} <span class="jwin">· ${t('journal.sum.window')}</span></div>` : ''}
    <div class="jchips">${['all', 'decision', 'built', 'answered', 'spent'].map(chip).join('')}</div>
    <div class="jlist" id="jr-list"></div>
  </div>`

  const liste = $('#jr-list', root)
  const peindre = () => {
    liste.innerHTML = ''
    liste.append(fil(filtre === 'all' ? entrees : entrees.filter((e) => e.kind === filtre)))
  }
  peindre()

  for (const b of root.querySelectorAll('.jchip')) {
    b.addEventListener('click', () => {
      filtre = b.dataset.k
      for (const x of root.querySelectorAll('.jchip')) x.classList.toggle('on', x === b)
      peindre()
    })
  }

  $('#jr-beat', root)?.addEventListener('click', (ev) => {
    enDirect = !enDirect
    ev.currentTarget.classList.toggle('on', enDirect)
    ev.currentTarget.lastChild.textContent = t(enDirect ? 'journal.live' : 'journal.paused')
    toast(t(enDirect ? 'journal.live' : 'journal.paused'))
  })

  // Six secondes : assez pour que les choses « arrivent » pendant une démo,
  // assez peu pour ne pas marteler un serveur local pendant une heure.
  battement = setInterval(() => battre(root), 6000)
}
