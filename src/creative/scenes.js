// The section images. The thing that was missing.
//
// landing-content.js has been asking the model for four `scenes` from the
// start — a photorealistic description per section, written in English for an
// image model. And then nothing read them. The copy was good and the page
// still looked like a form, because a sales page is carried by its pictures
// and mine had exactly one: the merchant's own photo, at the top.
//
// So this generates them. Four muse-image calls, in parallel, each degrading
// on its own: a scene that fails leaves its section without a picture rather
// than taking the page down with it. That matters more than it sounds — the
// image endpoint is the slowest and least reliable thing in this project, and
// a landing page that only renders when all four succeed is a landing page
// that does not render.
import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../config.js'
import { generate, save } from '../models/image.js'

const OUT = join(ROOT, 'out')

// The scenes a page can carry, in the order they appear.
export const SLOTS = ['hero', 'problem', 'solution', 'benefits']

const SUFFIX = {
  lifestyle: {
    hero: 'Wide aspirational lifestyle photograph, bright natural light, shallow depth of field, premium catalogue quality.',
    problem: 'Muted, overcast, slightly desaturated. The frustration is the subject. Documentary feel.',
    solution: 'Warm golden light, the product clearly the hero of the frame, inviting.',
    benefits: 'Extreme close-up of one real material detail, raking light, texture visible.',
  },
  // Studio keeps the product recognisable above everything else, which is
  // what a merchant selling a specific article actually needs: a buyer must
  // see the thing that will arrive, not a mood.
  studio: {
    hero: 'Studio photograph on a clean seamless background, soft large softbox, gentle floor shadow, product centred and sharp, premium catalogue quality.',
    problem: 'Studio photograph on a dark neutral background, single hard light, the product alone and slightly off-centre, sombre.',
    solution: 'Studio photograph on a warm light background, soft shadow, product centred, inviting and clean.',
    benefits: 'Macro studio shot of one material detail on a neutral background, raking light, texture visible.',
  },
}

const GUARD = 'Absolutely no text, no letters, no numbers, no logos, no watermark anywhere in the image. No people looking at the camera.'

/**
 * Generate what we can and report what we could not.
 *
 * Returns `{ hero: '/out/scene-...png', problem: null, ... }` plus a `failed`
 * array, so the renderer lays out around the holes and the caller can tell the
 * merchant which picture is missing instead of silently shipping a thinner
 * page.
 */
export async function renderScenes(scenes = {}, {
  slug = 'page', force = false, scenario = 'lifestyle', only = null, onProgress = () => {},
} = {}) {
  mkdirSync(OUT, { recursive: true })

  const suffix = SUFFIX[scenario] ?? SUFFIX.lifestyle
  const all = (only ?? SLOTS).filter((s) => typeof scenes[s] === 'string' && scenes[s].trim().length > 20)
  if (!all.length) return { images: {}, failed: [], asked: 0, reused: 0 }

  // A scene already on disk is reused unless asked otherwise. Changing one
  // line of CSS and paying four image generations to see it was the quickest
  // way to stop improving the page — and in the three days before a deadline,
  // credits spent re-drawing the same sandal are credits not spent on the
  // thing being judged. The scenario is in the filename because a studio shot
  // and a lifestyle shot of the same slot are not interchangeable.
  const images = {}
  const wanted = []
  for (const slot of all) {
    const file = `scene-${slug}-${scenario}-${slot}.png`
    if (!force && existsSync(join(OUT, file))) images[slot] = `/out/${file}`
    else wanted.push(slot)
  }
  const reused = all.length - wanted.length
  if (!wanted.length) return { images, failed: [], asked: 0, reused }

  let done = 0
  const settled = await Promise.allSettled(wanted.map(async (slot) => {
    const prompt = `${scenes[slot].trim()} ${suffix[slot]} ${GUARD}`
    const b64 = await generate(prompt, { size: '1024x1024' })
    if (!b64) throw new Error('aucune image renvoyée')
    const file = `scene-${slug}-${scenario}-${slot}.png`
    save(b64, join(OUT, file))
    onProgress({ step: ++done, total: wanted.length, label: slot, phase: 'scene' })
    return [slot, `/out/${file}`]
  }))

  const failed = []
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') images[r.value[0]] = r.value[1]
    else failed.push({ slot: wanted[i], error: r.reason?.message?.slice(0, 160) ?? 'échec' })
  })

  return { images, failed, asked: wanted.length, reused }
}
