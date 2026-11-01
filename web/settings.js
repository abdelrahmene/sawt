// Settings, and the honesty table.
//
// The table is the point of this screen. The hackathon rules require simulated
// parts to be labelled, and a label on each card is not enough on its own —
// someone watching a demo needs one place that says, line by line, what is a
// real model call and what is a stage set. It is also the answer to the only
// hard question a judge can ask about this project.
import { $, esc, icon, api, toast, loading } from './ui.js'
import { refresh } from './app.js'
// Les chaînes sont dans `i18n/settings.js`, trois langues par clé, l'anglais
// par défaut : c'est l'écran que le jury lira pour savoir ce qui est mesuré et
// ce qui est mis en scène, et il doit le lire dans sa langue. `num()` suit la
// langue choisie — le compteur de tours était rendu par `String()`.
import { t, num } from './i18n.js'

// Les deux tableaux portent des clés et pas du texte : ce module n'est évalué
// qu'une fois, à l'import, et la langue change après — t() doit donc être
// appelé au rendu. La colonne du milieu, elle, est un identifiant de modèle ou
// un nom de techno : elle traverse t() sans avoir d'entrée au dictionnaire, et
// le repli rend la clé telle quelle (voir i18n.js). Seule la case qui est une
// phrase — « fichiers sur le disque » — a sa propre clé.
const REAL = [
  ['settings.real.voice',   'muse-voice-transcribe-1.0', 'settings.real.voice.w'],
  ['settings.real.vision',  'muse-spark-1.3 (vision)',   'settings.real.vision.w'],
  ['settings.real.copy',    'muse-spark-1.3',            'settings.real.copy.w'],
  ['settings.real.images',  'muse-image-1.0',            'settings.real.images.w'],
  ['settings.real.replies', 'muse-spark-1.3',            'settings.real.replies.w'],
  ['settings.real.files',   'settings.real.files.src',   'settings.real.files.w'],
  ['settings.real.orders',  'SQLite',                    'settings.real.orders.w'],
  ['settings.real.dns',     'DNS',                       'settings.real.dns.w'],
]

const SIM = [
  ['settings.sim.login',   'settings.sim.login.w'],
  ['settings.sim.assets',  'settings.sim.assets.w'],
  ['settings.sim.people',  'settings.sim.people.w'],
  ['settings.sim.numbers', 'settings.sim.numbers.w'],
  ['settings.sim.spend',   'settings.sim.spend.w'],
]

// Les puces `chip mono` prises dans une phrase deviennent des variables de la
// chaîne : « out/ » et « npm run baseten » ne tombent pas à la même place en
// anglais, en darija et en français. Le DOM rendu reste le même — c'est
// seulement la phrase qui a le droit de les déplacer.
const CHIP = (s) => `<span class="chip mono">${s}</span>`

/* Le sélecteur de langue de la boutique s'appelle « set-lang ».
   La barre du haut porte déjà le nom « lang » : c'est le bouton EN/AR/FR.
   La recherche globale renvoyait donc ce bouton, dont .value vaut la chaîne
   vide — on enregistrait « language: "" » à chaque sauvegarde, sans erreur
   et sans rien dire. Les lectures de ce formulaire passent par root. */
export async function mount(root) {
  root.innerHTML = `<div class="page">${loading(t('settings.loading'))}</div>`
  const s = await api('/state')

  root.innerHTML = `<div class="page">
    <header>
      <div><h1>${esc(t('settings.title'))}</h1><p>${t('settings.lede')}</p></div>
    </header>

    <div class="card">
      <h3>${icon('user', 15)} ${t('settings.shop.card')}</h3>
      <div class="body">
        <div class="row">
          <div><label class="f">${t('settings.shop.name')}</label>
            <input class="f" id="shop" value="${esc(s.settings?.shop ?? '')}" placeholder="Sabat Dzair"></div>
          <div style="max-width:200px"><label class="f">${t('settings.shop.lang')}</label>
            <select class="f" id="set-lang">
              <option value="ar"${s.settings?.language === 'ar' ? ' selected' : ''}>${t('settings.shop.langAr')}</option>
              <option value="fr"${s.settings?.language === 'fr' ? ' selected' : ''}>${t('settings.shop.langFr')}</option>
            </select></div>
          <button class="btn p" id="save">${t('settings.shop.save')}</button>
        </div>
        <div class="why">${t('settings.shop.why')}</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3>${icon('bolt', 15)} ${t('settings.brain.card')}
        <span class="chip mono" style="margin-inline-start:auto">${esc(s.provider_model ?? '')}</span></h3>
      <div class="body">
        <div class="seg" id="prov" style="max-width:460px">
          <button data-p="meta" class="${s.provider === 'meta' ? 'on' : ''}">${
            t('settings.brain.meta', { model: 'muse-spark-1.3' })}</button>
          <button data-p="baseten" class="${s.provider === 'baseten' ? 'on' : ''}">${
            t('settings.brain.open', { model: 'Muse Spark Open' })}</button>
        </div>
        <div class="why" style="margin-top:14px">
          ${t('settings.brain.why')}
        </div>

        <h2 class="sec" style="margin-top:22px">${t('settings.open.section')}</h2>
        <div style="overflow:auto"><table><thead><tr>
          <th>${t('settings.open.th.cap')}</th><th>Muse Spark Open</th><th>${t('settings.open.th.measured')}</th>
        </tr></thead><tbody>
          <tr><td>${t('settings.open.chat')}</td><td><span class="chip ok">${t('settings.yes')}</span></td><td>${t('settings.open.chat.m')}</td></tr>
          <tr><td>${t('settings.open.darija')}</td><td><span class="chip ok">${t('settings.yes')}</span></td><td>${t('settings.open.darija.m')}</td></tr>
          <tr><td>${t('settings.open.tools')}</td><td><span class="chip ok">${t('settings.yes')}</span></td><td>${t('settings.open.tools.m')}</td></tr>
          <tr><td>${t('settings.open.vision')}</td><td><span class="chip ok">${t('settings.yes')}</span></td><td>${t('settings.open.vision.m')}</td></tr>
          <tr><td>${t('settings.open.image')}</td><td><span class="chip bad">${t('settings.no')}</span></td><td>${t('settings.open.image.m')}</td></tr>
          <tr><td>${t('settings.open.voice')}</td><td><span class="chip bad">${t('settings.no')}</span></td><td>${t('settings.open.voice.m')}</td></tr>
        </tbody></table></div>
        <div class="why warn" style="margin-top:12px">
          <b>${t('settings.open.verdict')}</b>
          ${t('settings.open.verify', { cmd: CHIP('npm run baseten') })}
        </div>
      </div>
    </div>

    <h2 class="sec">${t('settings.real.section')} <span class="sim real">${t('settings.real')}</span></h2>
    <div class="card"><div style="overflow:auto"><table><thead><tr>
      <th>${t('settings.th.fn')}</th><th>${t('settings.th.src')}</th><th>${t('settings.th.means')}</th>
    </tr></thead><tbody>
      ${REAL.map(([a, b, c]) => `<tr><td><b>${esc(t(a))}</b></td>
        <td><span class="chip mono">${esc(t(b))}</span></td><td>${esc(t(c))}</td></tr>`).join('')}
    </tbody></table></div></div>

    <h2 class="sec">${t('settings.sim.section')} <span class="sim">${t('settings.sim')}</span></h2>
    <div class="card"><div style="overflow:auto"><table><thead><tr>
      <th>${t('settings.th.fn')}</th><th>${t('settings.th.why')}</th>
    </tr></thead><tbody>
      ${SIM.map(([a, b]) => `<tr><td><b>${esc(t(a))}</b></td><td>${esc(t(b))}</td></tr>`).join('')}
    </tbody></table></div></div>

    <h2 class="sec">${t('settings.inst.section')}</h2>
    <div class="card"><div class="body">
      <dl class="kv">
        <dt>${t('settings.inst.mode')}</dt><dd><span class="chip mono">${esc(s.mode)}</span></dd>
        <dt>${t('settings.inst.brain')}</dt><dd><span class="chip mono">${esc(s.provider ?? '')}</span> — <span class="chip mono">${esc(s.provider_model ?? '')}</span></dd>
        <dt>${t('settings.inst.db')}</dt><dd>${t('settings.inst.dbValue', {
          file: CHIP(`out/${esc(s.db ?? '')}`), module: CHIP('node:sqlite') })}</dd>
        <dt>${t('settings.inst.ip')}</dt><dd><span class="chip mono">${esc(s.settings?.edge_ip ?? '')}</span></dd>
        <dt>${t('settings.inst.turns')}</dt><dd>${num(s.turns)}</dd>
        <dt>${t('settings.inst.session')}</dt><dd><span class="chip mono">${esc(localStorage.getItem('sawt.session') ?? '')}</span></dd>
      </dl>
      <div class="why">${t('settings.inst.why', { dir: CHIP('out/') })}</div>
    </div></div>

    <h2 class="sec">${t('settings.wipe.section')}</h2>
    <div class="card"><div class="body">
      <div class="row">
        <div><b>${t('settings.wipe.title')}</b><p style="color:var(--dim);font-size:13.5px;margin:4px 0 0">${
          t('settings.wipe.body', { dir: CHIP('out/') })}</p></div>
        <button class="btn danger" id="wipe">${icon('trash', 15)} ${t('settings.wipe.btn')}</button>
      </div>
    </div></div>
  </div>`

  for (const b of root.querySelectorAll('#prov button')) {
    b.onclick = async () => {
      const r = await api('/settings', { method: 'POST', body: { provider: b.dataset.p } })
      await refresh()
      toast(t('settings.brain.toast', { model: r.provider_model }))
      mount(root)
    }
  }

  $('#save').onclick = async () => {
    await api('/settings', { method: 'POST', body: { shop: $('#shop', root).value.trim(), language: $('#set-lang', root).value } })
    await refresh()
    toast(t('settings.saved'))
  }
  $('#wipe').onclick = async () => {
    if (!confirm(t('settings.wipe.confirm'))) return
    await api('/reset', { method: 'POST' })
    localStorage.removeItem('sawt.session')
    location.reload()
  }
}
