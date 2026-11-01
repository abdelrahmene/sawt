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
  product, price_dzd, angle, language, images = [], shop, notes,
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

  const file = `lp-${slug}.html`
  const url = `/out/${file}`

  // The row goes in before the render so the form can carry its id, which is
  // what connects an order on the page back to the page that sold it.
  const existing = one('SELECT id FROM pages WHERE url=?', url)
  const pageId = existing?.id ?? insert(
    `INSERT INTO pages(site,session,product,slug,url,price_dzd,angle,bytes,theme,content,at)
     VALUES(?,?,?,?,?,?,?,0,?,?,?)`,
    siteId, sessionId, product, slug, url, Math.round(price_dzd ?? 0), angle ?? null,
    J(content.theme), J(content), now()
  )

  const html = renderLanding(content, { images, scenes, shop, pageId, opts: o })
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, file), html, 'utf8')

  run('UPDATE pages SET site=COALESCE(?,site), bytes=?, theme=?, content=?, price_dzd=?, angle=? WHERE id=?',
    siteId, html.length, J(content.theme), J(content), Math.round(price_dzd ?? 0), angle ?? null, pageId)

  return {
    id: pageId, file, url, bytes: html.length,
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
export async function buildSite({ shop_name, tagline, products, language = 'ar', sessionId = null, options = {}, onProgress = () => {} }) {
  const siteId = insert(
    'INSERT INTO sites(session,shop,tagline,language,at) VALUES(?,?,?,?,?)',
    sessionId, shop_name, tagline ?? null, language, now()
  )

  const pages = []
  const total = products.length + 1
  for (const [i, p] of products.entries()) {
    onProgress({ step: i + 1, total, label: p.name, phase: 'page' })
    try {
      const lp = await buildLandingPage({
        product: p.name, price_dzd: p.price_dzd, angle: p.angle, language,
        images: p.image ? [p.image] : [],
        // The studio's settings apply to every page of the shop, minus the
        // photo pick — that one is per product, and reusing it would put the
        // casquette's photo on the sandal's page.
        options: { ...options, photos: [] },
        shop: shop_name, sessionId, siteId,
        onProgress: (e) => onProgress({ ...e, step: i + 1, total }),
      })
      pages.push({ ...p, ...lp })
    } catch (e) {
      pages.push({ ...p, error: e.message })
    }
  }

  const ok = pages.filter((p) => !p.error)
  onProgress({ step: total, total, label: shop_name, phase: 'home' })
  const home = await buildStorefront({
    shop_name, language, tagline, sessionId, siteId,
    products: ok.map((p) => ({ name: p.name, price: p.price_dzd, image: p.image, href: p.url })),
  })

  run('UPDATE sites SET home_url=? WHERE id=?', home.url, siteId)

  // Every shop gets a subdomain the moment it exists, the way a real platform
  // hands you one before you own a domain.
  const host = `${slugify(shop_name) || 'boutique'}.sawt.dz`
  if (!one('SELECT 1 FROM domains WHERE host=?', host)) {
    insert('INSERT INTO domains(site,host,kind,status,at) VALUES(?,?,?,?,?)',
      siteId, host, 'subdomain', 'live', now())
  }

  return {
    site_id: siteId, shop_name, home: home.url, host,
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

  const file = `storefront-${slugify(shop_name) || 'boutique'}.html`
  const url = `/out/${file}`
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, file), html, 'utf8')

  // buildSite passe son siteId et met home_url à jour lui-même. Appelée
  // seule, la vitrine se donne un site, pour exister sur l'écran Sites
  // comme n'importe quelle autre page.
  let id = siteId
  if (!id) {
    const deja = one('SELECT id FROM sites WHERE session IS ? AND shop=?', sessionId, shop_name)
    id = deja?.id ?? insert('INSERT INTO sites(session,shop,tagline,language,home_url,at) VALUES(?,?,?,?,?,?)',
      sessionId, shop_name, tagline ?? null, language, url, now())
    run('UPDATE sites SET home_url=?, tagline=COALESCE(?,tagline) WHERE id=?', url, tagline ?? null, id)
  }

  return { file, url, bytes: html.length, shop_name, count: products.length, site_id: id }
}
