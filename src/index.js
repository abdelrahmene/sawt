// Sawt — the demo a judge runs.
//
//   npm start               replay. No key, no network, no account. Always works.
//   npm run live            Meta's models run for real; Facebook stays replayed.
//   npm run live -- --real  everything live, against a Meta app you own (SETUP.md).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, MODE, META, BASETEN, PROVIDER } from './config.js'
import { ui } from './ui.js'
import { graph, provenanceOf } from './meta-graph/index.js'
import { understand } from './models/voice.js'
import { visibleAnswer, chat } from './models/llm.js'

const session = JSON.parse(readFileSync(join(ROOT, 'fixtures', 'session.json'), 'utf8'))
const live = MODE !== 'replay'

const sleep = (ms) => new Promise((r) => setTimeout(r, live ? 0 : ms))

function keyMissing() {
  const k = PROVIDER === 'baseten' ? BASETEN.key : META.key
  return live && !k
}

async function main() {
  ui.banner(MODE)

  if (keyMissing()) {
    ui.warn(`No key for provider "${PROVIDER}". Copy .env.example to .env, or run \`npm start\`.`)
    process.exit(1)
  }

  // ── 1. The merchant speaks ────────────────────────────────────────────────
  const m = session.merchant_instruction
  ui.step(1, 'The merchant sends a voice note, in darija')
  ui.speech('merchant', m.transcript_ar, m.transcript_fr)
  await sleep(500)

  let understood = m.understood
  if (live) {
    ui.liveCall('muse-voice-transcribe-1.0 → muse-spark: intent + entities')
    understood = await understand(m.transcript_ar).catch((e) => {
      ui.warn(e.message)
      return m.understood
    })
  } else {
    ui.replayed('transcription and intent extraction', m._recorded)
  }
  ui.kv('intent', understood.intent ?? 'launch_campaign')
  ui.kv('budget/day', `${m.understood.daily_budget_dzd} DZD`)
  ui.kv('geo', m.understood.geo.join(', '))
  await sleep(600)

  // ── 2. The creative ───────────────────────────────────────────────────────
  const c = session.creative
  ui.step(2, 'muse-image generates the creative')
  if (live) ui.liveCall('muse-image-1.0 /images/generations')
  else ui.replayed(c.file, c._recorded)
  ui.note(c.prompt.slice(0, 96) + '…')
  ui.kv('headline', `${c.headline_ar}   ${c.price_overlay}`)
  ui.note(c.note)
  await sleep(600)

  // ── 3. The campaign ───────────────────────────────────────────────────────
  ui.step(3, 'The agent builds and submits the campaign')
  const campaign = await graph.createCampaign({
    name: 'Sawt · leather shoe · Oran+Alger',
    objective: 'OUTCOME_SALES',
    daily_budget: m.understood.daily_budget_dzd * 100,
    special_ad_categories: [],
  })
  if (campaign._replayed) ui.replayed(`campaign ${campaign.id}`, provenanceOf('createCampaign'))
  else ui.liveCall(`campaign ${campaign.id}`)
  ui.ok(`status ${campaign.status} — an agent does not start spending without a human.`)
  await sleep(600)

  // ── 4. Customers answer, and some of them answer with their voice ─────────
  ui.step(4, 'Customers reply — the agent sells')
  const inbox = await graph.inbox()
  ui.replayed(`${inbox.data.length} inbound messages`, provenanceOf('inbox'))

  for (const msg of inbox.data.slice(0, 2)) {
    await sleep(400)
    ui.speech(
      `${msg.from.name}${msg.kind === 'audio' ? ' 🎤' : '   '}`,
      msg.transcript_ar,
      msg.transcript_fr
    )
    const canned = session.replies[msg.id]
    if (canned) {
      for (const t of canned.tools) ui.tool(t.name, t.args, t.result)
      if (live) {
        ui.liveCall('muse-spark-1.3 composes the darija reply')
        const out = await chat([
          { role: 'system', content: 'You are a shop assistant in Algeria. Reply in Algerian darija, two sentences maximum, warm and concrete.' },
          { role: 'user', content: msg.transcript_ar },
        ]).then(visibleAnswer).catch((e) => { ui.warn(e.message); return canned.text_ar })
        ui.speech('agent   ', out, '')
      } else {
        ui.replayed('muse-spark-1.3 reply', canned._recorded)
        ui.speech('agent   ', canned.text_ar, canned.text_fr)
      }
      await graph.reply(msg.id, canned.text_ar)
    }
  }
  await sleep(600)

  // ── 5. The part nobody clicks ─────────────────────────────────────────────
  const o = session.objection_loop
  ui.step(5, 'The agent notices a pattern and acts on it')
  ui.note(`"${o.detected}" raised ${o.occurrences} times in ${o.window} — by three different people.`)
  ui.note('No human asked for anything here.')
  if (live) ui.liveCall('muse-image-1.0 /images/edits — rewrite the creative')
  else ui.replayed('creative edited to answer the objection', o._recorded)
  ui.note(o.edit_prompt.slice(0, 96) + '…')
  ui.kv('new headline', `${o.headline_ar}   (${o.headline_fr})`)
  ui.ok(`new creative live ${o.elapsed_from_first_objection} after the first objection.`)

  ui.end([
    MODE === 'replay'
      ? 'Everything above was replayed from recorded runs — nothing was live.'
      : 'Meta models ran live; the Facebook/Instagram side was replayed.',
    '',
    'npm run live    run the models for real (one API key, no Meta account)',
    'npm run bench   measure darija intent and entity accuracy',
    'SETUP.md        drive a real Page and ad account',
  ])
}

main().catch((e) => {
  console.error(`\n  ${e.message}\n`)
  process.exit(1)
})
