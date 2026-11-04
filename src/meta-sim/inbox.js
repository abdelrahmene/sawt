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
import { seedPosts, dueNow, commentsOf, replyComment, escalateComment } from './posts.js'
import { chat, visibleAnswer } from '../models/llm.js'
import { priceLabel } from '../money.js'
import { shopProducts } from '../catalog.js'

/* ── the seed ─────────────────────────────────────────────────────────────
   Eight threads, chosen so that three of them CANNOT be answered without the
   merchant. A demo where the agent succeeds eight times out of eight is a
   demo of a liar. */

const H = 3600_000
/* ⚠️ DEUX LANGUES, ET LA LANGUE EST CELLE DE LA BOUTIQUE.
   Ces conversations étaient en darija seulement, et les raisons de refus en
   français. Un marchand anglophone ouvrait donc une boîte de réception qu'il
   ne pouvait pas lire — et c'est l'écran censé démontrer que l'agent répond
   DANS LA LANGUE DU CLIENT. Une démonstration qu'on ne peut pas lire ne
   démontre rien.

   L'intention, elle, ne change pas de langue : c'est un code, et c'est lui
   qui décide si l'agent peut répondre ou doit rendre la main. */
const SEED = [
  {
    channel: 'comment', person: 'Amine Kh.', intent: 'price',
    post: true, // la légende est construite dans le semis, depuis le vrai produit
    msgs: { ar: ['بشحال؟'], en: ['how much?'] }, ago: 0.4,
  },
  {
    channel: 'comment', person: 'Sofiane M.', intent: 'price_objection',
    post: true, // la légende est construite dans le semis, depuis le vrai produit
    msgs: { ar: ['غالي بزاف خويا، ما تنقصش شي حاجة؟'],
            en: ['too expensive bro, can you do better?'] }, ago: 1.2,
  },
  {
    channel: 'comment', person: 'Nadir B.', intent: 'delivery_zone',
    post: true, // la légende est construite dans le semis, depuis le vrai produit
    msgs: { ar: ['كاين توصيل لتيزي وزو؟'], en: ['do you deliver to Tizi Ouzou?'] }, ago: 2.1,
  },
  {
    channel: 'messenger', person: 'Rania S.', intent: 'stock_size',
    msgs: { ar: ['السلام عليكم', 'بغيت نعرف البوانتير 43 كاين؟'],
            en: ['hello', 'is the black one still in stock?'] }, ago: 0.2,
  },
  {
    channel: 'messenger', person: 'Walid T.', intent: 'shipping_fee',
    msgs: { ar: ['شحال التوصيل لوهران؟'], en: ['how much is delivery to Oran?'] }, ago: 3.5,
  },
  {
    channel: 'messenger', person: 'Hichem A.', intent: 'order_status',
    msgs: { ar: ['خويا راني طلبت نهار الخميس و مانيش عارف وين وصل الكولي'],
            en: ['I ordered on Thursday and I have no idea where my parcel is'] }, ago: 5,
  },
  {
    channel: 'instagram_dm', person: 'sara.dz', intent: 'authenticity',
    msgs: { ar: ['واش هاد الصباط أصلي ولا ريبليكا؟'],
            en: ['is this genuine leather or synthetic?'] }, ago: 1.8,
  },
  {
    channel: 'comment', person: 'Karim L.', intent: 'visit_shop',
    post: true, // la légende est construite dans le semis, depuis le vrai produit
    msgs: { ar: ['نقدر نجي نشوفو في المحل قبل ما نشري؟'],
            en: ['can I come see it in the shop before I buy?'] }, ago: 4.4,
  },
  /* This one is darija whatever the interface is set to — see `fixe` in the
     seeder. It is answerable from the facts the agent has, so it produces a
     published darija answer rather than a hand-back: the point is to show the
     reply, not the refusal. */
  {
    channel: 'messenger', person: 'Yacine B.', intent: 'delivery_zone', fixe: 'ar',
    msgs: { ar: ['سلام خويا، كيفاش يتم الدفع؟ و كاين توصيل لبسكرة؟'] }, ago: 0.6,
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

  /* La langue de la boutique décide de celle des clients. On la lit sur la
     session propriétaire de la connexion : un marchand qui travaille en
     anglais doit pouvoir LIRE sa boîte de réception — c'est l'écran censé
     montrer que l'agent répond dans la langue du client, et une
     démonstration illisible ne démontre rien. */
  const sess = one(
    `SELECT s.id, s.language FROM sessions s
     JOIN meta_connections c ON c.session = s.id
     JOIN meta_assets a ON a.connection = c.id
     WHERE a.id = ?`, assetId)
  const langue = sess?.language === 'en' ? 'en' : 'ar'

  /* ⚠️ LA LÉGENDE DU POST DIT LE PRODUIT DE CETTE BOUTIQUE, PAS UN EXEMPLE.
     Elle était écrite en dur : « New leather crossbody · 4 200 DA ». Or
     l'agent, lui, répondait avec le vrai produit et le vrai prix de la
     session. Résultat lisible dans une seule capture d'écran : au-dessus, un
     sac à 4 200 DA ; juste en dessous, l'agent qui annonce 40 $ pour un pull.
     Deux prix, deux produits, une conversation. Un juré n'a pas besoin de
     chercher pour voir ça — et il ne peut pas savoir lequel des deux mentait. */
  const produit = shopProducts(sess?.id ?? '')[0]
  const titre = produit?.name ?? (langue === 'en' ? 'New arrival' : 'جديد')
  const prix = produit ? priceLabel(produit.price, langue) : null
  const legende = langue === 'en'
    ? [titre, prix, 'delivery to all 58 wilayas'].filter(Boolean).join(' · ')
    : [titre, prix, 'التوصيل لكامل الولايات'].filter(Boolean).join(' · ')
  /* `fixe` wins over the session language. One customer writes in darija no
     matter what the interface is set to, because that is what actually
     happens: the shopkeeper's dashboard is in one language and the person
     typing on Messenger is in another. The agent has to follow the customer,
     not the dashboard — and the only way to see that it does is to have both
     kinds of customer in the same inbox at the same time. */
  const dit = (v, fixe) => (v && typeof v === 'object'
    ? (v[fixe ?? langue] ?? v.ar ?? v.en) : v)

  const t = now()
  let n = 0
  for (const s of SEED) {
    const mine = channel === 'instagram' ? s.channel === 'instagram_dm' : s.channel !== 'instagram_dm'
    if (!mine) continue
    const at = t - Math.round(s.ago * H)
    const id = insert(
      `INSERT INTO threads(asset,channel,person,avatar,post_text,status,intent,last_at,at)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      assetId, s.channel, s.person, initials(s.person),
      s.post ? legende : null, 'open', s.intent, at, at
    )
    ;(dit(s.msgs, s.fixe) ?? []).forEach((text, i) => {
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
    .map((a) => {
      seedInbox(a.id, a.kind)
      // Le mur de la Page, semé en même temps que ses messages. Les deux
      // arrivent avec la connexion : un compte branché dont la Page est
      // vide n'a l'air connecté à rien.
      if (a.kind === 'page') { seedPosts(a.id, connection.session); dueNow(a.id) }
      return a
    })

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
export function shopFacts({ product, price_dzd, shop, language = 'en' } = {}) {
  return {
    shop: shop ?? 'Sabat Dzair',
    product: product ?? 'Running shoes',
    price_dzd: price_dzd ?? 4500,
    payment: 'Cash on delivery. The customer pays the courier, not the shop.',
    coverage: 'Delivery to all 58 wilayas, 2 to 4 days.',
    language,
    // Le prix tel que la cliente le lit sur la page, pas tel qu'il est stocké.
    price_label: priceLabel(price_dzd ?? 4500, language),
    /* Written in English because these are not notes to myself: the model
       copies them into "missing", and "missing" is what the merchant reads on
       the Meta screen when a thread comes back to them. */
    unknown: [
      'stock, per size',
      'the exact delivery fee for a given wilaya',
      'the status of an order already placed',
      "the product's origin or whether it is authentic",
      'any discount the merchant has not decided',
    ],
  }
}

/* ⚠️ LA LANGUE DE LA RÉPONSE EST CELLE DU CLIENT, PAS UNE CONSTANTE.
   La consigne disait « WRITE IN ALGERIAN DARIJA » sans condition : un client
   qui écrivait en anglais recevait une réponse en arabe. C'est exactement
   l'erreur que ce produit reproche aux autres — répondre à côté de ce qui a
   été demandé — et elle était écrite en majuscules dans son propre prompt.

   La darija reste la langue par défaut parce que c'est celle dans laquelle
   la plupart des clients écrivent ici, et parce qu'y répondre est ce que le
   projet démontre. Mais c'est un défaut, pas une règle.

   ⚠️ DEUXIÈME CAUSE, et la vraie : la règle ci-dessus était juste, mais la
   branche du refus, trois paragraphes plus bas, disait « "reply" is a short
   holding line IN DARIJA ». Le modèle a obéi à la consigne la plus spécifique
   et la plus proche — correctement. Les seules réponses qui sortaient en arabe
   pour un client anglophone étaient exactement les refus. Une consigne générale
   ne rattrape pas une consigne particulière qui la contredit : il faut la
   corriger là où elle est écrite.

   Et parce qu'un prompt ne devrait pas avoir à déduire ce que le code sait
   déjà, la langue est maintenant détectée ici et énoncée au modèle. */

/** The customer's language, decided by code rather than inferred by the model. */
export function langueDu(texte) {
  const s = String(texte ?? '')
  if (/[؀-ۿ]/.test(s)) return { code: 'ar', nom: 'Algerian darija, in Arabic letters' }
  /* Darija in Latin letters — "bghit nchri", "chhal", "wach kayen". Half the
     messages a shop gets look like this, and matching Arabic script alone
     filed them as English. In arabizi 3, 7 and 9 are LETTERS, so they sit
     against letters — 3andek, ch7al, 9ahwa. The test requires that adjacency,
     because a bare number does not mean darija: "do you have size 39?" is an
     English sentence and an earlier `\w*[379]\w*` called it darija. */
  const arabizi = /\b(bghit|baghi|chhal|kayen|kayn|wach|wesh|khoya|kho|sahbi|labas|rani|win|kifach|kifah|ndir|nchri|dyal|bzaf|barka|hada|hadi)\b|[a-z][379]|[379][a-z]/i
  if (arabizi.test(s)) return { code: 'ar', nom: 'Algerian darija, in Latin letters — answer in the same Latin letters' }
  const fr = /\b(je|j'ai|bonjour|salut|est-ce|combien|livraison|vous|merci|svp|prix|taille|commande)\b/i
  if (fr.test(s)) return { code: 'fr', nom: 'French' }
  return { code: 'en', nom: 'English' }
}
const SYSTEM = (f) => `You answer customers for a cash-on-delivery shop, on Facebook
and Instagram, as the shop — never as a robot and never as a brand voice.

ANSWER IN THE LANGUAGE THE CUSTOMER WROTE IN. If they write in Algerian
darija, answer in darija in Arabic letters. If they write in English, answer
in English. If in French, in French. Never switch their language on them.

Write the way a shopkeeper types on a phone: short, warm, no emoji spam,
maximum two sentences. Brand names and sizes stay in Latin script or digits.
No Modern Standard Arabic.

WHAT YOU KNOW — and nothing beyond it:
  · shop: ${f.shop}
  · product: ${f.product}
  · price: ${f.price_label ?? `${f.price_dzd} DZD`} — quote it EXACTLY like that,
    with that currency symbol, because that is what the customer sees on the page
  · ${f.payment}
  · ${f.coverage}

WHAT YOU DO NOT KNOW. If the answer needs ANY of these, you must NOT answer:
${f.unknown.map((u) => `  · ${u}`).join('\n')}

THE RULE THAT MATTERS. A wrong "yes" costs the merchant a refused delivery,
the return shipping, and a customer who never comes back. So:
  · can_answer = true  only when every fact in your reply is in the list above.
  · can_answer = false when it is not. Then "missing" names the ONE thing the
    merchant has to tell you, in English, and "reply" is a short holding line
    IN THE CUSTOMER'S OWN LANGUAGE that promises an answer without inventing one.
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

  const derniere = [...t.messages].reverse().find((m) => m.author === 'customer')
  const langue = langueDu(derniere?.text)

  const t0 = Date.now()
  const msg = await chat(
    [{ role: 'system', content: SYSTEM(facts) },
     { role: 'user', content: `${where}\n\n${convo}\n\n`
       + `The customer wrote in ${langue.nom}. Your "reply" must be in ${langue.nom}`
       + ` — including when can_answer is false. "missing" stays in English.\n\n`
       + 'Answer the last customer line.' }],
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

/* ── les commentaires publics ──────────────────────────────────────────────
   Même cerveau que les messages privés, et ce n'est pas de la paresse : la
   règle à appliquer est identique — répondre à ce qu'on peut prouver depuis
   la fiche, rendre la main pour le reste. Ce qui change est le CONTEXTE
   qu'on donne au modèle, et il change beaucoup : sous une publication,
   tout le monde lit. Une réponse inventée en privé gêne un client ; la
   même sous un reel vu 41 000 fois gêne la boutique entière.

   D'où la consigne supplémentaire : plus court qu'un DM, et pas de détail
   personnel — on ne répond pas « ton colis part demain » sous un post. */
export async function draftComment(commentId, facts = shopFacts()) {
  const c = one('SELECT * FROM post_comments WHERE id=?', commentId)
  if (!c) throw new Error('Commentaire introuvable.')
  const p = one('SELECT kind, caption FROM posts WHERE id=?', c.post)

  const t0 = Date.now()
  const msg = await chat(
    [{ role: 'system', content: SYSTEM(facts) },
     { role: 'user', content:
`A PUBLIC comment under the shop's ${p?.kind ?? 'post'}: "${p?.caption ?? ''}".
Everyone who sees the post sees your answer, so keep it to ONE short sentence
and never mention anything personal about this customer.

CUSTOMER (${c.person}): ${c.text}

They wrote in ${langueDu(c.text).nom}. Your "reply" must be in ${langueDu(c.text).nom}
— including when can_answer is false. "missing" stays in English.

Answer that comment.` }],
    { temperature: 0.6 }
  )
  const raw = visibleAnswer(msg)
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) throw new Error("Le modèle n'a pas répondu en JSON.")
  const d = JSON.parse(m[0])
  return {
    comment: commentId,
    person: c.person,
    asked: c.text,
    reply: String(d.reply ?? '').trim(),
    can_answer: d.can_answer !== false && !c.needs,
    missing: String(d.missing ?? '').trim() || c.needs || null,
    intent: d.intent ?? c.intent,
    ms: Date.now() - t0,
    model: 'muse-spark-1.3',
  }
}

/** Publie la réponse, ou rend le commentaire au marchand avec la raison. */
export function sendCommentReply(commentId, draft) {
  if (draft.can_answer && draft.reply) return replyComment(commentId, draft.reply, { byAi: true })
  return escalateComment(commentId, draft.missing ?? 'A fact the shop never gave the agent.')
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
