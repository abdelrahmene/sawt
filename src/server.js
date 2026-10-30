// The whole app on one port, with no dependencies.
//
// Uploads come in as raw bodies rather than multipart: parsing multipart by
// hand to avoid a dependency is a bad trade, and the browser can post an
// ArrayBuffer just as easily.
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT, MODE } from './config.js'
import { runTurn } from './agent/loop.js'
import { transcribe, understand } from './models/voice.js'
import { describePhoto } from './models/vision.js'
import { OUT_DIR } from './creative/landing.js'

const run = promisify(execFile)
const PORT = Number(process.env.PORT || 7070)
const UPLOADS = join(ROOT, 'out', 'uploads')

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
}

// Kept in memory on purpose: this is a prototype, and a merchant's photos and
// conversation have no business outliving the process.
const sessions = new Map()
const session = (id) => {
  if (!sessions.has(id)) sessions.set(id, { history: [], photos: [], creatives: [], products: [], shop: null, timeline: [] })
  return sessions.get(id)
}

// `history` is what the model is replayed; `timeline` is what the SCREEN is
// replayed. They are not the same thing — the screen also holds the two
// readings of each voice note, the photos, and every artifact — and a reload
// that loses an afternoon of work is not something anyone forgives.
const remember = (s, entry) => {
  s.timeline.push(entry)
  if (s.timeline.length > 300) s.timeline.splice(0, s.timeline.length - 300)
}

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

async function body(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  return Buffer.concat(chunks)
}

async function serveStatic(res, path, method = 'GET') {
  if (!existsSync(path)) { res.writeHead(404); return res.end('Not found') }
  const type = MIME[extname(path).toLowerCase()] ?? 'application/octet-stream'
  if (method === 'HEAD') { res.writeHead(200, { 'Content-Type': type }); return res.end() }
  const data = await readFile(path)
  res.writeHead(200, { 'Content-Type': type })
  res.end(data)
}

// Voice notes arrive as webm/ogg/mp4 from the browser and from WhatsApp.
// muse-voice-transcribe takes WAV only — mono PCM at 16 kHz.
async function toWav(input) {
  const out = input.replace(/\.[^.]+$/, '') + '.wav'
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', out])
  return out
}

// 16 kHz mono 16-bit: 32000 bytes per second, minus a 44-byte header. Reading
// the file beats shelling out to ffprobe for a number we only need to sanity
// check.
async function durationOf(wavPath) {
  try {
    const { size } = await stat(wavPath)
    return Math.max(0, (size - 44) / 32000)
  } catch { return 0 }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const p = url.pathname

  try {
    // ---- static -----------------------------------------------------------
    // HEAD as well as GET: link checkers and prefetchers use it, and answering
    // 404 to a HEAD on a file that exists makes a working link look broken.
    const reading = req.method === 'GET' || req.method === 'HEAD'
    if (reading && (p === '/' || p === '/index.html')) {
      return serveStatic(res, join(ROOT, 'web', 'index.html'), req.method)
    }
    if (reading && p.startsWith('/web/')) {
      return serveStatic(res, join(ROOT, 'web', basename(p)), req.method)
    }
    if (reading && p.startsWith('/out/')) {
      return serveStatic(res, join(ROOT, decodeURIComponent(p).replace(/^\//, '')), req.method)
    }

    // ---- a product photo --------------------------------------------------
    // Described on arrival, not later: the agent has to know what it is
    // selling before the merchant says a word, and the description is what
    // goes into the system prompt.
    if (req.method === 'POST' && p === '/api/photo') {
      const sid = url.searchParams.get('session') ?? 'default'
      const ext = (url.searchParams.get('ext') ?? 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5)
      const buf = await body(req)
      await mkdir(UPLOADS, { recursive: true })
      const file = `photo-${Date.now().toString(36)}.${ext}`
      const path = join(UPLOADS, file)
      await writeFile(path, buf)

      const entry = { url: `/out/uploads/${file}`, path, described: null }
      const s = session(sid)
      s.photos.push(entry)

      try {
        entry.described = await describePhoto(path)
      } catch (e) {
        console.error('[vision]', e.message)
      }
      remember(s, { k: 'photo', url: entry.url, described: entry.described })
      return json(res, 200, { url: entry.url, described: entry.described, count: s.photos.length })
    }

    // ---- a voice note -----------------------------------------------------
    if (req.method === 'POST' && p === '/api/voice') {
      const s = session(url.searchParams.get('session') ?? 'default')
      const ext = (url.searchParams.get('ext') ?? 'webm').replace(/[^a-z0-9]/gi, '').slice(0, 5)
      const buf = await body(req)
      await mkdir(UPLOADS, { recursive: true })
      const raw = join(UPLOADS, `voice-${Date.now().toString(36)}.${ext}`)
      await writeFile(raw, buf)

      let wav
      try { wav = await toWav(raw) } catch (e) {
        return json(res, 500, { error: `ffmpeg est nécessaire pour convertir les vocaux en WAV. ${e.message}` })
      }

      // A silent or near-empty clip used to come back as an empty transcript,
      // which the UI showed as a blank box and the agent never received —
      // nothing happened and nothing said why. Measure the audio first and
      // fail out loud.
      const seconds = await durationOf(wav)
      if (seconds < 0.4) {
        return json(res, 200, {
          error: `Le vocal ne fait que ${seconds.toFixed(1)}s. Maintiens le micro pendant que tu parles, puis relâche.`,
          seconds,
        })
      }

      // Both readings, every time. The point of this project is that they
      // disagree, and that the gap is where orders get lost.
      const [pinned, auto] = await Promise.allSettled([
        transcribe(wav),
        transcribe(wav, { languageBias: null }),
      ])
      const transcript = pinned.status === 'fulfilled' ? (pinned.value ?? '').trim() : ''
      const transcript_auto = auto.status === 'fulfilled' ? (auto.value ?? '').trim() || null : null

      if (!transcript) {
        const why = pinned.status === 'rejected'
          ? pinned.reason?.message?.slice(0, 200)
          : "le modèle n'a rien entendu (micro muet, ou trop de bruit)"
        console.error('[voice] empty transcript', { seconds, why })
        return json(res, 200, { error: `Rien n'a été transcrit sur ${seconds.toFixed(1)}s d'audio — ${why}`, seconds, transcript_auto })
      }

      const understood = await understand(transcript).catch(() => null)
      remember(s, { k: 'heard', transcript, transcript_auto, understood })
      return json(res, 200, { transcript, transcript_auto, understood, seconds })
    }

    // ---- the agent, streamed ---------------------------------------------
    if (req.method === 'POST' && p === '/api/chat') {
      const sid = url.searchParams.get('session') ?? 'default'
      const s = session(sid)
      const { input, shop, productName } = JSON.parse((await body(req)).toString('utf8') || '{}')
      if (shop) s.shop = shop

      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
      const send = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`)
      remember(s, { k: 'me', text: input })

      try {
        const out = await runTurn({
          history: s.history,
          input,
          // `creatives` is the session's array by reference: the loop pushes
          // into it as muse-image produces them, so the landing page built
          // three turns later still has the studio shots to use.
          ctx: { shop: s.shop, products: s.products, photos: s.photos, creatives: s.creatives, productName,
                 productGuess: s.photos.at(-1)?.described?.product ?? null },
          onEvent: (e) => {
            send(e)
            if (e.type === 'say:end' && e.text?.trim()) remember(s, { k: 'bot', text: e.text })
            if (e.type === 'tool:end') {
              if (e.name === 'ask_merchant') remember(s, { k: 'ask', text: e.result?.question })
              else if (e.name === 'propose_choices') remember(s, { k: 'choices', ...e.result })
              else remember(s, { k: 'artifact', name: e.name, args: e.args, result: e.result, simulated: e.simulated, real: e.real })
            }
          },
        })
        s.history = out.messages.slice(-20)
        send({ type: 'done', text: out.text, blocked: !!out.blocked, missing: out.missing ?? null })
      } catch (e) {
        send({ type: 'error', error: e.message })
      }
      return res.end()
    }

    // ---- orders from a generated landing page ----------------------------
    if (req.method === 'POST' && p === '/api/order') {
      const raw = (await body(req)).toString('utf8')
      const data = Object.fromEntries(new URLSearchParams(raw))
      console.log('[order]', data)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end('<meta charset="utf-8"><body style="background:#0b0b0f;color:#eee;font:16px system-ui;display:grid;place-items:center;height:100vh"><p>تم تسجيل طلبك ✅</p>')
    }

    if (req.method === 'GET' && p === '/api/state') {
      const s = session(url.searchParams.get('session') ?? 'default')
      return json(res, 200, {
        mode: MODE,
        shop: s.shop,
        turns: s.history.length,
        photos: s.photos.map((x) => x.url),
        timeline: s.timeline,
      })
    }

    // Start over without losing the port: a fresh session id and an empty
    // screen, on purpose, when the merchant wants one.
    if (req.method === 'POST' && p === '/api/reset') {
      sessions.delete(url.searchParams.get('session') ?? 'default')
      return json(res, 200, { ok: true })
    }

    res.writeHead(404); res.end('Not found')
  } catch (e) {
    json(res, 500, { error: e.message })
  }
})

server.listen(PORT, () => {
  console.log(`\n  Sawt  →  http://localhost:${PORT}\n  mode: ${MODE}\n`)
})
