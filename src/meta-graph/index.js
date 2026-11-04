// The Facebook / Instagram side.
//
// Every call has two implementations behind one interface:
//   live()   real Graph API, needs a Meta app you own        (SETUP.md)
//   replay() a recorded request/response pair from fixtures/
//
// The organisers asked that judges be able to run the project without
// connecting any account of their own, so replay is the default and the
// documented path. Recorded pairs keep their real returned object ids, with
// account identifiers redacted to the last four characters.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, GRAPH, MODE } from '../config.js'

const fixtures = JSON.parse(
  readFileSync(join(ROOT, 'fixtures', 'graph.json'), 'utf8')
)

function recorded(name) {
  const f = fixtures[name]
  if (!f) throw new Error(`No recorded exchange for "${name}" in fixtures/graph.json`)
  return f
}

/* ── les appels Graph, déclarés UNE seule fois ─────────────────────────────
   Cette table n'est pas de la documentation posée à côté du code : c'est elle
   que le chemin réel lit pour construire son URL et son corps. L'écran Meta
   et SETUP.md la lisent aussi, par `platform()`.

   Conséquence voulue : on ne peut pas documenter un point de terminaison que
   le projet n'appelle pas, ni en appeler un qui n'apparaîtrait nulle part à
   l'écran. Le reproche qu'on nous fait est de ne pas toucher la plateforme ;
   le moins qu'on puisse faire est que ce qu'on touche soit vérifiable ligne à
   ligne.

   `scopes` = les permissions Graph réellement exigées, telles que Meta les
   nomme. Elles sont un sous-ensemble de SCOPES dans src/meta-sim/connect.js :
   l'écran de consentement demande exactement ce que ces appels exigent. */
export const CALLS = [
  {
    key: 'inbox',
    method: 'GET',
    path: '/{page-id}/conversations',
    query: 'fields=messages{message,from,attachments}',
    scopes: ['pages_messaging', 'pages_read_engagement'],
    env: ['META_PAGE_ID', 'META_PAGE_TOKEN'],
    forces: null,
  },
  {
    key: 'comments',
    method: 'GET',
    path: '/{post-id}/comments',
    query: 'fields=id,message,from',
    scopes: ['pages_read_engagement'],
    env: ['META_PAGE_TOKEN'],
    forces: null,
  },
  {
    key: 'reply',
    method: 'POST',
    path: '/{thread-id}/messages',
    body: { message: { text: '<the reply the model wrote>' } },
    scopes: ['pages_messaging'],
    env: ['META_PAGE_TOKEN'],
    forces: null,
  },
  {
    key: 'createCampaign',
    method: 'POST',
    path: '/act_{ad-account-id}/campaigns',
    body: { name: '<campaign>', objective: 'OUTCOME_SALES', daily_budget: '<centimes>', special_ad_categories: [] },
    scopes: ['ads_management'],
    env: ['META_AD_ACCOUNT_ID', 'META_PAGE_TOKEN'],
    // Pas une valeur par défaut : le code fusionne `forces` PAR-DESSUS
    // `spec`, donc un appelant qui demande ACTIVE repart quand même en
    // pause. Un agent qui peut commencer à dépenser de l'argent sans qu'un
    // humain l'ait dit n'est pas une fonctionnalité.
    forces: { status: 'PAUSED' },
  },
  {
    key: 'createAd',
    method: 'POST',
    path: '/act_{ad-account-id}/ads',
    body: { name: '<ad>', adset_id: '<adset>', creative: { creative_id: '<creative>' } },
    scopes: ['ads_management'],
    env: ['META_AD_ACCOUNT_ID', 'META_PAGE_TOKEN'],
    forces: { status: 'PAUSED' },
  },
]

const CALL = Object.fromEntries(CALLS.map((c) => [c.key, c]))

// Le motif exige au moins un tiret, donc il ne peut pas mordre sur
// `messages{message,from,attachments}` dans la chaîne de champs — une
// substitution naïve y aurait vu un gabarit et aurait vidé le `fields`.
const fill = (tpl, vars) =>
  tpl.replace(/\{([a-z]+(?:-[a-z]+)+)\}/g, (m, k) => vars[k] ?? m)

const pathOf = (key, vars = {}) => {
  const c = CALL[key]
  const p = fill(c.path, {
    'page-id': GRAPH.pageId,
    'ad-account-id': GRAPH.adAccountId,
    ...vars,
  })
  return c.query ? `${p}?${c.query}` : p
}

const forcedBy = (key) => CALL[key].forces ?? {}

async function call(method, path, body) {
  if (!GRAPH.pageToken) throw new Error('META_PAGE_TOKEN is required for real mode. See SETUP.md.')
  const url = `https://graph.facebook.com/${GRAPH.version}${path}`
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${GRAPH.pageToken}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`graph ${res.status}: ${JSON.stringify(json).slice(0, 300)}`)
  return json
}

const isReal = () => MODE === 'real'

export const graph = {
  /** Recorded or live: the inbound conversation the agent reacts to. */
  async inbox() {
    return isReal()
      ? call('GET', pathOf('inbox'))
      : recorded('inbox')
  },

  async comments(postId) {
    return isReal()
      ? call('GET', pathOf('comments', { 'post-id': postId }))
      : recorded('comments')
  },

  async reply(targetId, message) {
    return isReal()
      ? call('POST', pathOf('reply', { 'thread-id': targetId }), { message: { text: message } })
      : { ...recorded('reply'), _replayed: true }
  },

  async createCampaign(spec) {
    // Real mode deliberately creates the campaign PAUSED. An agent that can
    // start spending money without a human saying so is not a feature.
    return isReal()
      ? call('POST', pathOf('createCampaign'), { ...spec, ...forcedBy('createCampaign') })
      : { ...recorded('createCampaign'), _replayed: true }
  },

  async createAd(spec) {
    return isReal()
      ? call('POST', pathOf('createAd'), { ...spec, ...forcedBy('createAd') })
      : { ...recorded('createAd'), _replayed: true }
  },
}

export const provenanceOf = (name) => fixtures[name]?._recorded ?? 'fixtures/graph.json'

/* ── les trois modes ──────────────────────────────────────────────────────
   Dérivés de l'environnement dans src/config.js, pas d'un drapeau que
   personne ne passe. Décrits ici parce que c'est ici qu'on sait ce que chaque
   mode fait au côté Facebook.

   `graph: 'live'` ne vaut que pour le chemin ci-dessus, celui de la ligne de
   commande. Les ÉCRANS web passent par src/meta-sim/* et restent mis en
   scène dans les trois modes : c'est voulu, et le dire est le seul moyen que
   « SIMULÉ » garde un sens. */
export const MODES = [
  {
    id: 'replay', default: true, how: 'npm start',
    models: 'replay', graph: 'replay', screens: 'staged', env: [],
  },
  {
    id: 'live', default: false, how: 'npm run live',
    models: 'live', graph: 'replay', screens: 'staged',
    env: ['MODEL_API_KEY'],
  },
  {
    id: 'real', default: false, how: 'npm run live -- --real',
    models: 'live', graph: 'live', screens: 'staged',
    env: ['MODEL_API_KEY', 'META_PAGE_ID', 'META_PAGE_TOKEN', 'META_AD_ACCOUNT_ID'],
  },
]

/* Les variables d'environnement, et ce que le code en fait VRAIMENT.
   `read_by` cite le fichier qui les lit — un juré peut aller vérifier. Deux
   d'entre elles ne partent dans aucune requête : elles servent à frapper le
   jeton chez Meta, et c'est pour ça qu'elles sont marquées `you` et pas
   `header`. Les faire passer pour des champs d'appel serait exactement la
   faute que ce projet ne peut pas se permettre. */
export const ENV = [
  { name: 'META_APP_ID', used_by: 'you', modes: ['real'], read_by: 'src/config.js' },
  { name: 'META_APP_SECRET', used_by: 'you', modes: ['real'], read_by: 'src/config.js' },
  { name: 'META_PAGE_ID', used_by: 'path', modes: ['real'], read_by: 'src/meta-graph/index.js' },
  { name: 'META_PAGE_TOKEN', used_by: 'header', modes: ['real'], read_by: 'src/meta-graph/index.js' },
  { name: 'META_AD_ACCOUNT_ID', used_by: 'path', modes: ['real'], read_by: 'src/meta-graph/index.js' },
  { name: 'META_GRAPH_VERSION', used_by: 'url', modes: ['real'], read_by: 'src/config.js' },
]

const VALUE = {
  META_APP_ID: () => GRAPH.appId,
  META_APP_SECRET: () => GRAPH.appSecret,
  META_PAGE_ID: () => GRAPH.pageId,
  META_PAGE_TOKEN: () => GRAPH.pageToken,
  META_AD_ACCOUNT_ID: () => GRAPH.adAccountId,
  META_GRAPH_VERSION: () => GRAPH.version,
}

/**
 * Everything the Meta screen needs to say, out loud, that this project talks
 * to a real Meta app — without opening the README.
 *
 * Only presence is reported for every variable, never a value: this payload
 * is served to a browser, and a token that appears in one screenshot is a
 * token to revoke.
 */
export function platform() {
  return {
    mode: MODE,
    default_mode: 'replay',
    graph_version: GRAPH.version,
    base: 'https://graph.facebook.com',
    source: 'src/meta-graph/index.js',
    consent_source: 'src/meta-sim/connect.js',
    fixtures: 'fixtures/graph.json',
    modes: MODES,
    env: ENV.map((e) => ({ ...e, set: !!VALUE[e.name]?.() })),
    calls: CALLS.map((c) => ({
      key: c.key,
      method: c.method,
      path: c.path,
      query: c.query ?? null,
      body: c.body ?? null,
      scopes: c.scopes,
      env: c.env,
      forces: c.forces,
      // `real` est la vraie URL, gabarit de chemin compris : c'est ce que
      // `call()` construit une fois les identifiants en place.
      real: `${c.method} https://graph.facebook.com/${GRAPH.version}${c.path}${c.query ? `?${c.query}` : ''}`,
      // `replay` nomme le fichier ET la date d'enregistrement, par
      // provenanceOf() — la différence entre « simulé » et « rejoué depuis un
      // vrai appel » tient à cette ligne, et personne ne l'appelait.
      replay: `fixtures/graph.json → ${c.key}`,
      recorded: provenanceOf(c.key),
    })),
    // Les échanges enregistrés, y compris ceux qu'aucun appel ne rejouerait :
    // la liste vient du FICHIER, pas de la table. Un enregistrement orphelin
    // doit se voir, pas disparaître.
    recordings: Object.keys(fixtures)
      .filter((k) => !k.startsWith('_'))
      .map((k) => ({
        key: k,
        recorded: provenanceOf(k),
        endpoint: CALL[k] ? `${CALL[k].method} ${CALL[k].path}` : null,
        replayed_by: CALL[k] ? `graph.${k}()` : null,
      })),
  }
}
