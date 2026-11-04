// Sites, pages and domains.
//
// The domain part is the one place in this project where the "simulated"
// label would have been a cop-out, because checking a DNS record costs
// nothing and Node can do it: resolveTxt and resolve4 are real lookups
// against real nameservers. So a merchant who actually owns boutique.dz can
// point it here and watch it verify for real, and the demo keeps a clearly
// marked shortcut for the case where nobody owns anything.
//
// The states are the ones a merchant really walks through, and naming them
// honestly is most of the value: a domain that says `dns_pending` with the
// exact record to add is useful, where a domain that says "erreur" is not.
import { promises as dns } from 'node:dns'
import { randomBytes, createHash } from 'node:crypto'
import { all, one, run, insert, now, J, unJ } from './db.js'

const HOST_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

export const STATES = {
  draft: 'ajouté, rien à vérifier encore',
  dns_pending: "en attente du DNS — l'enregistrement n'est pas encore visible",
  verified: 'DNS vérifié',
  live: 'en ligne',
  failed: 'la vérification a échoué',
}

export function sites(sessionId = null) {
  // Le rattrapage se fait à la lecture, par `adopt()` — la seule porte. Voir
  // sa raison d'être plus bas : une page construite avant ce correctif a une
  // session et pas de boutique, et personne ne va lancer une migration.
  adopt(sessionId)
  const rows = sessionId
    ? all('SELECT * FROM sites WHERE session=? ORDER BY id DESC', sessionId)
    : all('SELECT * FROM sites ORDER BY id DESC')
  return rows.map((s) => ({
    ...s,
    pages: all('SELECT id,product,url,price_dzd,angle,bytes,at FROM pages WHERE site=? ORDER BY id', s.id),
    domains: all('SELECT * FROM domains WHERE site=? ORDER BY id', s.id),
    orders: one('SELECT COUNT(*) n FROM orders WHERE page IN (SELECT id FROM pages WHERE site=?)', s.id)?.n ?? 0,
  }))
}

export function site(id) {
  const s = one('SELECT * FROM sites WHERE id=?', id)
  if (!s) return null
  return {
    ...s,
    pages: all(`SELECT p.*, (SELECT COUNT(*) FROM orders WHERE page=p.id) orders
                FROM pages p WHERE p.site=? ORDER BY p.id`, id)
      .map((p) => ({ ...p, theme: unJ(p.theme, {}), content: undefined })),
    domains: all('SELECT * FROM domains WHERE site=? ORDER BY id', id),
  }
}

/** Pages built outside a site (a single landing page, which is the common case).
 *
 *  Bornées à la session. Sans le filtre, l'écran Sites listait les pages de
 *  TOUTES les sessions tout en étant servi pour une seule : le badge du rail
 *  comptait quatre pages et l'en-tête de l'écran en annonçait dix-neuf, dont
 *  seize appartenaient à quelqu'un d'autre. Un écran qui montre le travail
 *  d'une autre session n'est pas « plus complet », il est faux. */
export const loosePages = (session = null) =>
  all(`SELECT p.*, (SELECT COUNT(*) FROM orders WHERE page=p.id) orders
       FROM pages p WHERE p.site IS NULL AND (? IS NULL OR p.session = ?) ORDER BY p.id DESC`, session, session)
    .map((p) => ({ ...p, theme: unJ(p.theme, {}), content: undefined }))

/* ── la boutique d'une session ────────────────────────────────────────────
   UNE session = UNE boutique. Ce n'est pas un raccourci : la table `sessions`
   n'a qu'une colonne `shop`, et le marchand qui parle à l'agent tient un
   commerce, pas un portefeuille d'enseignes.

   POURQUOI CETTE FONCTION EXISTE. `build_landing_page` insérait sa page avec
   `site=NULL`, et seul `build_site` — l'outil le plus cher de l'app, celui
   que le modèle appelle le moins — créait un site. Mesuré le 04/11/2026 sur
   out/sawt.db : 10 pages dont 2 rattachées à une boutique, et UNE boutique
   pour la base entière. Une session neuve n'avait donc ni l'une ni l'autre,
   et l'écran Sites s'ouvrait vide dans la seconde qui suivait l'annonce
   « ta page est prête ». Deux écrans, deux vérités, et c'est l'écran qui
   avait tort — le même défaut que le semis de la boîte de réception.

   Toute création de boutique passe maintenant par ici, et par ici seulement. */

const txt = (v) => { const s = String(v ?? '').trim(); return s || null }

/** L'étiquette d'hôte tirée d'un nom de boutique. Un nom en arabe ne laisse
 *  aucun caractère permis : on retombe alors sur `boutique`. */
const etiquette = (nom) =>
  String(nom ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

/**
 * Le sous-domaine de la plateforme, donné à la boutique dès qu'elle existe —
 * comme le fait une vraie plateforme avant que le marchand possède un nom.
 *
 * ⚠️ `domains.host` est UNIQUE, et deux sessions qui vendent la même chose
 * dérivent le MÊME hôte. Sans marque de session, l'INSERT de la seconde
 * échouait, donc la création de sa boutique, donc la construction de sa page
 * entière. C'est la collision inter-sessions déjà corrigée sur les noms de
 * fichiers (`marque()` dans creative/landing.js) : on ne la réintroduit pas.
 * Et le `try` reste, parce qu'une boutique sans sous-domaine vaut mieux
 * qu'une page qui ne se construit pas.
 */
function sousDomaine(siteId, sessionId, shop) {
  const base = etiquette(shop) || 'boutique'
  const marque = createHash('sha1').update(String(sessionId)).digest('hex').slice(0, 4)
  for (const host of [`${base}.sawt.dz`, `${base}-${marque}.sawt.dz`]) {
    if (one('SELECT 1 FROM domains WHERE host=?', host)) continue
    try {
      insert('INSERT INTO domains(site,host,kind,status,at) VALUES(?,?,?,?,?)',
        siteId, host, 'subdomain', 'live', now())
      return host
    } catch { /* course entre deux écritures : on s'en passe */ }
  }
  return null
}

/**
 * The shop a session owns, created on demand.
 *
 * `shop` is authoritative — a name the merchant actually gave — and renames
 * the existing shop. `fallback` is only ever used to name a shop at creation
 * time: without that distinction, a product page built before the merchant
 * had named anything renamed their shop after the product, every time.
 */
export function siteFor(sessionId, { shop = null, fallback = null, language = null, tagline = null } = {}) {
  // Sans session, pas de boutique. Le banc d'essai et `try-landing` écrivent
  // des pages hors de tout commerce : elles doivent rester des pages seules,
  // pas fonder une enseigne à chaque exécution.
  if (!sessionId) return null

  const s = one('SELECT shop,language FROM sessions WHERE id=?', sessionId)
  const nom = txt(shop) ?? txt(s?.shop)
  const langue = language ?? s?.language ?? 'ar'

  // ⚠️ `session=?`, jamais `session IS ?` : avec un identifiant non nul les
  // deux se valent, mais le second attrape les lignes historiques à session
  // NULL le jour où quelqu'un passe null. L'isolation de session est le seul
  // invariant qui ne se négocie pas dans ce fichier.
  let site = (nom && one('SELECT * FROM sites WHERE session=? AND shop=? COLLATE NOCASE ORDER BY id LIMIT 1', sessionId, nom))
    || one('SELECT * FROM sites WHERE session=? ORDER BY id LIMIT 1', sessionId)

  if (site) {
    // Le marchand a fini par nommer sa boutique : on renomme la sienne plutôt
    // que d'en ouvrir une deuxième à côté. Deux « fais-moi un site » dans la
    // même conversation laissaient deux cartes sur l'écran, dont une vide.
    if (nom && site.shop !== nom) {
      // ⚠️ `language=COALESCE(?, language)` et l'argument BRUT, pas `langue`.
      // Mesuré le 04/11 : une boutique bâtie en français revenait en arabe RTL
      // après un simple « change le nom ». `langue` porte déjà le repli « ar »,
      // donc l'écrire ici écrasait la langue enregistrée à chaque renommage.
      // Un renommage renomme — il ne doit rien décider d'autre.
      run('UPDATE sites SET shop=?, tagline=COALESCE(?,tagline), language=COALESCE(?,language) WHERE id=?',
        nom, txt(tagline), language, site.id)
    } else if (txt(tagline) && !site.tagline) {
      run('UPDATE sites SET tagline=? WHERE id=?', txt(tagline), site.id)
    } else {
      return site
    }
    return one('SELECT * FROM sites WHERE id=?', site.id)
  }

  const shopName = nom ?? txt(fallback) ?? 'Boutique'
  const id = insert('INSERT INTO sites(session,shop,tagline,language,at) VALUES(?,?,?,?,?)',
    sessionId, shopName, txt(tagline), langue, now())
  sousDomaine(id, sessionId, shopName)
  return one('SELECT * FROM sites WHERE id=?', id)
}

/**
 * Pages built in a session but left with no shop, adopted by its shop — on
 * READ.
 *
 * POURQUOI À LA LECTURE. C'est le motif déjà établi ici par `surfacesOf()`,
 * `connection()`, `dueNow()` et `catchUp()`, et pour la même raison : une app
 * qui doit tourner en continu pour que ses données soient justes a des
 * données fausses dès qu'on la ferme. Les pages écrites par la version
 * précédente sont rattrapées au premier affichage — sans migration, sans
 * minuterie, sans script à lancer.
 *
 * Idempotent : la deuxième lecture ne trouve plus rien à faire.
 *
 * ⚠️ Rien de ce qui appartient à une autre session n'est touché, et les
 * lignes historiques à session NULL restent invisibles : `session=?` avec un
 * identifiant non nul ne les attrape pas (en SQL `NULL = 'x'` vaut NULL, pas
 * vrai), et sans session la fonction rend la main avant d'écrire.
 */
export function adopt(sessionId) {
  if (!sessionId) return 0
  const orphelines = all('SELECT id,product,content FROM pages WHERE site IS NULL AND session=? ORDER BY id', sessionId)
  if (!orphelines.length) return 0

  // La langue vient des PAGES qu'on adopte, pas d'un repli. Sans ça, une
  // boutique dont toutes les pages sont en français se fondait en « ar » —
  // l'enseigne annonçait une langue que pas une de ses pages ne parlait.
  let langue = null
  for (const p of orphelines) {
    try { langue = JSON.parse(p.content)?.language ?? null } catch { /* contenu illisible */ }
    if (langue) break
  }

  const site = siteFor(sessionId, { fallback: orphelines[0].product, language: langue })
  if (!site) return 0
  return Number(run('UPDATE pages SET site=? WHERE site IS NULL AND session=?', site.id, sessionId).changes ?? 0)
}

/* ── domains ──────────────────────────────────────────────────────────── */

/** The IPv4 a custom domain is told to point at. Configurable, because in a
 *  real deployment it is the load balancer, not this laptop. */
export const EDGE_IP = process.env.SAWT_EDGE_IP || '203.0.113.10'   // RFC 5737 doc range

export function addDomain(siteId, host, kind = 'custom') {
  const clean = String(host ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!HOST_RE.test(clean)) throw new Error(`« ${clean} » n'est pas un nom de domaine valide.`)
  if (one('SELECT 1 FROM domains WHERE host=?', clean)) throw new Error(`${clean} est déjà enregistré.`)

  const token = 'sawt-verify=' + randomBytes(10).toString('hex')
  const id = insert('INSERT INTO domains(site,host,kind,status,token,at) VALUES(?,?,?,?,?,?)',
    siteId, clean, kind, kind === 'subdomain' ? 'live' : 'dns_pending', token, now())
  return domain(id)
}

export const domain = (id) => {
  const d = one('SELECT * FROM domains WHERE id=?', id)
  if (!d) return null
  return { ...d, records: records(d), state_label: STATES[d.status] ?? d.status }
}

/** The exact rows to paste into a registrar's panel. */
export function records(d) {
  if (d.kind === 'subdomain') return []
  const apex = d.host.split('.').length === 2
  return [
    { type: 'TXT', name: `_sawt.${d.host}`, value: d.token, why: 'prouve que le domaine est à toi' },
    apex
      ? { type: 'A', name: d.host, value: EDGE_IP, why: 'envoie le trafic vers la boutique' }
      : { type: 'CNAME', name: d.host, value: 'edge.sawt.dz', why: 'envoie le trafic vers la boutique' },
  ]
}

/**
 * A real DNS check.
 *
 * Both lookups are attempted and reported separately, because "le TXT est là
 * mais le A pointe ailleurs" is the actual situation nine times out of ten and
 * a single red cross tells the merchant nothing.
 */
export async function verifyDomain(id) {
  const d = one('SELECT * FROM domains WHERE id=?', id)
  if (!d) throw new Error('Domaine introuvable.')
  if (d.kind === 'subdomain') {
    run('UPDATE domains SET status=?, checked=? WHERE id=?', 'live', now(), id)
    return { ...domain(id), checks: [], note: 'Sous-domaine de la plateforme — rien à vérifier.' }
  }

  const checks = []

  try {
    const txt = (await dns.resolveTxt(`_sawt.${d.host}`)).flat()
    const found = txt.some((v) => v.trim() === d.token)
    checks.push({ type: 'TXT', ok: found, got: txt.slice(0, 4), want: d.token,
      why: found ? 'propriété prouvée' : 'le jeton attendu n\'est pas dans les enregistrements TXT' })
  } catch (e) {
    checks.push({ type: 'TXT', ok: false, error: e.code ?? e.message,
      why: e.code === 'ENOTFOUND' || e.code === 'ENODATA' ? 'aucun TXT sur _sawt — pas encore propagé' : 'échec de la résolution' })
  }

  try {
    const a = await dns.resolve4(d.host)
    const ok = a.includes(EDGE_IP)
    checks.push({ type: 'A', ok, got: a, want: EDGE_IP,
      why: ok ? 'le trafic arrive bien ici' : `pointe vers ${a.join(', ')}` })
  } catch (e) {
    checks.push({ type: 'A', ok: false, error: e.code ?? e.message, why: 'aucun A résolu' })
  }

  const txtOk = checks.find((c) => c.type === 'TXT')?.ok
  const status = txtOk && checks.find((c) => c.type === 'A')?.ok ? 'live' : txtOk ? 'verified' : 'dns_pending'
  run('UPDATE domains SET status=?, checked=? WHERE id=?', status, now(), id)
  return { ...domain(id), checks, simulated: false }
}

/**
 * The demo shortcut, labelled as one.
 *
 * Nobody in a three-minute video waits for DNS to propagate, and a judge does
 * not own a domain to point at this. So the screen offers this button, and
 * every row it produces says `simulated` — the one thing that must never
 * happen is a simulated verification that looks measured.
 */
export function pretendVerified(id) {
  const d = one('SELECT * FROM domains WHERE id=?', id)
  if (!d) throw new Error('Domaine introuvable.')
  run('UPDATE domains SET status=?, checked=? WHERE id=?', 'live', now(), id)
  return { ...domain(id), simulated: true, note: 'Propagation DNS simulée pour la démonstration.' }
}

export function removeDomain(id) {
  run('DELETE FROM domains WHERE id=?', id)
  return { ok: true }
}

/* ── orders from the generated pages ──────────────────────────────────── */

/**
 * Une commande arrive d'une page publique. Donc rien de ce qu'elle dit sur
 * l'argent n'est cru.
 *
 * Le prix et le nom du produit étaient repris du formulaire, alors que la
 * page est en base et connaît les deux. N'importe qui pouvait poster
 * `price=1` et le marchand lisait 1 DA dans ses commandes. Quand la page est
 * identifiée, le serveur prend SON prix ; le champ du formulaire ne sert plus
 * que de repli pour une page qu'on ne retrouve pas.
 */
export function recordOrder(data) {
  const pageId = Number(data.page) || null
  const p = pageId ? one('SELECT id,product,price_dzd FROM pages WHERE id=?', pageId) : null
  const prix = p?.price_dzd ?? (Number(data.price) || null)
  const id = insert(
    `INSERT INTO orders(page,product,name,phone,wilaya,commune,qty,price,variant,source,at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    p?.id ?? null, p?.product ?? data.product ?? null, data.name ?? null, data.phone ?? null,
    data.wilaya ?? null, data.commune ?? null, Number(data.qty) || 1, prix,
    // La taille telle que le client l'a choisie. Bornée, parce qu'un champ
    // de formulaire public n'a aucune raison de contenir un roman.
    String(data.variant ?? '').trim().slice(0, 40) || null,
    'landing', now()
  )
  return one('SELECT * FROM orders WHERE id=?', id)
}

// Même raison : une commande posée sur la page d'une autre session n'a rien
// à faire dans celle-ci. Ce sont les seules lignes que rien ne simule, donc
// les attribuer au mauvais marchand est la pire des confusions possibles.
export const orders = (session = null, limit = 50) =>
  all(`SELECT o.*, p.url page_url FROM orders o LEFT JOIN pages p ON p.id=o.page
       WHERE ? IS NULL OR p.session = ?
       ORDER BY o.id DESC LIMIT ?`, session, session, limit)

export { J, unJ }
