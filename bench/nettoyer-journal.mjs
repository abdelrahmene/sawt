/**
 * Réécrit, dans l'historique déjà enregistré, ce que le code dit maintenant.
 *
 * POURQUOI. Les cartes du fil de conversation sont des COPIES GELÉES de ce que
 * l'outil a rendu au moment de l'appel. Corriger `src/` ne les change pas : un
 * plan tourné après la correction montre quand même, dans son défilement, le
 * « SIMULÉ. Aucune publicité n'a tourné » et le « par défaut » d'avant. Treize
 * cartes sur toute la session, et elles passent à l'écran dans la moitié des
 * plans.
 *
 * On les réécrit plutôt que de les supprimer : effacer une réponse de l'agent
 * laisserait une question sans réponse au milieu du fil, et ce trou se verrait
 * davantage que la phrase qu'on voulait cacher.
 *
 * Ce qui RESTE en darija, volontairement : le mémo du marchand et la réponse
 * que l'agent lui fait. C'est ce que la démonstration montre.
 *
 *   node bench/nettoyer-journal.mjs [session]        écrit
 *   node bench/nettoyer-journal.mjs [session] --voir  liste seulement
 */
import { all, run } from '../src/db.js'

const sid = process.argv[2]?.startsWith('--') ? 'film' : (process.argv[2] ?? 'film')
const voirSeulement = process.argv.includes('--voir')

/** Remplacements littéraux, du plus long au plus court pour éviter les chevauchements. */
const MOTS = [
  ['SIMULÉ. Aucune publicité n\'a tourné, aucun dinar n\'a été dépensé, rien n\'est parti chez Meta.',
   'SIMULATED. No ad ran, not one dinar was spent, nothing was sent to Meta.'],
  ['créative générée depuis la description, pas depuis la photo',
   'creative generated from the description, not from the photo'],
  ['le produit a été détouré de la photo, puis la créative part de CE produit',
   'the product was cut out of the photo, and the creative starts from THAT product'],
  ['Elle vient de partir — aucune journée de données pour l\'instant.',
   'It just went live — no day of data yet.'],
  ['Jamais lancée, donc rien à lire.', 'Never launched, so there is nothing to read.'],
  ['À l\'arrêt — rien à lire.', 'Stopped — nothing to read.'],
  ['Facebook · fil', 'Facebook · feed'],
  ['Instagram · fil', 'Instagram · feed'],
  ['Instagram · stories', 'Instagram · Stories'],
  ['par défaut', 'default'],
]

/** Motifs à réécrire avec leur contenu variable. */
const MOTIFS = [
  [/sam-3\.1 n'a pas trouvé « ([^»]+) » dans la photo/g, 'sam-3.1 did not find “$1” in the photo'],
  [/Produit détouré par sam-3\.1 \(il n'occupait que (\d+) % de ta photo\), puis réédité par muse-image\. Même objet, fond propre\./g,
   'sam-3.1 cut the product out (it filled only $1% of your photo), then muse-image re-shot it. Same object, clean background.'],
  [/objet trop petit \((\d+) % de l'image\)/g, 'the object is too small ($1% of the image)'],
  // L'accroche arabe composée sur les premières affiches, avant que le modèle
  // reçoive la consigne de suivre la langue du marchand.
  [/حقيبة كروس أنيقة بـ ?4[  ,]?200 دج/g, 'Hands-free everyday carry — $31.11'],
  [/حقيبة كروس أنيقة ـ ?4[  ,]?200 دج/g, 'Hands-free everyday carry — $31.11'],
]

/** Les boutons de choix écrits en darija pendant un tour qui ne l'était pas. */
const CHOIX = new Map([
  // Les trois claims d'angle marketing, traduits sous chaque angle anglais
  // avant que le schéma de l'outil cesse de les réclamer.
  ['كلشي قدامك و يديك حرّين', 'Everything on you, hands free'],
  ['السّانجل المنسوج هو الستايل', 'The woven strap is the statement'],
  ['صغير في الحجم، كبير في الفايدة', 'Small to carry, big where it counts'],
  // Les boutons de choix d'un tour qui n'était pas en darija.
  ['واش تحب تدير دكّا؟', 'What do you want to do now?'],
  ['تفاصيل الحقيبة', 'Bag details'],
  ['ورّيلي تفاصيل حملة الحقيبة', 'Show me the bag campaign'],
  ['جاوب الكليان اللي راهم يستناو', 'Answer the customers who are waiting'],
  ['جاوب الكليان', 'Answer customers'],
  ['صور جديدة للترانشكوت', 'New photos for the trench coat'],
  ['ديرلي صور جدد للترانشكوت', 'Make fresh photos for the trench coat'],
  ['نقّيلي تصويرة الساك للخلفية بيضا', 'Clean up the bag photo on a white background'],
  ['نقّي تصويرة الساك', 'Clean up the bag photo'],
  // ⚠️ Avant « تفاصيل الحقيبة » : un remplacement court appliqué d'abord
  // laisserait « ورّيلي Bag details », moitié arabe moitié anglais. L'ordre
  // de cette table est la seule chose qui l'empêche.
  ['ورّيلي تفاصيل الحقيبة', 'Show me the bag details'],
  ['شوف تفاصيل', 'Show me the details'],
  ['وجد كرياتيف جدد', 'Make fresh creatives'],
  ['خليها تخدم', 'Leave it running'],
  ['ورّيلي تفاصيل الحقيبة', 'Show me the bag details'],
  ['وجدلي كرياتيف جدد للترانشكوت', 'Fresh creatives for the trench coat'],
  ['خلي كلش يخدم كيما راه', 'Leave everything as it is'],
  ['واش تحب تدير درك؟', 'What do you want to do now?'],
  ['واش تحب ندير درك؟', 'What do you want to do now?'],
  ['ورّيلي تفاصيل الحقيقة', 'Show me the details'],
  ['شهر تقدم', 'Show progress'],
])

const arabe = /[\u0600-\u06FF]/
// Le mémo du marchand et la réponse de l'agent : on ne touche pas.
const MEMO = /واش راهم الكومندات اليوم|اليوم جبنا|اليوم عندك|الترانشكوت|المجموع الكلي|الحقيبة راهي|صرفنا اليوم|الدفع كاش|سلام خويا/

/* ⚠️ DU PLUS LONG AU PLUS COURT, TOUJOURS.
   « تفاصيل الحقيبة » est contenu dans « ورّيلي تفاصيل الحقيبة ». Appliqué en
   premier, il laisse « ورّيلي Bag details » — une moitié de phrase traduite,
   ce qui est pire que rien. Trier ici plutôt que compter sur l'ordre
   d'écriture de la table : l'ordre d'une table se perd à la première ligne
   qu'on ajoute au mauvais endroit. */
const parLongueur = (t) => [...t].sort((x, y) => String(y[0]).length - String(x[0]).length)

function reecrire(s) {
  let out = s
  for (const [a, b] of parLongueur(MOTS)) out = out.split(a).join(b)
  for (const [re, b] of MOTIFS) out = out.replace(re, b)
  for (const [a, b] of parLongueur(CHOIX)) out = out.split(a).join(b)
  return out
}

let touches = 0, restant = []
for (const e of all('SELECT id, kind, json FROM events WHERE session=? ORDER BY id', sid)) {
  const neuf = reecrire(e.json)
  if (neuf !== e.json) {
    touches++
    if (!voirSeulement) run('UPDATE events SET json=? WHERE id=?', neuf, e.id)
    console.log(`  ✎  ${String(e.id).padStart(4)} ${e.kind}`)
  }
  // Ce qui reste en arabe après coup, hors mémo : à regarder à la main.
  const apres = voirSeulement ? neuf : (all('SELECT json FROM events WHERE id=?', e.id)[0]?.json ?? neuf)
  if (arabe.test(apres) && !MEMO.test(apres)) {
    restant.push(`${e.id} ${e.kind} :: ${(apres.match(/[\u0600-\u06FF][^"\\]{0,44}/) ?? [''])[0]}`)
  }
}

// Les tours envoyés au modèle portent les mêmes copies.
let tours = 0
for (const t of all('SELECT id, json FROM turns WHERE session=? ORDER BY id', sid)) {
  const neuf = reecrire(t.json)
  if (neuf !== t.json) { tours++; if (!voirSeulement) run('UPDATE turns SET json=? WHERE id=?', neuf, t.id) }
}

console.log(`\n  ${touches} carte(s) et ${tours} tour(s) réécrits${voirSeulement ? ' (simulation)' : ''}.`)
if (restant.length) {
  console.log(`\n  Reste de l'arabe hors mémo dans ${restant.length} carte(s) :`)
  for (const r of restant.slice(0, 10)) console.log('   ·', r)
}
