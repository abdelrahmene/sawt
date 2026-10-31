// Ad creatives with muse-image-1.0.
//
// Two calls matter here, and the second is the interesting one:
//   generate() makes the first creative from a product photo
//   edit()     rewrites an EXISTING creative to answer a customer objection,
//              keeping the rest of the image intact
//
// The endpoints are OpenAI-Images compatible, so the shape below is the
// familiar one.
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { META } from '../config.js'

function requireKey() {
  if (!META.key) throw new Error('MODEL_API_KEY is required for image generation in live mode.')
}

async function post(path, body, isForm = false) {
  requireKey()
  const res = await fetch(`${META.base}${path}`, {
    method: 'POST',
    headers: isForm
      ? { Authorization: `Bearer ${META.key}` }
      : { Authorization: `Bearer ${META.key}`, 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`muse-image ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

export async function generate(prompt, { size = '1024x1024' } = {}) {
  const json = await post('/images/generations', { model: 'muse-image-1.0', prompt, size, n: 1 })
  return json.data?.[0]?.b64_json ?? null
}

export async function edit(imagePath, prompt, { size = '1024x1024' } = {}) {
  const form = new FormData()
  form.append('model', 'muse-image-1.0')
  form.append('prompt', prompt)
  form.append('size', size)
  form.append('image', new Blob([readFileSync(imagePath)]), basename(imagePath))
  const json = await post('/images/edits', form, true)
  return json.data?.[0]?.b64_json ?? null
}

export function save(b64, path) {
  if (!b64) return null
  writeFileSync(path, Buffer.from(b64, 'base64'))
  return path
}

/**
 * NE JAMAIS RENDRE UN LOGO PLUS LISIBLE QU'IL NE L'ÉTAIT.
 *
 * Mesuré, pas supposé. Photo d'un marchand : basket noire posée sur une
 * table, patte rouge au talon avec une inscription illisible. La vision avait
 * prévenu — « inscription en relief évoquant une marque de luxe, authenticité
 * à vérifier » — et restyle_photo a quand même réédité l'image : sur le rendu
 * studio, on lit distinctement « PRA… ».
 *
 * L'outil n'avait pas embelli une photo, il avait fabriqué une contrefaçon
 * plus convaincante que l'originale. À 4 500 DA la paire, ce n'est pas du
 * Prada, et une publicité portant ce logo, c'est le compte publicitaire fermé
 * et une plainte en contrefaçon — pas une hypothèse : c'est la règle que ce
 * marchand s'applique déjà à lui-même sur ses autres produits.
 *
 * On ne refuse pas de retoucher : un produit de marque peut être légitime, et
 * décider à sa place serait présomptueux. On refuse de RÉVÉLER ce que
 * l'original cachait.
 */
export const GARDE_MARQUE =
  'Do not sharpen, complete, redraw, invent or make legible any logo, brand name, ' +
  'monogram or trademark. Anything blurred, partial or unreadable in the source ' +
  'must stay exactly as blurred, partial and unreadable in the result.'

/** La vision signale-t-elle une marque ? Son champ `caution` est en français. */
export function risqueMarque(described) {
  const c = String(described?.caution ?? '')
  if (!c) return null
  return /marque|logo|authenticit|contrefa|luxe|réplique|replique|griffe/i.test(c) ? c : null
}

// Arabic headlines are composited as a deterministic SVG layer rather than
// drawn by the model: generative models reorder digits inside a right-to-left
// run, which turns a price into a different price. The model makes the scene,
// the typesetter makes the words.
export function headlinePrompt(product, angle) {
  return [
    `Advertising photograph of ${product}.`,
    angle,
    'Leave the top third of the frame visually empty and evenly lit,',
    'so a headline can be composited there afterwards.',
    'No text, no letters, no numbers anywhere in the image.',
  ].join(' ')
}
