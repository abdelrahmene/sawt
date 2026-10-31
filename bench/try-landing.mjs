// Build one landing page and print what came back.
//
//   node bench/try-landing.mjs "صباط رياضي Adidas" 4500 /out/creative-x.png
//
// Useful because a landing page is the slowest thing the agent does — the copy
// call plus four image calls — and driving it through the chat to see whether a
// section renders wastes minutes each time.
import { buildLandingPage } from '../src/creative/landing.js'

const [product = 'صباط رياضي', price = '4500', ...images] = process.argv.slice(2)

const t0 = Date.now()
const r = await buildLandingPage({
  product,
  price_dzd: Number(price),
  angle: process.env.ANGLE || 'La qualité se voit, et tu paies à la livraison',
  language: process.env.LANG_PAGE || 'ar',
  images,
  shop: process.env.SHOP || 'Sabat Dzair',
  onProgress: (p) => console.log('  ·', p.phase ?? '', p.label ?? '', p.step ? `${p.step}/${p.total}` : ''),
})

console.log(JSON.stringify(r, null, 2))
console.log(`\n${Math.round((Date.now() - t0) / 1000)}s → http://localhost:7070${r.url}`)
