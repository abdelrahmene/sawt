/**
 * Le prix tel qu'il est DIT, pas tel qu'il est stocké.
 *
 * L'unité de la base est le dinar, partout, sans exception : c'est la monnaie
 * dans laquelle le marchand encaisse. Le dollar n'existe que pour être lu.
 *
 * POURQUOI CE FICHIER. L'agent annonçait « 4500 DZD » à une cliente dont
 * l'interface, la boutique et le formulaire de commande affichaient tous des
 * dollars. Le prix était juste et la phrase était fausse : une cliente qui lit
 * « 4500 » sur une page à « $33 » ne commande pas, elle demande lequel des
 * deux est le vrai. Ce qui est dit doit être ce qui est affiché.
 *
 * ⚠️ LE TAUX EST ÉCRIT DEUX FOIS — ici et dans `web/i18n.js`, parce que le
 * navigateur ne peut pas importer `src/`. Les deux ne doivent jamais diverger,
 * et `bench/garde-taux.mjs` échoue si c'est le cas. Un taux différent entre la
 * vitrine et la réponse de l'agent, c'est exactement le bug qu'on vient de
 * corriger, réintroduit par la porte d'à côté.
 */
export const RATE_DZD_PER_USD = 135

const num = (n) => new Intl.NumberFormat('en-US').format(n)

/** La monnaie d'affichage pour une langue donnée — même règle que l'interface. */
export const currencyFor = (language) => (language === 'en' ? 'usd' : 'dzd')

/**
 * Un montant en dinars, écrit dans la monnaie que cette langue affiche.
 * Les deux décimales sous cent dollars, comme dans l'interface : entre « $13 »
 * et « $13.36 », le second dit de quel côté d'un seuil on se trouve.
 */
export function priceLabel(dzd, language = 'en') {
  const v = Math.round(Number(dzd) || 0)
  if (currencyFor(language) !== 'usd') return `${num(v)} DZD`
  const usd = v / RATE_DZD_PER_USD
  return `$${usd >= 100 ? num(Math.round(usd)) : usd.toFixed(2)}`
}
