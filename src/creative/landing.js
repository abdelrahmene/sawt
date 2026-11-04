// REAL, not simulated: the agent builds pages the merchant can open.
//
// A landing page is written in three passes — landing-content.js asks the model
// for the copy as JSON, scenes.js turns that JSON's scene descriptions into
// real pictures, landing-render.js draws the result. The storefront is still a
// single generated document, because a grid of cards has no spine worth
// enforcing and the model does it well.
//
// Everything built here is also a row in the database, so the Sites screen can
// list it, a domain can point at it, and an order posted from it has somewhere
// to land.
import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { ROOT } from '../config.js'
import { chat, visibleAnswer } from '../models/llm.js'
import { insert, run, one, now, J } from '../db.js'
import { siteFor } from '../sites.js'
import { landingContent } from './landing-content.js'
import { renderLanding } from './landing-render.js'
import { renderScenes } from './scenes.js'
import { normaliseOptions, briefFor, slotsFor } from './landing-options.js'

export const OUT_DIR = join(ROOT, 'out')

/**
 * A product named in Arabic has no ASCII left once you strip it, so the naive
 * slug collapsed every product to "produit" and each page silently overwrote
 * the last — a two-product shop shipped with both buttons pointing at the
 * casquette. Latin names keep a readable slug; anything else gets a short
 * digest of the name, which is stable (the same product always lands on the
 * same file) and unique.
 */
/* La marque de la boutique dans le nom du fichier.
   SANS elle, deux sessions qui vendent le même produit écrivaient le MÊME
   fichier et, pire, partageaient la même ligne en base : la requête
   `SELECT id FROM pages WHERE url=?` retrouvait la ligne de l'autre et la
   mettait à jour au lieu d'en créer une. Mesuré le 01/11/2026 — la seconde
   session voyait « 0 page » alors qu'elle venait d'en construire une, et le
   contenu de la première avait été remplacé sans un mot.
   Quatre caractères suffisent : le nom reste lisible, et une session sans
   identifiant (le banc d'essai, la ligne de commande) garde l'ancien nom. */
const marque = (sessionId) =>
  sessionId ? '-' + createHash('sha1').update(String(sessionId)).digest('hex').slice(0, 4) : ''

// `sites.shop` est NOT NULL : un appel hors session, sans nom, doit quand
// même pouvoir ouvrir une enseigne plutôt que de faire échouer l'INSERT.
const txtOuBoutique = (v) => String(v ?? '').trim() || 'Boutique'

export function slugify(name) {
  const ascii = String(name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  if (ascii.length >= 3) return ascii
  const digest = createHash('sha1').update(String(name ?? '')).digest('hex').slice(0, 8)
  return ascii ? `${ascii}-${digest}` : digest
}

/**
 * Copy from the model, pictures from the model, layout from code.
 *
 * This used to ask muse-spark for a whole HTML document. It produced good
 * pages and unpredictable ones in roughly equal measure: sections appearing
 * and vanishing between runs, right-to-left handled differently each time,
 * and once in three tries the product photo left out altogether.
 *
 * Splitting it fixed the structure but left the page plain, because the only
 * picture on it was the merchant's own photo. The scenes close that gap: four
 * generated images, one per section, from descriptions the copy model wrote
 * for exactly that purpose and which nothing used to read.
 */
export async function buildLandingPage({
  product, price_dzd, angle, language, images = [], shop, notes, variants = [],
  sessionId = null, siteId = null, freshScenes = false, options = {}, onProgress = () => {},
}) {
  // The merchant's settings, filled in with the defaults. Nothing downstream
  // reads the raw object, so an option that was never sent cannot leak through
  // as `undefined` and change the page by accident.
  const o = normaliseOptions({ ...options, language: language ?? options.language })
  const slots = slotsFor(o)
  if (o.photos.length) images = o.photos

  // Un chemin local pour le modèle, une URL servie pour la page. Les photos
  // du marchand vivent dans out/, celles du catalogue dans fixtures/ — les
  // deux doivent se résoudre, sinon un produit importé perd sa photo.
  const localPath = (u) =>
    /^https?:/.test(u) ? u : join(ROOT, String(u).replace(/^\//, ''))

  onProgress({ phase: 'copy', label: product })
  const content = await landingContent({
    product, price_dzd, angle, language: o.language, shop, notes,
    extra: briefFor(o),
    photos: images.map(localPath),
  })
  if (o.colorMode === 'impose' && o.color) content.theme.primary = o.color

  const slug = slugify(product)
  let scenes = {}, sceneFails = [], reused = 0, sceneFrom = 'texte', isolated = null
  if (slots.length) {
    onProgress({ phase: 'scenes', label: product })
    const r = await renderScenes(content.scenes, {
      slug, only: slots, scenario: o.scenario, force: freshScenes, onProgress,
      // LA correction qui change la qualité de la page : les scènes partent
      // de la photo du produit, pas d'une description de produit. La photo 0
      // fait autorité, comme le dit la consigne de fidélité.
      photo: images.length ? localPath(images[0]) : null,
      visual: content.visual,
    }).catch((e) => {
      // A page without its scenery is still a page. A page that threw is not.
      return { images: {}, failed: [{ slot: 'all', error: e.message }], asked: slots.length, reused: 0 }
    })
    scenes = r.images
    sceneFails = r.failed
    reused = r.reused ?? 0
    sceneFrom = r.from ?? 'texte'
    isolated = r.isolated ?? null

    // Une scène ratée devient la VRAIE photo du produit, pas un trou.
    // La page reste complète et reste vraie, même quand l'endpoint image
    // lâche — ce qui arrive, c'est le service le moins fiable du projet.
    if (images.length) for (const f of sceneFails) if (!scenes[f.slot]) scenes[f.slot] = images[0]
  }

  const file = `lp-${slug}${marque(sessionId)}.html`
  const url = `/out/${file}`

  /* La page appartient à une boutique.
     Elle sortait avec `site=NULL` : l'agent annonçait « ta page est prête »,
     le marchand ouvrait l'écran Sites et n'y trouvait rien. La boutique de la
     session est donc créée ici si elle n'existe pas encore — nommée d'après
     elle quand on la connaît, d'après le produit sinon, et renommée le jour
     où le marchand la nomme. `buildSite` passe la sienne : on ne la redérive
     pas, sinon la page du deuxième produit fonderait une deuxième enseigne. */
  const site = siteId
    ? { id: siteId, shop }
    : siteFor(sessionId, { shop, fallback: product, language: o.language })
  const monSite = site?.id ?? null

  // The row goes in before the render so the form can carry its id, which is
  // what connects an order on the page back to the page that sold it.
  const existing = one('SELECT id FROM pages WHERE url=?', url)
  const pageId = existing?.id ?? insert(
    `INSERT INTO pages(site,session,product,slug,url,price_dzd,angle,bytes,theme,content,at)
     VALUES(?,?,?,?,?,?,?,0,?,?,?)`,
    monSite, sessionId, product, slug, url, Math.round(price_dzd ?? 0), angle ?? null,
    J(content.theme), J(content), now()
  )

  const html = renderLanding(content, { images, scenes, shop, pageId, opts: o, variants })
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, file), html, 'utf8')

  // `COALESCE` : une page reconstruite garde sa boutique si celle du tour est
  // inconnue — rebâtir une page ne doit pas la détacher de l'enseigne.
  run('UPDATE pages SET site=COALESCE(?,site), bytes=?, theme=?, content=?, price_dzd=?, angle=? WHERE id=?',
    monSite, html.length, J(content.theme), J(content), Math.round(price_dzd ?? 0), angle ?? null, pageId)

  return {
    id: pageId, file, url, bytes: html.length,
    // La boutique remonte avec la page : l'écran du chat peut dire dans
    // laquelle elle est entrée, et l'agent n'a pas à le deviner.
    site_id: monSite, shop: site?.shop ?? shop ?? null,
    product, price_dzd, angle, language: o.language, options: o,
    images: images.length,
    scenes: Object.keys(scenes),
    scenes_reused: reused,
    scenes_failed: sceneFails,
    // Dit à l'écran d'où viennent les images de la page : « depuis ta photo »
    // n'est pas la même promesse que « depuis une description ».
    scenes_from: sceneFrom,
    isolated,
    sections: {
      problem: !!content.problem.title, solution: !!content.solution.title,
      benefits: content.benefits.length, features: content.features.length,
      steps: content.steps.length, faq: content.faq.length,
    },
    theme: content.theme,
  }
}

/**
 * A whole shop: one landing page per product, then a home page that links
 * them. Built product-first so the home page can be given the real hrefs
 * instead of inventing them — a model asked to link pages it has not seen
 * writes plausible paths that 404.
 */
/* ⚠️ `language` vaut `null` par défaut, et NON `'ar'`.
   Mesuré le 04/11 : une boutique bâtie en français revenait en arabe RTL dès
   que le marchand demandait à la renommer. La cause n'était pas le renommage
   mais cette valeur par défaut : `siteFor()` recevait toujours « ar », donc
   ne pouvait pas distinguer « le marchand veut de l'arabe » de « personne n'a
   rien demandé » — et écrasait la langue enregistrée à chaque passage.
   Une valeur par défaut posée ici devient une intention là-bas. */
export async function buildSite({ shop_name, tagline, products, language = null, sessionId = null, options = {}, onProgress = () => {} }) {
  // Ce qui sert à ÉCRIRE la page a besoin d'une langue ; ce qui sert à
  // décider de la boutique a besoin de savoir qu'on n'en a pas demandé.
  const langue = language ?? 'ar'
  /* La boutique de la session, créée OU renommée — pas une deuxième à côté.
     L'INSERT sec d'avant en ouvrait une par appel : deux « fais-moi un site »
     dans la même conversation laissaient deux cartes sur l'écran Sites, dont
     une sans page. Hors session (ligne de commande), la boutique existe quand
     même : c'est l'outil « fais-moi une boutique », pas une page seule. */
  const repli = shop_name ?? products?.[0]?.name
  const site = siteFor(sessionId, { shop: shop_name, fallback: repli, language, tagline })
  const siteId = site?.id ?? insert(
    'INSERT INTO sites(session,shop,tagline,language,at) VALUES(?,?,?,?,?)',
    sessionId, txtOuBoutique(repli), tagline ?? null, langue, now()
  )
  // Le nom retenu, et plus celui reçu : « Shop: null » en tête du prompt de
  // la vitrine donnait une page d'accueil sans enseigne.
  const enseigne = site?.shop ?? txtOuBoutique(repli)

  const pages = []
  const total = products.length + 1
  for (const [i, p] of products.entries()) {
    onProgress({ step: i + 1, total, label: p.name, phase: 'page' })
    try {
      const lp = await buildLandingPage({
        product: p.name, price_dzd: p.price_dzd, angle: p.angle, language: langue,
        images: p.images?.length ? p.images : p.image ? [p.image] : [],
        variants: p.variants ?? [],
        // The studio's settings apply to every page of the shop, minus the
        // photo pick — that one is per product, and reusing it would put the
        // casquette's photo on the sandal's page.
        options: { ...options, photos: [] },
        shop: enseigne, sessionId, siteId,
        onProgress: (e) => onProgress({ ...e, step: i + 1, total }),
      })
      pages.push({ ...p, ...lp })
    } catch (e) {
      pages.push({ ...p, error: e.message })
    }
  }

  const ok = pages.filter((p) => !p.error)
  onProgress({ step: total, total, label: enseigne, phase: 'home' })
  const home = await buildStorefront({
    shop_name: enseigne, language: langue, tagline, sessionId, siteId,
    products: ok.map((p) => ({ name: p.name, price: p.price_dzd, image: p.image, href: p.url })),
  })

  run('UPDATE sites SET home_url=? WHERE id=?', home.url, siteId)

  // Le sous-domaine est remis par `siteFor` au moment où la boutique naît,
  // comme le fait une vraie plateforme avant que le marchand possède un nom.
  // Il n'est plus posé ici : deux endroits qui dérivent un hôte du nom de la
  // boutique, c'est deux sous-domaines sur la même enseigne le jour où elle
  // est renommée.
  const host = one("SELECT host FROM domains WHERE site=? AND kind='subdomain' ORDER BY id LIMIT 1", siteId)?.host ?? null

  return {
    site_id: siteId, shop_name: enseigne, home: home.url, host,
    pages: ok.map((p) => ({ id: p.id, product: p.name, url: p.url, price_dzd: p.price_dzd, scenes: p.scenes })),
    failed: pages.filter((p) => p.error).map((p) => ({ product: p.name, error: p.error })),
    count: ok.length,
  }
}

const STORE_BRIEF = `You write storefronts for Algerian cash-on-delivery shops. Output ONE complete
HTML document and nothing else.

Single file, inline <style>, mobile first, RTL when Arabic, no external assets
beyond the photos given, no fake social proof, no emoji.

Design it like a real shop front, not a list: a tall header with the shop name
and one honest line, then a responsive grid of product cards with generous
whitespace, rounded corners (16px), soft shadows and a hover lift.

Each card MUST show the photo at the URL given for that product — exactly as
written, no prefix, no placeholder — then the name, the price in DZD, and a
link to that product's landing page at the href given. A card with no photo is
a dead card. Prices stay readable in right-to-left text: wrap each one in
<bdi dir="ltr">.`

/**
 * La vitrine n'existait nulle part.
 *
 * Elle écrivait son fichier, rendait une URL, et n'insérait AUCUNE ligne :
 * elle vivait donc uniquement dans la carte du chat. Elle n'apparaissait pas
 * dans l'écran Sites, on ne pouvait pas lui attacher un domaine, elle ne
 * comptait pas dans le badge, et un rechargement la faisait disparaître de
 * partout sauf de la conversation. Deux écrans qui parlent du même objet
 * doivent lire la même table — sinon l'un des deux ment.
 */
export async function buildStorefront({ shop_name, products, language = 'ar', tagline, sessionId = null, siteId = null }) {
  const prompt = [
    `Shop: ${shop_name}`,
    tagline ? `Tagline: ${tagline}` : '',
    `Language: ${language === 'fr' ? 'French' : 'Algerian darija, Arabic script'}`,
    'Products:',
    ...products.map((p) =>
      typeof p === 'string'
        ? `  - ${p}`
        : `  - ${p.name} — ${p.price ?? '?'} DZD — photo: ${p.image ?? 'none'} — href: ${p.href ?? '#'}`
    ),
  ].join('\n')

  const msg = await chat(
    [{ role: 'system', content: STORE_BRIEF }, { role: 'user', content: prompt }],
    { temperature: 0.7 }
  )

  let html = visibleAnswer(msg).trim()
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '').trim()
  if (!/^<!doctype html/i.test(html) && !/^<html/i.test(html)) {
    throw new Error('The model did not return an HTML document.')
  }

  const file = `storefront-${slugify(shop_name) || 'boutique'}${marque(sessionId)}.html`
  const url = `/out/${file}`
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, file), html, 'utf8')

  // buildSite passe son siteId et met home_url à jour lui-même. Appelée
  // seule, la vitrine prend la boutique de la session — par `siteFor`, comme
  // tout le reste, et non plus par un `SELECT ... WHERE session IS ?` à elle
  // qui ouvrait une enseigne par nom de boutique et attrapait les lignes à
  // session NULL dès qu'on l'appelait hors session.
  let id = siteId
  if (!id) {
    id = siteFor(sessionId, { shop: shop_name, fallback: shop_name, language, tagline })?.id
      ?? insert('INSERT INTO sites(session,shop,tagline,language,home_url,at) VALUES(?,?,?,?,?,?)',
        sessionId, txtOuBoutique(shop_name), tagline ?? null, language, url, now())
    run('UPDATE sites SET home_url=?, tagline=COALESCE(?,tagline) WHERE id=?', url, tagline ?? null, id)
  }

  return { file, url, bytes: html.length, shop_name, count: products.length, site_id: id }
}
