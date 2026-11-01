// The inbox: comments and Messenger, with replies the model really writes.
//
// The stage is simulated, the answers are not. Every customer message below
// was written for this demo — they are not real customers, and no real
// message, name or voice note from anyone's Page is in this repository. That
// is a hard line: Page conversations are Platform Data, and a merchant's
// customers did not agree to appear in a hackathon submission.
//
// What is real is the hard part. For each message the model decides whether it
// can answer AT ALL, and the interesting cases are the ones where it cannot:
// "is pointure 43 in stock" needs a stock figure nobody gave it, "where is my
// parcel" needs a tracking number, "is this an original" needs a fact about
// the supplier. Every AI customer-service demo answers those three anyway.
// This one refuses, names the fact it is missing, and hands the thread back to
// the merchant — because an invented "yes, 43 is available" is a refused
// delivery, 700 DA of return shipping, and a customer who never buys again.
import { all, one, run, insert, now, J, unJ } from '../db.js'
import { chat, visibleAnswer } from '../models/llm.js'

/* ── the seed ─────────────────────────────────────────────────────────────
   Eight threads, chosen so that three of them CANNOT be answered without the
   merchant. A demo where the agent succeeds eight times out of eight is a
   demo of a liar. */

const H = 3600_000
const SEED = [
  {
    channel: 'comment', person: 'Amine Kh.', intent: 'price',
    post_text: 'صباط رياضي جديد · 4 500 دج · التوصيل لكامل الولايات',
    msgs: ['بشحال؟'], ago: 0.4,
  },
  {
    channel: 'comment', person: 'Sofiane M.', intent: 'price_objection',
    post_text: 'صباط رياضي جديد · 4 500 دج · التوصيل لكامل الولايات',
    msgs: ['غالي بزاف خويا، ما تنقصش شي حاجة؟'], ago: 1.2,
  },
  {
    channel: 'comment', person: 'Nadir B.', intent: 'delivery_zone',
    post_text: 'صباط رياضي جديد · 4 500 دج · التوصيل لكامل الولايات',
    msgs: ['كاين توصيل لتيزي وزو؟'], ago: 2.1,
  },
  {
    channel: 'messenger', person: 'Rania S.', intent: 'stock_size',
    msgs: ['السلام عليكم', 'بغيت نعرف البوانتير 43 كاين؟'], ago: 0.2,
  },
  {
    channel: 'messenger', person: 'Walid T.', intent: 'shipping_fee',
    msgs: ['شحال التوصيل لوهران؟'], ago: 3.5,
  },
  {
    channel: 'messenger', person: 'Hichem A.', intent: 'order_status',
    msgs: ['خويا راني طلبت نهار الخميس و مانيش عارف وين وصل الكولي'], ago: 5,
  },
  {
    channel: 'instagram_dm', person: 'sara.dz', intent: 'authenticity',
    msgs: ['واش هاد الصباط أصلي ولا ريبليكا؟'], ago: 1.8,
  },
  {
    channel: 'comment', person: 'Karim L.', intent: 'visit_shop',
    post_text: 'صباط رياضي جديد · 4 500 دج · التوصيل لكامل الولايات',
    msgs: ['نقدر نجي نشوفو في المحل قبل ما نشري؟'], ago: 4.4,
  },
]

/**
 * Seeded once per asset. Re-running does nothing, so a reload does not
 * duplicate the inbox and a judge clicking around cannot end up with
 * sixteen copies of the same question.
 */
export function seedInbox(assetId, channel) {
  const existing = one('SELECT COUNT(*) n FROM threads WHERE asset=?', assetId)
  if (existing?.n) return existing.n

  const t = now()
  let n = 0
  for (const s of SEED) {
    const mine = channel === 'instagram' ? s.channel === 'instagram_dm' : s.channel !== 'instagram_dm'
    if (!mine) continue
    const at = t - Math.round(s.ago * H)
    const id = insert(
      `INSERT INTO threads(asset,channel,person,avatar,post_text,status,intent,last_at,at)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      assetId, s.channel, s.person, initials(s.person), s.post_text ?? null, 'open', s.intent, at, at
    )
    s.msgs.forEach((text, i) => {
      run('INSERT INTO thread_messages(thread,author,text,by_ai,at) VALUES(?,?,?,0,?)',
        id, 'customer', text, at + i * 40_000)
    })
    n++
  }
  return n
}

const initials = (name) =>
  name.replace(/[^\p{L}\s.]/gu, '').split(/[\s.]+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '').join('')

/**
 * Les surfaces d'une connexion — Page et Instagram — boîte semée.
 *
 * POURQUOI CETTE FONCTION EXISTE : le semis ne vivait que dans le serveur,
 * sur le chemin de l'écran Messages. L'agent, lui, lisait les fils
 * directement. Donc un marchand qui connecte Facebook et demande aussitôt
 * « واش كاين في الميساجات » s'entendait répondre « rien d'ouvert » — avec
 * aplomb — et trouvait huit clients en cliquant sur l'onglet juste après.
 * Deux écrans, deux vérités, et c'est l'agent qui avait tort.
 *
 * Le semis est idempotent : l'appeler sur les deux chemins ne duplique rien.
 */
export const surfacesOf = (connection) =>
  (connection?.assets ?? [])
    .filter((a) => a.kind === 'page' || a.kind === 'instagram')
    .map((a) => { seedInbox(a.id, a.kind); return a })

export function threads(assetId) {
  return all(
    `SELECT t.*,
            (SELECT text FROM thread_messages WHERE thread=t.id ORDER BY id DESC LIMIT 1) AS last_text,
            (SELECT COUNT(*) FROM thread_messages WHERE thread=t.id) AS n,
            (SELECT COUNT(*) FROM thread_messages WHERE thread=t.id AND by_ai=1) AS n_ai
     FROM threads t WHERE t.asset=? ORDER BY t.last_at DESC`, assetId)
}

export const thread = (id) => {
  const t = one('SELECT * FROM threads WHERE id=?', id)
  if (!t) return null
  return { ...t, messages: all('SELECT * FROM thread_messages WHERE thread=? ORDER BY id', id) }
}

/* ── what the agent is allowed to know ───────────────────────────────────── */

/**
 * The facts the agent has. Deliberately incomplete, because a real merchant's
 * are. Stock per size, the per-wilaya fee and the supplier's paperwork are
 * absent on purpose — those are the three that must be refused.
 */
export function shopFacts({ product, price_dzd, shop, language = 'ar' } = {}) {
  return {
    shop: shop ?? 'Sabat Dzair',
    product: product ?? 'صباط رياضي',
    price_dzd: price_dzd ?? 4500,
    payment: 'Paiement à la livraison (COD). Le client paie le livreur.',
    coverage: 'Livraison dans les 58 wilayas, 2 à 4 jours.',
    language,
    unknown: [
      'le stock par pointure',
      'le frais de livraison exact par wilaya',
      "l'état d'une commande déjà passée",
      "l'origine ou l'authenticité du produit",
      'toute remise non décidée par le marchand',
    ],
  }
}

const SYSTEM = (f) => `You answer customers for an Algerian cash-on-delivery shop, on Facebook
and Instagram, as the shop — never as a robot and never as a brand voice.

WRITE IN ALGERIAN DARIJA, IN ARABIC LETTERS, the way a shopkeeper types on a
phone: short, warm, no emoji spam, maximum two sentences. Brand names and
sizes stay in Latin script or digits. No Modern Standard Arabic.

WHAT YOU KNOW — and nothing beyond it:
  · shop: ${f.shop}
  · product: ${f.product}
  · price: ${f.price_dzd} DZD
  · ${f.payment}
  · ${f.coverage}

WHAT YOU DO NOT KNOW. If the answer needs ANY of these, you must NOT answer:
${f.unknown.map((u) => `  · ${u}`).join('\n')}

THE RULE THAT MATTERS. A wrong "yes" costs the merchant a refused delivery,
the return shipping, and a customer who never comes back. So:
  · can_answer = true  only when every fact in your reply is in the list above.
  · can_answer = false when it is not. Then "missing" names the ONE thing the
    merchant has to tell you, in French, and "reply" is a short holding line in
    darija that promises an answer without inventing one.
  · Never invent a stock level, a delivery fee, a discount, a delivery date, or
    a claim about where the product was made.
  · A customer asking for a discount gets warmth and the real price, never a
    price you made up.
  · A customer asking whether it is original: you do not know. Say the merchant
    will confirm. Never claim it is, never claim it is not.

Answer with ONLY this JSON:
{"reply":"...","can_answer":true|false,"missing":"... or empty","intent":"price|stock|delivery|order_status|authenticity|objection|other"}`

/**
 * Draft a reply for one thread. Nothing is sent anywhere — the "send" writes
 * it into the simulated thread, which is the whole point: the merchant can
 * read what the agent would have posted before any of this is real.
 */
export async function draftReply(threadId, facts = shopFacts()) {
  const t = thread(threadId)
  if (!t) throw new Error('Thread introuvable.')

  const convo = t.messages
    .map((m) => `${m.author === 'customer' ? 'CLIENT' : 'BOUTIQUE'}: ${m.text}`)
    .join('\n')
  const where = t.channel === 'comment'
    ? `A public comment under the post: "${t.post_text ?? ''}". Other people read it.`
    : 'A private message.'

  const t0 = Date.now()
  const msg = await chat(
    [{ role: 'system', content: SYSTEM(facts) },
     { role: 'user', content: `${where}\n\n${convo}\n\nAnswer the last customer line.` }],
    { temperature: 0.6 }
  )
  const raw = visibleAnswer(msg)
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) throw new Error("Le modèle n'a pas répondu en JSON.")

  const d = JSON.parse(m[0])
  return {
    thread: threadId,
    reply: String(d.reply ?? '').trim(),
    can_answer: d.can_answer !== false,
    missing: String(d.missing ?? '').trim() || null,
    intent: d.intent ?? t.intent,
    ms: Date.now() - t0,
    model: 'muse-spark-1.3',
  }
}

/** Post the draft into the thread, or park the thread for the merchant. */
export function sendReply(threadId, draft) {
  const t = now()
  if (draft.can_answer && draft.reply) {
    run('INSERT INTO thread_messages(thread,author,text,by_ai,model,ms,at) VALUES(?,?,?,1,?,?,?)',
      threadId, 'agent', draft.reply, draft.model ?? null, draft.ms ?? null, t)
    run('UPDATE threads SET status=?, last_at=?, intent=? WHERE id=?', 'answered', t, draft.intent ?? null, threadId)
  } else {
    if (draft.reply) {
      run('INSERT INTO thread_messages(thread,author,text,by_ai,model,ms,at) VALUES(?,?,?,1,?,?,?)',
        threadId, 'agent', draft.reply, draft.model ?? null, draft.ms ?? null, t)
    }
    run('UPDATE threads SET status=?, last_at=?, intent=?, subject=? WHERE id=?',
      'needs_merchant', t, draft.intent ?? null, draft.missing ?? null, threadId)
  }
  return thread(threadId)
}

/** The merchant answers the question the agent could not. */
export function merchantReply(threadId, text) {
  const t = now()
  run('INSERT INTO thread_messages(thread,author,text,by_ai,at) VALUES(?,?,?,0,?)', threadId, 'merchant', text, t)
  run('UPDATE threads SET status=?, last_at=? WHERE id=?', 'answered', t, threadId)
  return thread(threadId)
}

export function inboxStats(assetId) {
  const r = one(
    `SELECT COUNT(*) total,
            SUM(status='open') open,
            SUM(status='answered') answered,
            SUM(status='needs_merchant') escalated
     FROM threads WHERE asset=?`, assetId) ?? {}
  const ai = one(
    `SELECT COUNT(*) n, AVG(ms) ms FROM thread_messages
     WHERE by_ai=1 AND thread IN (SELECT id FROM threads WHERE asset=?)`, assetId) ?? {}
  return {
    total: r.total ?? 0, open: r.open ?? 0, answered: r.answered ?? 0, escalated: r.escalated ?? 0,
    ai_replies: ai.n ?? 0, avg_ms: ai.ms ? Math.round(ai.ms) : null,
  }
}

export { unJ, J }
