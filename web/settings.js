// Settings, and the honesty table.
//
// The table is the point of this screen. The hackathon rules require simulated
// parts to be labelled, and a label on each card is not enough on its own —
// someone watching a demo needs one place that says, line by line, what is a
// real model call and what is a stage set. It is also the answer to the only
// hard question a judge can ask about this project.
import { $, esc, icon, api, toast, loading } from './ui.js'
import { refresh } from './app.js'

const REAL = [
  ['Transcription des vocaux', 'muse-voice-transcribe-1.0', 'Vrai appel. Deux lectures du même clip à chaque fois — langue forcée et détection automatique — parce qu\'elles ne disent pas la même chose, et que l\'écart est là où les commandes se perdent.'],
  ['Lecture des photos', 'muse-spark-1.3 (vision)', 'Vrai appel. Il décrit le produit, critique la photo et signale ce qui ressemble à une contrefaçon.'],
  ['Texte des pages', 'muse-spark-1.3', 'Vrai appel. Le modèle écrit la copie en darija sous forme de JSON ; la mise en page est du code.'],
  ['Visuels', 'muse-image-1.0', 'Vrais appels. Créatives publicitaires, et un visuel par section de landing.'],
  ['Réponses aux clients', 'muse-spark-1.3', 'Vrai appel. La darija est écrite par le modèle, et c\'est lui qui décide s\'il a le droit de répondre.'],
  ['Pages, boutiques, visuels', 'fichiers sur le disque', 'De vrais fichiers dans out/. Ouvre-les, envoie-les, héberge-les.'],
  ['Commandes des formulaires', 'SQLite', 'De vraies lignes. Les seuls chiffres du projet que rien ne simule.'],
  ['Vérification de domaine', 'DNS', 'Vraie requête aux serveurs de noms. Le bouton « simuler la propagation » est à côté, et il est écrit.'],
]

const SIM = [
  ['Connexion Facebook', 'Le flux de consentement est mis en scène : même ordre, mêmes noms de permissions, jeton inutilisable. Un juré n\'a ni page ni compte publicitaire, et ads_management met des semaines à être approuvé.'],
  ['Business Manager, page, Instagram', 'Ressources fictives. Aucune page, aucun compte, aucun identifiant réels.'],
  ['Clients, commentaires, messages', 'Écrits pour la démonstration. Aucun vrai message de client n\'est dans ce dépôt — les conversations d\'une page sont des Platform Data, et les clients d\'un marchand n\'ont pas accepté de figurer dans une soumission de hackathon.'],
  ['Chiffres des campagnes', 'Simulation déterministe, graine fixe : la même campagne raconte toujours la même histoire, donc la vidéo est reproductible. Les Reels touchent plus par dinar et convertissent moins, le coût par résultat monte avec la fatigue.'],
  ['Mise en ligne, dépense', 'Rien n\'est envoyé à Meta. Aucun dinar ne bouge.'],
]

export async function mount(root) {
  root.innerHTML = `<div class="page">${loading('réglages')}</div>`
  const s = await api('/state')

  root.innerHTML = `<div class="page">
    <header>
      <div><h1>Réglages</h1><p>La boutique, la langue, et ce qui est réel dans ce prototype.</p></div>
    </header>

    <div class="card">
      <h3>${icon('user', 15)} La boutique</h3>
      <div class="body">
        <div class="row">
          <div><label class="f">Nom de la boutique</label>
            <input class="f" id="shop" value="${esc(s.settings?.shop ?? '')}" placeholder="Sabat Dzair"></div>
          <div style="max-width:200px"><label class="f">Langue des pages</label>
            <select class="f" id="lang">
              <option value="ar"${s.settings?.language === 'ar' ? ' selected' : ''}>Darija (arabe)</option>
              <option value="fr"${s.settings?.language === 'fr' ? ' selected' : ''}>Français</option>
            </select></div>
          <button class="btn p" id="save">enregistrer</button>
        </div>
        <div class="why">Le nom passe dans l'en-tête des pages générées et dans les réponses
          aux clients. La langue décide de celle des landings — l'agent, lui, répond toujours
          dans la langue dans laquelle on lui parle.</div>
      </div>
    </div>

    <h2 class="sec">Ce qui est réel ${'<span class="sim real">réel</span>'}</h2>
    <div class="card"><div style="overflow:auto"><table><thead><tr>
      <th>fonction</th><th>modèle / source</th><th>ce que ça veut dire</th>
    </tr></thead><tbody>
      ${REAL.map(([a, b, c]) => `<tr><td><b>${esc(a)}</b></td>
        <td><span class="chip mono">${esc(b)}</span></td><td>${esc(c)}</td></tr>`).join('')}
    </tbody></table></div></div>

    <h2 class="sec">Ce qui est simulé ${'<span class="sim">simulé</span>'}</h2>
    <div class="card"><div style="overflow:auto"><table><thead><tr>
      <th>fonction</th><th>pourquoi, et jusqu'où</th>
    </tr></thead><tbody>
      ${SIM.map(([a, b]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join('')}
    </tbody></table></div></div>

    <h2 class="sec">Cette installation</h2>
    <div class="card"><div class="body">
      <dl class="kv">
        <dt>mode</dt><dd><span class="chip mono">${esc(s.mode)}</span></dd>
        <dt>base de données</dt><dd><span class="chip mono">out/${esc(s.db ?? '')}</span> — SQLite, via <span class="chip mono">node:sqlite</span>, zéro dépendance</dd>
        <dt>IP de la plateforme</dt><dd><span class="chip mono">${esc(s.settings?.edge_ip ?? '')}</span></dd>
        <dt>tours en mémoire</dt><dd>${s.turns}</dd>
        <dt>session</dt><dd><span class="chip mono">${esc(localStorage.getItem('sawt.session') ?? '')}</span></dd>
      </dl>
      <div class="why">Tout est dans <span class="chip mono">out/</span> : la base, les pages,
        les visuels, les photos. Supprime le dossier et le projet repart de zéro.</div>
    </div></div>

    <h2 class="sec">Zone sensible</h2>
    <div class="card"><div class="body">
      <div class="row">
        <div><b>Effacer cette session</b><p style="color:var(--dim);font-size:13.5px;margin:4px 0 0">
          La conversation, les pages, les domaines, la connexion Meta et les campagnes de cette
          session. Les fichiers déjà générés restent dans <span class="chip mono">out/</span>.</p></div>
        <button class="btn danger" id="wipe">${icon('trash', 15)} effacer</button>
      </div>
    </div></div>
  </div>`

  $('#save').onclick = async () => {
    await api('/settings', { method: 'POST', body: { shop: $('#shop').value.trim(), language: $('#lang').value } })
    await refresh()
    toast('Enregistré.')
  }
  $('#wipe').onclick = async () => {
    if (!confirm('Effacer toute cette session ?')) return
    await api('/reset', { method: 'POST' })
    localStorage.removeItem('sawt.session')
    location.reload()
  }
}
