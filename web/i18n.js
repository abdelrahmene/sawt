// Trois langues, zéro dépendance, et l'anglais par défaut.
//
// Jusqu'ici il n'y avait aucune couche de langue : ~280 chaînes françaises
// écrites en dur dans des gabarits, `<html lang="fr">` sans `dir`, et un
// réglage « Langue des pages » qui écrivait `sessions.language` que RIEN ne
// relisait. Le jury du hackathon est anglophone, le marchand parle darija —
// les deux doivent pouvoir lire le même écran.
//
// Le dictionnaire est découpé par écran (`i18n/*.js`) pour une raison bête
// mais décisive : un seul gros fichier se fait réécrire par tout le monde en
// même temps. Clé d'abord, langues à l'intérieur — c'est la seule disposition
// où une traduction manquante se voit à l'œil nu.
import { shell } from './i18n/shell.js'
import { chat } from './i18n/chat.js'
import { studio } from './i18n/studio.js'
import { sites } from './i18n/sites.js'
import { campaigns } from './i18n/campaigns.js'
import { inbox } from './i18n/inbox.js'
import { meta } from './i18n/meta.js'
import { settings } from './i18n/settings.js'
import { catalog } from './i18n/catalog.js'
import { journal } from './i18n/journal.js'

const DICT = { ...shell, ...chat, ...studio, ...sites, ...campaigns, ...inbox, ...meta, ...settings, ...catalog, ...journal }

/** Ce que le sélecteur propose. `ar` est de la darija algérienne, pas de l'arabe littéraire. */
export const LANGS = [
  { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'ar', label: 'Darija', native: 'الدارجة', dir: 'rtl' },
  { code: 'fr', label: 'Français', native: 'Français', dir: 'ltr' },
]

const KNOWN = new Set(LANGS.map((l) => l.code))
const STORE = 'sawt.lang'

// Anglais par défaut, et assumé : la démonstration se joue devant Meta. Le
// marchand bascule en darija en deux touches, et son choix survit au rechargement.
let current = 'en'
try {
  const saved = localStorage.getItem(STORE)
  if (saved && KNOWN.has(saved)) current = saved
} catch {}

export const lang = () => current
export const dirOf = (code = current) => (code === 'ar' ? 'rtl' : 'ltr')
export const isRTL = () => dirOf() === 'rtl'

/**
 * La chaîne, dans la langue du moment.
 *
 * Replis en cascade : langue courante → anglais → la clé elle-même. On rend la
 * CLÉ et pas une chaîne vide, parce qu'un trou visible se corrige et qu'un
 * blanc passe inaperçu jusqu'à la démonstration.
 */
export function t(key, vars) {
  const row = DICT[key]
  let s = row ? (row[current] ?? row.en ?? key) : key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

/**
 * Une chaîne déjà traduite, venue d'ailleurs.
 *
 * Le serveur envoie certains libellés sous la forme `{en, ar, fr}` — ceux du
 * Studio, qui décrivent des réglages définis côté serveur et n'ont donc pas
 * de clé dans ce dictionnaire. On prend la langue du moment, et une chaîne
 * simple passe telle quelle : les appelants n'ont pas à savoir laquelle des
 * deux formes ils tiennent.
 */
export const pick = (v) =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v[current] ?? v.en ?? v.fr ?? '') : (v ?? '')

/** Les nombres suivent la langue, les chiffres restent occidentaux même en arabe. */
export function num(n) {
  const loc = current === 'fr' ? 'fr-FR' : current === 'ar' ? 'ar-DZ-u-nu-latn' : 'en-US'
  try { return Number(n ?? 0).toLocaleString(loc).replace(/[  ]/g, ' ') } catch { return String(n ?? 0) }
}

/* ── la monnaie ───────────────────────────────────────────────────────────
   POURQUOI. Tout est compté en dinars, parce que c'est la monnaie dans
   laquelle ce commerce se fait. Mais la thèse du projet n'est pas algérienne,
   et quelqu'un qui ne sait pas ce que vaut un dinar ne peut rien faire de
   « 1 804 DZD par commande » : il ne peut pas dire si c'est cher.

   Donc la monnaie suit la LANGUE de l'écran — dinars en darija et en
   français, dollars en anglais — et peut être forcée dans les réglages.

   ⚠️ Et le taux est ÉCRIT, partout où une conversion s'affiche. Un montant
   converti en silence est un chiffre inventé qui a l'air d'une mesure, ce que
   ce projet s'interdit ailleurs ligne par ligne ; il n'y a pas de raison de
   se l'autoriser ici. La valeur de référence reste le dinar : c'est lui qui
   est en base, lui qui est juste, et le dollar n'en est qu'une lecture. */

/* Taux officiel de la Banque d'Algérie, arrondi, figé au 4 novembre 2026.
   Figé et non récupéré en ligne, pour deux raisons : l'app doit tourner sans
   réseau, et un taux qui bouge rendrait deux captures d'écran du même écran
   incomparables. Le marché parallèle est sensiblement plus haut — c'est une
   lecture, pas la vérité du marchand. */
export const RATE_DZD_PER_USD = 135
export const rateLabel = () => `${num(RATE_DZD_PER_USD)} DZD = $1`

const CUR_STORE = 'sawt.currency'
let devise = null
try { devise = localStorage.getItem(CUR_STORE) } catch {}

/** La monnaie d'affichage : celle qu'on a choisie, sinon celle de la langue. */
export const currency = () => devise ?? (current === 'en' ? 'usd' : 'dzd')

export function setCurrency(code) {
  devise = code === 'auto' ? null : code === 'usd' ? 'usd' : 'dzd'
  try {
    if (devise) localStorage.setItem(CUR_STORE, devise)
    else localStorage.removeItem(CUR_STORE)
  } catch {}
  for (const fn of listeners) { try { fn(current) } catch (e) { console.error('[i18n]', e) } }
  return currency()
}

/**
 * Un montant, toujours lisible dans un paragraphe arabe.
 *
 * L'entrée est TOUJOURS en dinars — c'est l'unité de la base. `force` sert aux
 * rares endroits qui doivent dire une monnaie précise quoi qu'il arrive, comme
 * le prix du paquet de crédits, qui est en dollars parce qu'il a été payé en
 * dollars.
 */
export function money(n, { force = null } = {}) {
  const v = Math.round(Number(n) || 0)
  if ((force ?? currency()) !== 'usd') return `${num(v)} DZD`
  const usd = v / RATE_DZD_PER_USD
  // Sous cent dollars on garde deux décimales : entre « $13 » et « $13.36 »,
  // le second dit si une commande à 1 800 DZD est au-dessus ou au-dessous
  // d'un seuil que le lecteur a en tête. Au-dessus, la précision est du bruit.
  return `$${usd >= 100 ? num(Math.round(usd)) : usd.toFixed(2)}`
}

const listeners = new Set()
/** Les écrans s'inscrivent ici pour se redessiner quand la langue change. */
export const onLang = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

export function setLang(code) {
  if (!KNOWN.has(code) || code === current) return current
  current = code
  try { localStorage.setItem(STORE, code) } catch {}
  applyDocument()
  for (const fn of listeners) { try { fn(code) } catch (e) { console.error('[i18n]', e) } }
  return current
}

/**
 * La racine du document porte la langue et le sens de lecture.
 *
 * Toute la feuille de style est déjà écrite en propriétés logiques
 * (`margin-inline`, `padding-block`, `inset-inline-start`), donc basculer
 * `dir` sur <html> retourne l'interface entière sans une ligne de CSS en plus.
 *
 * Les deux chaînes coincées dans des `content:` CSS — que JavaScript ne peut
 * pas atteindre — sont injectées ici en variables personnalisées, sinon elles
 * restent en français sur un écran par ailleurs anglais.
 */
export function applyDocument() {
  const r = document.documentElement
  r.lang = current
  r.dir = dirOf()
  r.dataset.lang = current
  r.style.setProperty('--s-missing', JSON.stringify(t('shell.css.missing')))
  r.style.setProperty('--s-publishing', JSON.stringify(t('shell.css.publishing')))
}

applyDocument()
