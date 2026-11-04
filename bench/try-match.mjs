// Le banc de l'appariement produit → photo.
//
// POURQUOI IL EXISTE. Cette fonction décide quelle photo part sur quelle
// page, et elle s'est trompée sans rien casser : la page du « Wool overcoat,
// tailored collar » est sortie avec les trois photos du « Pull col roulé »,
// parce que l'ancienne version comparait des SOUS-CHAÎNES et que « col » est
// contenu dans « collar ». Rien n'a planté, aucune erreur en console — la
// page était simplement fausse, et il a fallu lire le HTML pour le voir.
//
// Un défaut invisible mérite un banc. Chaque ligne ci-dessous est un piège
// réel : des mots courts qui s'emboîtent, un produit nommé dans une autre
// langue, et deux articles également plausibles où la bonne réponse est de
// NE PAS trancher.
//
//   node bench/try-match.mjs
import { produitBoutique } from '../src/agent/loop.js'

const CATALOGUE = [
  { name: 'Fine-knit roll neck',
    aliases: ['pull-maille', 'Fine-knit roll neck', 'Pull col roulé, maille fine', 'تريكو كول رولي'] },
  { name: 'Belted trench coat',
    aliases: ['trench-ceinture', 'Belted trench coat', 'Trench ceinturé', 'طرونش بالسانتورة'] },
  { name: 'Wool overcoat, tailored collar',
    aliases: ['manteau-laine', 'Wool overcoat, tailored collar', 'Manteau en laine, col tailleur', 'مانطو صوف'] },
]

const CAS = [
  // ce qu'on demande                      ce qu'on doit obtenir
  ['Wool overcoat, tailored collar',       'Wool overcoat, tailored collar'],
  ['wool overcoat',                        'Wool overcoat, tailored collar'],
  ['Manteau en laine, col tailleur',       'Wool overcoat, tailored collar'],
  ['مانطو صوف',                             'Wool overcoat, tailored collar'],
  ['Fine-knit roll neck',                  'Fine-knit roll neck'],
  ['Pull col roulé',                       'Fine-knit roll neck'],
  ['Belted trench coat',                   'Belted trench coat'],
  ['Trench ceinturé',                      'Belted trench coat'],
  // Le piège exact qui a produit la page fausse : « col » ⊂ « collar ».
  ['tailored collar',                      'Wool overcoat, tailored collar'],
  // Rien de commun : on ne devine pas.
  ['Kitchen knife set',                    null],
  ['',                                     null],
  // « coat » n'appartient qu'au trench : « overcoat » est un AUTRE mot, et
  // c'est voulu. J'attendais `null` ici en croyant les deux ex æquo — c'est
  // l'attente qui était fausse. Un seul produit porte ce mot, donc répondre
  // n'est pas deviner.
  ['coat',                                 'Belted trench coat'],
  // Deux produits qui partagent autant : là, on ne tranche pas.
  ['laine maille',                         null],
]

const ctx = { products: CATALOGUE }
let ok = 0
console.log('')
for (const [demande, attendu] of CAS) {
  const r = produitBoutique(ctx, demande)?.name ?? null
  const bon = r === attendu
  if (bon) ok++
  console.log(`  ${bon ? '✓' : '✗'}  ${JSON.stringify(demande).padEnd(36)} → ${String(r)}` +
    (bon ? '' : `   ATTENDU ${String(attendu)}`))
}
console.log(`\n  ${ok}/${CAS.length}\n`)
process.exit(ok === CAS.length ? 0 : 1)
