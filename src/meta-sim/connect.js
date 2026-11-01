// A SIMULATED "Login with Facebook", end to end.
//
// Why simulate it rather than wire the real thing: the organisers answered
// this directly on Discord — a judge must be able to run the project without
// connecting their own Meta account. A real OAuth flow would stop the demo at
// the first screen, because a judge has no Page, no Business Manager and no ad
// account, and getting ads_management approved takes Meta weeks.
//
// So the flow is staged and the AI is real. Every step below is the real step,
// in the real order, asking for the real permission strings an app like this
// needs — and nothing it returns ever leaves this machine. The token is
// deliberately unusable and says so in its own text.
//
// The assets it seeds are INVENTED. No Page, account, business or customer in
// this file belongs to anyone: they are fictional Algerian shops written for
// the demo. That is not an aesthetic choice — real Page data and real customer
// messages are Platform Data, and they do not belong in a public repository.
import { createHash } from 'node:crypto'
import { all, one, run, insert, now, J, unJ } from '../db.js'
import { seedCampaigns } from './campaigns.js'

/**
 * The permissions this product actually needs, with the real Graph API scope
 * names. A judge reading the consent screen should be able to check them
 * against Meta's docs, line for line.
 */
export const SCOPES = [
  { name: 'public_profile', why: 'Ton nom et ta photo, pour savoir à qui on parle.', why_ar: 'سميتك و تصويرتك', required: true, group: 'compte' },
  { name: 'pages_show_list', why: 'Lister tes pages Facebook pour que tu choisisses laquelle gérer.', why_ar: 'باش نشوف صفحاتك', required: true, group: 'pages' },
  { name: 'pages_read_engagement', why: 'Lire les commentaires et les publications de ta page.', why_ar: 'نقرا التعليقات', required: true, group: 'pages' },
  { name: 'pages_manage_engagement', why: 'Répondre aux commentaires à ta place.', why_ar: 'نجاوب على التعليقات', required: true, group: 'pages' },
  { name: 'pages_messaging', why: 'Lire et répondre aux messages Messenger de tes clients.', why_ar: 'نجاوب في Messenger', required: true, group: 'pages' },
  { name: 'pages_manage_metadata', why: "S'abonner aux notifications de ta page (webhooks).", why_ar: 'نستقبل الإشعارات', required: true, group: 'pages' },
  { name: 'instagram_basic', why: 'Voir le compte Instagram lié à ta page.', why_ar: 'نشوف حساب Instagram', required: false, group: 'instagram' },
  { name: 'instagram_manage_comments', why: 'Répondre aux commentaires Instagram.', why_ar: 'نجاوب تعليقات Instagram', required: false, group: 'instagram' },
  { name: 'instagram_manage_messages', why: 'Répondre aux messages privés Instagram.', why_ar: 'نجاوب الرسائل', required: false, group: 'instagram' },
  { name: 'ads_read', why: 'Lire les résultats de tes campagnes : dépense, coût par commande.', why_ar: 'نقرا نتائج الإشهار', required: true, group: 'publicité' },
  { name: 'ads_management', why: 'Créer, mettre en pause et modifier tes campagnes.', why_ar: 'نسيّر الإشهار', required: true, group: 'publicité' },
  { name: 'business_management', why: 'Accéder à ton Business Manager et à ton compte publicitaire.', why_ar: 'نوصل للـ Business Manager', required: true, group: 'publicité' },
  { name: 'catalog_management', why: 'Tenir ton catalogue produits à jour.', why_ar: 'نحدّث الكتالوغ', required: false, group: 'publicité' },
]

export const REQUIRED_SCOPES = SCOPES.filter((s) => s.required).map((s) => s.name)

// The simulated Facebook user. One person, fictional, used so the consent
// screen has a face on it the way the real one does.
const PERSON = {
  id: 'SIM-10000000000001',
  name: 'Yacine B.',
  initials: 'YB',
  email: 'y.benali@example.dz',
}

// A stable fake id that is obviously fake, so nobody ever mistakes one of
// these for a real Graph id in a screenshot.
const simId = (...parts) =>
  'SIM-' + createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 14).toUpperCase()

/**
 * The shop the demo connects. Invented — see the note at the top of the file.
 *
 * `needs` is the permission each resource actually depends on, and it is
 * enforced below. Refusing a permission has to REMOVE something, or the
 * consent screen is theatre: a merchant who unticks the catalogue and still
 * sees their catalogue has learned that the ticks do not matter, which is the
 * exact habit that gets people to grant everything to everything.
 */
const SEED = {
  business: { name: 'Dar Essabat', id: simId('biz', 'dar-essabat') },
  assets: [
    {
      kind: 'page', needs: 'pages_show_list',
      name: 'صباط دزاير · Sabat Dzair', handle: 'sabat.dzair',
      followers: 18420, meta: { category: 'Chaussures', verified: false, response_rate: 0.74 },
    },
    {
      kind: 'instagram', needs: 'instagram_basic',
      name: '@sabat.dzair', handle: 'sabat.dzair',
      followers: 9137, meta: { linked_page: 'صباط دزاير · Sabat Dzair' },
    },
    {
      kind: 'adaccount', needs: 'ads_read',
      name: 'Dar Essabat — Publicité', currency: 'DZD',
      meta: { timezone: 'Africa/Algiers', spend_cap_dzd: 200000, status: 'ACTIVE', funding: 'CIB •••• 4417' },
    },
    {
      kind: 'pixel', needs: 'business_management',
      name: 'Sabat Dzair — Pixel', meta: { events_7d: 12840, last_event: 'PageView' },
    },
    {
      kind: 'catalog', needs: 'catalog_management',
      name: 'Catalogue Sabat Dzair', meta: { products: 24 },
    },
  ],
}

/* ── the flow ─────────────────────────────────────────────────────────────
   disconnected → account → permissions → connected
   Three screens, the same three the real dialog shows. The state lives in the
   database so a reload in the middle of the flow lands back on the same
   screen, which is exactly what the real dialog does too. */

export function connection(sessionId) {
  const c = one('SELECT * FROM meta_connections WHERE session=? ORDER BY id DESC LIMIT 1', sessionId)
  if (!c) return { status: 'disconnected', simulated: true }
  return {
    ...c,
    scopes: unJ(c.scopes, []),
    declined: unJ(c.declined, []),
    business: unJ(c.business),
    simulated: true,
    assets: assetsOf(c.id),
  }
}

export const assetsOf = (connectionId) =>
  all('SELECT * FROM meta_assets WHERE connection=? ORDER BY id', connectionId)
    .map((a) => ({ ...a, meta: unJ(a.meta, {}) }))

/** Step 1 — the click on "Continuer avec Facebook". */
export function startLogin(sessionId) {
  run('DELETE FROM meta_connections WHERE session=? AND status != ?', sessionId, 'connected')
  const id = insert(
    'INSERT INTO meta_connections(session,status,user_id,user_name,at) VALUES(?,?,?,?,?)',
    sessionId, 'account', PERSON.id, PERSON.name, now()
  )
  return { id, status: 'account', person: PERSON, simulated: true }
}

/** Step 2 — "Continuer en tant que Yacine" lands on the permission review. */
export function reviewPermissions(sessionId) {
  const c = one('SELECT * FROM meta_connections WHERE session=? ORDER BY id DESC LIMIT 1', sessionId)
  if (!c) return startLogin(sessionId)
  run('UPDATE meta_connections SET status=? WHERE id=?', 'permissions', c.id)
  return {
    id: c.id, status: 'permissions', person: PERSON, scopes: SCOPES,
    app: { name: 'Sawt', id: 'SIM-APP-9174820', privacy: 'sawt.local/privacy' },
    simulated: true,
  }
}

/**
 * Step 3 — the grant.
 *
 * The optional scopes can be refused, and refusing them has consequences the
 * UI then shows: decline instagram_manage_messages and the Instagram inbox
 * comes back empty with the scope named as the reason. That is the single most
 * common way a real integration half-works, and the agent has to cope with it
 * rather than pretend.
 */
export function grant(sessionId, granted = []) {
  const c = one('SELECT * FROM meta_connections WHERE session=? ORDER BY id DESC LIMIT 1', sessionId)
  if (!c) throw new Error('Aucune demande de connexion en cours.')

  const asked = SCOPES.map((s) => s.name)
  const ok = asked.filter((s) => granted.includes(s) || REQUIRED_SCOPES.includes(s))
  const declined = asked.filter((s) => !ok.includes(s))

  const token = `SIMULATED-TOKEN-NOT-VALID-ON-GRAPH-${simId('tok', sessionId, String(c.id))}`
  run(
    `UPDATE meta_connections SET status=?, scopes=?, declined=?, token=?, business=?, granted=? WHERE id=?`,
    'connected', J(ok), J(declined), token, J(SEED.business), now(), c.id
  )

  run('DELETE FROM meta_assets WHERE connection=?', c.id)
  for (const a of SEED.assets) {
    if (a.needs && !ok.includes(a.needs)) continue
    insert(
      `INSERT INTO meta_assets(connection,kind,external_id,name,handle,followers,currency,meta,at)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      c.id, a.kind, simId(a.kind, a.name), a.name, a.handle ?? null,
      a.followers ?? null, a.currency ?? null, J(a.meta ?? {}), now()
    )
  }

  /* Le compte ne part pas de zéro. Un marchand qui branche son Business
     Manager a déjà un passé publicitaire, et c'est ce passé qui rend
     l'agent utile dès la première phrase : il peut comparer. L'écran
     « aucune campagne » juste après une connexion réussie donnait
     l'impression que le branchement n'avait rien rapporté.
     Semé ICI, au moment de la connexion, et pas à la lecture d'un écran :
     les campagnes doivent exister pour l'agent avant que qui que ce soit
     ait ouvert l'onglet Ads. */
  seedCampaigns(sessionId)

  return connection(sessionId)
}

export function disconnect(sessionId) {
  run('DELETE FROM meta_connections WHERE session=?', sessionId)
  return { status: 'disconnected', simulated: true }
}

/**
 * The response the real Graph API would return for this connection.
 *
 * Shown in the UI behind a "voir la réponse Graph" toggle. It is the honest
 * way to make a simulated screen verifiable: a judge who knows the API can
 * check that the shape is right, and one who does not can see that we know
 * what the real thing looks like.
 */
export function graphEcho(sessionId) {
  const c = connection(sessionId)
  if (c.status !== 'connected') return null
  const pages = c.assets.filter((a) => a.kind === 'page')
  const ig = c.assets.find((a) => a.kind === 'instagram')
  const ad = c.assets.find((a) => a.kind === 'adaccount')
  return {
    'GET /v21.0/me/accounts': {
      data: pages.map((p) => ({
        id: p.external_id,
        name: p.name,
        category: p.meta.category ?? 'Shopping & Retail',
        access_token: 'SIMULATED-PAGE-TOKEN',
        tasks: ['ADVERTISE', 'ANALYZE', 'CREATE_CONTENT', 'MESSAGING', 'MODERATE'],
      })),
    },
    'GET /v21.0/me/permissions': {
      data: [
        ...c.scopes.map((s) => ({ permission: s, status: 'granted' })),
        ...c.declined.map((s) => ({ permission: s, status: 'declined' })),
      ],
    },
    [`GET /v21.0/${pages[0]?.external_id ?? 'PAGE_ID'}?fields=instagram_business_account`]: ig
      ? { instagram_business_account: { id: ig.external_id }, id: pages[0]?.external_id }
      : { id: pages[0]?.external_id, error_hint: 'instagram_basic non accordé' },
    'GET /v21.0/me/adaccounts': ad
      ? { data: [{ id: `act_${ad.external_id}`, name: ad.name, currency: ad.currency, account_status: 1 }] }
      : { data: [] },
  }
}
