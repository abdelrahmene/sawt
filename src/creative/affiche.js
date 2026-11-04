// L'affiche : un visuel généré devient une vraie publicité.
//
// POURQUOI CE FICHIER EXISTE. `headlinePrompt()` demande au modèle de laisser
// le tiers supérieur de l'image vide « so a headline can be composited there
// afterwards » — et personne ne compositait rien. Les créatifs sortaient donc
// avec un grand vide en haut et pas un mot dessus : de jolies photos, pas des
// publicités. Une annonce sans accroche ni prix ne vend pas, et un marchand
// qui voit ça se demande à quoi sert l'outil.
//
// ⚠️ LE MODÈLE NE DESSINE JAMAIS LE TEXTE. C'est une règle, pas une
// préférence : un modèle d'image réordonne les chiffres, et « 15 900 » devient
// « 19 500 ». Un prix faux sur une publicité, c'est un client qui refuse le
// colis à la livraison. Le modèle fait la scène, le typographe fait les mots.
//
// ⚠️ FORMAT 4:5, PAS CARRÉ. C'est le format que Meta sert le plus haut dans
// le fil : il occupe plus de hauteur d'écran qu'un carré, à largeur égale.
//
// Le texte est posé par `drawtext` et non par un calque SVG : on est en
// caractères latins, sans liaison ni sens de lecture inverse, donc le piège
// qui impose le SVG en arabe ne se présente pas ici.
import { mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ROOT } from '../config.js'

const run = promisify(execFile)
export const OUT_DIR = join(ROOT, 'out')

/* Les polices du système. Bold pour l'accroche, régulière pour le reste —
   une seule graisse sur une affiche, et rien ne hiérarchise. */
const GRAS = 'C\\:/Windows/Fonts/segoeuib.ttf'
const NORMAL = 'C\\:/Windows/Fonts/segoeui.ttf'

/** `drawtext` lit `:` comme un séparateur et `'` comme une borne. */
const echappe = (s) => String(s ?? '')
  .replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\u2019")
  .replace(/%/g, '\\%')

/**
 * Coupe une accroche en lignes qui tiennent dans la largeur.
 *
 * Mesure approchée — 0,52 em par caractère pour Segoe UI Bold. On ne cherche
 * pas la justification au pixel : on cherche à ne jamais déborder du cadre,
 * ce qu'une accroche trop longue ferait en silence.
 */
function lignes(texte, taillePx, largeurPx, max = 3) {
  const parMot = texte.trim().split(/\s+/)
  const parLigne = Math.max(8, Math.floor(largeurPx / (taillePx * 0.52)))
  const out = []
  let courante = ''
  for (const mot of parMot) {
    const essai = courante ? `${courante} ${mot}` : mot
    if (essai.length <= parLigne) { courante = essai; continue }
    out.push(courante); courante = mot
    if (out.length === max) break
  }
  if (courante && out.length < max) out.push(courante)
  return out.filter(Boolean)
}

/**
 * Compose l'affiche.
 *
 * @param {string} source   le visuel généré, sur le disque
 * @param {object} o
 *   headline — l'accroche, trois lignes au plus
 *   price    — le prix, déjà formaté avec son unité
 *   badge    — la mention de réassurance, en haut ("Cash on delivery")
 *   cta      — l'appel à l'action, en bas
 */
export async function composer(source, { headline, price, badge = null, cta = null, nom = null } = {}) {
  mkdirSync(OUT_DIR, { recursive: true })
  const W = 1080, H = 1350
  const marge = 72

  const fichier = nom ?? `ad-${basename(source).replace(/\.\w+$/, '')}.jpg`
  const dest = join(OUT_DIR, fichier)

  const f = []
  // 1. Cadrer en 4:5 sans déformer : on remplit, puis on recadre au centre.
  f.push(`scale=${W}:${H}:force_original_aspect_ratio=increase`, `crop=${W}:${H}`)

  /* 2. Deux voiles, et c'est ce qui sépare une affiche lisible d'un texte
        posé sur une photo. En haut pour l'accroche, en bas pour le prix.
        Sans eux, une accroche blanche disparaît dès que la photo est claire —
        et la photo, elle, change à chaque génération. */
  f.push(`drawbox=x=0:y=0:w=${W}:h=${Math.round(H * 0.42)}:color=black@0.42:t=fill`)
  f.push(`drawbox=x=0:y=${Math.round(H * 0.78)}:w=${W}:h=${Math.round(H * 0.22)}:color=black@0.55:t=fill`)

  // 3. Le badge de réassurance, tout en haut.
  if (badge) {
    f.push(`drawtext=fontfile='${NORMAL}':text='${echappe(badge.toUpperCase())}':` +
      `fontcolor=white@0.92:fontsize=30:borderw=0:` +
      `box=1:boxcolor=0x0d7a5f@0.95:boxborderw=18:x=${marge}:y=${marge}`)
  }

  // 4. L'accroche.
  const taille = 76
  const ls = lignes(headline ?? '', taille, W - marge * 2, 3)
  const haut = (badge ? marge + 112 : marge) + 24
  ls.forEach((ligne, i) => {
    f.push(`drawtext=fontfile='${GRAS}':text='${echappe(ligne)}':` +
      `fontcolor=white:fontsize=${taille}:line_spacing=10:` +
      `shadowcolor=black@0.5:shadowx=0:shadowy=3:` +
      `x=${marge}:y=${haut + i * Math.round(taille * 1.16)}`)
  })

  // 5. Le prix, en pastille pleine : c'est le chiffre qu'on vient chercher.
  if (price) {
    f.push(`drawtext=fontfile='${GRAS}':text='${echappe(price)}':` +
      `fontcolor=0x0c0e12:fontsize=62:` +
      `box=1:boxcolor=white@0.96:boxborderw=26:` +
      `x=${marge}:y=${H - marge - 150}`)
  }

  // 6. L'appel à l'action.
  if (cta) {
    f.push(`drawtext=fontfile='${NORMAL}':text='${echappe(cta)}':` +
      `fontcolor=white@0.88:fontsize=38:x=${marge}:y=${H - marge - 54}`)
  }

  await run('ffmpeg', ['-v', 'error', '-y', '-i', source,
    '-vf', f.join(','), '-q:v', '3', dest], { maxBuffer: 1 << 24 })

  return { file: fichier, url: `/out/${fichier}`, width: W, height: H, lines: ls.length }
}
