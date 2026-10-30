// The agent turn: call the model, run whatever tools it asked for, feed the
// results back, repeat until it has nothing left to call.
//
// `ask_merchant` ends the turn immediately. When the agent says a detail is
// missing, the right thing is to stop and show the question — not to keep
// reasoning around the hole.
import { chatStream, visibleAnswer } from '../models/llm.js'
import { TOOLS, SIMULATED, REAL } from './tools.js'
import { systemPrompt } from './system.js'
import { buildLandingPage, buildStorefront, buildSite } from '../creative/landing.js'
import { generate, save, headlinePrompt } from '../models/image.js'
import { configureCampaign, launchCampaign, campaignResults, adjustCampaign } from '../meta-graph/campaign-sim.js'
import { ONBOARDING } from './system.js'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { OUT_DIR } from '../creative/landing.js'

const MAX_STEPS = 6

/**
 * Every image this session has produced or been given, creatives first.
 * A generated creative is a studio shot of the product; the merchant's own
 * photo is the hanger-on-a-bedsheet it came from. Both belong on the page,
 * in that order.
 */
const isUrl = (s) => typeof s === 'string' && (s.startsWith('/out/') || s.startsWith('http'))

function assetsFor(ctx, explicit) {
  // The model answers this field with what the schema asked for — ids like
  // "0" or "photo_1" — so a non-empty list is not a usable list. Honouring it
  // blindly is why a page came back with zero <img> tags while two perfectly
  // good images sat in the session.
  const chosen = (explicit ?? []).filter(isUrl)
  if (chosen.length) return chosen

  const creatives = (ctx.creatives ?? []).map((c) => c.url ?? c).filter(isUrl)
  const photos = (ctx.photos ?? []).map((p) => p.url ?? p).filter(isUrl)
  return [...creatives, ...photos].slice(0, 6)
}

async function runTool(name, args, ctx, onEvent = () => {}) {
  switch (name) {
    case 'ask_merchant':
      return { ...args, blocking: true }

    // The model's own output, passed through. The UI turns it into buttons,
    // and the model is told the merchant tapped one on the next turn.
    case 'propose_choices':
      return args

    case 'marketing_angles':
      return args // the model's own proposal; nothing to compute

    // Minutes long: one model call per product, then one for the home page.
    // It reports each page as it lands so the screen never goes quiet.
    case 'build_site': {
      const pool = assetsFor(ctx)
      const products = (args.products ?? []).map((p, i) => ({ ...p, image: p.image || pool[i] || pool[0] || null }))
      return buildSite({ ...args, products, onProgress: (p) => onEvent({ type: 'progress', tool: 'build_site', ...p }) })
    }

    case 'generate_creatives': {
      const photos = ctx.photos ?? []
      const photo = photos[Number(args.product_image)] ?? photos.at(-1) ?? null
      // What the model saw in the photo beats what anyone typed: the creative
      // should depict the product that exists, not the one described.
      const subject = photo?.described?.product || ctx.productName || ctx.productGuess || 'the product'
      const seen = photo?.described?.details ? ` ${photo.described.details}` : ''
      const out = []
      for (const angle of (args.angles ?? ['default']).slice(0, 3)) {
        const b64 = await generate(headlinePrompt(subject + seen, angle))
        mkdirSync(OUT_DIR, { recursive: true })
        const file = `creative-${Date.now().toString(36)}-${out.length}.png`
        save(b64, join(OUT_DIR, file))
        out.push({ angle, url: `/out/${file}` })
      }
      // Kept on the session so the landing page can use them afterwards.
      ;(ctx.creatives ??= []).push(...out)
      return { creatives: out, headline_ar: args.headline_ar ?? null, subject, source_photo: photo?.url ?? null }
    }

    // The agent kept calling this with images:[] and the model then wrote a
    // beautiful page with no product on it. Whatever has actually been
    // generated or uploaded in this session is injected here, so forgetting
    // is not an option the agent has.
    case 'build_landing_page':
      return buildLandingPage({ ...args, images: assetsFor(ctx, args.images), shop: ctx.shop })

    case 'build_storefront':
      return buildStorefront(args)

    case 'configure_campaign':
      return configureCampaign(args)

    case 'launch_campaign':
      return launchCampaign(args.campaign_id, { confirmed_by_merchant: args.confirmed_by_merchant })

    case 'campaign_results':
      return campaignResults(args.campaign_id, { since_hours: args.since_hours })

    case 'adjust_campaign':
      return adjustCampaign(args.campaign_id, args)

    case 'show_meta_setup':
      return { guide: ONBOARDING, step: args.step ?? null }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

/**
 * @param {object} o
 * @param {Array} o.history   prior messages, OpenAI shape
 * @param {string} o.input    what the merchant just said (already transcribed)
 * @param {object} o.ctx      { shop, products, photos, productName }
 * @param {function} o.onEvent called with each step so the UI can stream
 */
export async function runTurn({ history = [], input, ctx = {}, onEvent = () => {} }) {
  const messages = [
    { role: 'system', content: systemPrompt(ctx) },
    ...history,
    { role: 'user', content: input },
  ]
  const artifacts = []

  for (let step = 0; step < MAX_STEPS; step++) {
    // One message id per model turn, so the UI knows which bubble the tokens
    // belong to and can grow it in place instead of appending new ones.
    const mid = `m${Date.now().toString(36)}${step}`
    onEvent({ type: 'say:start', id: mid })

    const msg = await chatStream(messages, {
      tools: TOOLS,
      onDelta: (t) => onEvent({ type: 'say:delta', id: mid, text: t }),
      onReasoning: () => onEvent({ type: 'thinking', id: mid }),
    })
    const calls = msg.tool_calls ?? []
    const text = visibleAnswer(msg)
    onEvent({ type: 'say:end', id: mid, text })

    if (!calls.length) {
      messages.push({ role: 'assistant', content: text })
      return { text, artifacts, messages: messages.slice(1) }
    }

    messages.push({ role: 'assistant', content: text || null, tool_calls: calls })

    for (const call of calls) {
      const name = call.function?.name
      let args = {}
      try { args = JSON.parse(call.function?.arguments || '{}') } catch {}

      onEvent({ type: 'tool:start', name, args, simulated: SIMULATED.has(name), real: REAL.has(name) })

      let result
      try {
        result = await runTool(name, args, ctx, onEvent)
      } catch (e) {
        result = { error: e.message }
      }

      const artifact = { name, args, result, simulated: SIMULATED.has(name), real: REAL.has(name) }
      artifacts.push(artifact)
      onEvent({ type: 'tool:end', ...artifact })

      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 6000) })

      // A missing detail stops everything. Asking beats guessing, and guessing
      // is exactly what the transcription failure would otherwise cause.
      if (name === 'ask_merchant') {
        return { text: args.question, blocked: true, missing: args.missing, artifacts, messages: messages.slice(1) }
      }
    }
  }

  return { text: 'Stopped after too many steps.', artifacts, messages: messages.slice(1) }
}
