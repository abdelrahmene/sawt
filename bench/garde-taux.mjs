/**
 * Le taux de change est écrit deux fois. Ce garde échoue s'il diverge.
 *
 * `src/money.js` sert les réponses de l'agent, `web/i18n.js` sert l'interface.
 * Le navigateur ne peut pas importer `src/`, donc la constante est dupliquée —
 * et une constante dupliquée finit toujours par se contredire. Celle-là se
 * contredirait de façon visible : l'agent annoncerait un prix, la vitrine un
 * autre, sur le même produit, dans la même démonstration.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const lire = (f) => {
  const src = readFileSync(join(ROOT, f), 'utf8')
  const m = src.match(/RATE_DZD_PER_USD\s*=\s*([\d.]+)/)
  if (!m) throw new Error(`RATE_DZD_PER_USD introuvable dans ${f}`)
  return { f, taux: Number(m[1]) }
}

const a = lire('src/money.js')
const b = lire('web/i18n.js')

if (a.taux !== b.taux) {
  console.error(`✗ taux divergents — ${a.f}: ${a.taux}  ≠  ${b.f}: ${b.taux}`)
  console.error('  La vitrine et la réponse de l\'agent annonceraient deux prix différents.')
  process.exit(1)
}

// Et la conversion elle-même, sur les prix réellement utilisés dans la démo.
const { priceLabel } = await import('../src/money.js')
const cas = [
  [4500, 'en', '$33.33'], [4500, 'ar', '4,500 DZD'],
  [4200, 'en', '$31.11'],
  // Au-dessus de cent dollars les décimales sont du bruit : 117,78 → $118.
  // C'est la même règle que l'interface, et c'est ce prix-là qui est déjà
  // imprimé sur les créatifs du manteau.
  [15900, 'en', '$118'], [20000, 'en', '$148'], [0, 'en', '$0.00'],
]
let ko = 0
for (const [dzd, lang, attendu] of cas) {
  const got = priceLabel(dzd, lang)
  if (got !== attendu) { ko++; console.error(`✗ ${dzd} (${lang}) → ${got}, attendu ${attendu}`) }
}
if (ko) process.exit(1)

console.log(`✓ taux aligné à ${a.taux} DZD = $1, et ${cas.length} conversions justes`)
