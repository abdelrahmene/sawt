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

const DICT = { ...shell, ...chat, ...studio, ...sites, ...campaigns, ...inbox, ...meta, ...settings, ...catalog }

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

/** Les nombres suivent la langue, les chiffres restent occidentaux même en arabe. */
export function num(n) {
  const loc = current === 'fr' ? 'fr-FR' : current === 'ar' ? 'ar-DZ-u-nu-latn' : 'en-US'
  try { return Number(n ?? 0).toLocaleString(loc).replace(/[  ]/g, ' ') } catch { return String(n ?? 0) }
}

/** Un montant en dinars, toujours lisible dans un paragraphe arabe. */
export const money = (n) => `${num(Math.round(Number(n) || 0))} DZD`

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
