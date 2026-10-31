// The agent turn: call the model, run whatever tools it asked for, feed the
// results back, repeat until it has nothing left to call.
//
// `ask_merchant` ends the turn immediately. When the agent says a detail is
// missing, the right thing is to stop and show the question — not to keep
// reasoning around the hole.
import { chatStream, visibleAnswer } from '../models/llm.js'
import { TOOLS, SIMULATED, REAL } from './tools.js'
import { systemPrompt, ONBOARDING } from './system.js'
import { briefing } from './briefing.js'
import { buildLandingPage, buildStorefront, buildSite } from '../creative/landing.js'
import { generate, save, headlinePrompt } from '../models/image.js'
import * as camp from '../meta-sim/campaigns.js'
import { connection } from '../meta-sim/connect.js'
import { threads, thread, draftReply, sendReply, shopFacts } from '../meta-sim/inbox.js'
import { addDomain } from '../sites.js'
import { setting } from '../db.js'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { OUT_DIR } from '../creative/landing.js'

// Six was too few once the agent had state to act on: reading the inbox,
// answering it, and then proposing what to do next is three calls before it
// has built anything.
const MAX_STEPS = 9

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
      return buildSite({
        ...args, products, sessionId: ctx.sessionId,
        options: { ...(setting(`landing:${ctx.sessionId}`) ?? {}), photos: [] },
        onProgress: (p) => onEvent({ type: 'progress', tool: 'build_site', ...p }),
      })
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
    // The studio's settings are the merchant's settings. A page the agent
    // builds on its own has to come out looking like the ones they tuned by
    // hand, or the two halves of the product disagree about what their shop
    // looks like.
    case 'build_landing_page':
      return buildLandingPage({
        ...args, images: assetsFor(ctx, args.images), shop: ctx.shop,
        sessionId: ctx.sessionId,
        options: { ...(setting(`landing:${ctx.sessionId}`) ?? {}), photos: [] },
        onProgress: (p) => onEvent({ type: 'progress', tool: 'build_landing_page', ...p }),
      })

    case 'build_storefront':
      return buildStorefront(args)

    /* ── campaigns, now rows rather than a closure ───────────────────────── */
    case 'configure_campaign':
      return camp.configure(ctx.sessionId, {
        ...args,
        creatives: (ctx.creatives ?? []).map((c) => ({ angle: c.angle, url: c.url })),
        headline_ar: args.headline_ar,
      })

    case 'launch_campaign':
      return camp.launch(Number(args.campaign_id), { confirmed_by_merchant: args.confirmed_by_merchant })

    case 'campaign_results':
      return camp.results(Number(args.campaign_id))

    case 'simulate_days':
      return camp.advance(Number(args.campaign_id), Math.max(1, Math.min(7, Number(args.days) || 1)))

    case 'adjust_campaign':
      return camp.decide(Number(args.campaign_id), args)

    /* ── the Facebook side ───────────────────────────────────────────────── */
    // Returning `open` is how a tool asks the SCREEN to do something. The
    // consent flow cannot be completed by the agent — that is the entire
    // point of consent — so it opens the dialog and the turn ends.
    case 'connect_meta': {
      const c = connection(ctx.sessionId)
      return {
        open: 'meta_login',
        already: c.status === 'connected',
        status: c.status,
        because: args.because,
        note: 'Flux de connexion SIMULÉ : aucune vraie app Meta, aucun vrai compte, aucun jeton utilisable.',
      }
    }

    case 'read_inbox': {
      const c = connection(ctx.sessionId)
      if (c.status !== 'connected') return { error: 'Meta n\'est pas connecté — il n\'y a pas de boîte de réception.', needs: 'connect_meta' }
      const want = args.status ?? 'open'
      const rows = c.assets.filter((a) => a.kind === 'page' || a.kind === 'instagram')
        .flatMap((a) => threads(a.id).map((t) => ({ ...t, asset_name: a.name })))
        .filter((t) => want === 'all' || t.status === want)
        .sort((x, y) => y.last_at - x.last_at)
      return {
        count: rows.length,
        threads: rows.slice(0, 12).map((t) => ({
          id: t.id, channel: t.channel, person: t.person, status: t.status,
          asked: t.last_text, needs_from_merchant: t.subject ?? null,
          minutes_ago: Math.round((Date.now() - t.last_at) / 60000),
        })),
      }
    }

    // The interesting one. Each thread gets its own model call, each decides
    // for itself whether it may answer, and the ones that may not are the
    // result worth showing.
    case 'answer_inbox': {
      const c = connection(ctx.sessionId)
      if (c.status !== 'connected') return { error: 'Meta n\'est pas connecté.', needs: 'connect_meta' }

      let ids = (args.thread_ids ?? []).map(Number).filter(Boolean)
      if (!ids.length) {
        ids = c.assets.filter((a) => a.kind === 'page' || a.kind === 'instagram')
          .flatMap((a) => threads(a.id)).filter((t) => t.status === 'open')
          .sort((x, y) => y.last_at - x.last_at).slice(0, 6).map((t) => t.id)
      }
      if (!ids.length) return { answered: [], escalated: [], note: 'Personne n\'attend.' }

      const facts = shopFacts({
        product: args.product ?? ctx.productName ?? ctx.productGuess,
        price_dzd: args.price_dzd,
        shop: ctx.shop,
      })

      const answered = [], escalated = []
      for (const id of ids.slice(0, 8)) {
        onEvent({ type: 'progress', tool: 'answer_inbox', step: answered.length + escalated.length + 1, total: ids.length, label: `#${id}` })
        try {
          const draft = await draftReply(id, facts)
          sendReply(id, draft)
          const t = thread(id)
          const row = { id, person: t.person, channel: t.channel, asked: t.messages.find((m) => m.author === 'customer')?.text, reply: draft.reply, ms: draft.ms }
          if (draft.can_answer) answered.push(row)
          else escalated.push({ ...row, need_from_merchant: draft.missing })
        } catch (e) {
          escalated.push({ id, error: e.message })
        }
      }
      return {
        answered, escalated,
        summary: `${answered.length} répondus, ${escalated.length} renvoyés au marchand.`,
        note: 'Les réponses sont écrites par muse-spark, en darija. La page et les clients sont simulés.',
      }
    }

    case 'add_domain':
      return addDomain(Number(args.site_id), args.host, /\.sawt\.dz$/i.test(args.host) ? 'subdomain' : 'custom')

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
  // Rebuilt on every turn, not cached: the state board is only useful if it
  // is current, and between two turns the merchant may have connected
  // Facebook, answered a customer or verified a domain in another tab.
  const messages = [
    { role: 'system', content: systemPrompt({ ...ctx, state: ctx.sessionId ? briefing(ctx.sessionId) : '' }) },
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
