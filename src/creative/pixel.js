// Le pixel Meta d'une page de vente, et les décisions qu'il porte.
//
// POURQUOI UN FICHIER À PART : trois lignes de `fbq` s'écrivent n'importe où.
// Ce qui ne s'improvise pas, c'est QUEL événement on envoie et QUAND — et en
// paiement à la livraison, les réponses ne sont pas celles du commerce
// classique. Elles sont écrites ici.
//
// ── Ce qu'on envoie, et pourquoi ─────────────────────────────────────────
//
// PageView        au chargement. Rien à décider.
//
// ViewContent     une fois la page vue. Avec `content_ids`, `content_name`,
//                 `content_type`, ET `value` + `currency`.
//                 ⚠️ `currency` sans `value` déclenche une alerte de qualité
//                 d'événement côté Meta et abîme l'optimisation. Les deux
//                 vont toujours ensemble, jamais l'un sans l'autre.
//
// InitiateCheckout au PREMIER contact avec le formulaire, pas à l'envoi.
//                 Posé à l'envoi, il arrive une milliseconde avant la
//                 conversion et ne distingue plus « a commencé à remplir »
//                 de « a commandé » — l'algorithme perd le signal qui
//                 l'intéresse, celui des gens qui ont hésité.
//
// Lead            à l'envoi du formulaire. PAS Purchase.
//                 C'est la décision qui compte. En COD, une commande passée
//                 n'est pas une commande payée : le client paie le livreur,
//                 et entre les deux il refuse le colis, ne répond pas au
//                 téléphone, ou n'est pas là. Compter un Purchase à l'envoi,
//                 c'est apprendre à Meta à chercher des gens qui remplissent
//                 des formulaires plutôt que des gens qui ouvrent leur porte.
//                 Le Purchase appartient à la livraison, et il remonte par
//                 l'API de conversions, pas depuis le navigateur.
//
// event_id        sur chaque événement. C'est la clé de déduplication avec
//                 un futur CAPI : sans elle, le même achat compte deux fois
//                 dès qu'on branche le serveur à côté du navigateur.
//
// ── Ce qu'on NE fait pas ─────────────────────────────────────────────────
// Pas de pixel quand aucun identifiant n'est configuré. Une page qui charge
// un script Facebook « pour la forme » ralentit le téléphone du client,
// ajoute un cookie tiers et ne mesure rien.

/** Un identifiant de pixel Meta est une suite de chiffres, rien d'autre. */
export const validPixel = (id) => /^\d{8,20}$/.test(String(id ?? '').trim())

/**
 * Le bloc à insérer dans <head>. Chaîne vide si aucun pixel n'est configuré.
 *
 * @param {object} o
 * @param {string} o.pixelId   l'identifiant du pixel du marchand
 * @param {string} o.product   le nom du produit, pour content_name
 * @param {number} o.price     le prix unitaire en DZD
 * @param {number|string} o.pageId  sert à fabriquer des event_id stables
 */
export function pixelSnippet({ pixelId, product, price, pageId } = {}) {
  if (!validPixel(pixelId)) return ''
  const id = String(pixelId).trim()
  const sku = `sawt-${pageId ?? 'page'}`
  const j = (v) => JSON.stringify(String(v ?? ''))

  return `
<!-- Meta Pixel. Les événements et leur moment sont expliqués dans
     src/creative/pixel.js : InitiateCheckout au premier contact avec le
     formulaire, et Lead — pas Purchase — à l'envoi, parce qu'en paiement à
     la livraison une commande passée n'est pas une commande payée. -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
(function(){
  try{
    var PRICE=${Number(price) || 0}, SKU=${j(sku)}, NAME=${j(product)};
    // Un identifiant par chargement de page, partagé par tous les événements
    // de cette visite : c'est ce qui permettra au serveur de dédupliquer.
    var eid=function(k){ return k+'.'+SKU+'.'+Date.now().toString(36)+Math.random().toString(36).slice(2,8) };
    var base=function(){ return { content_ids:[SKU], content_name:NAME, content_type:'product',
      value:PRICE, currency:'DZD' } };

    fbq('init', ${j(id)});
    fbq('track','PageView',{},{eventID:eid('pv')});
    fbq('track','ViewContent', base(), {eventID:eid('vc')});

    // ⚠️ Ce bloc vit dans <head> : le formulaire n'existe pas encore quand il
    // s'exécute. Sans cette attente, querySelector rend null et NI
    // InitiateCheckout NI Lead ne partent jamais — un pixel qui compte des
    // vues et aucune conversion, ce qui est pire que pas de pixel du tout.
    var brancher=function(){
    // Le premier geste vers le formulaire, une seule fois.
    var started=false;
    var form=document.querySelector('form[action="/api/order"]');
    if(form){
      var begin=function(){
        if(started) return; started=true;
        fbq('track','InitiateCheckout', base(), {eventID:eid('ic')});
      };
      ['focusin','change'].forEach(function(ev){ form.addEventListener(ev, begin, {once:false}) });
      // Le marchand arrive parfois par le bouton collant : voir le
      // formulaire compte comme un début, même sans l'avoir touché.
      try{
        new IntersectionObserver(function(es){ if(es[0].isIntersecting) begin() },
          {threshold:.6}).observe(form);
      }catch(e){}

      form.addEventListener('submit', function(){
        var qty=Math.max(1, parseInt((form.querySelector('[name=qty]')||{}).value||'1',10)||1);
        var d=base(); d.value=PRICE*qty; d.contents=[{id:SKU,quantity:qty,item_price:PRICE}];
        fbq('track','Lead', d, {eventID:eid('lead')});
      });
    }
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', brancher);
    else brancher();
  }catch(e){}
})();
</script>
<noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=${encodeURIComponent(id)}&ev=PageView&noscript=1" alt=""></noscript>
`
}
