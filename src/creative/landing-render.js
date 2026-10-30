// JSON in, one self-contained HTML file out.
//
// The layout lives here rather than in a prompt, which is the whole point: the
// model writes the words, the code draws the page. Typography, right-to-left,
// the order form and the image placement are decided once and are then correct
// every time, instead of being re-improvised on each generation.
//
// No webfont, no framework, no external request — the page must open on a 4G
// phone in Oran, and it must open from a file:// path when a judge downloads it.

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const AR = `"Segoe UI","Noto Kufi Arabic","Geeza Pro",Tahoma,sans-serif`
const LAT = `system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif`

// A price inside a right-to-left paragraph gets reordered by the bidi
// algorithm: "4 500 DA" renders as "DA 500 4", which is not a price. The
// isolate is not decoration — on a sales page this is the one string that must
// never be wrong, and it is wrong by default in Arabic.
const money = (n) => {
  const s = Number(n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ')
  return `<bdi dir="ltr">${s} DA</bdi>`
}

const WILAYAS = ['أدرار','الشلف','الأغواط','أم البواقي','باتنة','بجاية','بسكرة','بشار','البليدة','البويرة','تمنراست','تبسة','تلمسان','تيارت','تيزي وزو','الجزائر','الجلفة','جيجل','سطيف','سعيدة','سكيكدة','سيدي بلعباس','عنابة','قالمة','قسنطينة','المدية','مستغانم','المسيلة','معسكر','ورقلة','وهران','البيض','إليزي','برج بوعريريج','بومرداس','الطارف','تندوف','تيسمسيلت','الوادي','خنشلة','سوق أهراس','تيبازة','ميلة','عين الدفلى','النعامة','عين تموشنت','غرداية','غليزان','تيميمون','برج باجي مختار','أولاد جلال','بني عباس','عين صالح','عين قزام','تقرت','جانت','المغير','المنيعة']

export function renderLanding(c, { images = [], shop } = {}) {
  const ar = c.language !== 'fr'
  const t = c.theme
  const L = ar
    ? { order: 'اطلب الآن', name: 'الاسم الكامل', phone: 'رقم الهاتف', wilaya: 'الولاية', commune: 'البلدية', qty: 'الكمية', pick: 'اختر الولاية', send: 'أكّد الطلب', cod: 'الدفع عند الاستلام', faq: 'أسئلة متكررة', how: 'كيفاش', why: 'علاش حنا' }
    : { order: 'Commander', name: 'Nom complet', phone: 'Téléphone', wilaya: 'Wilaya', commune: 'Commune', qty: 'Quantité', pick: 'Choisir la wilaya', send: 'Confirmer la commande', cod: 'Paiement à la livraison', faq: 'Questions fréquentes', how: 'Comment ça marche', why: 'Pourquoi nous' }

  const hero = images[0]
  const rest = images.slice(1)

  const section = (title, body) => (title || body)
    ? `<section class="s"><div class="w">${title ? `<h2>${esc(title)}</h2>` : ''}${body}</div></section>` : ''

  const cards = (items, cls = 'cards') => items.length
    ? `<div class="${cls}">${items.map((i) => `<article><h3>${esc(i.title)}</h3>${i.text ? `<p>${esc(i.text)}</p>` : ''}</article>`).join('')}</div>` : ''

  return `<!doctype html>
<html lang="${ar ? 'ar' : 'fr'}" dir="${ar ? 'rtl' : 'ltr'}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(shop ? `${shop} | ${c.hero.headline}` : c.hero.headline)}</title>
<meta name="description" content="${esc(c.hero.sub || c.hero.headline)}">
<style>
:root{--p:${t.primary};--a:${t.accent};--d:${t.dark};--l:${t.light};
  --ink:#14171a;--dim:#5d666e;--line:#e4e7ea;--r:14px}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;color:var(--ink);font:16px/1.75 ${ar ? AR : LAT};-webkit-font-smoothing:antialiased;padding-bottom:84px}
img{max-width:100%;display:block}
.w{max-width:620px;margin:0 auto;padding:0 20px}
.s{padding:44px 0;border-bottom:1px solid var(--line)}
.s:nth-of-type(even){background:var(--l)}
h1{font-size:clamp(28px,7vw,40px);line-height:1.25;letter-spacing:-.01em}
h2{font-size:22px;line-height:1.35;margin-bottom:12px}
h3{font-size:16px;margin-bottom:5px}
p{color:var(--dim)}
.bar{background:var(--d);color:#fff;padding:13px 0}
.bar .w{display:flex;align-items:center;gap:12px}
.bar b{font-size:15px;letter-spacing:.08em;text-transform:uppercase}
.bar .cod{margin-inline-start:auto;background:var(--a);color:#1a1205;font-size:12px;font-weight:700;
  padding:6px 11px;border-radius:99px;white-space:nowrap}
.hero{background:var(--p);color:#fff;padding:40px 0 0}
.hero .eyebrow{display:inline-block;border:1px solid rgba(255,255,255,.4);border-radius:99px;
  padding:5px 13px;font-size:12px;letter-spacing:.06em;margin-bottom:16px}
.hero p{color:rgba(255,255,255,.88);font-size:17px;margin-top:10px}
.hero .shot{margin-top:26px;border-radius:var(--r) var(--r) 0 0;overflow:hidden;background:rgba(0,0,0,.14)}
.hero .shot img{width:100%;aspect-ratio:1/1;object-fit:cover}
.price{display:flex;align-items:baseline;gap:10px;margin-top:20px;font-size:34px;font-weight:800}
.price small{font-size:14px;font-weight:500;opacity:.8}
.hl{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.hl span{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);
  border-radius:99px;padding:6px 12px;font-size:13px}
.cards{display:grid;gap:12px}
.cards article{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:15px 17px}
.s:nth-of-type(even) .cards article{background:#fff}
.steps{counter-reset:n;display:grid;gap:12px}
.steps article{position:relative;padding-inline-start:46px}
.steps article::before{counter-increment:n;content:counter(n);position:absolute;inset-inline-start:0;top:0;
  width:32px;height:32px;border-radius:50%;background:var(--p);color:#fff;display:grid;place-items:center;font-weight:700}
.gal{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
.gal img{aspect-ratio:1/1;object-fit:cover;border-radius:12px;border:1px solid var(--line)}
.faq details{border-bottom:1px solid var(--line);padding:13px 0}
.faq summary{cursor:pointer;font-weight:600;list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";float:${ar ? 'left' : 'right'};color:var(--p);font-weight:700}
.faq details[open] summary::after{content:"−"}
.faq p{margin-top:8px}
form{display:grid;gap:11px;margin-top:18px}
label{font-size:13px;color:var(--dim);display:block;margin-bottom:5px}
input,select{width:100%;padding:13px 14px;border:1px solid var(--line);border-radius:11px;
  font:inherit;font-size:16px;background:#fff;color:var(--ink)}
input:focus,select:focus{outline:0;border-color:var(--p);box-shadow:0 0 0 3px ${t.primary}22}
button{width:100%;padding:16px;border:0;border-radius:12px;background:var(--p);color:#fff;
  font:inherit;font-size:17px;font-weight:700;cursor:pointer}
button:hover{filter:brightness(1.08)}
.note{font-size:13px;color:var(--dim);margin-top:10px;text-align:center}
.sticky{position:fixed;inset-inline:0;bottom:0;background:#fff;border-top:1px solid var(--line);
  padding:11px 20px;display:flex;align-items:center;gap:12px;z-index:9;box-shadow:0 -4px 18px rgba(0,0,0,.07)}
.sticky .p{font-weight:800;font-size:19px}
.sticky a{margin-inline-start:auto;background:var(--p);color:#fff;text-decoration:none;
  padding:12px 22px;border-radius:11px;font-weight:700}
footer{padding:26px 0;text-align:center;color:var(--dim);font-size:13px}
</style>

<div class="bar"><div class="w">
  <b>${esc(shop || '')}</b><span class="cod">${esc(L.cod)}</span>
</div></div>

<header class="hero"><div class="w">
  ${c.hero.eyebrow ? `<span class="eyebrow">${esc(c.hero.eyebrow)}</span>` : ''}
  <h1>${esc(c.hero.headline)}</h1>
  ${c.hero.sub ? `<p>${esc(c.hero.sub)}</p>` : ''}
  <div class="price">${money(c.price_dzd)}<small>${esc(L.cod)}</small></div>
  ${c.highlights.length ? `<div class="hl">${c.highlights.map((h) => `<span>${esc(h)}</span>`).join('')}</div>` : ''}
  ${hero ? `<div class="shot"><img src="${esc(hero)}" alt="${esc(c.product)}" fetchpriority="high"></div>` : ''}
</div></header>

${section(c.problem.title, c.problem.text ? `<p>${esc(c.problem.text)}</p>` : '')}
${section(c.solution.title, (c.solution.text ? `<p>${esc(c.solution.text)}</p>` : '') +
  (rest.length ? `<div class="gal">${rest.slice(0, 4).map((u) => `<img src="${esc(u)}" alt="${esc(c.product)}" loading="lazy">`).join('')}</div>` : ''))}
${section('', cards(c.benefits))}
${section('', cards(c.features))}
${c.steps.length ? section(L.how, cards(c.steps, 'steps')) : ''}
${c.whyChoose.length ? section(L.why, cards(c.whyChoose)) : ''}
${c.faq.length ? `<section class="s faq"><div class="w"><h2>${esc(L.faq)}</h2>${
  c.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')
}</div></section>` : ''}

<section class="s" id="order"><div class="w">
  <h2>${esc(L.order)}</h2>
  ${c.delivery ? `<p>${esc(c.delivery)}</p>` : ''}
  <form method="post" action="/api/order">
    <input type="hidden" name="product" value="${esc(c.product)}">
    <input type="hidden" name="price" value="${esc(String(c.price_dzd))}">
    <div><label for="n">${esc(L.name)}</label><input id="n" name="name" required autocomplete="name"></div>
    <div><label for="p">${esc(L.phone)}</label><input id="p" name="phone" required inputmode="tel" autocomplete="tel" pattern="[0-9 +]{9,}"></div>
    <div><label for="w">${esc(L.wilaya)}</label><select id="w" name="wilaya" required>
      <option value="">${esc(L.pick)}</option>${WILAYAS.map((x) => `<option>${esc(x)}</option>`).join('')}
    </select></div>
    <div><label for="c">${esc(L.commune)}</label><input id="c" name="commune" required></div>
    <div><label for="q">${esc(L.qty)}</label><input id="q" name="qty" type="number" min="1" value="1" required></div>
    <button type="submit">${esc(L.send)}</button>
  </form>
  ${c.guarantee ? `<p class="note">${esc(c.guarantee)}</p>` : ''}
</div></section>

<div class="sticky">
  <span class="p">${money(c.price_dzd)}</span>
  <a href="#order">${esc(c.hero.cta || L.order)}</a>
</div>

<footer>${esc(shop || '')}</footer>
`
}
