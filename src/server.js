// The whole app on one port, with no dependencies.
//
// Uploads come in as raw bodies rather than multipart: parsing multipart by
// hand to avoid a dependency is a bad trade, and the browser can post an
// ArrayBuffer just as easily.
//
// State lives in SQLite now (src/db.js). The conversation, the pages, the
// domains, the simulated Meta connection, the inbox and every campaign row are
// queried, not held in a Map — which is what makes a restart survivable and
// the screens consistent with each other.
import './preflight.js'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT, MODE } from './config.js'
import { all, one, run, insert, now, J, unJ, session, touch, setting, importLegacyJson, DB_FILE } from './db.js'
import { runTurn, marquerEngagement } from './agent/loop.js'
import { transcribe, understand } from './models/voice.js'
import { setProvider, currentProvider, providerModel, PROVIDERS } from './models/llm.js'
import { describePhoto } from './models/vision.js'
import * as meta from './meta-sim/connect.js'
import * as inbox from './meta-sim/inbox.js'
import * as camp from './meta-sim/campaigns.js'
import * as sites from './sites.js'
import * as opts from './creative/landing-options.js'
import { buildLandingPage } from './creative/landing.js'
import * as catalog from './catalog.js'
import * as credits from './credits.js'
import * as page from './meta-sim/posts.js'
import * as notify from './meta-sim/notify.js'

const sh = promisify(execFile)
const PORT = Number(process.env.PORT || 7070)
const UPLOADS = join(ROOT, 'out', 'uploads')

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
}

const imported = importLegacyJson()
if (imported) console.log(`  ${imported} session(s) reprise(s) depuis l'ancien out/sessions.json`)

// Le catalogue fournisseur, semé au premier démarrage depuis la fixture
// versionnée. Un juré qui clone le dépôt a des produits, des photos, des
// coûts et des marges sans clé et sans réseau.
const seeded = catalog.seed()
if (seeded) console.log(`  catalogue : ${seeded} produits fournisseur semés`)

// Le cerveau choisi la dernière fois survit au redémarrage : un juré qui bascule
// sur les poids ouverts, puis relance le serveur, doit y rester.
setProvider(setting('provider'))

/* ── session helpers ──────────────────────────────────────────────────────
   `turns` is what the MODEL is replayed; `events` is what the SCREEN is
   replayed. They are not the same thing — the screen also holds the two
   readings of each voice note, the photos and every artifact — and a reload
   that loses an afternoon of work is not something anyone forgives. */

/* Vingt messages, oui, mais pas une coupe n'importe où.
   ──────────────────────────────────────────────────────────────────────────
   `slice(-20)` tranchait à l'aveugle, et une tranche au milieu d'un appel
   d'outil laisse un message `role:'tool'` sans son assistant parent en tête
   de fenêtre. L'API répond alors 400 — « has no matching assistant message
   with tool_calls » — et la session est morte pour de bon : l'historique
   fautif est relu identique à chaque nouvelle tentative, donc le marchand ne
   peut plus rien dire. Mesuré le 31/10/26 sur la session de la boucle
   campagne, au premier tour après son vingtième message.

   Une fenêtre est toujours un suffixe, donc le seul orphelin possible est au
   début : on avance jusqu'au premier message qui n'est pas une réponse
   d'outil. Appliqué à la LECTURE autant qu'à l'écriture, pour que les
   sessions déjà abîmées repartent sans migration. */
const recoller = (messages) => {
  let i = 0
  while (i < messages.length && messages[i]?.role === 'tool') i++
  return messages.slice(i)
}

const history = (sid) =>
  recoller(all('SELECT json FROM turns WHERE session=? ORDER BY id', sid).map((r) => unJ(r.json)).filter(Boolean))

function saveHistory(sid, messages) {
  run('DELETE FROM turns WHERE session=?', sid)
  for (const m of recoller(messages.slice(-20))) run('INSERT INTO turns(session,json,at) VALUES(?,?,?)', sid, J(m), now())
}

const remember = (sid, entry) => {
  insert('INSERT INTO events(session,kind,json,at) VALUES(?,?,?,?)', sid, entry.k ?? 'bot', J(entry), now())
  touch(sid)
}

// Le marquage « ça engage de l'argent » est réappliqué à la relecture, pas
// seulement au moment où l'outil tourne : sinon une conversation enregistrée
// avant la garde ressort avec un bouton « Lance-la » en pilule ordinaire, et
// le point de contrôle qu'on a mis à l'écran ne protège que les sessions
// neuves. Une seule fonction, appelée aux deux bouts.
//
// ⚠️ Et la coupe se fait par le BON bout. `ORDER BY id LIMIT 400` gardait les
// 400 événements les plus ANCIENS : une session assez longue pour importer un
// produit, construire une page et faire tourner une campagne rechargeait sur
// son propre début, la fin manquante. On prend les 400 derniers, remis à
// l'endroit.
const timeline = (sid) =>
  all('SELECT json FROM events WHERE session=? ORDER BY id DESC LIMIT 400', sid)
    .reverse()
    .map((r) => unJ(r.json))
    .filter(Boolean)
    .map((e) => (e.k === 'choices' && e.choices ? { ...e, choices: e.choices.map(marquerEngagement) } : e))

const photosOf = (sid) =>
  all('SELECT url,path,described FROM photos WHERE session=? ORDER BY id', sid)
    .map((p) => ({ ...p, described: unJ(p.described) }))

const creativesOf = (sid) =>
  all('SELECT url,angle FROM creatives WHERE session=? ORDER BY id', sid)

/* ── tiny helpers ─────────────────────────────────────────────────────────── */

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function body(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  return Buffer.concat(chunks)
}
const jsonBody = async (req) => { try { return JSON.parse((await body(req)).toString('utf8') || '{}') } catch { return {} } }

async function serveStatic(res, path, method = 'GET') {
  if (!existsSync(path)) { res.writeHead(404); return res.end('Not found') }
  const type = MIME[extname(path).toLowerCase()] ?? 'application/octet-stream'
  if (method === 'HEAD') { res.writeHead(200, { 'Content-Type': type }); return res.end() }
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(await readFile(path))
}

// Voice notes arrive as webm/ogg/mp4 from the browser and from WhatsApp.
// muse-voice-transcribe takes WAV only — mono PCM at 16 kHz.
async function toWav(input) {
  const out = input.replace(/\.[^.]+$/, '') + '.wav'
  await sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', out])
  return out
}

// 16 kHz mono 16-bit: 32000 bytes per second, minus a 44-byte header. Reading
// the file beats shelling out to ffprobe for a number we only need to sanity
// check.
async function durationOf(wavPath) {
  try { const { size } = await stat(wavPath); return Math.max(0, (size - 44) / 32000) } catch { return 0 }
}

/** The badge numbers behind the left-hand menu, in one query each. */
function counts(sid) {
  const c = one('SELECT id FROM meta_connections WHERE session=? AND status=? ORDER BY id DESC LIMIT 1', sid, 'connected')
  const assetIds = c ? all('SELECT id FROM meta_assets WHERE connection=?', c.id).map((a) => a.id) : []
  const open = assetIds.length
    ? one(`SELECT COUNT(*) n FROM threads WHERE status='open' AND asset IN (${assetIds.map(() => '?').join(',')})`, ...assetIds)?.n ?? 0
    : 0
  const stuck = assetIds.length
    ? one(`SELECT COUNT(*) n FROM threads WHERE status='needs_merchant' AND asset IN (${assetIds.map(() => '?').join(',')})`, ...assetIds)?.n ?? 0
    : 0
  // Les commentaires publics comptent à part des messages privés : ce ne
  // sont pas les mêmes gens, pas le même risque, et surtout pas la même
  // pastille. Les mélanger cacherait que neuf personnes attendent sous un
  // reel pendant que la messagerie est vide.
  const comments = assetIds.length
    ? one(`SELECT COUNT(*) n FROM post_comments c JOIN posts p ON p.id=c.post
           WHERE c.status='open' AND p.asset IN (${assetIds.map(() => '?').join(',')})`, ...assetIds)?.n ?? 0
    : 0
  const scheduled = assetIds.length
    ? one(`SELECT COUNT(*) n FROM posts WHERE status='scheduled' AND asset IN (${assetIds.map(() => '?').join(',')})`, ...assetIds)?.n ?? 0
    : 0
  return {
    connected: !!c,
    inbox_open: open,
    inbox_stuck: stuck,
    comments_open: comments,
    scheduled,
    notifs: notify.unseen(sid),
    pages: one('SELECT COUNT(*) n FROM pages WHERE session=?', sid)?.n ?? 0,
    sites: one('SELECT COUNT(*) n FROM sites WHERE session=?', sid)?.n ?? 0,
    campaigns: one('SELECT COUNT(*) n FROM campaigns WHERE session=?', sid)?.n ?? 0,
    live: one("SELECT COUNT(*) n FROM campaigns WHERE session=? AND status='ACTIVE'", sid)?.n ?? 0,
    orders: one('SELECT COUNT(*) n FROM orders WHERE page IN (SELECT id FROM pages WHERE session=?)', sid)?.n ?? 0,
    imported: one('SELECT COUNT(*) n FROM imports WHERE session=?', sid)?.n ?? 0,
  }
}

/** The Page and Instagram assets of the current connection, inbox seeded. */
function surfaces(sid) {
  const c = meta.connection(sid)
  if (c.status !== 'connected') return []
  return inbox.surfacesOf(c).map((a) => ({ ...a, stats: inbox.inboxStats(a.id) }))
}

/* ── the server ───────────────────────────────────────────────────────────── */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const p = url.pathname
  const sid = url.searchParams.get('session') ?? 'default'
  const reading = req.method === 'GET' || req.method === 'HEAD'
  const seg = p.split('/').filter(Boolean)

  try {
    /* ── static ─────────────────────────────────────────────────────────── */
    // HEAD as well as GET: link checkers and prefetchers use it, and answering
    // 404 to a HEAD on a file that exists makes a working link look broken.
    if (reading && (p === '/' || p === '/index.html')) return serveStatic(res, join(ROOT, 'web', 'index.html'), req.method)
    if (reading && p.startsWith('/web/')) return serveStatic(res, join(ROOT, 'web', ...p.split('/').slice(2)), req.method)
    if (reading && p.startsWith('/out/')) return serveStatic(res, join(ROOT, decodeURIComponent(p).replace(/^\//, '')), req.method)
    // Les photos du catalogue sont versionnées, pas générées à l'exécution :
    // elles vivent dans fixtures/, pas dans out/.
    if (reading && p.startsWith('/fixtures/catalog/')) {
      return serveStatic(res, join(ROOT, 'fixtures', 'catalog', basename(decodeURIComponent(p))), req.method)
    }

    if (p.startsWith('/api/')) session(sid)

    /* ── le catalogue fournisseur ───────────────────────────────────────── */
    if (reading && p === '/api/catalog') {
      return json(res, 200, {
        products: catalog.list({
          category: url.searchParams.get('category') ?? undefined,
          q: url.searchParams.get('q') ?? undefined,
          max_cost: url.searchParams.get('max_cost') ?? undefined,
          min_margin: url.searchParams.get('min_margin') ?? undefined,
        }),
        categories: catalog.categories(),
        imports: catalog.importsOf(sid),
      })
    }
    if (reading && seg[1] === 'catalog' && seg[2]) {
      const d = catalog.detail(decodeURIComponent(seg[2]))
      return d ? json(res, 200, d) : json(res, 404, { error: 'introuvable' })
    }
    if (req.method === 'POST' && p === '/api/catalog/import') {
      const b = await jsonBody(req)
      const r = catalog.importProduct(sid, String(b.product_id ?? ''), { selling: b.selling })
      touch(sid)
      return json(res, r.error ? 400 : 200, { ...r, counts: counts(sid) })
    }
    if (req.method === 'POST' && p === '/api/catalog/remove') {
      const b = await jsonBody(req)
      const r = catalog.removeImport(sid, String(b.product_id ?? ''))
      return json(res, 200, { ...r, counts: counts(sid) })
    }

    /* ── a product photo ────────────────────────────────────────────────── */
    // Described on arrival, not later: the agent has to know what it is
    // selling before the merchant says a word, and the description is what
    // goes into the system prompt.
    if (req.method === 'POST' && p === '/api/photo') {
      const ext = (url.searchParams.get('ext') ?? 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5)
      const buf = await body(req)
      await mkdir(UPLOADS, { recursive: true })
      const file = `photo-${Date.now().toString(36)}.${ext}`
      const path = join(UPLOADS, file)
      await writeFile(path, buf)

      let described = null
      try { described = await describePhoto(path) } catch (e) { console.error('[vision]', e.message) }

      insert('INSERT INTO photos(session,url,path,described,at) VALUES(?,?,?,?,?)',
        sid, `/out/uploads/${file}`, path, J(described), now())
      remember(sid, { k: 'photo', url: `/out/uploads/${file}`, described })
      return json(res, 200, { url: `/out/uploads/${file}`, described, count: photosOf(sid).length })
    }

    /* ── a voice note ───────────────────────────────────────────────────── */
    if (req.method === 'POST' && p === '/api/voice') {
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
      const [pinned, auto] = await Promise.allSettled([transcribe(wav), transcribe(wav, { languageBias: null })])
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
      remember(sid, { k: 'heard', transcript, transcript_auto, understood })
      return json(res, 200, { transcript, transcript_auto, understood, seconds })
    }

    /* ── the agent, streamed ────────────────────────────────────────────── */
    if (req.method === 'POST' && p === '/api/chat') {
      const { input, shop, productName } = await jsonBody(req)
      if (shop) run('UPDATE sessions SET shop=? WHERE id=?', shop, sid)
      const s = one('SELECT * FROM sessions WHERE id=?', sid)

      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
      })
      const send = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`)
      remember(sid, { k: 'me', text: input })

      const photos = photosOf(sid)
      // Held by reference so generate_creatives can push into it and a landing
      // page built later in the same turn still has the studio shots.
      const creatives = creativesOf(sid)

      try {
        const out = await runTurn({
          history: history(sid),
          input,
          ctx: {
            // Ce que le marchand vend VRAIMENT. Le créneau existait dans le
            // prompt système depuis le début et recevait un tableau vide :
            // l'agent ne pouvait littéralement pas savoir ce qu'il vendait.
            sessionId: sid, shop: s?.shop ?? shop ?? null,
            products: catalog.shopProducts(sid), photos, creatives, productName,
            productGuess: photos.at(-1)?.described?.product ?? null,
          },
          onEvent: (e) => {
            send(e)
            if (e.type === 'say:end' && e.text?.trim()) remember(sid, { k: 'bot', text: e.text })
            if (e.type === 'tool:end') {
              if (e.name === 'ask_merchant') remember(sid, { k: 'ask', text: e.result?.question })
              else if (e.name === 'propose_choices') remember(sid, { k: 'choices', ...e.result })
              else remember(sid, { k: 'artifact', name: e.name, args: e.args, result: e.result, simulated: e.simulated, real: e.real })
            }
          },
        })

        // Whatever the creatives array gained during the turn gets written out.
        const known = new Set(creativesOf(sid).map((c) => c.url))
        for (const c of creatives) {
          if (!known.has(c.url)) {
            insert('INSERT INTO creatives(session,url,angle,model,at) VALUES(?,?,?,?,?)',
              sid, c.url, c.angle ?? null, 'muse-image-1.0', now())
          }
        }

        saveHistory(sid, out.messages)
        send({ type: 'done', text: out.text, blocked: !!out.blocked, missing: out.missing ?? null, counts: counts(sid) })
      } catch (e) {
        console.error('[chat]', e)
        send({ type: 'error', error: e.message })
      }
      return res.end()
    }

    /* ── orders from a generated landing page ───────────────────────────── */
    if (req.method === 'POST' && p === '/api/order') {
      const data = Object.fromEntries(new URLSearchParams((await body(req)).toString('utf8')))
      const order = sites.recordOrder(data)
      console.log('[order]', order)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>تم</title><body style="margin:0;background:#0d1117;color:#e7eaee;font:16px/1.8 system-ui;display:grid;place-items:center;height:100dvh;text-align:center;padding:24px">
<div><div style="font-size:46px;margin-bottom:12px">✓</div>
<p style="font-size:21px;font-weight:700" dir="rtl">تم تسجيل طلبك</p>
<p style="color:#8b949e" dir="rtl">نعيطولك قريب باش نأكّدو الطلب.</p>
<p style="color:#6e7681;font-size:13px;margin-top:22px">commande nº ${order.id} — enregistrée dans la base</p></div></body>`)
    }

    /* ── state for the shell ────────────────────────────────────────────── */
    if (reading && p === '/api/state') {
      const s = one('SELECT * FROM sessions WHERE id=?', sid)
      return json(res, 200, {
        mode: MODE,
        db: basename(DB_FILE),
        provider: currentProvider(),
        provider_model: providerModel(),
        providers: PROVIDERS,
        shop: s?.shop ?? null,
        turns: history(sid).length,
        photos: photosOf(sid).map((x) => x.url),
        timeline: timeline(sid),
        counts: counts(sid),
        credits: credits.balance(sid),
        settings: {
          shop: s?.shop ?? null,
          language: s?.language ?? 'ar',
          edge_ip: sites.EDGE_IP,
        },
      })
    }

    if (req.method === 'POST' && p === '/api/settings') {
      const b = await jsonBody(req)
      if (b.shop !== undefined) run('UPDATE sessions SET shop=? WHERE id=?', b.shop || null, sid)
      if (b.language) run('UPDATE sessions SET language=? WHERE id=?', b.language, sid)
      // Le fournisseur est global, pas par session : c'est le cerveau du
      // serveur, et deux onglets qui ne tourneraient pas sur le même modèle
      // rendraient toute comparaison impossible.
      if (b.provider && PROVIDERS.includes(b.provider)) {
        setProvider(b.provider)
        setting('provider', b.provider)
      }
      if (b.key && b.value !== undefined) setting(b.key, b.value)
      return json(res, 200, {
        ok: true, counts: counts(sid),
        provider: currentProvider(), provider_model: providerModel(),
      })
    }

    // Start over without losing the port: a fresh session and an empty screen,
    // on purpose, when the merchant wants one. ON DELETE CASCADE does the rest.
    if (req.method === 'POST' && p === '/api/reset') {
      run('DELETE FROM sessions WHERE id=?', sid)
      return json(res, 200, { ok: true })
    }

    /* ── the simulated Meta connection ──────────────────────────────────── */
    if (reading && p === '/api/meta') {
      return json(res, 200, { ...meta.connection(sid), scope_catalog: meta.SCOPES, surfaces: surfaces(sid) })
    }
    if (req.method === 'POST' && p === '/api/meta/login') return json(res, 200, meta.startLogin(sid))
    if (req.method === 'POST' && p === '/api/meta/review') return json(res, 200, meta.reviewPermissions(sid))
    if (req.method === 'POST' && p === '/api/meta/grant') {
      const b = await jsonBody(req)
      const c = meta.grant(sid, b.granted ?? meta.SCOPES.map((s) => s.name))
      return json(res, 200, { ...c, surfaces: surfaces(sid), counts: counts(sid) })
    }
    if (req.method === 'POST' && p === '/api/meta/disconnect') return json(res, 200, meta.disconnect(sid))
    if (reading && p === '/api/meta/graph') return json(res, 200, meta.graphEcho(sid) ?? { error: 'non connecté' })

    /* ── the inbox ──────────────────────────────────────────────────────── */
    /* ── la Page : son mur et ses commentaires ─────────────────────────── */
    if (reading && p === '/api/page') {
      const a = surfaces(sid).find((x) => x.kind === 'page')
      if (!a) return json(res, 200, { connected: false })
      const posts = page.postsOf(a.id)
      return json(res, 200, {
        connected: true,
        page: { id: a.id, name: a.name, handle: a.handle, followers: a.followers },
        stats: page.pageStats(a.id),
        posts: posts.map((x) => ({ ...x, comments: page.commentsOf(x.id) })),
      })
    }

    if (req.method === 'POST' && p === '/api/page/schedule') {
      const b = await jsonBody(req)
      const a = surfaces(sid).find((x) => x.kind === 'page')
      if (!a) return json(res, 400, { error: 'Aucune Page connectée.' })
      const h = Number(b.in_hours)
      const r = page.schedulePost(a.id, {
        kind: b.kind, caption: b.caption, media: b.image ?? null,
        when: Number.isFinite(h) && h > 0 ? Date.now() + h * 3_600_000 : null,
        sessionId: sid,
      })
      notify.push(sid, {
        kind: 'post', ref: r.id, goto: 'meta',
        title: r.status === 'scheduled' ? `${r.kind} programmé` : `${r.kind} publié sur la Page`,
        body: String(b.caption ?? '').slice(0, 120),
      })
      touch(sid)
      return json(res, 200, { ...r, counts: counts(sid) })
    }

    // La réponse écrite À LA MAIN par le marchand : `by_ai` reste à 0, donc
    // l'écran ne pourra jamais présenter sa phrase comme venant du modèle.
    if (req.method === 'POST' && p === '/api/page/reply') {
      const b = await jsonBody(req)
      const id = Number(b.comment_id)
      if (!id || !String(b.text ?? '').trim()) return json(res, 400, { error: 'Commentaire ou texte manquant.' })
      return json(res, 200, { comment: page.replyComment(id, b.text, { byAi: false }), counts: counts(sid) })
    }

    /* ── les notifications ─────────────────────────────────────────────── */
    if (reading && p === '/api/notifications') {
      return json(res, 200, { items: notify.feed(sid), unseen: notify.unseen(sid) })
    }
    if (req.method === 'POST' && p === '/api/notifications/seen') {
      const b = await jsonBody(req).catch(() => ({}))
      return json(res, 200, { unseen: notify.markSeen(sid, b?.id ? Number(b.id) : null) })
    }

    if (reading && p === '/api/inbox') {
      const asset = Number(url.searchParams.get('asset')) || null
      const list = surfaces(sid)
      const chosen = asset ? list.filter((a) => a.id === asset) : list
      return json(res, 200, {
        surfaces: list.map((a) => ({ id: a.id, kind: a.kind, name: a.name, handle: a.handle, followers: a.followers, stats: a.stats })),
        threads: chosen.flatMap((a) => inbox.threads(a.id).map((t) => ({ ...t, asset_name: a.name, asset_kind: a.kind }))),
      })
    }
    if (reading && seg[1] === 'inbox' && seg[2]) {
      const t = inbox.thread(Number(seg[2]))
      return t ? json(res, 200, t) : json(res, 404, { error: 'introuvable' })
    }
    // The model writes the reply AND decides whether it may be sent. The
    // screen shows both outcomes, because the refusals are the point.
    if (req.method === 'POST' && seg[1] === 'inbox' && seg[3] === 'answer') {
      const b = await jsonBody(req)
      const facts = inbox.shopFacts({ product: b.product, price_dzd: b.price_dzd, shop: one('SELECT shop FROM sessions WHERE id=?', sid)?.shop })
      const draft = await inbox.draftReply(Number(seg[2]), facts)
      const t = b.dry ? inbox.thread(Number(seg[2])) : inbox.sendReply(Number(seg[2]), draft)
      return json(res, 200, { draft, thread: t, counts: counts(sid) })
    }
    if (req.method === 'POST' && seg[1] === 'inbox' && seg[3] === 'reply') {
      const b = await jsonBody(req)
      if (!b.text?.trim()) return json(res, 400, { error: 'texte vide' })
      return json(res, 200, { thread: inbox.merchantReply(Number(seg[2]), b.text.trim()), counts: counts(sid) })
    }

    /* ── campaigns ──────────────────────────────────────────────────────── */
    if (reading && p === '/api/campaigns') return json(res, 200, { campaigns: camp.list(sid), placements: camp.PLACEMENTS })
    if (reading && seg[1] === 'campaigns' && seg[2]) {
      const c = camp.get(Number(seg[2]))
      if (!c) return json(res, 404, { error: 'introuvable' })
      return json(res, 200, { ...c, results: c.status === 'ACTIVE' ? camp.results(c.id) : null })
    }
    if (req.method === 'POST' && seg[1] === 'campaigns' && seg[3] === 'launch') {
      return json(res, 200, { campaign: camp.launch(Number(seg[2]), { confirmed_by_merchant: true }), counts: counts(sid) })
    }
    if (req.method === 'POST' && seg[1] === 'campaigns' && seg[3] === 'advance') {
      const b = await jsonBody(req)
      return json(res, 200, camp.advance(Number(seg[2]), Math.max(1, Math.min(7, Number(b.days) || 1))))
    }
    if (req.method === 'POST' && seg[1] === 'campaigns' && seg[3] === 'decide') {
      const b = await jsonBody(req)
      return json(res, 200, camp.decide(Number(seg[2]), b))
    }

    /* ── sites, pages, domains ──────────────────────────────────────────── */
    if (reading && p === '/api/sites') {
      return json(res, 200, { sites: sites.sites(sid), loose: sites.loosePages(sid), edge_ip: sites.EDGE_IP })
    }
    if (reading && seg[1] === 'sites' && seg[2]) {
      const s = sites.site(Number(seg[2]))
      return s ? json(res, 200, s) : json(res, 404, { error: 'introuvable' })
    }
    if (req.method === 'POST' && p === '/api/domains') {
      const b = await jsonBody(req)
      return json(res, 200, sites.addDomain(Number(b.site) || null, b.host, b.kind))
    }
    if (req.method === 'POST' && seg[1] === 'domains' && seg[3] === 'verify') {
      return json(res, 200, await sites.verifyDomain(Number(seg[2])))
    }
    if (req.method === 'POST' && seg[1] === 'domains' && seg[3] === 'pretend') {
      return json(res, 200, sites.pretendVerified(Number(seg[2])))
    }
    if (req.method === 'DELETE' && seg[1] === 'domains' && seg[2]) {
      return json(res, 200, sites.removeDomain(Number(seg[2])))
    }

    if (reading && p === '/api/orders') return json(res, 200, { orders: sites.orders(sid) })

    /* ── the landing studio ─────────────────────────────────────────────── */
    // The catalogue of knobs, what this session last chose, and everything it
    // could put on a page.
    if (reading && p === '/api/landing') {
      const saved = setting(`landing:${sid}`) ?? {}
      const o = opts.normaliseOptions(saved)
      const s = one('SELECT * FROM sessions WHERE id=?', sid)
      return json(res, 200, {
        catalogue: opts.OPTIONS, sections: opts.SECTIONS, refused: opts.REFUSED,
        options: o, estimate: opts.estimate(o),
        shop: s?.shop ?? null,
        photos: [
          ...creativesOf(sid).map((c) => ({ url: c.url, kind: 'creative', label: c.angle ?? 'créative' })),
          ...photosOf(sid).map((x) => ({ url: x.url, kind: 'photo', label: x.described?.product ?? 'photo' })),
        ],
        pages: all(`SELECT id,product,url,price_dzd,angle,bytes,at FROM pages WHERE session=? ORDER BY id DESC LIMIT 12`, sid),
        products: [...new Set(all('SELECT DISTINCT product FROM pages WHERE session=?', sid).map((x) => x.product))],
        /* La vitrine du Studio. On choisit un produit, on ne tape plus son
           nom : taper « doudoune » à la main, c'est repartir sans la photo,
           sans le prix et sans la marge — donc une page dont le produit ne
           correspond à rien de la boutique. Deux rayons :
             · `mine`  ce que le marchand a déjà importé, avec SON prix ;
             · `offer` le reste du catalogue fournisseur, à importer.
           Le prix de vente conseillé accompagne chaque fiche, pour que le
           formulaire se remplisse seul. */
        showcase: {
          mine: catalog.shopProducts(sid).map((p) => ({
            id: p.id, name: p.name, price: p.price, margin: p.margin,
            image: p.image, images: p.images, supplier: p.supplier,
            sizes: p.variants, mine: true,
          })),
          offer: catalog.list({ limit: 40 })
            .filter((p) => !catalog.shopProducts(sid).some((m) => m.id === p.id))
            .map((p) => ({
              id: p.id, name: p.name.en || p.name.fr || p.id,
              price: p.min_selling, margin: p.min_selling - p.supplier_cost,
              image: p.image, images: p.images, supplier: p.supplier,
              category: p.category, mine: false,
            })),
        },
      })
    }

    if (req.method === 'POST' && p === '/api/landing/defaults') {
      const o = opts.normaliseOptions(await jsonBody(req))
      setting(`landing:${sid}`, o)
      return json(res, 200, { options: o, estimate: opts.estimate(o) })
    }

    // Streamed, because a page with four generated scenes takes over a minute
    // and a button that sits disabled for ninety seconds reads as broken.
    if (req.method === 'POST' && p === '/api/landing/build') {
      const b = await jsonBody(req)
      const o = opts.normaliseOptions(b.options ?? {})
      setting(`landing:${sid}`, o)

      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
      })
      const send = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`)

      try {
        if (!b.product?.trim()) throw new Error('Il manque le nom du produit.')
        const shop = b.shop?.trim() || one('SELECT shop FROM sessions WHERE id=?', sid)?.shop || null
        if (b.shop?.trim()) run('UPDATE sessions SET shop=? WHERE id=?', b.shop.trim(), sid)

        const r = await buildLandingPage({
          product: b.product.trim(),
          price_dzd: Number(b.price_dzd) || 0,
          angle: b.angle?.trim() || null,
          notes: b.notes?.trim() || null,
          shop, sessionId: sid, options: o,
          freshScenes: !!b.fresh,
          images: o.photos.length ? o.photos : [...creativesOf(sid), ...photosOf(sid)].map((x) => x.url).slice(0, 6),
          onProgress: (e) => send({ type: 'progress', ...e }),
        })
        remember(sid, { k: 'artifact', name: 'build_landing_page', args: { product: b.product }, result: r, real: true })
        /* Le Studio débite comme l'agent. Sans cette ligne, une page
           construite ici ne coûtait rien au registre alors que le panneau
           annonçait son prix juste au-dessus du bouton : le solde ne
           bougeait pas, et un compteur qui ne bouge pas ne veut rien dire.
           Compté sur ce qui est revenu — les scènes reprises du cache ne
           sont pas dans `r.scenes`, donc elles ne sont pas facturées. */
        const facture = credits.charge(sid, [
          { kind: 'text', n: 1 },
          { kind: 'segment', n: r.isolated?.model ? 1 : 0 },
          { kind: 'image', n: r.scenes?.length ?? 0 },
        ], 'studio:landing')
        send({ type: 'done', result: r, counts: counts(sid), cost: facture, credits: credits.balance(sid) })
      } catch (e) {
        console.error('[landing]', e)
        send({ type: 'error', error: e.message })
      }
      return res.end()
    }

    res.writeHead(404); res.end('Not found')
  } catch (e) {
    console.error('[server]', p, e)
    if (!res.headersSent) return json(res, 500, { error: e.message })
    res.end()
  }
})

server.listen(PORT, () => {
  console.log(`\n  Sawt  →  http://localhost:${PORT}`)
  console.log(`  mode: ${MODE}   ·   base: out/${basename(DB_FILE)}\n`)
})
