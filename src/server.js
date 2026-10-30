// The whole app on one port, with no dependencies.
//
// Uploads come in as raw bodies rather than multipart: parsing multipart by
// hand to avoid a dependency is a bad trade, and the browser can post an
// ArrayBuffer just as easily.
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT, MODE } from './config.js'
import { runTurn } from './agent/loop.js'
import { transcribe } from './models/voice.js'
import { understand } from './models/voice.js'
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
  if (!sessions.has(id)) sessions.set(id, { history: [], photos: [], products: [], shop: null })
  return sessions.get(id)
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

async function serveStatic(res, path) {
  if (!existsSync(path)) { res.writeHead(404); return res.end('Not found') }
  const data = await readFile(path)
  res.writeHead(200, { 'Content-Type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream' })
  res.end(data)
}

// Voice notes arrive as webm/ogg/mp4 from the browser and from WhatsApp.
// muse-voice-transcribe takes WAV only — mono PCM at 16 kHz.
async function toWav(input) {
  const out = input.replace(/\.[^.]+$/, '') + '.wav'
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', out])
  return out
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const p = url.pathname

  try {
    // ---- static -----------------------------------------------------------
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
      return serveStatic(res, join(ROOT, 'web', 'index.html'))
    }
    if (req.method === 'GET' && p.startsWith('/web/')) {
      return serveStatic(res, join(ROOT, 'web', basename(p)))
    }
    if (req.method === 'GET' && p.startsWith('/out/')) {
      return serveStatic(res, join(ROOT, p.replace(/^\//, '')))
    }

    // ---- a product photo --------------------------------------------------
    if (req.method === 'POST' && p === '/api/photo') {
      const sid = url.searchParams.get('session') ?? 'default'
      const ext = (url.searchParams.get('ext') ?? 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5)
      const buf = await body(req)
      await mkdir(UPLOADS, { recursive: true })
      const file = `photo-${Date.now().toString(36)}.${ext}`
      await writeFile(join(UPLOADS, file), buf)
      const s = session(sid)
      s.photos.push(`/out/uploads/${file}`)
      return json(res, 200, { url: `/out/uploads/${file}`, count: s.photos.length })
    }

    // ---- a voice note -----------------------------------------------------
    if (req.method === 'POST' && p === '/api/voice') {
      const ext = (url.searchParams.get('ext') ?? 'webm').replace(/[^a-z0-9]/gi, '').slice(0, 5)
      const buf = await body(req)
      await mkdir(UPLOADS, { recursive: true })
      const raw = join(UPLOADS, `voice-${Date.now().toString(36)}.${ext}`)
      await writeFile(raw, buf)

      let wav
      try { wav = await toWav(raw) } catch (e) {
        return json(res, 500, { error: `ffmpeg is required to convert voice notes to WAV. ${e.message}` })
      }

      // Both readings, every time. The point of this project is that they
      // disagree, and that the gap is where orders get lost.
      const [pinned, auto] = await Promise.all([
        transcribe(wav).catch((e) => `(failed: ${e.message})`),
        transcribe(wav, { languageBias: null }).catch(() => null),
      ])
      const understood = await understand(pinned).catch(() => null)
      return json(res, 200, { transcript: pinned, transcript_auto: auto, understood })
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

      try {
        const out = await runTurn({
          history: s.history,
          input,
          ctx: { shop: s.shop, products: s.products, photos: s.photos, productName },
          onEvent: send,
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
      return json(res, 200, { mode: MODE, photos: s.photos, shop: s.shop, turns: s.history.length })
    }

    res.writeHead(404); res.end('Not found')
  } catch (e) {
    json(res, 500, { error: e.message })
  }
})

server.listen(PORT, () => {
  console.log(`\n  Sawt  →  http://localhost:${PORT}\n  mode: ${MODE}\n`)
})
