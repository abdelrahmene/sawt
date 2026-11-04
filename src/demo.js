/**
 * Ce qu'un juré trouve à l'écran la première fois qu'il lance le projet.
 *
 * 🚨 POURQUOI CE FICHIER EXISTE — MESURÉ, PAS SUPPOSÉ.
 * J'ai cloné le dépôt public dans un dossier vide et lancé `npm start`, comme
 * le fera un juré. Le serveur démarrait, le mode affichait `replay`, la page
 * répondait 200 — et l'application était VIDE : `connected: false`, zéro
 * client, zéro campagne, zéro commande. Tout l'état que je croyais acquis
 * vivait dans `out/sawt.db`, qui est gitignoré et ne part donc jamais avec le
 * dépôt. Le README, lui, promettait « a connected Meta account, nine customers
 * waiting and a campaign six days old ». C'était vrai chez moi et faux chez
 * tout le monde — exactement le genre d'écart qu'un juré découvre en trente
 * secondes et qui coûte plus cher que la fonctionnalité qu'il décrit.
 *
 * Le semis tourne UNE SEULE FOIS, quand la base n'a aucune session. Relancer
 * le serveur ne réécrit rien ; un juré qui a cliqué partout retrouve son état.
 *
 * Il passe par les VRAIES portes — `startLogin`, `reviewPermissions`, `grant`,
 * `importProduct` — et non par des INSERT. C'est ce chemin qui sème la Page,
 * son mur, la boîte de réception et l'historique des campagnes. Un INSERT
 * donnerait un compte branché sur rien.
 */
import { all, one, run, session } from './db.js'
import * as catalog from './catalog.js'
import { startLogin, reviewPermissions, grant, connection, SCOPES } from './meta-sim/connect.js'
import { surfacesOf } from './meta-sim/inbox.js'

/** La session que l'interface ouvre par défaut. */
export const DEMO_SESSION = 'demo'

const BOUTIQUE = 'Dar Ennour'

/* Trois produits, pas un : la vitrine doit avoir des cartes, et choisir parmi
   plusieurs est ce qui rend l'écran catalogue intéressant. Les prix sont
   au-dessus du plancher fournisseur — c'est le marchand qui les fixe, et un
   prix collé au minimum ne raconte aucune décision. */
const PANIER = [
  { id: 'manteau-laine', selling: 15900 },
  { id: 'trench-ceinture', selling: 12500 },
  { id: 'pull-maille', selling: 5400 },
]

/** Y a-t-il déjà quelque chose dans cette base ? */
export const dejaSemee = () =>
  (one('SELECT COUNT(*) n FROM sessions')?.n ?? 0) > 0

/**
 * Sème la session de démonstration. Idempotent par construction : on ne
 * l'appelle que sur une base vierge, et on ne touche à rien d'autre.
 */
export function seedDemo(sid = DEMO_SESSION) {
  session(sid)
  // L'anglais, parce que le jury est anglophone et que la langue de la session
  // décide de celle des pages que l'agent construira devant lui.
  run('UPDATE sessions SET shop=?, language=? WHERE id=?', BOUTIQUE, 'en', sid)

  catalog.seed()
  for (const p of PANIER) catalog.importProduct(sid, p.id, { selling: p.selling })

  startLogin(sid)
  reviewPermissions(sid)
  grant(sid, SCOPES.map((s) => s.name))

  const c = connection(sid)
  const surfaces = surfacesOf(c)   // sème la Page, le mur et la boîte

  const camps = all('SELECT status FROM campaigns WHERE session=?', sid)
  const fils = one(
    `SELECT COUNT(*) n FROM threads WHERE asset IN
       (SELECT id FROM meta_assets WHERE connection=?)`, c.id)?.n ?? 0
  const comms = one(
    `SELECT COUNT(*) n FROM post_comments WHERE status='open' AND post IN
       (SELECT id FROM posts WHERE session=?)`, sid)?.n ?? 0

  return {
    session: sid, shop: BOUTIQUE, produits: PANIER.length,
    surfaces: surfaces.length, campagnes: camps.length,
    conversations: fils, commentaires: comms,
  }
}

/** Au démarrage : si la base est vierge, on la remplit. Sinon on n'y touche pas. */
export function seedDemoSiVide() {
  if (dejaSemee()) return null
  return seedDemo()
}
