// La Page elle-même : ce qu'elle a publié, ce qui est programmé, et ce que
// les gens écrivent dessous.
//
// ⚠️ TOUT CE FICHIER EST UNE MISE EN SCÈNE, et c'est écrit partout où ça
// sort à l'écran. Aucun appel n'est fait vers Facebook, aucune publication
// n'est créée nulle part. C'est exigé par les organisateurs — un juré doit
// pouvoir lancer le projet sans compte Meta — et c'est la règle n° 2 du
// projet : un chiffre simulé qui ressemble à une mesure est la seule faute
// que ce projet ne peut pas se permettre.
//
// POURQUOI CETTE COUCHE EXISTE. La boîte de réception montrait des clients
// qui écrivent en privé. Mais en Algérie, l'essentiel de la demande arrive
// SOUS LA PUBLICATION, pas en message : « سومة ؟ », « كاين 43 ؟ »,
// « ليفريزون وهران ؟ » — cent fois sous le même reel. Un agent qui ne lit
// que les DM ne voit qu'une fraction du travail réel du marchand.
//
// Les commentaires suivent exactement la règle des DM : l'agent répond à ce
// qu'il peut PROUVER depuis la fiche produit, et rend la main pour le reste.
// Le stock par pointure, les frais vers une commune précise, l'état d'un
// colis — il ne les connaît pas, et inventer une réponse sous une
// publication publique est pire qu'en privé : tout le monde la lit.
import { all, one, run, insert, now, J, unJ } from '../db.js'

const H = 3_600_000
const D = 24 * H

run(`CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  asset INTEGER NOT NULL REFERENCES meta_assets(id) ON DELETE CASCADE,
  session TEXT,
  kind TEXT NOT NULL,              -- post | story | reel
  caption TEXT,
  media TEXT,                      -- url d'une image servie par l'app, ou null
  status TEXT NOT NULL,            -- published | scheduled
  scheduled_at INTEGER,
  published_at INTEGER,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  campaign INTEGER,                -- renseigné si la publication est sponsorisée
  at INTEGER NOT NULL
)`)

run(`CREATE TABLE IF NOT EXISTS post_comments (
  id INTEGER PRIMARY KEY,
  post INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  person TEXT NOT NULL,
  text TEXT NOT NULL,
  intent TEXT,
  status TEXT NOT NULL DEFAULT 'open',   -- open | answered | escalated
  needs TEXT,                            -- ce qui manque, quand on ne peut pas répondre
  reply TEXT,
  by_ai INTEGER DEFAULT 0,
  at INTEGER NOT NULL,
  replied_at INTEGER
)`)

/* ── ce qu'une Page algérienne a vraiment sur son mur ─────────────────────
   Les légendes sont en darija parce que c'est ce qu'écrit un marchand
   d'Alger. Les chiffres sont à l'échelle d'une Page de 18 000 abonnés :
   un reel qui marche dépasse largement l'audience de la Page, un post de
   feed en touche une fraction. Inventer 400 000 vues ferait joli et ne
   ressemblerait à rien. */
const MUR = [
  { kind: 'reel', ago: 1.5, reach: 41280, likes: 1934, shares: 212, saves: 388,
    caption: { ar: 'الدودون الطويلة وصلات 🧥 ديري كومند و خلص كي توصلك',
               en: 'The long puffer just landed 🧥 order now, pay when it arrives' } },
  { kind: 'post', ago: 2.2, reach: 9120, likes: 318, shares: 41, saves: 66,
    caption: { ar: 'صباط رياضي رجالي — من 40 حتى 45. الدفع عند الاستلام، 58 ولاية.',
               en: 'Leather crossbody — one size, fits the essentials. Cash on delivery, all 58 wilayas.' } },
  { kind: 'story', ago: 0.4, reach: 6240, likes: 102, shares: 0, saves: 0,
    caption: { ar: 'آخر القياسات اللي باقية — سوايعات و تسالي',
               en: 'Last pieces left — a few hours and it is gone' } },
  { kind: 'reel', ago: 4.1, reach: 27640, likes: 1216, shares: 143, saves: 501,
    caption: { ar: 'العباية الكروازي 🖤 قماش كريب، ما يتكرمشش',
               en: 'The wrap abaya 🖤 heavy crepe, it does not crease' } },
  { kind: 'post', ago: 6.0, reach: 7430, likes: 254, shares: 77, saves: 92,
    caption: { ar: 'تاپي الصلاة المبطن — خفيف و يتطوى. هدية مليحة.',
               en: 'The padded prayer mat — light, folds flat. A good gift.' } },
]

/* Ce que les gens écrivent sous une publication, pour de vrai.
   `can` dit si la réponse se trouve dans ce que la boutique SAIT. Les quatre
   derniers ne s'y trouvent pas, et c'est voulu : une démonstration où l'agent
   répond à tout est une démonstration qui ment sur ce qu'il est. */
const SOUS = [
  { i: 0, person: 'Lamia B.', ago: 1.1, intent: 'price', can: true,
    text: { ar: 'سومة ؟', en: 'price?' } },
  { i: 0, person: 'Nawal Z.', ago: 0.9, intent: 'variant', can: false,
    text: { ar: 'كاين لون بيج ؟', en: 'do you have it in beige?' },
    needs: { fr: 'Les couleurs disponibles — la fiche ne donne que les tailles.',
             en: 'Which colours are in stock — the product sheet only lists sizes.' } },
  { i: 0, person: 'Soumia K.', ago: 0.6, intent: 'shipping', can: false,
    text: { ar: 'ليفريزون وهران بشحال ؟', en: 'how much is delivery to Oran?' },
    needs: { fr: 'Le tarif exact vers Oran — il dépend du transporteur et de la commune.',
             en: 'The exact fee to Oran — it depends on the carrier and the commune.' } },
  { i: 1, person: 'Yacine M.', ago: 1.8, intent: 'stock', can: false,
    text: { ar: 'كاين 43 ؟', en: 'is size 43 in stock?' },
    needs: { fr: 'Le stock restant en pointure 43, en temps réel.',
             en: 'How many size 43 are left, right now.' } },
  { i: 1, person: 'Riad T.', ago: 1.4, intent: 'payment', can: true,
    text: { ar: 'الدفع كيفاش ؟', en: 'how do I pay?' } },
  { i: 3, person: 'Hadjer A.', ago: 3.0, intent: 'size', can: true,
    text: { ar: 'شحال الطول تاعها ؟', en: 'how long is it?' } },
  { i: 3, person: 'Meriem S.', ago: 2.1, intent: 'returns', can: false,
    text: { ar: 'نقدر نبدلها إذا ما جاتنيش ؟', en: 'can I exchange it if it does not fit?' },
    needs: { fr: "La politique d'échange de cette boutique — le marchand ne l'a jamais écrite.",
             en: 'This shop exchange policy — the merchant has never written one.' } },
  { i: 4, person: 'Bilal R.', ago: 5.2, intent: 'care', can: false,
    text: { ar: 'واش راه يغسل في الماشينة ؟', en: 'is it machine washable?' },
    needs: { fr: "L'entretien du tissu — rien dans la fiche fournisseur.",
             en: 'How the material should be cared for — nothing in the supplier sheet.' } },
  { i: 4, person: 'Sarah D.', ago: 4.4, intent: 'shipping', can: true,
    text: { ar: 'توصلو لبسكرة ؟', en: 'do you deliver to Biskra?' } },
]

/**
 * Sème le mur d'une Page. Idempotent, comme la boîte de réception : un
 * rechargement ne crée pas un second mur, et un juré qui clique partout ne
 * se retrouve pas avec quinze fois le même reel.
 */
export function seedPosts(assetId, sessionId = null) {
  const deja = one('SELECT COUNT(*) n FROM posts WHERE asset=?', assetId)
  if (deja?.n) return deja.n

  const t = now()

  /* La langue de la boutique, lue une fois et valable pour tout le mur : les
     légendes, puis les commentaires en dessous. */
  const langue = (sessionId
    ? one('SELECT language FROM sessions WHERE id=?', sessionId)?.language
    : null) === 'en' ? 'en' : 'ar'
  const dit = (v, repli = 'fr') =>
    (v && typeof v === 'object' ? (v[langue] ?? v[repli] ?? v.ar ?? v.en) : v)

  const ids = MUR.map((p) => insert(
    `INSERT INTO posts(asset,session,kind,caption,media,status,published_at,reach,likes,shares,saves,at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
    assetId, sessionId, p.kind, dit(p.caption, 'ar'), null, 'published',
    t - Math.round(p.ago * D), p.reach, p.likes, p.shares, p.saves, t - Math.round(p.ago * D)
  ))

  /* Les commentaires. C'est ici que
     se joue la meilleure démonstration du produit — les questions auxquelles
     l'agent REFUSE de répondre, avec la raison — et un jury qui ne lit ni la
     darija ni le français ne verrait qu'un écran de signes. */
  for (const c of SOUS) {
    const post = ids[c.i]
    if (!post) continue
    insert(
      `INSERT INTO post_comments(post,person,text,intent,status,needs,at) VALUES(?,?,?,?,?,?,?)`,
      post, c.person, dit(c.text, 'ar'), c.intent, 'open',
      c.can ? null : dit(c.needs, 'fr'), t - Math.round(c.ago * D)
    )
  }
  return ids.length
}

/* ── lecture ──────────────────────────────────────────────────────────── */

export const postsOf = (assetId, { status = null } = {}) =>
  all(
    `SELECT p.*, (SELECT COUNT(*) FROM post_comments WHERE post=p.id) n_comments,
            (SELECT COUNT(*) FROM post_comments WHERE post=p.id AND status='open') n_open
     FROM posts p WHERE p.asset=? ${status ? 'AND p.status=?' : ''}
     ORDER BY COALESCE(p.published_at, p.scheduled_at) DESC`,
    ...(status ? [assetId, status] : [assetId])
  )

export const commentsOf = (postId) =>
  all('SELECT * FROM post_comments WHERE post=? ORDER BY at', postId)

/** Tous les commentaires d'une Page, le plus urgent d'abord. */
export const openComments = (assetId) =>
  all(
    `SELECT c.*, p.kind, p.caption FROM post_comments c
     JOIN posts p ON p.id = c.post
     WHERE p.asset=? AND c.status='open' ORDER BY c.at DESC`, assetId)

/** Ce que l'écran affiche en tête de la Page. */
export function pageStats(assetId) {
  const s = one(
    `SELECT COUNT(*) posts,
            COALESCE(SUM(reach),0) reach,
            COALESCE(SUM(likes),0) likes
     FROM posts WHERE asset=? AND status='published'`, assetId) ?? {}
  const q = one(
    `SELECT COUNT(*) n FROM posts WHERE asset=? AND status='scheduled'`, assetId)?.n ?? 0
  const open = one(
    `SELECT COUNT(*) n FROM post_comments c JOIN posts p ON p.id=c.post
     WHERE p.asset=? AND c.status='open'`, assetId)?.n ?? 0
  return { ...s, scheduled: q, comments_open: open }
}

/* ── écriture ─────────────────────────────────────────────────────────── */

/**
 * Programme ou publie. `when` est un horodatage, ou rien pour tout de suite.
 *
 * Une publication programmée n'a AUCUN chiffre : pas de portée, pas de
 * mentions j'aime. C'est évident et c'est pourtant le piège — inventer
 * « portée estimée : 12 000 » sous un post qui n'existe pas encore, c'est
 * exactement le chiffre simulé qui ressemble à une mesure.
 */
export function schedulePost(assetId, { kind = 'post', caption = '', media = null, when = null, sessionId = null } = {}) {
  const k = ['post', 'story', 'reel'].includes(kind) ? kind : 'post'
  const t = now()
  const quand = when ? Number(when) : null
  const programme = quand && quand > t
  const id = insert(
    `INSERT INTO posts(asset,session,kind,caption,media,status,scheduled_at,published_at,at)
     VALUES(?,?,?,?,?,?,?,?,?)`,
    assetId, sessionId, k, String(caption).slice(0, 2200), media,
    programme ? 'scheduled' : 'published',
    programme ? quand : null, programme ? null : t, t
  )
  return { id, kind: k, status: programme ? 'scheduled' : 'published', scheduled_at: programme ? quand : null, simulated: true }
}

/**
 * Les publications programmées dont l'heure est passée.
 *
 * Appelée à la lecture plutôt que par une minuterie : une app qui doit
 * tourner en continu pour que ses données soient justes est une app dont
 * les données sont fausses dès qu'on la ferme. Une story programmée hier
 * soir est publiée au moment où quelqu'un regarde, pas jamais.
 */
export function dueNow(assetId) {
  const t = now()
  const dues = all(
    "SELECT * FROM posts WHERE asset=? AND status='scheduled' AND scheduled_at<=?", assetId, t)
  for (const p of dues) {
    run("UPDATE posts SET status='published', published_at=? WHERE id=?", p.scheduled_at, p.id)
  }
  return dues
}

/** Une réponse sous un commentaire. `by_ai` dit qui a écrit. */
export function replyComment(commentId, text, { byAi = true } = {}) {
  run("UPDATE post_comments SET status='answered', reply=?, by_ai=?, replied_at=? WHERE id=?",
    String(text).slice(0, 900), byAi ? 1 : 0, now(), commentId)
  return one('SELECT * FROM post_comments WHERE id=?', commentId)
}

/** Rendu au marchand, avec la raison. Le commentaire reste visible. */
export function escalateComment(commentId, needs) {
  run("UPDATE post_comments SET status='escalated', needs=? WHERE id=?", String(needs ?? '').slice(0, 300), commentId)
  return one('SELECT * FROM post_comments WHERE id=?', commentId)
}
