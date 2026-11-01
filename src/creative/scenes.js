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
import { mkdirSync, existsSync, rmSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT } from '../config.js'
import { generate, edit, save, GARDE_MARQUE } from '../models/image.js'
import { isolate } from '../models/segment.js'

const OUT = join(ROOT, 'out')
const sh = promisify(execFile)

/**
 * Le PNG devient un WebP.
 *
 * muse-image rend du PNG 1024 px : ~350 Ko par scène, quatre scènes par page,
 * plus la photo du marchand. C'est une page qu'on ne charge pas en 4G à Oran
 * — et la seule chose qui compte pour une page de vente, c'est qu'elle
 * s'ouvre avant que l'acheteur reparte.
 *
 * Mesuré sur la MÊME page, avant et après : 1 394 Ko → 657 Ko. Le gain
 * dépend de la scène, et beaucoup : un fond de studio tombe de 85 % (une
 * page entière à 192 Ko), une photo de parc ou de bord de mer d'environ la
 * moitié. Ne pas annoncer le meilleur chiffre comme s'il était le chiffre.
 *
 * ffmpeg était déjà là pour les vocaux, donc aucune dépendance en plus. S'il
 * manque ou s'il échoue, on garde le PNG : une page lourde vaut mieux qu'une
 * page sans images.
 */
async function alleger(png) {
  const webp = png.replace(/\.png$/, '.webp')
  try {
    await sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-quality', '82', webp])
    if (statSync(webp).size < statSync(png).size) {
      rmSync(png, { force: true })
      return webp
    }
    rmSync(webp, { force: true })
  } catch { /* ffmpeg absent ou en échec : on garde le PNG */ }
  return png
}

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
  // « Studio premium » dit au marchand qu'il aura des reflets, des macros et
  // un piédestal. Le menu l'annonce, donc le prompt doit le livrer — sinon on
  // vend une promesse. Ce que le fond neutre d'avant ne donnait pas.
  studio: {
    hero: 'Premium studio photograph: the product raised on a low stone pedestal, lit by one large softbox from above, a clean mirror reflection beneath it, deep gradient backdrop, sharp, luxury catalogue quality.',
    problem: 'Premium studio photograph on a dark gradient backdrop, single hard rim light grazing the product, long dramatic shadow, the product alone and slightly off-centre, sombre and cinematic.',
    solution: 'Premium studio photograph, warm key light and soft fill, the product on a polished surface with a gentle reflection, inviting, clean, high-end.',
    benefits: 'Extreme macro studio shot of one material detail, raking light across the texture, shallow depth of field, the weave and the stitching clearly visible.',
  },
}

const GUARD = 'Absolutely no text, no letters, no numbers, no logos, no watermark anywhere in the image. No people looking at the camera.'

/* RETIRÉ : la bande calme du haut.
   Elle demandait au modèle de laisser le tiers supérieur vide « pour que le
   titre puisse s'y poser ». C'était une rustine : le titre était écrit EN
   HTML par-dessus la photo, donc il fallait lui faire de la place dans
   l'image. On payait ça cher — un tiers du cadre perdu, le produit repoussé
   en bas, et la contrainte était de toute façon mal suivie.
   Depuis le portage de `landing-lab`, le texte a sa propre place AU-DESSUS
   de l'image, qui est ensuite remontée sous lui et fondue dans le fond. Le
   modèle peut donc composer librement, et le produit occupe le cadre.

   PORTRAIT 2:3 et non carré : la page se lit sur un téléphone tenu à la
   verticale. Un carré y perd un tiers de la hauteur utile. Vérifié le
   01/11/2026 — muse-image accepte 1024x1536. */
const FORMAT = '1024x1536'
const CADRE = 'Vertical portrait composition, 2:3. The product is the subject and fills the frame confidently.'

/**
 * La consigne de fidélité, EN PREMIER dans le prompt.
 *
 * C'était le défaut central de cette page : `generate(prompt)` ne reçoit
 * aucune image, donc chaque illustration de section était un produit INVENTÉ
 * à partir d'une description. Un polo blanc à col vert ressortait en polo
 * foncé, et le marchand avait raison de dire que ce n'était pas le sien.
 *
 * Le chemin image-vers-image existait pourtant déjà dans le projet, pour
 * restyle_photo : sam-3.1 détoure le produit, muse-image réédite CE
 * produit-là. Il n'était simplement pas branché ici.
 *
 * L'ordre compte : ce qu'on met en tête pèse le plus. La fidélité d'abord,
 * la scène ensuite, le style en dernier.
 */
const fidele = (visual, scene, suffix) => [
  'This is the product. Keep it exactly as it is in the image:',
  visual?.fidelity || 'same shape, same cut, same materials, same proportions, every visible detail identical.',
  visual?.couleur ? `Its colour and finish are: ${visual.couleur}. Do not change them.` : '',
  'Do not redesign it, do not swap it for a similar product, do not add or remove parts.',
  'Re-photograph THIS object in a new setting:',
  scene,
  suffix,
  CADRE,
  GARDE_MARQUE,
  GUARD,
].filter(Boolean).join(' ')

/**
 * Generate what we can and report what we could not.
 *
 * Returns `{ hero: '/out/scene-...png', problem: null, ... }` plus a `failed`
 * array, so the renderer lays out around the holes and the caller can tell the
 * merchant which picture is missing instead of silently shipping a thinner
 * page.
 */
export async function renderScenes(scenes = {}, {
  slug = 'page', force = false, scenario = 'lifestyle', only = null,
  photo = null, visual = null, onProgress = () => {},
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
  // L'empreinte entre dans le nom du fichier. Avant, le cache ne connaissait
  // que le slug et le scénario : on changeait l'angle, le ton, la photo
  // source — et la page resservait les images de la version d'avant, sans
  // rien dire. Un cache qui ne sait pas ce qu'il met en cache est un bug.
  const sig = createHash('sha1')
    .update(JSON.stringify([scenes, visual?.couleur ?? '', visual?.fidelity ?? '', photo ?? '']))
    .digest('hex').slice(0, 6)

  const base = (slot) => `scene-${slug}-${scenario}-${sig}-${slot}`
  // Le WebP d'abord : c'est ce qu'on écrit désormais, le PNG n'est gardé que
  // lorsque ffmpeg a échoué, et les pages d'avant en ont encore.
  const dejaLa = (slot) =>
    ['.webp', '.png'].map((ext) => base(slot) + ext).find((f) => existsSync(join(OUT, f)))

  const images = {}
  const wanted = []
  for (const slot of all) {
    const f = force ? null : dejaLa(slot)
    if (f) images[slot] = `/out/${f}`
    else wanted.push(slot)
  }
  const reused = all.length - wanted.length
  if (!wanted.length) return { images, failed: [], asked: 0, reused, from: photo ? 'photo' : 'texte' }

  // Le détourage une seule fois pour les quatre scènes : sam-3.1 coûte un
  // appel, et le recadrage sur le produit vaut pour toutes.
  let source = photo
  let cut = null
  if (photo) {
    onProgress({ phase: 'isolate', label: 'sam-3.1' })
    cut = await isolate(photo, visual?.couleur ? `the product (${visual.couleur})` : 'the product').catch(() => null)
    if (cut?.ok) source = cut.path
  }

  let done = 0
  const settled = await Promise.allSettled(wanted.map(async (slot) => {
    const b64 = source
      ? await edit(source, fidele(visual, scenes[slot].trim(), suffix[slot]), { size: FORMAT })
      : await generate(`${scenes[slot].trim()} ${suffix[slot]} ${CADRE} ${GUARD}`, { size: FORMAT })
    if (!b64) throw new Error('aucune image renvoyée')
    const png = join(OUT, base(slot) + '.png')
    save(b64, png)
    const fichier = await alleger(png)
    onProgress({ step: ++done, total: wanted.length, label: slot, phase: 'scene' })
    return [slot, `/out/${fichier.split(/[\\/]/).pop()}`]
  }))

  const failed = []
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') images[r.value[0]] = r.value[1]
    else failed.push({ slot: wanted[i], error: r.reason?.message?.slice(0, 160) ?? 'échec' })
  })

  return {
    images, failed, asked: wanted.length, reused,
    // D'où viennent les images, dit explicitement : c'est la différence entre
    // « voici ton produit » et « voici un produit qui lui ressemble ».
    from: source ? 'photo' : 'texte',
    isolated: cut?.ok ? { model: 'sam-3.1', coverage: cut.found?.coverage } : cut ? { failed: cut.why } : null,
  }
}
