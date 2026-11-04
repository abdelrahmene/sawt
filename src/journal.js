// Ce que l'agent a trouvé, décidé et fait — dans l'ordre, avec la raison.
//
// POURQUOI. L'app agissait beaucoup et ne racontait rien. Elle mettait une
// campagne en pause, remplaçait quatre visuels usés, répondait à sept clients,
// et l'écran suivant montrait seulement le résultat : un budget différent, une
// boîte vide. Le marchand voyait le monde avoir changé sans voir qui l'avait
// changé ni pourquoi. C'est exactement ce qu'on reproche à un pilote
// automatique — et c'est ce qui empêche de lui faire confiance.
//
// Or tout était déjà écrit. `decisions` garde l'action ET son « because »,
// `events` garde chaque artefact avec son outil et son résultat,
// `notifications` ce qui a été signalé, `thread_messages` et `post_comments`
// ce qui a été répondu par l'IA. Cinq tables pleines, zéro écran.
//
// Ce fichier n'invente rien et n'écrit rien. Il fusionne ces sources en une
// seule ligne de temps, la plus récente d'abord, et sait rendre uniquement ce
// qui est arrivé APRÈS un instant donné — c'est ce qui permet à l'écran de
// rester vivant sans tout redessiner.
//
// ⚠️ Deux règles tenues à la ligne près :
//
//   1. L'ACTION est une étiquette, la RAISON est une citation. `kind` et
//      `action` sont des codes que l'écran traduit ; `because` est rendu tel
//      quel, parce que c'est l'agent qui l'a écrit, dans la langue où il
//      parlait. Traduire après coup la phrase d'un modèle, c'est lui faire
//      dire ce qu'il n'a pas dit.
//
//   2. Le réel et le simulé ne se mélangent pas. Chaque entrée porte
//      `simulated: true/false`. Une page construite est réelle — le fichier
//      existe. Une dépense publicitaire est mise en scène. Les additionner
//      dans un « voilà ce que ça t'a coûté » serait le chiffre simulé qui
//      ressemble à une mesure.
import { all } from './db.js'

/**
 * L'instant qui représente une journée « 2026-11-04 », pour pouvoir trier.
 *
 * ⚠️ MIDI UTC, et surtout pas 23:59:59. Mesuré à l'écran le 04/11 : la
 * dépense du 4 novembre s'affichait sous un séparateur « 5 NOVEMBER », une
 * date qui n'existait pas encore. 23:59:59 UTC vaut 00:59 le lendemain à
 * Alger (UTC+1), donc le libellé du jour sautait d'une journée.
 *
 * Midi UTC tombe sur la même date du calendrier dans tous les fuseaux de
 * UTC−11 à UTC+12 : le libellé ne peut plus se tromper, où que tourne le
 * serveur. Le prix est que la ligne de dépense d'un jour se place au milieu
 * de ses événements plutôt qu'à la fin — c'est un résumé de journée entière,
 * donc c'est même plus juste.
 */
const midiDe = (jour) => Date.parse(jour + 'T12:00:00Z')

/** Un JSON de base qui peut être n'importe quoi : on ne fait jamais confiance. */
function lire(texte) {
  try { return JSON.parse(texte) } catch { return null }
}

/**
 * Un libellé est toujours une chaîne ou rien.
 *
 * Le résultat d'un outil n'a pas de forme garantie : `build_site` a renvoyé un
 * objet là où on attendait un nom de boutique, et l'écran a reçu « [object
 * Object] » — ou pire, a cassé sur un `.slice`. On coupe ici, une fois, au
 * lieu de se protéger dans chaque gabarit.
 */
function texte(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (typeof v === 'object') return texte(v.name ?? v.shop ?? v.title ?? v.product ?? v.label)
  return null
}

/**
 * Résumé court d'un artefact, sans recopier 28 Ko de HTML dans l'écran.
 *
 * On retient ce qu'un humain reconnaîtrait : le produit, le nom du fichier,
 * le nombre de visuels. Le reste du résultat reste en base pour qui veut.
 */
function resumeArtefact(nom, args, res) {
  if (!res || typeof res !== 'object') return { detail: null, href: null }
  const href = texte(res.url ?? res.href)
  switch (nom) {
    case 'build_landing_page':
      return { detail: texte(res.product ?? args?.product), href, unit: 'page' }
    case 'build_site':
    case 'build_storefront':
      return { detail: texte(res.shop ?? res.name ?? args?.shop), href, unit: 'site' }
    case 'generate_creatives':
    case 'refresh_creatives':
      return { detail: null, href, unit: 'creative', n: res.images?.length ?? res.added?.length ?? res.n ?? null }
    case 'restyle_photo':
      return { detail: texte(res.product), href, unit: 'photo' }
    case 'import_product':
      return { detail: texte(res.product ?? res.name), href, unit: 'product' }
    case 'launch_campaign':
    case 'configure_campaign':
      return { detail: texte(res.name ?? args?.name), href: null, unit: 'campaign' }
    default:
      return { detail: texte(res.product ?? res.name), href, unit: null }
  }
}

/** Le coût en crédits que la boucle a attaché à l'artefact, s'il y en a un. */
const coutDe = (e) => {
  const c = e?.cost ?? e?.result?.cost ?? null
  if (c == null) return null
  return typeof c === 'number' ? c : (c.credits ?? null)
}

/**
 * La ligne de temps d'une session.
 *
 * @param {string} sessionId
 * @param {{ since?: number, limit?: number, spendDays?: number }} opts
 *   `since`     — ne rend que ce qui est arrivé strictement après cet instant.
 *                 C'est ce que l'écran rappelle toutes les quelques secondes
 *                 pour faire arriver les choses sans tout redessiner.
 *   `spendDays` — combien de jours de dépense remonter, PAR CAMPAGNE.
 *                 Mesuré le 04/11 : à cinq jours, cinq des huit premières
 *                 lignes étaient de la dépense quotidienne et les décisions
 *                 passaient sous la ligne de flottaison. Or la dépense est
 *                 déjà sur le tableau du matin ; ici on vient lire ce qui a
 *                 été DÉCIDÉ. Deux jours suffisent à donner le contexte.
 *   `kinds`     — ne garder que ces natures d'entrée. L'écran s'en sert pour
 *                 son filtre « décisions seulement ».
 */
export function journal(sessionId, { since = 0, limit = 80, spendDays = 2, kinds = null } = {}) {
  const apres = Number(since) || 0
  const garde = kinds?.length ? new Set(kinds) : null
  const out = []

  /* ── ce qu'il a DÉCIDÉ, et pourquoi ──────────────────────────────────── */
  for (const d of all(
    `SELECT d.id, d.campaign, d.action, d.target, d.because, d.at, c.name, c.status
     FROM decisions d JOIN campaigns c ON c.id = d.campaign
     WHERE c.session = ? AND d.at > ? ORDER BY d.at DESC LIMIT ?`, sessionId, apres, limit)) {
    out.push({
      id: 'd' + d.id, at: d.at, kind: 'decision', action: d.action,
      campaign: d.campaign, campaign_name: d.name, target: d.target,
      // La phrase de l'agent, telle qu'il l'a écrite. Voir la règle 1 en tête.
      because: d.because || null,
      simulated: true,
    })
  }

  /* ── ce qu'il a CONSTRUIT ────────────────────────────────────────────── */
  for (const e of all(
    `SELECT id, json, at FROM events
     WHERE session = ? AND kind = 'artifact' AND at > ? ORDER BY at DESC LIMIT ?`,
    sessionId, apres, limit)) {
    const j = lire(e.json)
    if (!j?.name) continue
    const r = resumeArtefact(j.name, j.args, j.result)
    out.push({
      id: 'e' + e.id, at: e.at, kind: 'built', action: j.name,
      detail: r.detail, href: r.href, unit: r.unit, n: r.n ?? null,
      cost_credits: coutDe(j),
      // Un fichier écrit sur le disque est réel : on peut l'ouvrir.
      simulated: false,
    })
  }

  /* ── ce qu'il a LANCÉ ────────────────────────────────────────────────── */
  for (const c of all(
    `SELECT id, name, daily_budget_dzd, launched, status FROM campaigns
     WHERE session = ? AND launched IS NOT NULL AND launched > ? ORDER BY launched DESC`,
    sessionId, apres)) {
    out.push({
      id: 'c' + c.id, at: c.launched, kind: 'launched', action: 'launch',
      campaign: c.id, campaign_name: c.name,
      daily_budget_dzd: c.daily_budget_dzd, status: c.status,
      simulated: true,
    })
  }

  /* ── ce qu'il a RÉPONDU en privé (Messenger / Instagram) ─────────────── */
  for (const m of all(
    `SELECT m.id, m.text, m.at, m.ms, m.model, t.person, t.channel
     FROM thread_messages m JOIN threads t ON t.id = m.thread
     WHERE m.by_ai = 1 AND m.at > ?
       AND t.asset IN (SELECT id FROM meta_assets WHERE connection IN
         (SELECT id FROM meta_connections WHERE session = ?))
     ORDER BY m.at DESC LIMIT ?`, apres, sessionId, limit)) {
    out.push({
      id: 'm' + m.id, at: m.at, kind: 'answered', action: 'dm',
      person: m.person, channel: m.channel, text: m.text,
      ms: m.ms ?? null, model: m.model ?? null,
      // Le texte vient vraiment du modèle ; l'interlocuteur est mis en scène.
      simulated: false,
    })
  }

  /* ── ce qu'il a RÉPONDU en public (commentaires) ─────────────────────── */
  for (const p of all(
    `SELECT pc.id, pc.reply, pc.replied_at, pc.person, pc.text AS question, p.caption, p.id AS post
     FROM post_comments pc JOIN posts p ON p.id = pc.post
     WHERE pc.by_ai = 1 AND pc.replied_at IS NOT NULL AND pc.replied_at > ? AND p.session = ?
     ORDER BY pc.replied_at DESC LIMIT ?`, apres, sessionId, limit)) {
    out.push({
      id: 'p' + p.id, at: p.replied_at, kind: 'answered', action: 'comment',
      person: p.person, question: p.question, text: p.reply, post: p.post,
      simulated: false,
    })
  }

  /* ── ce qu'il a RENDU À L'HUMAIN parce qu'il ne pouvait pas savoir ───── */
  for (const p of all(
    `SELECT pc.id, pc.person, pc.text, pc.needs, pc.at, p.id AS post
     FROM post_comments pc JOIN posts p ON p.id = pc.post
     WHERE pc.needs IS NOT NULL AND pc.status = 'needs_merchant' AND pc.at > ? AND p.session = ?
     ORDER BY pc.at DESC LIMIT ?`, apres, sessionId, limit)) {
    out.push({
      id: 'n' + p.id, at: p.at, kind: 'handed_back', action: 'comment',
      person: p.person, question: p.text, needs: p.needs, post: p.post,
      simulated: false,
    })
  }

  /* ── ce qu'il a SIGNALÉ ──────────────────────────────────────────────── */
  for (const n of all(
    `SELECT id, kind AS sort, title, tkey, vars, body, goto, ref, at FROM notifications
     WHERE session = ? AND at > ? ORDER BY at DESC LIMIT ?`, sessionId, apres, limit)) {
    // La clé et ses paramètres passent jusqu'à l'écran, qui traduit. `title`
    // n'est que le repli des lignes écrites avant que les notifications
    // cessent d'être des phrases françaises figées.
    let vars = null
    try { vars = n.vars ? JSON.parse(n.vars) : null } catch { /* version d'avant */ }
    out.push({
      id: 'z' + n.id, at: n.at, kind: 'notified', action: n.sort,
      title: n.title, tkey: n.tkey ?? null, vars, text: n.body, goto: n.goto, ref: n.ref,
      simulated: true,
    })
  }

  /* ── ce qu'il a DÉPENSÉ, par campagne et par jour ────────────────────── */
  const jours = all(
    `SELECT i.campaign, c.name, i.day,
            SUM(i.spend_dzd) spend, SUM(i.orders) orders, SUM(i.clicks) clicks
     FROM insights i JOIN campaigns c ON c.id = i.campaign
     WHERE c.session = ? GROUP BY i.campaign, i.day ORDER BY i.day DESC`, sessionId)
  const vus = new Map()
  for (const j of jours) {
    const n = vus.get(j.campaign) ?? 0
    if (n >= spendDays) continue
    vus.set(j.campaign, n + 1)
    const at = midiDe(j.day)
    if (!Number.isFinite(at) || at <= apres) continue
    out.push({
      id: 's' + j.campaign + '-' + j.day, at, kind: 'spent', action: 'day',
      campaign: j.campaign, campaign_name: j.name, day: j.day,
      spend_dzd: j.spend, orders: j.orders, clicks: j.clicks,
      cost_per_order: j.orders ? Math.round(j.spend / j.orders) : null,
      // La dépense publicitaire est mise en scène, et le dit.
      simulated: true,
    })
  }

  out.sort((a, b) => b.at - a.at)
  return (garde ? out.filter((e) => garde.has(e.kind)) : out).slice(0, limit)
}

/** Les natures d'entrée que l'écran sait filtrer, dans l'ordre d'importance. */
export const KINDS = ['decision', 'built', 'answered', 'handed_back', 'launched', 'notified', 'spent']

/**
 * De quoi écrire une phrase d'en-tête : ce qu'il a fait pendant une fenêtre.
 *
 * Des comptes, pas des phrases — l'écran compose, pour que « 3 décisions »
 * puisse se dire en arabe sans qu'on ait écrit « 3 décisions » en français ici.
 */
export function activity(sessionId, { hours = 24 } = {}) {
  const depuis = Date.now() - hours * 3_600_000
  const lignes = journal(sessionId, { since: depuis, limit: 500, spendDays: 2 })
  const c = { decisions: 0, built: 0, answered: 0, handed_back: 0, launched: 0, notified: 0 }
  let credits = 0, spend = 0, orders = 0
  for (const e of lignes) {
    if (e.kind === 'decision') c.decisions++
    else if (e.kind === 'built') { c.built++; credits += e.cost_credits ?? 0 }
    else if (e.kind === 'answered') c.answered++
    else if (e.kind === 'handed_back') c.handed_back++
    else if (e.kind === 'launched') c.launched++
    else if (e.kind === 'notified') c.notified++
    else if (e.kind === 'spent') { spend += e.spend_dzd ?? 0; orders += e.orders ?? 0 }
  }
  return {
    hours, counts: c,
    real: { credits_spent: credits },
    simulated: { spend_dzd: spend, orders },
    // L'instant du plus récent : l'écran s'en sert comme point de reprise.
    latest: lignes[0]?.at ?? null,
  }
}
