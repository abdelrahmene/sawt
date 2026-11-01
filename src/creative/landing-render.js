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

const AR = `"Segoe UI","Noto Kufi Arabic","Noto Naskh Arabic","Geeza Pro",Tahoma,sans-serif`
const LAT = `system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif`

// A price inside a right-to-left paragraph gets reordered by the bidi
// algorithm: "4 500 DA" renders as "DA 500 4", which is not a price. The
// isolate is not decoration — on a sales page this is the one string that must
// never be wrong, and it is wrong by default in Arabic.
const money = (n) => {
  const s = Number(n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ')
  return `<bdi dir="ltr">${s} DA</bdi>`
}

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
  editorial: { h1: '30px,6vw,52px', h2: '22px,3.4vw,32px', w: 760, r: 16, weight: 750, pad: 72, grad: false, track: '-.022em' },
  bold:      { h1: '34px,8vw,68px', h2: '26px,4.4vw,40px', w: 1060, r: 6,  weight: 850, pad: 84, grad: false, track: '-.035em' },
  soft:      { h1: '28px,6vw,46px', h2: '21px,3.2vw,30px', w: 920, r: 28, weight: 700, pad: 68, grad: false, track: '-.015em' },
  vivid:     { h1: '32px,7vw,58px', h2: '24px,3.8vw,36px', w: 1000, r: 20, weight: 800, pad: 76, grad: true,  track: '-.028em' },
}

const clamp = (s) => `clamp(${s.split(',').join(',')})`

export function renderLanding(c, { images = [], scenes = {}, shop, pageId, opts = {}, variants = [] } = {}) {
  const ar = c.language !== 'fr'
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
  const split = (img, title, text, extra = '') => {
    if (!title && !text && !extra) return ''
    const flip = turn++ % 2 ? ' flip' : ''
    return `<section class="s split${flip}${band(turn)}"><div class="w">
      ${img ? `<div class="pic"><img src="${esc(img)}" alt="${esc(c.product)}" loading="lazy"></div>` : ''}
      <div class="txt">
        ${title ? `<h2>${esc(title)}</h2>` : ''}
        ${text ? `<p>${esc(text)}</p>` : ''}
        ${extra}
      </div>
    </div></section>`
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
<html lang="${ar ? 'ar' : 'fr'}" dir="${ar ? 'rtl' : 'ltr'}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(shop ? `${c.hero.headline} — ${shop}` : c.hero.headline)}</title>
<meta name="description" content="${esc(c.hero.sub || c.hero.headline)}">
<meta property="og:title" content="${esc(c.hero.headline)}">
<meta property="og:description" content="${esc(c.hero.sub || '')}">
${shot ? `<meta property="og:image" content="${esc(shot)}">` : ''}
${pixelSnippet({ pixelId: opts.pixelId, product: c.product, price: c.price_dzd, pageId })}
<style>
:root{
  --p:${t.primary}; --a:${t.accent}; --d:${t.dark}; --l:${dark ? '#17191c' : t.light};
  ${dark
    ? '--ink:#f2f4f6; --mid:#aeb6bf; --dim:#8b949e; --line:#262a2f; --paper:#0e1013;'
    : '--ink:#15181c; --mid:#4a525b; --dim:#737c86; --line:#e7eaee; --paper:#fff;'}
  --r:${tpl.r}px; --r-s:${Math.max(6, Math.round(tpl.r * 0.66))}px;
  --cta:${tpl.grad ? `linear-gradient(135deg,var(--p),color-mix(in srgb,var(--a) 55%,var(--p)))` : 'var(--p)'};
  --sh:0 1px 2px rgba(0,0,0,${dark ? '.4' : '.04'}), 0 10px 30px -12px rgba(0,0,0,${dark ? '.55' : '.14'});
  --sh-lg:0 2px 4px rgba(0,0,0,${dark ? '.45' : '.05'}), 0 24px 60px -20px rgba(0,0,0,${dark ? '.7' : '.22'});
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{background:var(--paper);color:var(--ink);
  font:17px/${ar ? '1.95' : '1.7'} ${ar ? AR : LAT};
  -webkit-font-smoothing:antialiased;padding-bottom:86px;overflow-x:hidden}
img{max-width:100%;display:block}
.w{max-width:${tpl.w}px;margin:0 auto;padding:0 22px}
.s{padding:${tpl.pad}px 0}
.s.alt{background:var(--l)}
h1{font-size:${clamp(tpl.h1)};line-height:1.16;font-weight:${tpl.weight + 50};
  letter-spacing:${ar ? '0' : tpl.track}}
h2{font-size:${clamp(tpl.h2)};line-height:1.26;font-weight:${tpl.weight};
  letter-spacing:${ar ? '0' : tpl.track};margin-bottom:14px}
h3{font-size:17px;font-weight:700;margin-bottom:6px;letter-spacing:${ar ? '0' : '-.008em'}}
p{color:var(--mid);font-size:16.5px}

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
.hero{position:relative;min-height:min(86vh,720px);display:grid;align-items:end;
  background:var(--d);overflow:hidden;isolation:isolate}
.hero .bg{position:absolute;inset:0;z-index:-2}
.hero .bg img{width:100%;height:100%;object-fit:cover;transform:scale(1.03)}
.hero::after{content:"";position:absolute;inset:0;z-index:-1;
  background:linear-gradient(to top,rgba(8,10,12,.93) 0%,rgba(8,10,12,.62) 42%,rgba(8,10,12,.28) 100%)}
.hero .w{padding:0 22px 56px;color:#fff;max-width:1060px}
.hero .in{max-width:680px}
.eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.13);
  border:1px solid rgba(255,255,255,.26);backdrop-filter:blur(6px);border-radius:99px;
  padding:7px 15px;font-size:13px;font-weight:600;letter-spacing:.02em;margin-bottom:20px}
.hero h1{color:#fff;text-shadow:0 2px 24px rgba(0,0,0,.35)}
.hero .sub{color:rgba(255,255,255,.9);font-size:clamp(16px,2.1vw,20px);margin-top:14px;max-width:560px}
.hero .buy{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-top:30px}
.price{font-size:clamp(28px,4.6vw,42px);font-weight:800;letter-spacing:-.02em;line-height:1}
.cta{display:inline-flex;align-items:center;gap:9px;background:var(--cta);color:#fff;
  text-decoration:none;padding:17px 32px;border-radius:99px;font-size:17px;font-weight:750;
  box-shadow:0 10px 32px -8px color-mix(in srgb,var(--p) 70%,transparent);transition:.18s}
.cta:hover{transform:translateY(-2px);filter:brightness(1.07)}
.hl{display:flex;flex-wrap:wrap;gap:9px;margin-top:26px}
.hl span{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.2);border-radius:99px;padding:8px 14px;font-size:13.5px;
  color:#fff;backdrop-filter:blur(4px)}

/* ── trust strip ─────────────────────────────────────────────────────── */
.trust{background:var(--d);color:#fff}
.trust .w{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:0 22px}
.trust div{display:flex;align-items:center;justify-content:center;gap:10px;padding:19px 10px;
  font-size:14px;font-weight:600;text-align:center}
.trust div + div{border-inline-start:1px solid rgba(255,255,255,.14)}
.trust svg{opacity:.75;flex:0 0 auto}

/* ── alternating picture / words ─────────────────────────────────────── */
.split .w{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,64px);align-items:center}
.split.flip .pic{order:2}
.split .pic{border-radius:var(--r);overflow:hidden;box-shadow:var(--sh-lg);background:var(--l)}
.split .pic img{width:100%;aspect-ratio:4/3;object-fit:cover}
@media (max-width:820px){
  .split .w{grid-template-columns:1fr;gap:26px}
  .split.flip .pic{order:0}
}

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

<header class="hero">
  ${heroBg ? `<div class="bg"><img src="${esc(heroBg)}" alt="${esc(c.product)}" fetchpriority="high"></div>` : ''}
  <div class="w"><div class="in">
    ${c.hero.eyebrow ? `<span class="eyebrow">${icon('spark', 15)}${esc(c.hero.eyebrow)}</span>` : ''}
    <h1>${esc(c.hero.headline)}</h1>
    ${c.hero.sub ? `<p class="sub">${esc(c.hero.sub)}</p>` : ''}
    <div class="buy">
      <span class="price">${money(c.price_dzd)}</span>
      <a class="cta" href="#order">${esc(c.hero.cta || L.order)}${icon('check', 18)}</a>
    </div>
    ${c.highlights.length ? `<div class="hl">${c.highlights.map((h) => `<span>${icon('check', 14)}${esc(h)}</span>`).join('')}</div>` : ''}
  </div></div>
</header>

<div class="trust"><div class="w">
  <div>${icon('truck')}${esc(L.wil)}</div>
  <div>${icon('cash')}${esc(L.free)}</div>
  <div>${icon('phone')}${esc(L.call)}</div>
</div></div>

${split(scenes.problem, c.problem.title, c.problem.text)}
${split(scenes.solution ?? images[0], c.solution.title, c.solution.text)}

${show('benefits') && c.benefits.length ? `<section class="s rv"><div class="w">
  <div class="head"><h2>${esc(ar ? 'علاش هاد المنتج' : 'Ce qu\'il vous apporte')}</h2></div>
  ${cardList(c.benefits)}
</div></section>` : ''}

${show('features') && c.features.length ? `<section class="s alt split rv"><div class="w">
  ${scenes.benefits ? `<div class="pic"><img src="${esc(scenes.benefits)}" alt="${esc(c.product)}" loading="lazy"></div>` : ''}
  <div class="txt">
    <h2>${esc(ar ? 'التفاصيل' : 'Les détails')}</h2>
    ${checks(c.features)}
  </div>
</div></section>` : ''}

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
