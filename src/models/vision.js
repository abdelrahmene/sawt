// Looking at the product.
//
// Until now a photo was a filename the agent was told about. It could not see
// the thing it was supposed to sell, so it asked for a photo it already had,
// and any angle it proposed was guessed from the merchant's words rather than
// from the product. A shopkeeper who hands you a shirt and hears "what are you
// selling?" does not come back.
//
// So every upload is described the moment it lands, and the description goes
// into the system prompt. The agent then knows the colour, the material, the
// cut and what is wrong with the photo — before the merchant says anything.
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { chat, visibleAnswer } from './llm.js'

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

export function dataUrl(path) {
  const type = MIME[extname(path).toLowerCase()] ?? 'image/jpeg'
  return `data:${type};base64,${readFileSync(path).toString('base64')}`
}

const LOOK = `You are looking at a product photo sent by a small Algerian shopkeeper who
wants to advertise it. Answer in FRENCH, as compact JSON and nothing else:

{
  "product": "what it is, three or four words, e.g. 'polo blanc col vert'",
  "details": "colour, material, cut, visible branding, condition — one sentence",
  "angles": ["two or three reasons someone would buy THIS one, from what you can see"],
  "photo_quality": "what is wrong with the photo for advertising: background, light, crop, wrinkles — one sentence, or 'bonne' if nothing is",
  "caution": "a trademark or counterfeit concern if you see a brand mark, otherwise null"
}

Describe only what is in the image. Never invent a brand, a material or a
price. If you cannot tell what the material is, say so.`

export async function describePhoto(filePath, { provider } = {}) {
  const msg = await chat(
    [
      { role: 'system', content: LOOK },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Ce produit, décris-le.' },
          { type: 'image_url', image_url: { url: dataUrl(filePath) } },
        ],
      },
    ],
    { temperature: 0.2, provider }
  )

  const raw = visibleAnswer(msg)
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) return { product: null, details: raw.slice(0, 300), angles: [], photo_quality: null, caution: null }
  try {
    return JSON.parse(m[0])
  } catch {
    return { product: null, details: raw.slice(0, 300), angles: [], photo_quality: null, caution: null }
  }
}
