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
      ? call('GET', `/${GRAPH.pageId}/conversations?fields=messages{message,from,attachments}`)
      : recorded('inbox')
  },

  async comments(postId) {
    return isReal()
      ? call('GET', `/${postId}/comments?fields=id,message,from`)
      : recorded('comments')
  },

  async reply(targetId, message) {
    return isReal()
      ? call('POST', `/${targetId}/messages`, { message: { text: message } })
      : { ...recorded('reply'), _replayed: true }
  },

  async createCampaign(spec) {
    // Real mode deliberately creates the campaign PAUSED. An agent that can
    // start spending money without a human saying so is not a feature.
    return isReal()
      ? call('POST', `/act_${GRAPH.adAccountId}/campaigns`, { ...spec, status: 'PAUSED' })
      : { ...recorded('createCampaign'), _replayed: true }
  },

  async createAd(spec) {
    return isReal()
      ? call('POST', `/act_${GRAPH.adAccountId}/ads`, { ...spec, status: 'PAUSED' })
      : { ...recorded('createAd'), _replayed: true }
  },
}

export const provenanceOf = (name) => fixtures[name]?._recorded ?? 'fixtures/graph.json'
