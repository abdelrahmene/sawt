// Loads .env without a dependency, so `npm start` needs no install at all.
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadDotEnv() {
  const path = join(ROOT, '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadDotEnv()

const argv = process.argv.slice(2)
export const flag = (name) => argv.includes(`--${name}`)
export const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`)
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}

// Three modes, deliberately explicit — see the table in the README.
//   replay : nothing is live. No key, no network. This is what `npm start` runs.
//   live   : Meta's MODELS are live, the Facebook/Instagram side stays replayed.
//   real   : everything live, against a Meta app you own. See SETUP.md.
export const MODE = flag('real') ? 'real' : flag('live') ? 'live' : 'replay'

export const PROVIDER = process.env.LLM_PROVIDER || 'meta'

export const META = {
  key: process.env.MODEL_API_KEY || '',
  base: process.env.MODEL_API_BASE || 'https://api.meta.ai/v1',
}

export const BASETEN = {
  key: process.env.BASETEN_API_KEY || '',
  base: process.env.BASETEN_API_BASE || 'https://inference.baseten.co/v1',
  // The hackathon build of Muse Spark Open. The published docs use
  // `meta-models/muse-spark-open`; this event pins the -1026 build.
  model: 'meta-models/muse-spark-open-1026',
}

export const GRAPH = {
  version: process.env.META_GRAPH_VERSION || 'v21.0',
  pageId: process.env.META_PAGE_ID || '',
  pageToken: process.env.META_PAGE_TOKEN || '',
  adAccountId: process.env.META_AD_ACCOUNT_ID || '',
}
