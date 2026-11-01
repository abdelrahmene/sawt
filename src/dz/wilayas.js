// Les 58 wilayas, dans les deux écritures, dans l'ordre officiel.
//
// POURQUOI CE FICHIER EXISTE : le banc darija disait que le modèle ratait la
// wilaya une fois sur deux. C'était faux. Sur cinq appels identiques, il
// rendait quatre fois « Oran » et une fois « وهران » — la même ville, deux
// écritures, toutes les deux justes — et la comparaison par chaîne comptait
// la seconde comme une erreur. Le banc notait le modèle sur un choix
// d'alphabet.
//
// C'est la règle du projet : quand une mesure dit qu'un modèle a tort, on
// regarde avant de conclure. Ici il avait raison les cinq fois.
//
// L'indice EST le numéro officiel (1 à 58), celui qui sert aux transporteurs.
// Les deux tableaux sont dans le même ordre, et c'est la seule chose qui les
// lie — donc on n'en modifie jamais un sans l'autre.

export const WILAYAS_AR = [
  'أدرار', 'الشلف', 'الأغواط', 'أم البواقي', 'باتنة', 'بجاية', 'بسكرة', 'بشار',
  'البليدة', 'البويرة', 'تمنراست', 'تبسة', 'تلمسان', 'تيارت', 'تيزي وزو', 'الجزائر',
  'الجلفة', 'جيجل', 'سطيف', 'سعيدة', 'سكيكدة', 'سيدي بلعباس', 'عنابة', 'قالمة',
  'قسنطينة', 'المدية', 'مستغانم', 'المسيلة', 'معسكر', 'ورقلة', 'وهران', 'البيض',
  'إليزي', 'برج بوعريريج', 'بومرداس', 'الطارف', 'تندوف', 'تيسمسيلت', 'الوادي',
  'خنشلة', 'سوق أهراس', 'تيبازة', 'ميلة', 'عين الدفلى', 'النعامة', 'عين تموشنت',
  'غرداية', 'غليزان', 'تيميمون', 'برج باجي مختار', 'أولاد جلال', 'بني عباس',
  'عين صالح', 'عين قزام', 'تقرت', 'جانت', 'المغير', 'المنيعة',
]

export const WILAYAS_FR = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar',
  'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger',
  'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma',
  'Constantine', 'Médéa', 'Mostaganem', "M'Sila", 'Mascara', 'Ouargla', 'Oran', 'El Bayadh',
  'Illizi', 'Bordj Bou Arréridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued',
  'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent',
  'Ghardaïa', 'Relizane', 'Timimoun', 'Bordj Badji Mokhtar', 'Ouled Djellal', 'Béni Abbès',
  'In Salah', 'In Guezzam', 'Touggourt', 'Djanet', "El M'Ghair", 'El Meniaa',
]

/* Les graphies qu'on rencontre pour de vrai et qui ne tombent pas des deux
   tableaux : translittérations anglaises, orthographes administratives,
   abréviations. Clé = forme normalisée, valeur = numéro officiel. */
const ALIAS = {
  algiers: 16, alger: 16, 'el djazair': 16, 'al jazair': 16,
  oran: 31, wahran: 31,
  constantine: 25, qacentina: 25,
  annaba: 23, bone: 23,
  bejaia: 6, bgayet: 6, bougie: 6,
  setif: 19, stif: 19,
  tizi: 15, 'tizi ouzou': 15, 'tizi-ouzou': 15,
  'sidi bel abbes': 22, sba: 22,
  'bordj bou arreridj': 34, bba: 34,
  'ain defla': 44, 'ain temouchent': 46, 'ain salah': 53, 'ain guezzam': 54,
  'el oued': 39, eloued: 39,
  msila: 28, 'm sila': 28,
  ghardaia: 47, ouargla: 30, touggourt: 55,
  blida: 9, boumerdes: 35, tipaza: 42, tipasa: 42,
}

/**
 * Deux chaînes, une seule ville ?
 *
 * On ramène tout à un numéro de wilaya : accents retirés, apostrophes et
 * tirets gommés, article arabe « ال » et article latin « el/al » ignorés.
 * Ce qui reste se cherche dans les deux tableaux puis dans les alias.
 */
const nettoie = (s) =>
  String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')      // accents latins
    .replace(/[ً-ْـ]/g, '')                  // diacritiques arabes
    .toLowerCase()
    .replace(/[’'`\-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const sansArticle = (s) => s.replace(/^(el |al )/, '').replace(/^ال/, '')

const INDEX = new Map()
const poser = (forme, n) => { const k = nettoie(forme); if (k) { INDEX.set(k, n); INDEX.set(sansArticle(k), n) } }
WILAYAS_AR.forEach((w, i) => poser(w, i + 1))
WILAYAS_FR.forEach((w, i) => poser(w, i + 1))
for (const [k, n] of Object.entries(ALIAS)) poser(k, n)

/** Le numéro officiel d'une wilaya écrite n'importe comment, ou null. */
export function wilayaIndex(name) {
  const k = nettoie(name)
  if (!k) return null
  return INDEX.get(k) ?? INDEX.get(sansArticle(k)) ?? null
}

/**
 * Deux écritures de la même wilaya comptent comme égales.
 *
 * Si AUCUNE des deux n'est reconnue, on retombe sur la comparaison de
 * chaînes : une commune mal orthographiée ne doit pas devenir « égale à
 * tout » parce que la table ne la connaît pas.
 */
export function sameWilaya(a, b) {
  const x = wilayaIndex(a), y = wilayaIndex(b)
  if (x && y) return x === y
  return nettoie(a) === nettoie(b)
}
