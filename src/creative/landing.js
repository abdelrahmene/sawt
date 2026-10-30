// REAL, not simulated: the agent builds pages the merchant can open.
//
// A landing page is written in two halves — landing-content.js asks the model
// for the copy as JSON, landing-render.js draws it. The storefront is still a
// single generated document, because a grid of cards has no spine worth
// enforcing and the model does it well.
import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { ROOT } from '../config.js'
import { chat, visibleAnswer } from '../models/llm.js'
import { landingContent } from './landing-content.js'
import { renderLanding } from './landing-render.js'

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
 * Copy from the model, layout from code.
 *
 * This used to ask muse-spark for a whole HTML document. It produced good
 * pages and unpredictable ones in roughly equal measure: sections appearing
 * and vanishing between runs, right-to-left handled differently each time,
 * and once in three tries the product photo left out altogether. Now the model
 * writes the words as JSON and renderLanding draws them, so every page has the
 * same spine — problem, solution, proof you can see, three steps, the order
 * form — and the photo is never optional.
 */
export async function buildLandingPage({ product, price_dzd, angle, language = 'ar', images = [], shop, notes }) {
  const content = await landingContent({
    product, price_dzd, angle, language, shop, notes,
    // Local paths are inlined as data URLs for the vision call; the page
    // itself references the served /out/ URLs.
    photos: images.map((u) => (u.startsWith('/out/') ? join(ROOT, u.replace(/^\//, '')) : u)),
  })

  const html = renderLanding(content, { images, shop })

  const file = `lp-${slugify(product)}.html`
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, file), html, 'utf8')

  return {
    file, url: `/out/${file}`, bytes: html.length,
    product, price_dzd, angle, language,
    images: images.length,
    sections: {
      problem: !!content.problem.title, solution: !!content.solution.title,
      benefits: content.benefits.length, features: content.features.length,
      steps: content.steps.length, faq: content.faq.length,
    },
    theme: content.theme,
    scenes: content.scenes,
  }
}

/**
 * A whole shop: one landing page per product, then a home page that links
 * them. Built product-first so the home page can be given the real hrefs
 * instead of inventing them — a model asked to link pages it has not seen
 * writes plausible paths that 404.
 */
export async function buildSite({ shop_name, tagline, products, language = 'ar', onProgress = () => {} }) {
  const pages = []
  const total = products.length + 1
  for (const [i, p] of products.entries()) {
    onProgress({ step: i + 1, total, label: p.name, phase: 'page' })
    try {
      const lp = await buildLandingPage({
        product: p.name,
        price_dzd: p.price_dzd,
        angle: p.angle,
        language,
        images: p.image ? [p.image] : [],
        shop: shop_name,
      })
      pages.push({ ...p, ...lp })
    } catch (e) {
      pages.push({ ...p, error: e.message })
    }
  }

  const ok = pages.filter((p) => !p.error)
  onProgress({ step: total, total, label: shop_name, phase: 'home' })
  const home = await buildStorefront({
    shop_name,
    language,
    products: ok.map((p) => ({ name: p.name, price: p.price_dzd, image: p.image, href: p.url })),
    tagline,
  })

  return {
    shop_name,
    home: home.url,
    pages: ok.map((p) => ({ product: p.name, url: p.url, price_dzd: p.price_dzd })),
    failed: pages.filter((p) => p.error).map((p) => ({ product: p.name, error: p.error })),
    count: ok.length,
  }
}

const STORE_BRIEF = `You write storefronts for Algerian cash-on-delivery shops. Output ONE complete
HTML document and nothing else.

Same rules as a landing page: single file, inline <style>, mobile first, RTL
when Arabic, no external assets beyond the photos given, no fake social proof.

A storefront is a grid of products. Each card MUST show the photo at the URL
given for that product — exactly as written, no prefix, no placeholder — then
the name, the price in DZD, and a link to that product's landing page at the
href given. A card with no photo is a dead card.
Above the grid: the shop name and one honest line about what it sells.`

export async function buildStorefront({ shop_name, products, language = 'ar', tagline }) {
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

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, 'storefront.html'), html, 'utf8')
  return { file: 'storefront.html', url: '/out/storefront.html', bytes: html.length, shop_name, count: products.length }
}
