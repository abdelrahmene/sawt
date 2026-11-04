// Répondre aux clients tout seul, en vrai, pendant que le marchand fait
// autre chose.
//
// POURQUOI. L'agent savait déjà répondre : `draftComment()` et `draftReply()`
// appellent le vrai modèle et rendent une réponse en darija, ou rendent la
// main quand ils ne savent pas. Mais il fallait le lui demander. Or un client
// qui écrit à 23 h n'attend pas qu'on clique : en paiement à la livraison, la
// première boutique qui répond prend la commande, et celle qui répond demain
// matin a perdu la vente avant de l'avoir vue.
//
// Ce module est la boucle qui manquait. Il est allumé PAR DÉFAUT, parce qu'une
// fonctionnalité de ce genre éteinte par défaut n'existe pas.
//
// ⚠️ TROIS GARDE-FOUS, et aucun n'est décoratif :
//
//   1. LA RÈGLE DU REFUS SURVIT. C'est le point le plus important du fichier.
//      Répondre automatiquement est exactement la situation où un agent se met
//      à deviner : personne ne relit. Donc tout ce qui porte un `needs` — la
//      pointure en stock, le suivi du colis, l'authenticité — est REMONTÉ au
//      marchand et jamais répondu. L'automatisme accélère les réponses qu'on
//      savait déjà donner ; il n'en autorise aucune nouvelle.
//
//   2. LE PLANCHER DE CRÉDITS. Chaque réponse est un VRAI appel de modèle,
//      donc un vrai crédit. Une boucle qui tourne pendant qu'on prépare une
//      démonstration peut vider le paquet avant le moment où on en a besoin.
//      En dessous du plancher, la boucle s'arrête et le dit — elle ne se
//      contente pas d'échouer en silence.
//
//   3. LE DÉBIT. Deux réponses par battement, et un intervalle minimum entre
//      deux battements. Sans ça, ouvrir l'écran avec sept clients en attente
//      déclencherait sept appels simultanés — et Meta, comme tout le monde,
//      compte les appels.
import { all, one, setting, now } from './db.js'
import { connection } from './meta-sim/connect.js'
import {
  surfacesOf, threads, draftReply, sendReply,
  draftComment, sendCommentReply, shopFacts,
} from './meta-sim/inbox.js'
import { openComments } from './meta-sim/posts.js'
import { shopProducts } from './catalog.js'
import { charge, balance } from './credits.js'
import { push } from './meta-sim/notify.js'

/* ⚠️ LES FAITS SONT CEUX DE CETTE BOUTIQUE, PAS CEUX DU DÉFAUT.
   Ici c'était `shopFacts()`, sans un seul argument. Le battement répondait
   donc aux clients avec la boutique d'exemple et un prix codé en dur, pendant
   que l'agent — `loop.js`, même fonction, mêmes clients — répondait avec le
   vrai produit et le vrai prix. Deux chemins, deux vérités, et c'est le
   chemin automatique qui mentait : celui qui tourne tout seul, sans que
   personne regarde. Un client à qui on annonce un prix inventé revient
   le réclamer à la livraison. */
function factsOf(sessionId) {
  const s = one('SELECT shop, language FROM sessions WHERE id=?', sessionId)
  const p = shopProducts(sessionId)[0]
  return shopFacts({
    shop: s?.shop || undefined,
    product: p?.name || undefined,
    price_dzd: p?.price || undefined,
    language: s?.language || 'en',
  })
}

/** En dessous, on ne lance plus rien : il faut de quoi finir une démonstration. */
export const PLANCHER = 40

/** Deux par battement : assez pour que ça vive, assez peu pour que ça se lise. */
const PAR_BATTEMENT = 2

/** Un battement toutes les huit secondes au plus — le client en envoie un toutes les six. */
const INTERVALLE = 8_000

const CLE = (sid) => `autoreply.${sid}`
const CLE_T = (sid) => `autoreply.last.${sid}`

/** Allumé par défaut : c'est l'intérêt de la chose. */
export function enabled(sessionId) {
  const v = setting(CLE(sessionId))
  return v === undefined || v === null ? true : !!v
}

export function setEnabled(sessionId, on) {
  setting(CLE(sessionId), !!on)
  return enabled(sessionId)
}

/**
 * Ce qui attend une réponse, dans l'ordre où ça devrait l'obtenir.
 *
 * Les commentaires publics d'abord : sous une publication, tout le monde voit
 * la question sans réponse, y compris les clients qui n'ont pas encore écrit.
 */
function enAttente(sessionId) {
  const c = connection(sessionId)
  if (!c || c.status !== 'connected') return []
  const assets = surfacesOf(c)
  const file = []

  for (const a of assets) {
    if (a.kind === 'page') {
      for (const k of openComments(a.id)) {
        // Un commentaire déjà rendu au marchand n'est pas « en attente de
        // l'agent » : il attend un humain. Le relancer en boucle serait lui
        // redemander la même chose toutes les huit secondes.
        if (k.needs) continue
        file.push({ sort: 'comment', id: k.id, person: k.person, text: k.text, at: k.at })
      }
    }
    for (const t of threads(a.id)) {
      if (t.status !== 'open') continue
      // Le dernier mot doit être celui du client : si l'agent a déjà répondu
      // et que personne n'a rien ajouté, il n'y a rien à dire de plus.
      const dernier = one(
        'SELECT by_ai FROM thread_messages WHERE thread=? ORDER BY id DESC LIMIT 1', t.id)
      if (!dernier || dernier.by_ai) continue
      file.push({ sort: 'dm', id: t.id, person: t.person, text: t.last_text, at: t.last_at })
    }
  }

  file.sort((a, b) => (a.sort === b.sort ? (a.at ?? 0) - (b.at ?? 0) : a.sort === 'comment' ? -1 : 1))
  return file
}

/** Combien de clients attendent — sans appeler le moindre modèle. */
export const pending = (sessionId) => enAttente(sessionId).length

/**
 * Un battement : jusqu'à deux réponses, vraiment écrites par le modèle.
 *
 * Rend toujours un objet qui DIT ce qui s'est passé, y compris quand rien ne
 * s'est passé et pourquoi. Un automatisme muet est un automatisme auquel on
 * ne peut pas faire confiance : « éteint », « plus assez de crédits » et
 * « personne n'attend » sont trois états très différents, et l'écran doit
 * pouvoir les distinguer.
 */
export async function tick(sessionId, { max = PAR_BATTEMENT, force = false } = {}) {
  if (!sessionId) return { ran: false, why: 'no_session' }
  if (!enabled(sessionId)) return { ran: false, why: 'off' }

  const t = now()
  const dernier = Number(setting(CLE_T(sessionId))) || 0
  if (!force && t - dernier < INTERVALLE) return { ran: false, why: 'too_soon' }
  setting(CLE_T(sessionId), t)

  const solde = balance(sessionId)
  if (solde.left <= PLANCHER) {
    return { ran: false, why: 'low_credits', left: solde.left, floor: PLANCHER }
  }

  const file = enAttente(sessionId).slice(0, Math.max(1, max))
  if (!file.length) return { ran: true, answered: [], handed_back: [], credits: 0, left: solde.left }

  const repondus = [], rendus = []
  let credits = 0
  // Une fois pour la file, pas une fois par client : la boutique ne change pas
  // entre deux réponses du même battement.
  const facts = factsOf(sessionId)

  for (const item of file) {
    // On revérifie le solde entre deux appels : deux réponses peuvent suffire
    // à franchir le plancher quand on en est près.
    if (balance(sessionId).left <= PLANCHER) break
    try {
      const draft = item.sort === 'comment'
        ? await draftComment(item.id, facts)
        : await draftReply(item.id, facts)

      // Un appel de modèle a eu lieu : il se paie, qu'on publie la réponse ou
      // qu'on la rende au marchand. Faire payer seulement les réponses
      // publiées rendrait le refus gratuit, donc invisible dans le compteur —
      // or c'est un vrai travail, et c'est celui dont on est le plus fier.
      credits += charge(sessionId, [{ kind: 'text', n: 1 }],
        item.sort === 'comment' ? 'auto-reply comment' : 'auto-reply DM')?.credits ?? 0

      if (item.sort === 'comment') sendCommentReply(item.id, draft)
      else sendReply(item.id, draft)

      const ok = draft.can_answer && draft.reply
      ;(ok ? repondus : rendus).push({
        sort: item.sort, id: item.id, person: item.person,
        asked: item.text, reply: ok ? draft.reply : null,
        missing: ok ? null : (draft.missing ?? null),
        ms: draft.ms ?? null, model: draft.model ?? null,
      })
    } catch (e) {
      // Une réponse ratée ne doit pas arrêter la boucle ni être retentée en
      // rafale : on la laisse en file, le battement suivant la reprendra.
      console.error('[autoreply]', item.sort, item.id, e.message)
    }
  }

  if (repondus.length) {
    push(sessionId, {
      kind: 'autoreply',
      key: 'notif.autoreply', vars: { n: repondus.length },
      title: `${repondus.length} réponse(s) envoyée(s) automatiquement`,
      body: repondus[0].reply?.slice(0, 120) ?? null,
      goto: 'inbox', ref: null,
    })
  }
  if (rendus.length) {
    push(sessionId, {
      kind: 'handback',
      key: 'notif.handback', vars: { n: rendus.length },
      title: `${rendus.length} question(s) qu'il n'a pas voulu deviner`,
      body: rendus[0].missing ?? null,
      goto: 'inbox', ref: null,
    })
  }

  return {
    ran: true,
    answered: repondus,
    handed_back: rendus,
    credits,
    left: balance(sessionId).left,
    waiting: pending(sessionId),
  }
}
