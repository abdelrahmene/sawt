// Ajoute une troisième prise de vue à chaque produit, et quatre vêtements
// premium au catalogue fournisseur.
//
// POURQUOI UNE TROISIÈME PRISE. Deux photos suffisent à remplir une carte ;
// elles ne suffisent pas à décider d'acheter. En paiement à la livraison, la
// question que le client pose avant de confirmer — « c'est quoi la matière »,
// « ça fait quelle longueur », « comment ça se ferme » — est exactement celle
// à laquelle une troisième photo répond. Une fiche qui n'y répond pas la
// renvoie au téléphone, et chaque appel coûte une vente.
//
// La troisième est donc écrite À LA MAIN pour chaque produit, et elle montre
// autre chose : le dos, le dessous, la matière, l'objet ouvert. Trois fois le
// même angle, c'est deux photos de plus et pas une information de plus.
//
// POURQUOI GÉNÉRER PLUTÔT QUE REPRENDRE LES VRAIES. La raison est déjà écrite
// dans make-catalog.mjs et elle n'a pas changé : aucun droit de tiers à
// demander, et le vrai catalogue d'un grossiste algérien est plein de
// répliques de marques que le règlement du concours interdit de montrer.
//
//   node bench/add-premium.mjs          # modifie fixtures/catalog.json
//   node bench/make-catalog.mjs         # fabrique les images manquantes
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../src/config.js'

const FILE = join(ROOT, 'fixtures', 'catalog.json')
const cat = JSON.parse(readFileSync(FILE, 'utf8'))

/* ── la troisième prise, produit par produit ──────────────────────────────
   Chacune montre ce que les deux premières ne montrent pas. */
const TROISIEME = {
  'sacoche-bandouliere':
    'Back view of the same grained black crossbody bag lying on a clean light grey surface, the adjustable webbing strap coiled beside it, the rear slip pocket open enough to show its depth, soft diffused light, gentle contact shadow, neutral seamless background.',
  'doudoune-longue':
    'The same matte black quilted puffer coat folded flat on a clean light grey surface, hood squared on top, sleeves tucked, showing how little space it takes folded, soft even light from above, neutral seamless background.',
  'basket-course-homme':
    'The outsole of the same mesh running shoe photographed from directly below on a clean light grey background, the full tread pattern and the thickness of the foam midsole clearly readable, soft raking light, no reflections.',
  'abaya-croisee':
    'A length of the same heavy black crepe held so the fabric falls in deep vertical folds, the wrap edge and its stitched hem crossing the frame, raking soft light so the weave and the weight of the cloth read clearly, shallow depth of field, neutral background.',
  'miroir-led':
    'Three-quarter back view of the same round LED vanity mirror on a clean light grey surface, showing the stand, the hinge and the touch control on the rim, the ring switched off, soft diffused light, gentle floor shadow.',
  'gourde-isotherme':
    'The same stainless insulated flask standing open with its lid resting beside it on a clean light grey surface, the wide mouth and the screw threads clearly visible from a high three-quarter angle, soft softbox light, neutral seamless background.',
  'couteaux-cuisine':
    'The five knives of the same set laid flat side by side on a clean light grey surface in descending size, blades angled to catch a soft raking light along the edges, the empty wooden block standing behind them, neutral seamless background.',
  'basket-enfant':
    'The same kids sneaker with its hook-and-loop strap fully opened, photographed from a high three-quarter angle on a clean light grey background so the width of the opening and the padded collar are clearly visible, soft even light.',
  'mousseur-lait':
    'The same electric milk frother with its lid removed and set beside it on a clean light grey surface, the whisk visible inside the jug, photographed from a high angle, soft diffused light, gentle contact shadow, neutral seamless background.',
  'tapis-priere':
    'The same padded prayer mat rolled up and held closed by its strap, standing upright on a clean light grey surface, photographed from the side so the thickness of the padding reads along the spiral, soft diffused light, neutral background.',
}

let ajoutees = 0
for (const p of cat.products) {
  const t = TROISIEME[p.id]
  if (!t || p.shots.length >= 3) continue
  p.shots.push(t)
  p.images.push(`${p.id}-3.webp`)
  ajoutees++
}

/* ── quatre vêtements premium ─────────────────────────────────────────────
   Aucune marque, aucune réplique : des pièces décrites par leur matière et
   leur coupe, ce qui est de toute façon ce qu'un client demande au téléphone.
   Les prix sont ceux d'un grossiste algérien, pas ceux d'une boutique
   européenne : le coût fournisseur et le prix plancher tiennent la marge
   autour de 50 %, comme le reste du catalogue. */
const NOUVEAUX = [
  {
    id: 'manteau-laine',
    supplier: 'atlas',
    category: 'clothing',
    name: {
      en: 'Wool overcoat, tailored collar',
      ar: 'مانطو صوف بكول تايور',
      fr: 'Manteau en laine, col tailleur',
    },
    blurb: {
      en: 'Camel wool blend, straight cut, falls below the knee. Warm without the bulk.',
      ar: 'صوف لون كامل، قصة مستقيمة، يطيح تحت الركبة. سخون بلا ما يكبّرك.',
      fr: 'Laine mélangée camel, coupe droite, tombe sous le genou. Chaud sans épaissir.',
    },
    record: 'Manteau femme laine melangee 60 pourcent, col tailleur, coupe droite, deux poches passepoilees, doublure satinee, longueur sous le genou. Tailles S M L XL. Coloris: camel, anthracite. Stock faible sur XL.',
    supplier_cost: 7200,
    min_selling: 14500,
    variants: [{ size: 'S', stock: 12 }, { size: 'M', stock: 21 }, { size: 'L', stock: 17 }, { size: 'XL', stock: 5 }],
    images: ['manteau-laine-1.webp', 'manteau-laine-2.webp', 'manteau-laine-3.webp'],
    shots: [
      'Studio product photograph of a camel wool blend overcoat for women with a tailored notch collar, straight cut, falling below the knee, shown on an invisible mannequin on a clean seamless light grey background, large softbox from the left, gentle floor shadow, premium catalogue quality.',
      'Close-up of the woven camel wool of the same coat at the notch collar and lapel, the stitched edge crossing the frame diagonally, raking soft light so the wool fibre and the weave read clearly, shallow depth of field, neutral background.',
      'The same camel wool overcoat photographed from behind on an invisible mannequin, showing the centre back seam and the clean shoulder line, clean seamless light grey background, soft even light, gentle floor shadow.',
    ],
  },
  {
    id: 'chemise-lin',
    supplier: 'sahel',
    category: 'clothing',
    name: {
      en: 'Washed linen shirt, men',
      ar: 'قميجة كتان مغسول للرجال',
      fr: 'Chemise en lin lavé, homme',
    },
    blurb: {
      en: 'Off-white washed linen, soft from the first wear. Breathes through an Oran summer.',
      ar: 'كتان مغسول لون كريمي، ليّن من أول مرة. يتنفّس في صهد وهران.',
      fr: "Lin lavé écru, souple dès le premier porté. Respire dans l'été d'Oran.",
    },
    record: 'Chemise homme lin lave 100 pourcent, col classique, patte boutonnee, manches longues avec poignet boutonne, coupe droite. Tailles S M L XL XXL. Coloris: ecru, bleu ciel. Rupture frequente sur L.',
    supplier_cost: 1850,
    min_selling: 3900,
    variants: [{ size: 'S', stock: 18 }, { size: 'M', stock: 34 }, { size: 'L', stock: 7 }, { size: 'XL', stock: 22 }, { size: 'XXL', stock: 11 }],
    images: ['chemise-lin-1.webp', 'chemise-lin-2.webp', 'chemise-lin-3.webp'],
    shots: [
      'Studio product photograph of an off-white washed linen shirt for men with a classic collar and long sleeves, shown on an invisible mannequin on a clean seamless light grey background, soft large softbox, gentle floor shadow, premium catalogue quality.',
      'Macro of the washed linen weave of the same off-white shirt at the buttoned cuff, the mother-of-pearl toned button and the stitched placket edge in frame, raking soft light so the slubs of the linen read clearly, shallow depth of field, neutral background.',
      'The same off-white linen shirt folded flat on a clean light grey surface, collar squared at the top, sleeves tucked behind, soft even light from above, gentle contact shadow, neutral seamless background.',
    ],
  },
  {
    id: 'pull-maille',
    supplier: 'sahel',
    category: 'clothing',
    name: {
      en: 'Fine-knit roll neck',
      ar: 'تريكو كول رولي مايل رفيعة',
      fr: 'Pull col roulé, maille fine',
    },
    blurb: {
      en: 'Charcoal fine knit, close without squeezing. Goes under a jacket without bunching.',
      ar: 'مايل رفيعة لون ڨري غامق، تلصق بلا ما تضيّق. تدخل تحت الفيست بلا ما تكرمش.',
      fr: 'Maille fine anthracite, près du corps sans serrer. Passe sous une veste sans gonfler.',
    },
    record: 'Pull mixte col roule maille fine, 70 pourcent viscose 30 pourcent polyamide, cotes au col aux poignets et a la base, coupe ajustee. Tailles S M L XL. Coloris: anthracite, noir, bordeaux.',
    supplier_cost: 2300,
    min_selling: 4800,
    variants: [{ size: 'S', stock: 26 }, { size: 'M', stock: 40 }, { size: 'L', stock: 29 }, { size: 'XL', stock: 13 }],
    images: ['pull-maille-1.webp', 'pull-maille-2.webp', 'pull-maille-3.webp'],
    shots: [
      'Studio product photograph of a charcoal grey fine-knit roll neck sweater shown on an invisible mannequin on a clean seamless light grey background, the rolled collar standing evenly, soft large softbox, gentle floor shadow, premium catalogue quality.',
      'Macro of the fine knit of the same charcoal sweater where the ribbed collar meets the body, the ribs running diagonally across the frame, raking soft light so each stitch reads, shallow depth of field, neutral background.',
      'The same charcoal roll neck folded flat on a clean light grey surface, the rolled collar laid at the top of the frame, sleeves folded behind, soft even light from above, gentle contact shadow, neutral seamless background.',
    ],
  },
  {
    id: 'trench-ceinture',
    supplier: 'atlas',
    category: 'clothing',
    name: {
      en: 'Belted trench coat',
      ar: 'طرونش بالسانتورة',
      fr: 'Trench ceinturé',
    },
    blurb: {
      en: 'Sand cotton gabardine, double breasted, belt included. Rain slides off it.',
      ar: 'ڨابردين قطن لون رملي، دوبل بوتوناج، بالسانتورة. المطر يزلق عليه.',
      fr: 'Gabardine de coton sable, double boutonnage, ceinture fournie. La pluie glisse dessus.',
    },
    record: 'Trench femme gabardine coton deperlante, double boutonnage, ceinture a boucle metal fournie, empiecement dos, deux poches a rabat, longueur mi-mollet. Tailles S M L XL. Coloris: sable, kaki. Stock limite sur S.',
    supplier_cost: 5400,
    min_selling: 11000,
    variants: [{ size: 'S', stock: 6 }, { size: 'M', stock: 23 }, { size: 'L', stock: 18 }, { size: 'XL', stock: 9 }],
    images: ['trench-ceinture-1.webp', 'trench-ceinture-2.webp', 'trench-ceinture-3.webp'],
    shots: [
      'Studio product photograph of a sand coloured cotton gabardine trench coat for women, double breasted, belt tied at the waist, mid-calf length, shown on an invisible mannequin on a clean seamless light grey background, large softbox, gentle floor shadow, premium catalogue quality.',
      'Close-up of the tied belt and metal buckle of the same sand trench coat, the gabardine twill visible around it, raking soft light so the diagonal weave and the buckle edge read clearly, shallow depth of field, neutral background.',
      'The same sand trench coat photographed from behind on an invisible mannequin, showing the back yoke and the belt loops, clean seamless light grey background, soft even light, gentle floor shadow.',
    ],
  },
]

const existants = new Set(cat.products.map((p) => p.id))
let neufs = 0
for (const p of NOUVEAUX) {
  if (existants.has(p.id)) continue
  cat.products.push(p)
  neufs++
}

writeFileSync(FILE, JSON.stringify(cat, null, 2) + '\n', 'utf8')

const sans3 = cat.products.filter((p) => p.shots.length < 3).map((p) => p.id)
console.log(`\n  ${ajoutees} troisième(s) prise(s) ajoutée(s), ${neufs} produit(s) neuf(s).`)
console.log(`  ${cat.products.length} produits au catalogue, ` +
  `${cat.products.reduce((n, p) => n + p.shots.length, 0)} prises de vue au total.`)
if (sans3.length) console.log(`  ⚠️ encore sous 3 prises : ${sans3.join(', ')}`)
console.log('\n  Suite :  node bench/make-catalog.mjs\n')
