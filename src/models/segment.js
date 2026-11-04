// sam-3.1 — trouver le produit dans la photo.
//
// Le cinquième modèle Meta du projet, et celui qui répond à un défaut que
// l'agent signalait lui-même sans pouvoir le corriger : sur la première photo
// du marchand, la vision a répondu « polo blanc col vert » puis « fond
// encombré, à refaire ». Elle voyait le problème ; elle n'avait aucun moyen
// d'y remédier. sam-3.1 lui en donne un.
//
// COMMENT ON L'APPELLE. Pas comme les autres : /chat/completions répond
// « The model `sam-3.1` is not available on this endpoint. Use /v1/responses »,
// et /images/edits dit la même chose. C'est donc /responses, avec le format
// `input_text` + `input_image` — `image_url` en objet y est refusé.
//
// CE QU'IL REND. Un texte à jetons, pas du JSON :
//   <|box;x1=180;y1=782;x2=1421;y2=1461;w=1600;h=1600|>
//   <|mask;x=0;y=0;data=561,1024,<blob>|>
// On lit la BOÎTE et on ignore le masque : son encodage n'est documenté nulle
// part, et décoder un blob à l'aveugle trois jours avant une échéance est le
// genre de pari qui fait perdre les trois jours. La boîte suffit pour
// recadrer, et le recadrage est 80 % du bénéfice.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import { ROOT, META } from '../config.js'

const run = promisify(execFile)
const OUT = join(ROOT, 'out')

const BOX = /<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)\|>/g

/**
 * Où est `concept` dans cette image ?
 *
 * @returns {Promise<{boxes: Array, best: object|null, coverage: number}>}
 *   `coverage` est la part de l'image occupée par le produit. C'est la mesure
 *   qui transforme « la photo est encombrée » en un reproche chiffré.
 */
export async function locate(imagePath, concept = 'the product') {
  if (!META.key) throw new Error('MODEL_API_KEY requis pour sam-3.1.')
  if (!existsSync(imagePath)) throw new Error(`Image introuvable : ${imagePath}`)

  const dataUrl = 'data:image/png;base64,' + readFileSync(imagePath).toString('base64')
  const res = await fetch(`${META.base}/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${META.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sam-3.1',
      input: [{ role: 'user', content: [
        { type: 'input_text', text: concept },
        { type: 'input_image', image_url: dataUrl },
      ] }],
    }),
  })
  if (!res.ok) throw new Error(`sam-3.1 ${res.status}: ${(await res.text()).slice(0, 200)}`)

  const json = await res.json()
  const text = json.output?.[0]?.content?.[0]?.text ?? ''

  const boxes = []
  for (const m of text.matchAll(BOX)) {
    const [, x1, y1, x2, y2, w, h] = m.map(Number)
    const box = { x1, y1, x2, y2, w, h }
    box.width = x2 - x1
    box.height = y2 - y1
    box.area = box.width * box.height
    box.coverage = +(box.area / (w * h)).toFixed(3)
    boxes.push(box)
  }
  boxes.sort((a, b) => b.area - a.area)

  return {
    model: 'sam-3.1',
    concept,
    boxes,
    best: boxes[0] ?? null,
    coverage: boxes[0]?.coverage ?? 0,
    // Le masque existe dans la réponse ; on dit qu'on ne le lit pas plutôt que
    // de laisser croire qu'il n'y en a pas.
    mask_present: text.includes('<|mask;'),
  }
}

/**
 * Recadrer sur la boîte, avec ffmpeg.
 *
 * ffmpeg est déjà indispensable au projet pour convertir les vocaux en WAV :
 * s'en servir pour découper une image n'ajoute donc aucune dépendance, là où
 * sharp ou jimp en ajouteraient une avec compilation native.
 *
 * `pad` élargit la boîte, parce qu'un produit collé aux bords du cadre fait
 * une créative étouffée. On reste évidemment dans l'image.
 */
export async function cropToBox(imagePath, box, { pad = 0.08, suffix = 'cut' } = {}) {
  const px = Math.round(box.width * pad)
  const py = Math.round(box.height * pad)
  const x = Math.max(0, box.x1 - px)
  const y = Math.max(0, box.y1 - py)
  const w = Math.min(box.w - x, box.width + px * 2)
  const h = Math.min(box.h - y, box.height + py * 2)

  mkdirSync(OUT, { recursive: true })
  const name = basename(imagePath, extname(imagePath))
  const file = `${name}-${suffix}.png`
  const out = join(OUT, file)
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', imagePath,
    '-vf', `crop=${w}:${h}:${x}:${y}`, out])
  return { path: out, url: `/out/${file}`, x, y, w, h }
}

/**
 * Localiser puis recadrer, en une fois, sans jamais faire échouer l'appelant.
 *
 * Un détourage raté doit laisser passer la photo d'origine, pas arrêter la
 * génération de créative : le marchand préfère une créative imparfaite à
 * aucune créative.
 */
export async function isolate(imagePath, concept, { minCoverage = 0.02, maxCoverage = 0.92 } = {}) {
  try {
    const found = await locate(imagePath, concept)
    if (!found.best) return { ok: false, why: `sam-3.1 did not find “${concept}” in the photo`, path: imagePath }
    // Trop petit : la boîte est probablement un reflet ou une étiquette.
    // Presque toute l'image : il n'y a rien à détourer, le recadrage ne
    // ferait que dégrader la définition.
    if (found.coverage < minCoverage) return { ok: false, why: `the object is too small (${Math.round(found.coverage * 100)}% of the image)`, path: imagePath, found }
    if (found.coverage > maxCoverage) return { ok: false, why: `the product already fills ${Math.round(found.coverage * 100)}% of the frame — nothing to cut out`, path: imagePath, found }

    const cut = await cropToBox(imagePath, found.best)
    return {
      ok: true, path: cut.path, url: cut.url, found,
      gain: `le produit passait de ${Math.round(found.coverage * 100)} % à ~100 % du cadre`,
    }
  } catch (e) {
    return { ok: false, why: e.message.slice(0, 160), path: imagePath }
  }
}
