// L'affiche publicitaire : un visuel généré devient une vraie annonce.
//
// POURQUOI ICI, DANS LE NAVIGATEUR. `headlinePrompt()` demande au modèle de
// laisser le haut de l'image vide « so a headline can be composited there
// afterwards » — et personne ne compositait rien. Les créatifs sortaient avec
// un grand vide et pas un mot dessus : de belles photos, pas des publicités.
//
// Trois façons de poser ce texte, et deux sont mauvaises :
//   · le faire dessiner par le modèle — il réordonne les chiffres, « 15 900 »
//     revient « 19 500 », et un prix faux sur une annonce finit en colis
//     refusé à la livraison ;
//   · `drawtext` de ffmpeg — il ne sait pas faire de crénage, et un titre
//     sans crénage à 76 px se voit immédiatement ;
//   · un calque SVG — ffmpeg de cette machine n'a pas de décodeur SVG.
//
// Reste le `canvas` du navigateur : vrai dégradé, vrai crénage, et Inter déjà
// chargée dans la page. Zéro dépendance, ce qui est la règle du projet.
//
// ⚠️ LE FORMAT EST 4:5. C'est celui que Meta sert le plus haut dans le fil :
// à largeur égale il occupe plus de hauteur d'écran qu'un carré.
import { api } from './ui.js'

const L = 1080, H = 1350

/** Coupe un titre en lignes qui tiennent, en mesurant vraiment. */
function lignes(ctx, texte, largeur, max = 3) {
  const out = []
  let courante = ''
  for (const mot of String(texte ?? '').trim().split(/\s+/)) {
    const essai = courante ? `${courante} ${mot}` : mot
    if (ctx.measureText(essai).width <= largeur || !courante) { courante = essai; continue }
    out.push(courante); courante = mot
    if (out.length === max) return out
  }
  if (courante) out.push(courante)
  return out.slice(0, max)
}

/** Un rectangle à coins ronds, sans dépendre de `roundRect` partout. */
function pastille(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
  else {
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
  }
}

/**
 * Compose l'affiche et rend un blob PNG.
 *
 * Le parti pris est celui d'une annonce de mode, pas d'un prospectus : la
 * photo occupe le cadre, le texte vit en bas sur un dégradé — pas sur un
 * aplat noir qui mangerait la moitié du produit. Une seule couleur d'accent,
 * un filet, et de l'air.
 */
export async function composer(srcImage, {
  headline, price, badge = null, cta = null, shop = null,
} = {}) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = srcImage
  await img.decode()
  await document.fonts.ready

  const c = document.createElement('canvas')
  c.width = L; c.height = H
  const x = c.getContext('2d')

  /* 1. La photo, cadrée en 4:5 sans déformation : on remplit, on recadre. */
  const k = Math.max(L / img.naturalWidth, H / img.naturalHeight)
  const w = img.naturalWidth * k, h = img.naturalHeight * k
  x.drawImage(img, (L - w) / 2, (H - h) / 2, w, h)

  /* 2. Le dégradé du bas. Un VRAI dégradé, pas un aplat : c'est lui qui rend
        le texte lisible quelle que soit la photo — et la photo change à
        chaque génération — sans effacer le produit. */
  const g = x.createLinearGradient(0, H * 0.44, 0, H)
  g.addColorStop(0, 'rgba(8,10,13,0)')
  g.addColorStop(0.55, 'rgba(8,10,13,0.62)')
  g.addColorStop(1, 'rgba(8,10,13,0.94)')
  x.fillStyle = g
  x.fillRect(0, Math.round(H * 0.44), L, Math.round(H * 0.56))

  const marge = 76
  const large = L - marge * 2

  /* 3. L'enseigne, tout en haut, en petites capitales espacées : c'est la
        signature, elle ne doit pas rivaliser avec l'accroche. */
  if (shop) {
    const vg = x.createLinearGradient(0, 0, 0, 220)
    vg.addColorStop(0, 'rgba(8,10,13,0.55)'); vg.addColorStop(1, 'rgba(8,10,13,0)')
    x.fillStyle = vg; x.fillRect(0, 0, L, 220)
    x.font = '600 26px Inter, system-ui, sans-serif'
    x.letterSpacing = '3px'
    x.fillStyle = 'rgba(255,255,255,0.92)'
    x.textBaseline = 'alphabetic'
    x.fillText(shop.toUpperCase(), marge, marge + 26)
    x.letterSpacing = '0px'
  }

  /* 4. Le filet d'accent, puis l'accroche. Le filet dit où commence la
        parole ; sans lui le texte flotte sur la photo. */
  x.font = '700 76px Inter, system-ui, sans-serif'
  x.letterSpacing = '-1.9px'
  const ls = lignes(x, headline, large, 3)
  const hauteurTitre = ls.length * 88
  const basBloc = H - marge - (cta ? 112 : 56)
  const hautTitre = basBloc - (price ? 118 : 0) - hauteurTitre

  x.fillStyle = '#38e0ad'
  pastille(x, marge, hautTitre - 46, 84, 5, 3)
  x.fill()

  x.fillStyle = '#ffffff'
  x.textBaseline = 'top'
  ls.forEach((ligne, i) => x.fillText(ligne, marge, hautTitre + i * 88))
  x.letterSpacing = '0px'

  /* 5. Le prix. Pas une pastille criarde : le chiffre en gros, l'unité et la
        mention de paiement en petit à côté. C'est le chiffre qu'on vient
        chercher, il n'a pas besoin qu'on crie. */
  if (price) {
    const y = hautTitre + hauteurTitre + 26
    x.font = '700 64px Inter, system-ui, sans-serif'
    x.letterSpacing = '-1.2px'
    x.fillStyle = '#ffffff'
    x.fillText(price, marge, y)
    const l = x.measureText(price).width
    x.letterSpacing = '0px'
    if (badge) {
      x.font = '500 26px Inter, system-ui, sans-serif'
      x.fillStyle = 'rgba(255,255,255,0.70)'
      x.fillText(badge, marge + l + 26, y + 30)
    }
  }

  /* 6. L'appel à l'action, en bouton plein : c'est la seule chose à faire. */
  if (cta) {
    const y = H - marge - 72
    x.font = '650 30px Inter, system-ui, sans-serif'
    const l = x.measureText(cta).width
    x.fillStyle = '#38e0ad'
    pastille(x, marge, y, l + 72, 60, 30)
    x.fill()
    x.fillStyle = '#07140f'
    x.textBaseline = 'middle'
    x.fillText(cta, marge + 36, y + 31)
  }

  return await new Promise((r) => c.toBlob(r, 'image/png'))
}

/**
 * Compose et enregistre côté serveur, pour que l'affiche existe comme fichier.
 *
 * Une image qui ne vit que dans un onglet n'est pas une publicité : elle doit
 * pouvoir être ouverte, envoyée à Meta, et retrouvée demain.
 */
export async function composerEtEnregistrer(srcImage, opts) {
  const blob = await composer(srcImage, opts)
  const r = await fetch(`/api/affiche?session=${encodeURIComponent(opts.session ?? '')}&ext=png`, {
    method: 'POST', body: blob,
  })
  if (!r.ok) throw new Error(`affiche ${r.status}`)
  return await r.json()
}
