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
/* Trois PRISES DE VUE différentes, et c'est le point.

   Avant, les trois créatives d'une campagne étaient la même photo : « an
   advertising photograph of X » rendait trois fois le même produit détouré
   sur du gris, et l'angle marketing — deux mots en milieu de prompt — ne
   changeait rien. Trois images identiques ne sont pas trois créatives : la
   régie les montre aux mêmes gens, la lassitude arrive au même rythme, et on
   n'apprend rien de laquelle marche.

   Une campagne a besoin de regards différents sur le MÊME objet : le produit
   en situation, la matière de près, le produit porté. C'est ce qu'un studio
   livre, et c'est ce qui fait la différence entre une fiche et une publicité. */
const PRISES = [
  { nom: 'editorial',
    scene: 'Editorial advertising photograph in a real place that suits the product — daylight from one side, ' +
      'soft falloff, a shallow depth of field that keeps the product sharp and lets the background fall away. ' +
      'The product is the subject and fills the frame confidently.' },
  { nom: 'macro',
    scene: 'Extreme close-up on the material and the construction — the weave, the stitching, an edge or a fastening ' +
      'crossing the frame diagonally. Raking light so the texture reads. Very shallow depth of field.' },
  { nom: 'worn',
    scene: 'The product in use, three-quarter view, cinematic natural light, a lived-in setting slightly out of focus ' +
      'behind it. No face in frame.' },
]

/**
 * Le prompt d'une créative publicitaire.
 *
 * ⚠️ LA PLACE DU TEXTE EST EN BAS, PAS EN HAUT. La consigne demandait un
 * tiers SUPÉRIEUR vide — héritage du temps où l'accroche arabe était
 * composée en haut — alors que le compositeur écrit sur le bas de l'image.
 * L'image et la composition se contredisaient : le dégradé du bas tombait
 * sur le produit, et le vide réservé en haut ne servait à rien.
 *
 * ⚠️ ET LA FIDÉLITÉ PASSE EN PREMIER. Ce qu'on met en tête d'un prompt pèse
 * le plus — la leçon est déjà écrite dans `src/creative/scenes.js`, elle
 * n'avait simplement pas été appliquée ici.
 *
 * @param {number} prise  laquelle des trois prises de vue (0, 1, 2)
 */
export function headlinePrompt(product, angle, prise = 0) {
  const p = PRISES[prise % PRISES.length]
  return [
    'This is the product. Keep it exactly as it is in the image:',
    'same shape, same cut, same materials, same proportions, every visible detail identical.',
    'Do not redesign it, do not swap it for a similar product, do not add or remove parts.',
    `Re-photograph THIS object — ${product}.`,
    p.scene,
    angle ? `The idea to convey: ${angle}.` : '',
    'Premium brand photography, not a catalogue cutout: real light, real depth, a considered background.',
    // La place du texte, là où le compositeur écrit vraiment.
    'Leave the bottom third of the frame calm and uncluttered — no busy detail there —',
    'so a headline and a price can be composited over it afterwards.',
    'No text, no letters, no numbers, no logo anywhere in the image.',
  ].filter(Boolean).join(' ')
}
