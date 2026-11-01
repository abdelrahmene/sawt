// JSON in, one self-contained HTML file out.
//
// The layout lives here rather than in a prompt, which is the whole point: the
// model writes the words and the pictures, the code draws the page. Typography,
// right-to-left, the order form and the image placement are decided once and
// are then correct every time, instead of being re-improvised on each run.
//
// The first version of this file was honest and ugly — correct sections, a
// product photo at the top, and nothing else to look at. A cash-on-delivery
// page is carried by its pictures: the buyer is deciding whether to open the
// door to a courier, and they decide on how the thing looks. So the structure
// changed: a full-bleed hero behind the headline, then alternating picture and
// text down the page, each picture generated for its own section.
//
// What did not change: no webfont, no framework, no external request. The page
// must open on a 4G phone in Oran, and from a file:// path when a judge
// downloads it.

// Le seul import de ce fichier, et il ne coûte rien quand le marchand n'a
// pas de pixel : pixelSnippet rend une chaîne vide.
import { pixelSnippet } from './pixel.js'
import { WILAYAS_AR, WILAYAS_FR } from '../dz/wilayas.js'

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/* ══ LA TYPOGRAPHIE ══════════════════════════════════════════════════════
   C'est elle qui faisait « page générée » plutôt que « marque ». La page
   était composée en `system-ui` : Segoe UI sur Windows, Roboto sur Android.
   Ces caractères sont très bons, et c'est précisément le problème — ce sont
   ceux de l'interface du téléphone, donc la page avait l'air d'un formulaire
   du système, pas d'une boutique.

   UNE seule paire, et c'est délibéré : **Inter Tight** pour les titres,
   **Inter** pour le texte, **Cairo** pour l'arabe. C'est exactement celle de
   `landing-lab`, la page de référence du fondateur, celle qu'il a jugée
   bonne. Je n'en invente pas une quatrième gabarit par gabarit : le gabarit
   fait déjà varier l'échelle, la graisse et les arrondis — faire varier AUSSI
   le caractère donnerait quatre pages qui n'ont plus rien à voir entre elles.

   L'arabe est à part. Il n'a pas la coupure sérif/sans du latin, et une
   police latine n'a aucun glyphe arabe : un titre en Inter Tight retomberait
   sur le repli système et casserait l'unité de la page. Cairo partout en
   arabe — liaisons correctes, graisses jusqu'au noir, et c'est le caractère
   déjà en service sur les pages des vraies boutiques.

   ⚠️ Le repli n'est pas décoratif. Si fonts.googleapis.com ne répond pas —
   4G d'Oran, coupure, bloqueur — `display=swap` affiche IMMÉDIATEMENT la
   pile système et la page reste lisible. Aucun texte invisible, jamais. */
const SYS = `system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif`
const SYS_AR = `"Cairo","Segoe UI","Noto Kufi Arabic","Noto Naskh Arabic","Geeza Pro",Tahoma,sans-serif`

const FACE = {
  lat: { d: `"Inter Tight",${SYS}`, t: `"Inter",${SYS}` },
  ar: { d: SYS_AR, t: SYS_AR },
  q: 'Cairo:wght@400;500;600;700;800&family=Inter+Tight:wght@600;700&family=Inter:wght@400;500;600;700',
}

// A price inside a right-to-left paragraph gets reordered by the bidi
// algorithm: "4 500 DA" renders as "DA 500 4", which is not a price. The
// isolate is not decoration — on a sales page this is the one string that must
// never be wrong, and it is wrong by default in Arabic.
const money = (n) => {
  const s = Number(n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ')
  return `<bdi dir="ltr">${s} DA</bdi>`
}

/* Une image de section, déclarée correctement.
   `width`/`height` ne sont pas décoratifs : sans eux le navigateur ne connaît
   pas la place à réserver, et chaque image qui arrive pousse le texte déjà lu
   vers le bas. Sur une page de vente, c'est le moment exact où l'acheteur
   voulait toucher le bouton. Le héros est chargé en priorité, le reste en
   différé — une page ne doit pas télécharger la cinquième image avant que la
   première soit à l'écran. */
const shotTag = (src, alt, first = false) =>
  `<img src="${esc(src)}" alt="${esc(alt)}" width="1024" height="1536"` +
  (first ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"') +
  ' decoding="async">'

// Inline, so the page still has its icons with no network. Drawn on a 24 grid,
// stroked, inheriting currentColor.
const ICON = {
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>',
  shield: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  phone: '<path d="M7 3h10v18H7z"/><path d="M10.5 18.5h3"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  spark: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>',
}
const icon = (name, size = 20) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] ?? ICON.check}</svg>`

// La liste vit dans src/dz/wilayas.js, avec sa jumelle en latin et le
// comparateur qui sait que « Oran » et « وهران » sont la même ville. Une
// page en français ne doit pas proposer 58 noms en arabe.

/* The gabarits. Four sets of tokens, not four stylesheets — the layout is the
   same page every time, which is the point of drawing it in code. What moves
   is the type scale, how round the corners are, how heavy the headings sit
   and whether the accent is flat or a gradient. */
const TEMPLATES = {
  editorial: { h1: '30px,6vw,52px', h2: '22px,3.4vw,32px', r: 16, weight: 750, pad: 72, grad: false, track: '-.022em' },
  bold:      { h1: '34px,8vw,68px', h2: '26px,4.4vw,40px', r: 6,  weight: 850, pad: 84, grad: false, track: '-.035em' },
  soft:      { h1: '28px,6vw,46px', h2: '21px,3.2vw,30px', r: 28, weight: 700, pad: 68, grad: false, track: '-.015em' },
  vivid:     { h1: '32px,7vw,58px', h2: '24px,3.8vw,36px', r: 20, weight: 800, pad: 76, grad: true,  track: '-.028em' },
}

export function renderLanding(c, { images = [], scenes = {}, shop, pageId, opts = {}, variants = [] } = {}) {
  // Trois langues, plus deux. L'arabe reste le repli : une page enregistree
  // avant l'anglais n'a pas de champ `language` et doit rester en arabe.
  const en = c.language === 'en'
  const ar = c.language !== 'fr' && !en
  // Le gabarit choisit la paire de caractères ; l'arabe passe outre, parce
  // qu'un titre en Fraunces n'a aucun glyphe arabe et retomberait seul.
  const face = ar ? FACE.ar : FACE.lat
  const t = c.theme
  const tpl = TEMPLATES[opts.template] ?? TEMPLATES.editorial
  const dark = opts.theme === 'dark'
  const show = (k) => opts.sections ? opts.sections[k] !== false : true
  const L = ar
    ? { order: 'اطلب الآن', name: 'الاسم الكامل', phone: 'رقم الهاتف', wilaya: 'الولاية', commune: 'البلدية',
        qty: 'الكمية', pick: 'اختر الولاية', send: 'أكّد الطلب', cod: 'الدفع عند الاستلام',
        size: 'القياس', pickSize: 'اختر القياس', soldOut: 'ما كاينش',
        faq: 'أسئلة متكررة', how: 'كيفاش تطلب', why: 'علاش تشري من عندنا', gallery: 'تصاور المنتج',
        total: 'المجموع', free: 'بلا دفع مقدّم', wil: '58 ولاية', call: 'نعيطولك باش نأكّدو' }
    : en
    ? { order: 'Order now', name: 'Full name', phone: 'Phone number', wilaya: 'Wilaya', commune: 'Commune',
        qty: 'Quantity', pick: 'Choose your wilaya', send: 'Confirm the order', cod: 'Cash on delivery',
        size: 'Size', pickSize: 'Choose a size', soldOut: 'out of stock',
        faq: 'Questions', how: 'How to order', why: 'Why buy from us', gallery: 'Product photos',
        total: 'Total', free: 'Nothing to pay up front', wil: '58 wilayas', call: 'We call you to confirm' }
    : { order: 'Commander', name: 'Nom complet', phone: 'Téléphone', wilaya: 'Wilaya', commune: 'Commune',
        qty: 'Quantité', pick: 'Choisir la wilaya', send: 'Confirmer la commande', cod: 'Paiement à la livraison',
        size: 'Taille', pickSize: 'Choisir la taille', soldOut: 'épuisé',
        faq: 'Questions fréquentes', how: 'Comment commander', why: 'Pourquoi nous', gallery: 'Photos du produit',
        total: 'Total', free: 'Rien à payer d\'avance', wil: '58 wilayas', call: 'On vous appelle pour confirmer' }

  // The merchant's own photos come first everywhere a product must be
  // recognisable; the generated scenes only ever decorate a section.
  //
  // In studio mode the banner is the merchant's actual photo, on purpose: a
  // buyer about to let a courier knock needs to see the thing that will
  // arrive, not a mood. Lifestyle puts the generated scene there instead.
  // The fallback chain ends on "any picture we have", not on null. At two
  // generated scenes there is no hero scene, and a merchant who picked no
  // photo got a banner that was a flat colour — the most important block on
  // the page, empty, because of an option elsewhere.
  const studio = opts.scenario === 'studio'
  const anyScene = scenes.hero ?? scenes.solution ?? scenes.benefits ?? scenes.problem ?? null
  const heroBg = studio ? (images[0] ?? anyScene) : (scenes.hero ?? images[0] ?? anyScene)
  const shot = images[0] ?? heroBg
  const gallery = images.filter((u) => u && u !== heroBg)

  const band = (i) => (i % 2 ? ' alt' : '')

  /* A section with a picture on one side and words on the other. Flipped every
     other time, which is most of what makes a page read as designed. */
  let turn = 0
  /* Texte, puis image remontée dessous. L'alternance gauche/droite n'existe
     plus : dans une colonne de 480 px il n'y a pas de gauche ni de droite.
     Ce qui alterne maintenant, c'est le chevauchement — un rythme, pas une
     symétrie. Sans image, la section reste du texte et ne laisse pas de
     trou : `--ov` ne sert à rien s'il n'y a rien à remonter. */
  const split = (img, title, text, extra = '', kicker = '') => {
    if (!title && !text && !extra) return ''
    const ov = [0.3, 0.16, 0.28, 0.22][turn++ % 4]
    return `<section class="sec s split${band(turn)} rv" style="--ov:${ov}">
      <div class="sec-text">
        ${kicker ? `<span class="kicker">${esc(kicker)}</span>` : ''}
        ${title ? `<h2>${esc(title)}</h2>` : ''}
        ${text ? `<p>${esc(text)}</p>` : ''}
        ${extra}
      </div>
      ${img ? `<div class="sec-media">${shotTag(img, c.product)}</div>` : ''}
    </section>`
  }

  const cardList = (items) => items.length
    ? `<div class="cards">${items.map((i) => `<article>
        <span class="ic">${icon('spark', 18)}</span>
        <h3>${esc(i.title)}</h3>${i.text ? `<p>${esc(i.text)}</p>` : ''}
      </article>`).join('')}</div>`
    : ''

  const checks = (items) => items.length
    ? `<ul class="checks">${items.map((i) => `<li><span>${icon('check', 16)}</span><div>
        <b>${esc(i.title)}</b>${i.text ? `<p>${esc(i.text)}</p>` : ''}</div></li>`).join('')}</ul>`
    : ''

  return `<!doctype html>
<html lang="${c.language ?? 'ar'}" dir="${ar ? 'rtl' : 'ltr'}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(shop ? `${c.hero.headline} — ${shop}` : c.hero.headline)}</title>
<meta name="description" content="${esc(c.hero.sub || c.hero.headline)}">
<meta property="og:title" content="${esc(c.hero.headline)}">
<meta property="og:description" content="${esc(c.hero.sub || '')}">
${shot ? `<meta property="og:image" content="${esc(shot)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${FACE.q}&display=swap">
${pixelSnippet({ pixelId: opts.pixelId, product: c.product, price: c.price_dzd, pageId })}
<style>
:root{
  --p:${t.primary}; --a:${t.accent}; --d:${t.dark}; --l:${dark ? '#17191c' : t.light};
  ${dark
    ? '--ink:#f2f4f6; --mid:#aeb6bf; --dim:#8b949e; --line:#262a2f; --paper:#0e1013;'
    : '--ink:#15181c; --mid:#4a525b; --dim:#737c86; --line:#e7eaee; --paper:#fff;'}
  --w:min(100vw,480px); --pad:24px;
  --outer:${dark ? '#060608' : '#e9ebee'};
  --f-head:${face.d}; --f-body:${face.t};
  --r:${tpl.r}px; --r-s:${Math.max(6, Math.round(tpl.r * 0.66))}px;
  --cta:${tpl.grad ? `linear-gradient(135deg,var(--p),color-mix(in srgb,var(--a) 55%,var(--p)))` : 'var(--p)'};
  --sh:0 1px 2px rgba(0,0,0,${dark ? '.4' : '.04'}), 0 10px 30px -12px rgba(0,0,0,${dark ? '.55' : '.14'});
  --sh-lg:0 2px 4px rgba(0,0,0,${dark ? '.45' : '.05'}), 0 24px 60px -20px rgba(0,0,0,${dark ? '.7' : '.22'});
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;background:var(--outer)}

/* ── LA COLONNE ───────────────────────────────────────────────────────────
   480 px, centrés, sur un fond plus sombre que la page. C'est le format de
   « landing-lab », et ce n'est pas un rétrécissement : une page de vente en
   paiement à la livraison se lit à 100 % au pouce, sur un téléphone tenu
   d'une main. La version d'avant faisait 760 à 1060 px — une page de bureau
   qu'on regardait sur un mobile.

   On habille les enfants directs plutôt que d'ajouter un conteneur : ça
   évite de retoucher tout le gabarit, et la barre collante, qui est en
   position fixe, se centre sur la même colonne au lieu de barrer l'écran. */
body{background:var(--outer);color:var(--ink);
  font:400 16px/${ar ? '1.85' : '1.6'} var(--f-body);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
body > :not(script){max-width:var(--w);margin-inline:auto;background:var(--paper)}
img{max-width:100%;display:block}
.w{max-width:var(--w);margin:0 auto;padding:0 var(--pad)}
.s{padding:56px 0}
.s.alt{background:var(--l)}

/* ── LA TYPOGRAPHIE ───────────────────────────────────────────────────────
   « text-wrap:balance » sur les titres : le navigateur répartit lui-même les
   mots sur les lignes au lieu de laisser un mot seul en bas. « pretty » sur
   les paragraphes fait la même chose contre les orphelines. Deux
   déclarations, et c'est la différence la plus visible entre une page
   composée et une page empilée.

   La mesure compte autant : 32 à 34 signes par ligne. Au-delà, l'œil perd
   le début de la ligne suivante — sur une colonne de 480 px, un paragraphe
   pleine largeur se lit mal même avec la bonne police. */
h1,h2{font-family:var(--f-head);text-wrap:balance;color:var(--ink)}
h1{font-size:clamp(32px,9.5vw,${Math.round(parseInt(tpl.h1.split(',')[2]) * 0.84)}px);
  line-height:1.04;font-weight:${Math.min(900, tpl.weight + 50)};letter-spacing:${ar ? '0' : tpl.track}}
h2{font-size:clamp(26px,7.4vw,33px);line-height:1.1;font-weight:${tpl.weight};
  letter-spacing:${ar ? '0' : tpl.track};margin-bottom:12px}
h3{font-family:var(--f-head);font-size:18px;font-weight:700;margin-bottom:6px;
  letter-spacing:${ar ? '0' : '-.008em'}}
p{color:var(--mid);font-size:16px;text-wrap:pretty;max-width:34ch}
.lead{margin-top:14px;font-size:17px;line-height:1.5;color:var(--mid);max-width:32ch;text-wrap:pretty}
${ar ? '.lead{font-size:18px;line-height:1.8}p{font-size:17px;line-height:1.85}' : ''}
.head p,.sticky p,.sec-text .checks p{max-width:none}

/* Le chapeau de section. En latin il est en capitales largement tracées —
   c'est ce qui donne le ton éditorial. En arabe, JAMAIS : l'arabe n'a pas de
   capitales, et l'interlettrage casse les liaisons entre les glyphes. */
.kicker{font:600 12.5px/1.25 var(--f-body);letter-spacing:.16em;text-transform:uppercase;
  color:var(--p);margin-bottom:12px;display:block}
${ar ? '.kicker{letter-spacing:0;text-transform:none;font-size:15px;font-weight:700}' : ''}

/* ── top bar ─────────────────────────────────────────────────────────── */
.bar{position:sticky;top:0;z-index:20;background:${dark ? 'rgba(14,16,19,.84)' : 'rgba(255,255,255,.86)'};
  backdrop-filter:saturate(1.6) blur(14px);border-bottom:1px solid var(--line)}
.bar .w{display:flex;align-items:center;gap:14px;padding:13px 22px}
.bar b{font-size:16px;font-weight:750;letter-spacing:${ar ? '0' : '-.01em'}}
.bar .tag{margin-inline-start:auto;display:inline-flex;align-items:center;gap:7px;
  background:var(--l);color:var(--d);border:1px solid color-mix(in srgb,var(--p) 22%,transparent);
  font-size:13px;font-weight:650;padding:7px 13px;border-radius:99px;white-space:nowrap}
.bar .tag svg{flex:0 0 auto;opacity:.8}

/* ── hero ────────────────────────────────────────────────────────────── */
/* ── TEXTE DESSUS, IMAGE DESSOUS ──────────────────────────────────────────
   LE changement. Avant, le titre était posé SUR la photo, et il fallait
   demander au modèle d'image de « laisser le tiers supérieur vide » pour
   lui faire de la place. Ça ne marchait pas : le produit remplissait le
   cadre et le titre tombait sur la capuche.

   Ici le texte a son propre espace, puis l'image est REMONTÉE sous lui de
   « --ov » fois sa hauteur (l'image fait 1,5 fois la largeur de la colonne,
   puisqu'elle est en 2:3), et un dégradé fond son bord haut dans le fond de
   page. Résultat : aucune couture visible, l'image a l'air de sortir du
   texte, et le modèle d'image n'a plus aucune contrainte de composition.

   « --ov » se règle par section : 0 = aucun chevauchement, .34 = franc. */
.sec{position:relative}
.sec-text{position:relative;z-index:2;padding:66px var(--pad) 0}
.hero .sec-text{padding-top:40px}
.sec-media{position:relative;z-index:1;margin-top:calc(var(--w) * -1.5 * var(--ov,.26))}
.sec-media img{width:100%;height:auto;aspect-ratio:2/3;object-fit:cover}
.sec-media::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(to bottom,var(--paper) 0%,
    color-mix(in srgb,var(--paper) 92%,transparent) calc(var(--ov,.26) * 55%),
    transparent calc(var(--ov,.26) * 100% + 10%),transparent 82%,var(--paper) 99%)}

.buy{padding:22px var(--pad) 0}
.prix-ligne{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:16px}
.cod{display:inline-flex;align-items:center;gap:8px;font:500 14.5px/1.3 var(--f-body);color:var(--dim)}
.eyebrow{display:none}
.price{font-family:var(--f-head);font-size:38px;font-weight:800;letter-spacing:-.02em;line-height:1;
  font-variant-numeric:tabular-nums}
/* Un seul bouton, pleine largeur, 58 px de haut : au pouce, une cible
   étroite se rate. C'est la mesure de « landing-lab ». */
.cta{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:58px;
  background:var(--cta);color:#fff;text-decoration:none;padding:0 20px;border-radius:14px;
  font:700 17px/1.2 var(--f-body);letter-spacing:.01em;
  box-shadow:0 10px 30px -12px color-mix(in srgb,var(--p) 80%,transparent);transition:.18s}
.cta:hover{filter:brightness(1.08)}
.hl{list-style:none;display:grid;gap:12px;margin-top:20px}
.hl span{display:flex;align-items:center;gap:12px;font:500 15px/1.35 var(--f-body);color:var(--mid)}
.hl span svg{flex:0 0 auto;color:var(--p)}

/* ── trust strip ─────────────────────────────────────────────────────── */
.trust{background:var(--d);color:#fff}
.trust .w{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:0 22px}
.trust div{display:flex;align-items:center;justify-content:center;gap:10px;padding:19px 10px;
  font-size:14px;font-weight:600;text-align:center}
.trust div + div{border-inline-start:1px solid rgba(255,255,255,.14)}
.trust svg{opacity:.75;flex:0 0 auto}

/* ── alternating picture / words ─────────────────────────────────────── */
/* Les sections illustrées suivent la même composition que le héros : le
   texte d'abord, l'image ensuite, remontée et fondue. La grille à deux
   colonnes d'avant n'a plus de sens dans une colonne de 480 px. */
.split{padding:0}
.split .w{padding:0;max-width:none}

/* ── LES GRILLES, DANS UNE COLONNE ────────────────────────────────────────
   Trois colonnes de bandeau de confiance, trois étapes côte à côte, des
   cartes à 248 px de plancher : tout ça était dimensionné pour une page
   large. Dans 480 px moins 48 de marge, il reste 432 px. */
.trust .w{grid-template-columns:1fr;gap:0}
.trust div{justify-content:flex-start;padding:15px 0}
.trust div + div{border-inline-start:0;border-top:1px solid rgba(255,255,255,.14)}
.cards{grid-template-columns:1fr}
.steps{grid-template-columns:1fr;gap:24px;text-align:start}
.steps article{text-align:start;padding:0}
.steps article::before{margin:0 0 12px;width:44px;height:44px;font-size:18px}
.gal{grid-template-columns:1fr 1fr;gap:10px}
.two{grid-template-columns:1fr}
.head{text-align:start;margin-bottom:26px}

/* ── cards & lists ───────────────────────────────────────────────────── */
.head{text-align:center;max-width:620px;margin:0 auto 38px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(248px,1fr));gap:16px}
.cards article{background:var(--paper);border:1px solid var(--line);border-radius:var(--r);
  padding:26px 24px;box-shadow:var(--sh);transition:.2s}
.cards article:hover{transform:translateY(-3px);box-shadow:var(--sh-lg)}
.cards .ic{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;
  background:var(--l);color:var(--p);margin-bottom:15px}
.cards p{font-size:15.5px}

.checks{list-style:none;display:grid;gap:15px}
.checks li{display:flex;gap:13px;align-items:flex-start}
.checks li > span{flex:0 0 auto;display:grid;place-items:center;width:26px;height:26px;margin-top:2px;
  border-radius:50%;background:var(--p);color:#fff}
.checks b{font-size:16.5px;font-weight:700}
.checks p{font-size:15.5px;margin-top:2px}

/* ── steps ───────────────────────────────────────────────────────────── */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;counter-reset:n;position:relative}
.steps article{text-align:center;padding:0 10px}
.steps article::before{counter-increment:n;content:counter(n);display:grid;place-items:center;
  width:52px;height:52px;margin:0 auto 16px;border-radius:50%;background:var(--p);color:#fff;
  font-size:21px;font-weight:800;box-shadow:0 8px 22px -8px color-mix(in srgb,var(--p) 70%,transparent)}
@media (max-width:700px){.steps{grid-template-columns:1fr;gap:26px}}

/* ── gallery ─────────────────────────────────────────────────────────── */
.gal{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.gal img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:var(--r-s);
  border:1px solid var(--line);transition:.2s}
.gal img:hover{transform:scale(1.015);box-shadow:var(--sh)}

/* ── faq ─────────────────────────────────────────────────────────────── */
.faq{max-width:760px;margin:0 auto}
.faq details{background:var(--paper);border:1px solid var(--line);border-radius:var(--r-s);
  margin-bottom:11px;overflow:hidden;transition:.18s}
.faq details[open]{box-shadow:var(--sh);border-color:color-mix(in srgb,var(--p) 26%,var(--line))}
.faq summary{cursor:pointer;list-style:none;padding:17px 20px;font-weight:650;font-size:16.5px;
  display:flex;align-items:center;gap:12px}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"";margin-inline-start:auto;flex:0 0 auto;width:10px;height:10px;
  border-right:2px solid var(--p);border-bottom:2px solid var(--p);
  transform:rotate(45deg);transition:.2s}
.faq details[open] summary::after{transform:rotate(225deg)}
.faq .a{padding:0 20px 18px;color:var(--mid);font-size:16px}

/* ── order ───────────────────────────────────────────────────────────── */
.order{background:var(--l)}
.panel{max-width:600px;margin:0 auto;background:var(--paper);border:1px solid var(--line);
  border-radius:var(--r);padding:clamp(24px,4vw,38px);box-shadow:var(--sh-lg)}
form{display:grid;gap:15px;margin-top:22px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:15px}
@media (max-width:560px){.two{grid-template-columns:1fr}}
label{font-size:13.5px;font-weight:650;color:var(--mid);display:block;margin-bottom:7px}
input,select{width:100%;padding:15px 16px;border:1.5px solid var(--line);border-radius:var(--r-s);
  font:inherit;font-size:16.5px;background:var(--paper);color:var(--ink);transition:.16s}
input:focus,select:focus{outline:0;border-color:var(--p);
  box-shadow:0 0 0 4px color-mix(in srgb,var(--p) 14%,transparent)}
.qty{display:flex;align-items:stretch;gap:0;border:1.5px solid var(--line);border-radius:var(--r-s);overflow:hidden}
.qty button{width:52px;border:0;background:var(--l);color:var(--p);font-size:21px;font-weight:700;cursor:pointer}
.qty button:hover{background:color-mix(in srgb,var(--p) 14%,transparent)}
.qty input{border:0;border-radius:0;text-align:center;font-weight:700}
.qty input:focus{box-shadow:none}
.tot{display:flex;align-items:baseline;gap:10px;padding:16px 18px;background:var(--l);
  border-radius:var(--r-s);font-weight:800;font-size:21px}
.tot span{font-size:14px;font-weight:600;color:var(--mid)}
.tot b{margin-inline-start:auto}
button.send{width:100%;padding:19px;border:0;border-radius:99px;background:var(--cta);color:#fff;
  font:inherit;font-size:18px;font-weight:750;cursor:pointer;
  box-shadow:0 10px 30px -8px color-mix(in srgb,var(--p) 70%,transparent);transition:.18s}
button.send:hover{filter:brightness(1.08);transform:translateY(-1px)}
.note{font-size:14px;color:var(--dim);margin-top:14px;text-align:center}

/* ── sticky ──────────────────────────────────────────────────────────── */
.sticky{position:fixed;inset-inline:0;bottom:0;z-index:30;background:${dark ? 'rgba(14,16,19,.93)' : 'rgba(255,255,255,.93)'};
  backdrop-filter:blur(14px);border-top:1px solid var(--line);padding:12px 22px;
  display:flex;align-items:center;gap:14px;box-shadow:0 -6px 24px rgba(20,24,28,.1);
  transform:translateY(110%);transition:transform .28s cubic-bezier(.2,.8,.3,1)}
.sticky.on{transform:none}
.sticky .p{font-weight:800;font-size:21px;line-height:1.2}
.sticky .p small{display:block;font-size:12px;font-weight:600;color:var(--dim)}
.sticky .cta{margin-inline-start:auto;padding:14px 26px;font-size:16px}

footer{padding:40px 0 34px;text-align:center;color:var(--dim);font-size:14px;border-top:1px solid var(--line)}

/* Reveal on scroll — but only where JavaScript is actually running.
   Hiding a section by default and waiting for an observer to un-hide it lost
   two thirds of this page: in a print, in a PDF, in a full-page capture and
   anywhere the script failed, the observer never fired and the benefits, the
   steps and the FAQ simply were not there. The content is visible unless the
   page can prove it can bring it back. */
html.js .rv{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s cubic-bezier(.2,.8,.3,1)}
html.js .rv.in{opacity:1;transform:none}
@media print{html.js .rv{opacity:1 !important;transform:none !important}}
@media (prefers-reduced-motion:reduce){
  html.js .rv{opacity:1;transform:none;transition:none}
  .cta:hover,.cards article:hover,.gal img:hover{transform:none}
  html{scroll-behavior:auto}
}
</style>

<div class="bar"><div class="w">
  <b>${esc(shop || c.product)}</b>
  <span class="tag">${icon('cash', 16)}${esc(L.cod)}</span>
</div></div>

<header class="sec hero" style="--ov:.30">
  <div class="sec-text">
    ${c.hero.eyebrow ? `<span class="kicker">${esc(c.hero.eyebrow)}</span>` : ''}
    <h1>${esc(c.hero.headline)}</h1>
    ${c.hero.sub ? `<p class="lead">${esc(c.hero.sub)}</p>` : ''}
  </div>
  ${heroBg ? `<div class="sec-media">${shotTag(heroBg, c.product, true)}</div>` : ''}
  <div class="buy">
    <div class="prix-ligne">
      <span class="price">${money(c.price_dzd)}</span>
      <span class="cod">${icon('cash', 18)}${esc(L.cod)}</span>
    </div>
    <a class="cta" href="#order">${esc(c.hero.cta || L.order)}${icon('check', 18)}</a>
    ${c.highlights.length ? `<div class="hl">${c.highlights.map((h) => `<span>${icon('check', 17)}${esc(h)}</span>`).join('')}</div>` : ''}
  </div>
</header>

<div class="trust"><div class="w">
  <div>${icon('truck')}${esc(L.wil)}</div>
  <div>${icon('cash')}${esc(L.free)}</div>
  <div>${icon('phone')}${esc(L.call)}</div>
</div></div>

${split(scenes.problem, c.problem.title, c.problem.text)}
${split(scenes.solution ?? images[0], c.solution.title, c.solution.text)}

${show('benefits') && c.benefits.length ? `<section class="s rv"><div class="w">
  <div class="head"><h2>${esc(ar ? 'علاش هاد المنتج' : en ? 'What it gives you' : 'Ce qu\'il vous apporte')}</h2></div>
  ${cardList(c.benefits)}
</div></section>` : ''}

${show('features') && c.features.length ? `<section class="sec s alt split rv" style="--ov:.20">
  <div class="sec-text">
    <h2>${esc(ar ? 'التفاصيل' : en ? 'The details' : 'Les détails')}</h2>
    ${checks(c.features)}
  </div>
  ${scenes.benefits ? `<div class="sec-media">${shotTag(scenes.benefits, c.product)}</div>` : ''}
</section>` : ''}

${show('gallery') && gallery.length ? `<section class="s rv"><div class="w">
  <div class="head"><h2>${esc(L.gallery)}</h2></div>
  <div class="gal">${gallery.slice(0, 6).map((u) => `<img src="${esc(u)}" alt="${esc(c.product)}" loading="lazy">`).join('')}</div>
</div></section>` : ''}

${show('steps') && c.steps.length ? `<section class="s alt rv"><div class="w">
  <div class="head"><h2>${esc(L.how)}</h2></div>
  <div class="steps">${c.steps.map((s) => `<article><h3>${esc(s.title)}</h3>${s.text ? `<p>${esc(s.text)}</p>` : ''}</article>`).join('')}</div>
</div></section>` : ''}

${show('why') && c.whyChoose.length ? `<section class="s rv"><div class="w">
  <div class="head"><h2>${esc(L.why)}</h2></div>
  <div style="max-width:620px;margin:0 auto">${checks(c.whyChoose)}</div>
</div></section>` : ''}

${show('faq') && c.faq.length ? `<section class="s alt rv"><div class="w">
  <div class="head"><h2>${esc(L.faq)}</h2></div>
  <div class="faq">${c.faq.map((f) => `<details><summary>${esc(f.q)}</summary><div class="a">${esc(f.a)}</div></details>`).join('')}</div>
</div></section>` : ''}

<section class="s order" id="order"><div class="w"><div class="panel">
  <h2 style="text-align:center">${esc(L.order)}</h2>
  ${c.delivery ? `<p style="text-align:center">${esc(c.delivery)}</p>` : ''}
  <form method="post" action="/api/order">
    <input type="hidden" name="product" value="${esc(c.product)}">
    <input type="hidden" name="price" value="${esc(String(c.price_dzd))}">
    ${pageId ? `<input type="hidden" name="page" value="${esc(String(pageId))}">` : ''}
    <div><label for="n">${esc(L.name)}</label><input id="n" name="name" required autocomplete="name"></div>
    <div><label for="p">${esc(L.phone)}</label>
      <input id="p" name="phone" required inputmode="tel" autocomplete="tel" pattern="[0-9 +]{9,}" placeholder="0${ar ? '6' : '6'}XX XX XX XX"></div>
    <div class="two">
      <div><label for="w">${esc(L.wilaya)}</label><select id="w" name="wilaya" required>
        <option value="">${esc(L.pick)}</option>${(ar ? WILAYAS_AR : WILAYAS_FR).map((x) => `<option>${esc(x)}</option>`).join('')}
      </select></div>
      <div><label for="c">${esc(L.commune)}</label><input id="c" name="commune" required></div>
    </div>
    ${/* La taille, demandée AVANT la commande et pas au téléphone.
          La règle numéro un de l'agent dit qu'une pointure manquante est une
          question — et le formulaire, lui, n'en posait aucune. Résultat : un
          appel de confirmation en plus pour chaque commande, et une livraison
          refusée à la porte quand la taille n'était pas la bonne. Les
          variantes en rupture restent VISIBLES mais désactivées : savoir que
          le 45 existe et qu'il est épuisé vaut mieux que de croire qu'il
          n'existe pas. */ ''}
    ${variants.length ? `<div><label for="v">${esc(L.size)}</label>
      <select id="v" name="variant" required>
        <option value="">${esc(L.pickSize)}</option>
        ${variants.map((v) => {
          const size = typeof v === 'string' ? v : v.size
          const stock = typeof v === 'string' ? null : v.stock
          const out = stock != null && stock <= 0
          return `<option value="${esc(size)}"${out ? ' disabled' : ''}>${esc(size)}${out ? ` — ${esc(L.soldOut)}` : ''}</option>`
        }).join('')}
      </select></div>` : ''}
    <div><label for="q">${esc(L.qty)}</label>
      <div class="qty">
        <button type="button" data-step="-1" aria-label="-">−</button>
        <input id="q" name="qty" type="number" min="1" max="20" value="1" required>
        <button type="button" data-step="1" aria-label="+">+</button>
      </div>
    </div>
    <div class="tot"><span>${esc(L.total)}</span><b id="tot">${money(c.price_dzd)}</b></div>
    <button class="send" type="submit">${esc(L.send)}</button>
  </form>
  ${c.guarantee ? `<p class="note">${esc(c.guarantee)}</p>` : ''}
</div></div></section>

<div class="sticky" id="sticky">
  <span class="p">${money(c.price_dzd)}<small>${esc(L.cod)}</small></span>
  <a class="cta" href="#order">${esc(c.hero.cta || L.order)}</a>
</div>

<footer>${esc(shop || '')}</footer>

<script>
// Three small things, no library. Each is wrapped because a page that throws
// here must still be a page you can order from.
(function(){
  var all=function(){ document.querySelectorAll('.rv').forEach(function(n){ n.classList.add('in') }) };
  try{
    if(!('IntersectionObserver' in window)) throw 0;
    document.documentElement.classList.add('js');
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target) } })
    },{rootMargin:'0px 0px -8% 0px',threshold:.08});
    document.querySelectorAll('.rv').forEach(function(n){ io.observe(n) });
    // Belt and braces: whatever has not revealed itself within three seconds
    // gets revealed anyway. A section nobody can read is worse than one that
    // arrived without its animation.
    setTimeout(all,3000);
    addEventListener('beforeprint',all);
  }catch(e){ document.documentElement.classList.remove('js'); all() }

  // The sticky bar only earns its place once the hero's own button is gone.
  try{
    var hero=document.querySelector('.hero'), bar=document.getElementById('sticky');
    new IntersectionObserver(function(es){ bar.classList.toggle('on', !es[0].isIntersecting) },
      {threshold:0}).observe(hero);
  }catch(e){}

  // Quantity, and a total that follows it. A buyer who has to multiply in
  // their head before trusting a courier does not order.
  try{
    var unit=${Number(c.price_dzd) || 0}, q=document.getElementById('q'), tot=document.getElementById('tot');
    function fmt(n){ return new Intl.NumberFormat('fr-FR').format(n).replace(/[\\u202f\\u00a0]/g,' ')+' DA' }
    function paint(){ var n=Math.max(1,Math.min(20,parseInt(q.value||'1',10)||1)); q.value=n;
      tot.innerHTML='<bdi dir="ltr">'+fmt(unit*n)+'</bdi>' }
    document.querySelectorAll('.qty button').forEach(function(b){
      b.addEventListener('click',function(){ q.value=(parseInt(q.value||'1',10)||1)+Number(b.dataset.step); paint() })
    });
    q.addEventListener('input',paint); paint();
  }catch(e){}
})();
</script>
`
}
