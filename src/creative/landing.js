// REAL, not simulated: the agent writes a landing page and the merchant can
// open it. The HTML is produced by muse-spark — the model writes the page, we
// only enforce the shell it has to fit in.
//
// Why constrain it at all: a model asked for "a landing page" returns a lorem
// ipsum template with stock-photo placeholders. Constrained to one product,
// one angle, one price, right-to-left, and a form that posts to a real
// endpoint, it returns something a shop can use this afternoon.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../config.js'
import { chat, visibleAnswer } from '../models/llm.js'

export const OUT_DIR = join(ROOT, 'out')

const BRIEF = `You write landing pages for Algerian cash-on-delivery shops. Output ONE complete
HTML document and nothing else — no explanation, no markdown fence.

Hard requirements:
- Single file. Inline <style>. No external CSS, no framework, no build step.
- No external images except the product photo URLs given to you.
- If the language is Arabic: <html dir="rtl" lang="ar">, and all copy in
  Algerian darija a shopkeeper would actually write — not Modern Standard Arabic.
- Mobile first. Most buyers arrive on a phone, on 4G, through an ad.
- The order form asks for: full name, phone, wilaya, commune, and nothing else.
  Cash on delivery: never ask for an email or a card.
- The form posts to /api/order. Keep the input names: name, phone, wilaya, commune, qty.
- One clear price, in DZD, large. State delivery is paid on receipt.
- Lead with the angle you are given — the whole page argues that one point.
- No invented certifications, no fake reviews, no fake counters, no fake urgency.

Taste: dark, high contrast, generous spacing, one accent colour, a real
typographic hierarchy. It should look like a brand, not a template.`

export async function buildLandingPage({ product, price_dzd, angle, language = 'ar', images = [], shop }) {
  const prompt = [
    `Product: ${product}`,
    `Price: ${price_dzd} DZD`,
    angle ? `Angle to lead with: ${angle}` : '',
    `Language: ${language === 'fr' ? 'French' : 'Algerian darija, Arabic script'}`,
    shop ? `Shop name: ${shop}` : '',
    images.length ? `Product photo URLs, in order:\n${images.map((u) => `  ${u}`).join('\n')}` : 'No photo available: design around typography.',
  ].filter(Boolean).join('\n')

  const msg = await chat(
    [{ role: 'system', content: BRIEF }, { role: 'user', content: prompt }],
    { temperature: 0.7 }
  )

  let html = visibleAnswer(msg).trim()
  // Models wrap HTML in a fence about a third of the time, whatever you ask.
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '').trim()
  if (!/^<!doctype html/i.test(html) && !/^<html/i.test(html)) {
    throw new Error('The model did not return an HTML document.')
  }

  const slug = String(product).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'produit'
  const file = `lp-${slug}.html`
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, file), html, 'utf8')

  return { file, url: `/out/${file}`, bytes: html.length, product, price_dzd, angle, language }
}

const STORE_BRIEF = `You write storefronts for Algerian cash-on-delivery shops. Output ONE complete
HTML document and nothing else.

Same rules as a landing page: single file, inline <style>, mobile first, RTL
when Arabic, no external assets beyond the photos given, no fake social proof.

A storefront is a grid of products. Each card shows the photo, the name, the
price in DZD, and links to that product's landing page at the href given.
Above the grid: the shop name and one honest line about what it sells.`

export async function buildStorefront({ shop_name, products, language = 'ar' }) {
  const prompt = [
    `Shop: ${shop_name}`,
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
