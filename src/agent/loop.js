// The agent turn: call the model, run whatever tools it asked for, feed the
// results back, repeat until it has nothing left to call.
//
// `ask_merchant` ends the turn immediately. When the agent says a detail is
// missing, the right thing is to stop and show the question — not to keep
// reasoning around the hole.
import { chat, chatStream, visibleAnswer } from '../models/llm.js'
import { TOOLS, SIMULATED, REAL } from './tools.js'
import { systemPrompt, ONBOARDING } from './system.js'
import { briefing } from './briefing.js'
import { buildLandingPage, buildStorefront, buildSite } from '../creative/landing.js'
import { generate, edit, save, headlinePrompt, GARDE_MARQUE, risqueMarque } from '../models/image.js'
import { isolate } from '../models/segment.js'
import * as camp from '../meta-sim/campaigns.js'
import { connection } from '../meta-sim/connect.js'
import { threads, thread, draftReply, sendReply, shopFacts, surfacesOf,
  draftComment, sendCommentReply, langueDu } from '../meta-sim/inbox.js'
import * as page from '../meta-sim/posts.js'
import * as notify from '../meta-sim/notify.js'
import { addDomain } from '../sites.js'
import * as catalog from '../catalog.js'
import { charge } from '../credits.js'
import { setting } from '../db.js'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { OUT_DIR } from '../creative/landing.js'
// Pour résoudre une URL servie par l'app en chemin de fichier, quand une
// photo de catalogue doit passer sous `sam-3.1`.
import { ROOT } from '../config.js'

// Six was too few once the agent had state to act on: reading the inbox,
// answering it, and then proposing what to do next is three calls before it
// has built anything.
const MAX_STEPS = 9

/**
 * Every image this session has produced or been given, creatives first.
 * A generated creative is a studio shot of the product; the merchant's own
 * photo is the hanger-on-a-bedsheet it came from. Both belong on the page,
 * in that order.
 */
// `/fixtures/` compte aussi : les produits du catalogue arrivent avec leurs
// propres photos, versionnées dans le dépôt. Sans cette ligne elles étaient
// filtrées ici et la page d'un produit importé sortait sans une seule image —
// le marchand n'a pourtant rien à envoyer, c'est tout l'intérêt.
const isUrl = (s) => typeof s === 'string' && (s.startsWith('/out/') || s.startsWith('/fixtures/') || s.startsWith('http'))

/**
 * Le produit de la boutique dont le modèle est en train de parler.
 *
 * Il écrit le nom comme il le dit — « running shoes », « Men's running
 * shoes, mesh », « la gourde » — donc on compare sur les mots, jamais sur
 * l'égalité. Sans ce rapprochement, un site à deux produits piochait les
 * photos PAR POSITION : une chance sur deux que la page de la gourde
 * montre les chaussures, ce qui est pire qu'une page sans image.
 */
/* Les mots d'un libellé, assez longs pour vouloir dire quelque chose. */
const mots = (s) => new Set(
  String(s ?? '').toLowerCase().split(/[^a-z0-9؀-ۿ]+/).filter((w) => w.length >= 3))

// Exportée pour être testable : c'est elle qui décide quelle photo va sur
// quelle page, et elle s'est trompée une fois de façon invisible.
export function produitBoutique(ctx, nom) {
  const produits = ctx.products ?? []
  if (!produits.length) return null
  const cible = mots(nom)
  if (!cible.size) return produits.length === 1 ? produits[0] : null

  /* ⚠️ ON COMPARE DES MOTS ENTIERS, PAS DES SOUS-CHAÎNES.
     L'ancienne version faisait `cible.includes(w)`, et « Pull col roulé » a
     gagné la page du « Wool overcoat, tailored collar » — parce que « col »
     est contenu dans « collar ». Mesuré le 04/11 : la page du manteau est
     sortie avec les trois photos du pull, étiquetées du nom du manteau.

     C'est la faute que drip-bot a payée en production sur un survêtement
     Arsenal devenu « ARMANI AX2615 », les deux commençant par AR. Une
     sous-chaîne n'est pas une ressemblance.

     Et on prend le MEILLEUR score, pas le premier trouvé : avec trois
     vêtements au catalogue, plusieurs partagent des mots, et « le premier qui
     touche » dépend de l'ordre d'importation. */
  let meilleur = null, score = 0, exaequo = false
  for (const p of produits) {
    let n = 0
    for (const alias of (p.aliases ?? [p.name])) {
      let c = 0
      for (const w of mots(alias)) if (cible.has(w)) c++
      if (c > n) n = c
    }
    if (n > score) { score = n; meilleur = p; exaequo = false }
    else if (n === score && n > 0 && p !== meilleur) exaequo = true
  }

  // Aucun mot commun, ou deux produits aussi plausibles l'un que l'autre : on
  // ne tranche pas. Rendre le mauvais produit coûte un colis refusé ; ne rien
  // rendre coûte une page sans galerie, que le marchand voit et corrige.
  if (!score || exaequo) return produits.length === 1 ? produits[0] : null
  return meilleur
}

/**
 * Les tailles d'un produit, prises là où elles existent vraiment.
 *
 * Une seule variante « unique » ne vaut pas un sélecteur : un choix à une
 * option est une case à cocher obligatoire déguisée.
 */
function variantesPour(ctx, nom) {
  const v = produitBoutique(ctx, nom)?.sizes ?? []
  return v.length < 2 ? [] : v
}

function assetsFor(ctx, explicit) {
  // The model answers this field with what the schema asked for — ids like
  // "0" or "photo_1" — so a non-empty list is not a usable list. Honouring it
  // blindly is why a page came back with zero <img> tags while two perfectly
  // good images sat in the session.
  const chosen = (explicit ?? []).filter(isUrl)
  if (chosen.length) return chosen

  const creatives = (ctx.creatives ?? []).map((c) => c.url ?? c).filter(isUrl)
  const photos = (ctx.photos ?? []).map((p) => p.url ?? p).filter(isUrl)
  // Les produits que le marchand a fait entrer depuis le catalogue. En
  // dernier, parce qu'une photo qu'il a prise lui-même prime toujours sur
  // une photo de catalogue.
  const boutique = (ctx.products ?? []).flatMap((p) => p.images ?? (p.image ? [p.image] : [])).filter(isUrl)
  return [...creatives, ...photos, ...boutique].slice(0, 6)
}

/**
 * Les images d'UN produit précis — pas celles de la boutique entière.
 *
 * ⚠️ `assetsFor()` rend tout ce qui traîne dans la session, et c'est juste
 * pour une publicité générique. Pour la page d'UN article, c'est faux : la
 * page du manteau en laine est sortie avec une galerie contenant les photos
 * du pull et du trench, toutes étiquetées « Wool overcoat ». Mesuré le 04/11
 * sur `out/lp-wool-overcoat-tailored-collar-ad36.html` — cinq images, trois
 * d'un autre article.
 *
 * C'est la même faute que celle corrigée ce matin dans `build_site`, à un
 * autre endroit du code : la photo d'un produit se résout PAR LE CODE depuis
 * sa fiche, jamais depuis ce qui se trouvait à portée. Une page qui montre
 * l'article du voisin se répare au retour du colis.
 *
 * Les photos envoyées par le marchand pendant la conversation restent
 * prioritaires : s'il vient d'en prendre une, c'est d'elle qu'il parle.
 */
function imagesDuProduit(ctx, nom, explicites) {
  const choisies = (explicites ?? []).filter(isUrl)
  if (choisies.length) return choisies

  const recentes = (ctx.photos ?? []).map((p) => p.url ?? p).filter(isUrl)
  if (recentes.length) return recentes.slice(0, 6)

  const mien = produitBoutique(ctx, nom)
  const siennes = (mien?.images ?? (mien?.image ? [mien.image] : [])).filter(isUrl)
  // Pas de repli sur la boutique entière : mieux vaut une page sans galerie
  // qu'une page qui ment sur ce qu'elle vend.
  return siennes.slice(0, 6)
}

/* Ce qui met une campagne en ligne, dans les trois langues du marchand, et ce
   qui recule. On ne marque que la première sans la seconde : « ne lance rien »
   contient « lance ». */
const ENGAGE = /lanc\w*|lansi|publi\w*|activ\w*|d[ée]marr\w*|go.?live|met\w*[\s\-'\w]{0,24}en ligne|start the campaign|أطلق|اطلق|لانسي|نلانسي|شغل الحملة/i
const RECULE = /\bne\b|\bpas\b|\bnon\b|jamais|annul\w*|plus tard|attend\w*|ما ت|بلا|ماشي/i
export const marquerEngagement = (c) => {
  const t = `${c?.label ?? ''} ${c?.send ?? ''}`
  return ENGAGE.test(t) && !RECULE.test(t) ? { ...c, kind: 'caution' } : c
}

/* Ce que le modèle rend quand on lui demande des choix, remis en forme.
   Mesuré : une fois sur treize, `choices` n'est pas un tableau mais la chaîne
   JSON du tableau. Sans ce filtre, `.map` lève et le tour entier se termine
   sur une erreur — pour un menu de boutons. */
const normaliserChoix = (brut) => {
  let c = brut
  if (typeof c === 'string') { try { c = JSON.parse(c) } catch { return [] } }
  if (c && !Array.isArray(c) && typeof c === 'object') c = Object.values(c)
  if (!Array.isArray(c)) return []
  return c
    .map((x) => (typeof x === 'string' ? { label: x, send: x } : x))
    .filter((x) => x && typeof x.label === 'string' && x.label.trim())
    .map((x) => marquerEngagement({ ...x, send: x.send || x.label }))
    .slice(0, 4)
}

/* Le menu de fin de tour, réclamé quand il manque.
   ──────────────────────────────────────────────────────────────────────────
   « Termine presque chaque tour par des choix » est la règle 6, et le modèle
   l'a tenue tant que les tours étaient courts. Puis la boucle campagne est
   arrivée : cinq ou six outils dans un tour, une analyse de résultats à
   écrire — et les boutons ont disparu des derniers tours, exactement ceux où
   le marchand a le plus besoin qu'on lui dise quoi faire ensuite.

   Une règle que le modèle suit « presque toujours » n'est pas une règle, c'est
   une tendance. On ne la réécrit donc pas plus fort : si le tour finit sans
   menu, on en redemande un.

   ⚠️ On ne peut PAS l'imposer. Mesuré le 31/10/26 sur l'API Meta :
   `tool_choice` n'accepte que « auto » — « required » et un outil nommé
   renvoient tous deux un 400 explicite. (Le paramètre existe quand même dans
   llm.js : vLLM, derrière les poids ouverts, lui obéit.) Le levier portable,
   c'est de ne mettre qu'UN outil sur la table : le modèle n'a plus d'autre
   geste disponible. Sur six appels aboutis, six menus corrects.

   Deux tentatives, pour le cas où le modèle répond mais sans menu utilisable
   (il a écrit de la prose, ou deux fois le même bouton). Les coupures réseau,
   elles, sont déjà reprises d'un étage plus bas, dans llm.js. Si les deux
   tentatives échouent on rend la main sans menu plutôt que d'inventer des
   libellés : un bouton écrit par nous risque de tomber dans la mauvaise
   langue, et un faux choix est pire qu'un prompt vide. */
const PROPOSE = TOOLS.find((t) => t.function?.name === 'propose_choices')

const RELANCE =
  'The turn is over and you left the merchant nothing to tap. Call propose_choices ' +
  'now and nothing else: two to four next steps you can really carry out from here, ' +
  'in the language the merchant has been using, phrased the way they would say it. ' +
  'No prose, no preamble.'

async function menuDeFin({ messages, artifacts, onEvent }) {
  if (artifacts.some((a) => a.name === 'propose_choices')) return
  const ask = [...messages, { role: 'system', content: RELANCE }]

  for (let essai = 0; essai < 2; essai++) {
    let call
    try {
      const msg = await chat(ask, { tools: [PROPOSE] })
      call = msg?.tool_calls?.find((c) => c.function?.name === 'propose_choices')
    } catch { /* réseau : on retente une fois */ }
    if (!call) continue

    let args = {}
    try { args = JSON.parse(call.function?.arguments || '{}') } catch {}
    const choices = normaliserChoix(args.choices)
    if (choices.length < 2) continue

    const result = { question: args.question ?? null, choices }
    onEvent({ type: 'tool:start', name: 'propose_choices', args: result, simulated: false, real: false })
    const artifact = { name: 'propose_choices', args: result, result, simulated: false, real: false }
    artifacts.push(artifact)
    onEvent({ type: 'tool:end', ...artifact })

    // Le modèle a bien émis cet appel : il appartient à l'historique, pour
    // qu'au tour suivant il sache ce qu'il a proposé. La relance, elle, n'y
    // entre pas — ce n'est pas le marchand qui a parlé.
    messages.push({ role: 'assistant', content: null, tool_calls: [call] })
    messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
    return
  }
}

/* Ce qu'un outil a RÉELLEMENT consommé, lu dans son résultat.
   Pas un barème écrit à l'avance : une page dont les quatre scènes sortent
   du cache ne coûte qu'un appel de texte, et l'annoncer à dix crédits
   serait facturer du vent. Les outils absents de cette table ne coûtent
   rien — lire la boîte de réception ou ouvrir le catalogue n'appelle aucun
   modèle. */
function consomme(name, r) {
  if (!r || r.error) return []
  const iso = r.isolated?.model ? 1 : 0
  switch (name) {
    case 'build_landing_page':
      return [{ kind: 'text', n: 1 }, { kind: 'segment', n: iso },
        { kind: 'image', n: (r.scenes?.length ?? 0) }]
    case 'build_site':
      // Une copie par page, plus la page d'accueil, plus les scènes de
      // chacune. Le site est de loin l'action la plus chère de l'app.
      return [
        { kind: 'text', n: (r.pages?.length ?? 0) + 1 },
        { kind: 'image', n: (r.pages ?? []).reduce((s, p) => s + (p.scenes ?? 0), 0) },
      ]
    case 'generate_creatives':
    case 'refresh_creatives':
      return [{ kind: 'segment', n: iso }, { kind: 'image', n: r.creatives?.length ?? 0 }]
    case 'restyle_photo':
      return [{ kind: 'segment', n: iso }, { kind: 'image', n: r.photos?.length ?? 0 }]
    case 'answer_inbox':
      return [{ kind: 'text', n: r.answered?.length ?? 1 }]
    case 'answer_comments':
      // Un appel par commentaire traité, réponse publiée OU refus motivé :
      // décider qu'on ne peut pas répondre coûte le même appel que répondre.
      return [{ kind: 'text', n: (r.answered?.length ?? 0) + (r.escalated?.length ?? 0) }]
    default:
      return []
  }
}

async function runTool(name, args, ctx, onEvent = () => {}) {
  switch (name) {
    case 'ask_merchant':
      return { ...args, blocking: true }

    // The model's own output, passed through. The UI turns it into buttons,
    // and the model is told the merchant tapped one on the next turn.
    // Sauf pour une chose : marquer le choix qui engage de l'argent. La règle
    // existe dans le prompt, donc le modèle l'applique « presque toujours » —
    // et « presque » ne vaut rien quand le bouton met une campagne en ligne.
    // L'écran le détecte lui-même, et le marchand voit un point de contrôle.
    case 'propose_choices':
      return { ...args, choices: normaliserChoix(args.choices) }

    case 'marketing_angles':
      return args // the model's own proposal; nothing to compute

    /* ── le dropshipping ─────────────────────────────────────────────────── */
    case 'browse_catalog': {
      const products = catalog.list(args)
      return {
        count: products.length,
        products: products.map((p) => ({
          id: p.id, name: p.name.en, category: p.category, supplier: p.supplier,
          supplier_cost: p.supplier_cost, recommended_price: p.min_selling,
          margin_per_order: p.margin, margin_pct: p.margin_pct,
          sizes: p.variants.map((v) => `${v.size} (${v.stock})`).join(', '),
          in_stock: p.stock,
          // La photo part avec la fiche. Sans elle, l'écran affichait un
          // tableau de chiffres : un dropshippeur ne choisit pas un produit
          // sur une ligne de JSON, il le choisit en le voyant. Et c'est la
          // même photo qui servira de source aux scènes de sa page.
          image: p.image, images: p.images,
        })),
        note: 'Catalogue de démonstration, modelé sur un vrai catalogue algérien : ' +
          'les champs, les prix et les marges sont réalistes, mais aucun fournisseur n\'expédiera. ' +
          'Le calcul de marge, lui, est le vrai : prix de vente moins coût fournisseur.',
        say: 'La marge est par commande LIVRÉE, pas par commande passée — en paiement à la livraison, une partie revient.',
      }
    }

    case 'import_product': {
      const r = catalog.importProduct(ctx.sessionId, String(args.product_id ?? ''), { selling: args.selling })
      if (r.error) return r
      // Le produit entre dans la boutique : le briefing du tour suivant le
      // verra, donc l'agent saura ce que le marchand vend sans qu'on le lui
      // redise.
      ;(ctx.products ??= []).unshift({
        id: r.product_id, name: r.name?.en ?? r.product_id, price: r.selling,
        variants: r.variants?.filter((v) => v.stock > 0).map((v) => v.size) ?? [],
        images: r.images ?? [], image: r.images?.[0] ?? null,
        sizes: r.variants ?? [],
      })
      return { ...r, next: 'Tu peux maintenant lui construire une page et une campagne, sans lui demander de photo : le catalogue en fournit.' }
    }

    // Minutes long: one model call per product, then one for the home page.
    // It reports each page as it lands so the screen never goes quiet.
    case 'build_site': {
      const pool = assetsFor(ctx)

      /* Une boutique sans produit n'est pas une boutique.
         Le schéma réclame `products`, et le modèle l'omet quand même quand
         le marchand dit juste « ديرلي موقع » : `args.products` arrivait
         `undefined`, la vitrine partait avec zéro carte, et le marchand
         recevait une page d'accueil vide appelée boutique. Ce qu'il vend est
         pourtant en base — c'est la table `imports` — donc on la prend, avec
         SON prix de vente, plutôt que de rendre une coquille. */
      let demandes = args.products ?? []
      if (!demandes.length) {
        demandes = (ctx.products ?? [])
          .filter((p) => p.price)
          .map((p) => ({ name: p.name, price_dzd: p.price }))
      }
      if (!demandes.length) {
        return {
          error: "Rien à mettre dans la boutique : le marchand n'a aucun produit avec un prix.",
          needs: 'browse_catalog',
          say: "Dis-le-lui franchement et propose-lui de choisir un produit dans le catalogue fournisseur — tu ne peux pas ouvrir une boutique vide.",
        }
      }

      /* ⚠️ L'APPARIEMENT PRODUIT → PHOTO SE FAIT PAR LE CODE, JAMAIS PAR LE
         MODÈLE. C'est le cœur du projet : la publicité doit montrer LEUR
         produit, et une photo attribuée au hasard détruit exactement ce que
         `sam-3.1` et l'édition d'image servent à garantir.

         L'ordre était inversé. `image: p.image || mien?.image || pool[i] ||
         pool[0]` faisait passer la chaîne écrite par le modèle AVANT la fiche
         réelle du marchand. Mesuré dans `out/storefront-nour-store.html` : la
         carte « صباط سبور للرجال » — des chaussures de sport — portait
         `gourde-isotherme-1.webp`, la photo d'une gourde isotherme. Le modèle
         n'avait pas menti, on lui avait demandé un nom de fichier.

         Et `pool[0]` en dernier recours donnait la MÊME photo à tous les
         produits non appariés. Une carte sans photo se répare ; une carte
         avec la photo d'un autre article se répare au retour du colis. */
      const products = demandes.map((p, i) => {
        const mien = produitBoutique(ctx, p.name)

        // 1. Les photos de SA fiche produit. Elles lui appartiennent.
        const siennes = mien?.images?.length ? mien.images
          : mien?.image ? [mien.image] : []

        // 2. Une url donnée par le modèle, mais seulement si elle désigne un
        //    fichier qui existe VRAIMENT dans cette session. Le modèle peut
        //    repasser une photo que le marchand vient d'envoyer ; il ne peut
        //    pas inventer un chemin de catalogue.
        const duModele = isUrl(p.image) && pool.includes(p.image) ? [p.image] : []

        const images = siennes.length ? siennes : duModele
        return {
          ...p,
          images,
          image: images[0] ?? null,
          variants: (mien?.sizes ?? []).length > 1 ? mien.sizes : [],
        }
      })
      return buildSite({
        ...args, products, sessionId: ctx.sessionId,
        // Le nom de la boutique est obligatoire dans le schéma et manque
        // quand même : plutôt que d'en inventer un — ce que la règle 1
        // interdit — on reprend celui que le marchand a déjà donné, et
        // `siteFor` retombe sur le produit en dernier recours.
        shop_name: args.shop_name?.trim() || ctx.shop || null,
        options: { ...(setting(`landing:${ctx.sessionId}`) ?? {}), photos: [] },
        onProgress: (p) => onEvent({ type: 'progress', tool: 'build_site', ...p }),
      })
    }

    // sam-3.1 d'abord, muse-image ensuite.
    //
    // La créative partait d'une DESCRIPTION de la photo, jamais de la photo :
    // `generate(headlinePrompt(subject))` ne reçoit aucune image. Le marchand
    // envoyait son produit et recevait l'idée que le modèle se fait d'un
    // produit de ce nom — ressemblant, et pas le sien. Pour un marchand qui
    // vend UN article précis, c'est la différence entre une publicité et une
    // promesse qu'il ne peut pas tenir.
    //
    // Maintenant : sam-3.1 trouve le produit dans la photo, ffmpeg recadre
    // dessus, et muse-image ÉDITE ce recadrage. Si le détourage échoue, on
    // retombe sur l'ancien chemin — le marchand préfère une créative
    // imparfaite à aucune créative.
    case 'generate_creatives': {
      /* ⚠️ LA PHOTO VIENT DU PRODUIT NOMMÉ, PAS DE LA DERNIÈRE ENVOYÉE.
         `photos.at(-1)` a produit trois publicités pour un manteau en laine
         avec la photo d'une basket — le marchand avait envoyé des baskets
         plus tôt dans la conversation, et l'outil a pris la dernière arrivée.
         Troisième endroit du code où la même faute se présentait : une photo
         se résout depuis la fiche du produit, jamais depuis ce qui traîne. */
      const photos = ctx.photos ?? []
      const mien = produitBoutique(ctx, args.product)
      const choisie = args.product_image != null ? photos[Number(args.product_image)] : null
      // Une photo que le marchand a prise lui-même prime sur le catalogue —
      // mais seulement s'il l'a désignée, ou s'il n'a pas de fiche produit.
      const photo = choisie
        ?? (mien ? null : photos.at(-1))
        ?? null
      const duCatalogue = !photo && mien
        ? { url: (mien.images ?? [])[0] ?? mien.image ?? null, path: null }
        : null
      // What the model saw in the photo beats what anyone typed: the creative
      // should depict the product that exists, not the one described.
      const subject = photo?.described?.product || mien?.name || args.product
        || ctx.productName || ctx.productGuess || 'the product'
      const seen = photo?.described?.details ? ` ${photo.described.details}` : ''

      /* Une photo de catalogue arrive comme URL, pas comme chemin : `sam-3.1`
         a besoin d'un fichier. On ne résout que ce qui est servi par l'app,
         et jamais un chemin venu du modèle — `..` dans une URL est la plus
         vieille façon de lire un fichier qui ne regarde personne. */
      const surDisque = (u) => {
        if (typeof u !== 'string') return null
        const m = u.match(/^\/(out|fixtures)\/([A-Za-z0-9._\-\/]+)$/)
        if (!m || m[2].includes('..')) return null
        return join(ROOT, m[1], ...m[2].split('/'))
      }
      const source = photo?.path ?? surDisque(duCatalogue?.url)

      let cut = null
      if (source) {
        onEvent({ type: 'progress', tool: 'generate_creatives', phase: 'isolate', label: subject })
        cut = await isolate(source, subject)
      }

      const out = []
      const angles = (args.angles ?? ['default']).slice(0, 3)
      for (const [i, angle] of angles.entries()) {
        onEvent({ type: 'progress', tool: 'generate_creatives', phase: 'creative', step: out.length + 1, total: angles.length, label: angle })
        // Une PRISE DE VUE différente par créative : le produit en situation,
        // la matière de près, le produit porté. Trois fois le même cadrage ne
        // sont pas trois créatives.
        const prompt = headlinePrompt(subject + seen, angle, i)
        const b64 = cut?.ok
          ? await edit(cut.path, `Keep this exact product, unchanged. ${prompt} ${GARDE_MARQUE}`)
          : await generate(prompt)
        mkdirSync(OUT_DIR, { recursive: true })
        const file = `creative-${Date.now().toString(36)}-${out.length}.png`
        save(b64, join(OUT_DIR, file))
        out.push({ angle, url: `/out/${file}` })
      }
      // Kept on the session so the landing page can use them afterwards.
      ;(ctx.creatives ??= []).push(...out)
      return {
        creatives: out, headline_ar: args.headline_ar ?? null, subject,
        source_photo: photo?.url ?? duCatalogue?.url ?? null,
        // Ce que l'affiche a besoin de savoir pour être une publicité et pas
        // une photo : le prix et l'enseigne. Sans eux, le compositeur pose un
        // titre sur une image et s'arrête là.
        product: mien?.name ?? args.product ?? null,
        // La fiche du marchand d'abord ; le prix qu'il vient d'annoncer
        // ensuite. Un produit arrivé par photo n'a pas de fiche.
        price_dzd: mien?.price ?? (Number(args.price_dzd) || null),
        shop: ctx.shop ?? null,
        isolated: cut?.ok
          ? { model: 'sam-3.1', url: cut.url, coverage: cut.found.coverage, gain: cut.gain,
              from: 'le produit a été détouré de la photo, puis la créative part de CE produit' }
          : cut ? { model: 'sam-3.1', failed: cut.why, from: 'créative générée depuis la description, pas depuis la photo' } : null,
      }
    }

    /* ── renouveler les visuels d'une campagne qui s'essouffle ──────────
       Une campagne ne meurt pas d'un mauvais ciblage, elle meurt d'usure :
       les mêmes gens voient la même image, le coût par commande monte
       chaque jour. C'est visible dans les chiffres — la portée par dinar
       baisse et le prix d'un résultat grimpe — et la réponse n'est PAS de
       monter le budget, c'est de changer l'image.

       Ce qui se passe ici : les anciennes annonces passent en pause, de
       nouvelles créatives sont générées depuis la même photo produit (donc
       le même objet, sous d'autres angles), et elles entrent dans la
       campagne. L'historique n'est pas touché : on voit le coût avant et
       après, sur la même campagne. */
    case 'refresh_creatives': {
      const id = Number(args.campaign_id)
      const c = camp.get(id)
      if (!c) return { error: `Campagne ${id} introuvable.` }

      const photos = ctx.photos ?? []
      const prod = produitBoutique(ctx, c.name) ?? ctx.products?.[0] ?? null
      const source = photos.at(-1)?.path ?? null
      const sujet = prod?.name || photos.at(-1)?.described?.product || c.payload?.product || 'the product'

      let cut = null
      if (source) {
        onEvent({ type: 'progress', tool: 'refresh_creatives', phase: 'isolate', label: sujet })
        cut = await isolate(source, sujet).catch(() => null)
      }

      const angles = (args.angles ?? ['une autre lumière', 'en situation']).slice(0, 3)
      const neufs = []
      for (const [i, angle] of angles.entries()) {
        onEvent({ type: 'progress', tool: 'refresh_creatives', phase: 'creative', step: neufs.length + 1, total: angles.length, label: angle })
        try {
          // Décalées d'un cran par rapport à la série précédente : renouveler
          // des visuels usés en reprenant les mêmes cadrages ne renouvelle rien.
          const prompt = headlinePrompt(sujet, angle, i + 1)
          const b64 = cut?.ok
            ? await edit(cut.path, `Keep this exact product, unchanged. ${prompt} ${GARDE_MARQUE}`)
            : await generate(prompt)
          if (!b64) continue
          mkdirSync(OUT_DIR, { recursive: true })
          const file = `creative-${Date.now().toString(36)}-${neufs.length}.png`
          save(b64, join(OUT_DIR, file))
          neufs.push({ angle, url: `/out/${file}` })
        } catch (e) { /* une créative ratée ne doit pas annuler les autres */ }
      }
      if (!neufs.length) return { error: "Aucune créative n'est revenue. La campagne n'a pas été touchée." }

      const r = camp.swapCreatives(id, neufs, args.because ?? 'usure des visuels')
      ;(ctx.creatives ??= []).push(...neufs)
      return {
        ...r, creatives: neufs, subject: sujet,
        isolated: cut?.ok ? { model: 'sam-3.1', coverage: cut.found?.coverage } : null,
        say: "Le budget n'a pas bougé : quand le coût monte à cause de l'usure, changer l'image coûte moins cher que monter la mise.",
      }
    }

    // « Refais-moi l'image. » Rien de plus, rien de moins.
    //
    // Sans cet outil le modèle partait sur marketing_angles — l'étape d'à
    // côté — et le marchand avait raison de trouver qu'on ne l'écoutait pas.
    // Ici : sam-3.1 détoure, muse-image réédite le MÊME objet sous une
    // lumière propre. On n'invente pas un produit ; on refait sa photo.
    case 'restyle_photo': {
      const photos = ctx.photos ?? []
      const photo = photos[Number(args.photo_index)] ?? photos.at(-1) ?? null
      if (!photo?.path) return { error: "Aucune photo dans cette session — envoie-m'en une d'abord." }

      const sujet = args.product || photo.described?.product || ctx.productName || 'the product'
      onEvent({ type: 'progress', tool: 'restyle_photo', phase: 'isolate', label: sujet })
      const cut = await isolate(photo.path, sujet)
      const source = cut.ok ? cut.path : photo.path

      const LOOKS = {
        studio: 'Re-photograph it in a studio on a clean seamless light-grey background, one large soft light, a soft natural shadow under the object.',
        packshot: 'Re-photograph it on pure white, evenly lit, no shadow, centred — a catalogue packshot.',
        closeup: 'Move in close on one real material detail of it, raking light so the texture reads.',
        lifestyle: 'Place it in a simple real setting where it is used, warm daylight, shallow depth of field.',
      }
      const looks = (args.looks?.length ? args.looks : ['studio']).slice(0, 3)

      const out = []
      for (const look of looks) {
        onEvent({ type: 'progress', tool: 'restyle_photo', phase: 'render', step: out.length + 1, total: looks.length, label: look })
        // La consigne la plus importante est la première : garder l'objet.
        // Un « refais la photo » qui rend un AUTRE produit est pire qu'une
        // mauvaise photo — le marchand vendrait ce qu'il n'a pas.
        const prompt = [
          `This is ${sujet}. Keep this exact object: same shape, same colour, same materials, same wear.`,
          'Do not redesign it, do not change the model, do not add or remove parts.',
          LOOKS[look] ?? LOOKS.studio,
          'Photorealistic, sharp, no text, no letters, no watermark.',
          GARDE_MARQUE,
        ].join(' ')
        const b64 = await edit(source, prompt)
        mkdirSync(OUT_DIR, { recursive: true })
        const file = `photo-${look}-${Date.now().toString(36)}.png`
        save(b64, join(OUT_DIR, file))
        out.push({ look, url: `/out/${file}` })
      }

      // Les versions propres deviennent les images par défaut pour la suite :
      // landing, vitrine, créatives. C'est le but — il ne faut pas qu'il
      // redemande.
      ;(ctx.creatives ??= []).unshift(...out.map((o) => ({ angle: `photo ${o.look}`, url: o.url })))

      const marque = risqueMarque(photo.described)
      return {
        product: sujet,
        source_photo: photo.url,
        isolated: cut.ok ? { model: 'sam-3.1', url: cut.url, coverage: cut.found.coverage } : { failed: cut.why },
        photos: out,
        // Remonté jusqu'au marchand, pas avalé en silence : c'est lui qui sait
        // d'où vient sa marchandise, et c'est son compte publicitaire.
        brand_risk: marque
          ? { seen: marque, told_the_model: 'ne rien rendre plus lisible que sur l original',
              say: "Dis-le-lui en une phrase : un logo de marque sur une publicité Meta, sans autorisation, c'est le compte publicitaire fermé. Demande-lui si le produit est authentique ou s'il préfère une photo où la marque ne se voit pas." }
          : null,
        note: cut.ok
          ? `Produit détouré par sam-3.1 (il n'occupait que ${Math.round(cut.found.coverage * 100)} % de ta photo), puis réédité par muse-image. Même objet, fond propre.`
          : `Détourage impossible (${cut.why}) — réédition faite depuis la photo entière.`,
      }
    }

    // The agent kept calling this with images:[] and the model then wrote a
    // beautiful page with no product on it. Whatever has actually been
    // generated or uploaded in this session is injected here, so forgetting
    // is not an option the agent has.
    // The studio's settings are the merchant's settings. A page the agent
    // builds on its own has to come out looking like the ones they tuned by
    // hand, or the two halves of the product disagree about what their shop
    // looks like.
    case 'build_landing_page':
      return buildLandingPage({
        ...args, images: imagesDuProduit(ctx, args.product, args.images), shop: ctx.shop,
        // Les tailles du produit, prises là où elles existent vraiment —
        // la fiche du catalogue — plutôt que redemandées au modèle, qui les
        // inventerait. Un formulaire sans taille, c'est un appel de
        // confirmation en plus et une livraison refusée à la porte.
        variants: variantesPour(ctx, args.product),
        sessionId: ctx.sessionId,
        options: { ...(setting(`landing:${ctx.sessionId}`) ?? {}), photos: [] },
        onProgress: (p) => onEvent({ type: 'progress', tool: 'build_landing_page', ...p }),
      })

    case 'build_storefront':
      return buildStorefront({ ...args, sessionId: ctx.sessionId })

    /* ── campaigns, now rows rather than a closure ───────────────────────── */
    case 'configure_campaign':
      return camp.configure(ctx.sessionId, {
        ...args,
        creatives: (ctx.creatives ?? []).map((c) => ({ angle: c.angle, url: c.url })),
        headline_ar: args.headline_ar,
      })

    case 'launch_campaign':
      return camp.launch(Number(args.campaign_id), { confirmed_by_merchant: args.confirmed_by_merchant })

    case 'campaign_results':
      return camp.results(Number(args.campaign_id))

    case 'simulate_days':
      return camp.advance(Number(args.campaign_id), Math.max(1, Math.min(7, Number(args.days) || 1)))

    case 'adjust_campaign':
      return camp.decide(Number(args.campaign_id), args)

    /* ── the Facebook side ───────────────────────────────────────────────── */
    // Returning `open` is how a tool asks the SCREEN to do something. The
    // consent flow cannot be completed by the agent — that is the entire
    // point of consent — so it opens the dialog and the turn ends.
    case 'connect_meta': {
      const c = connection(ctx.sessionId)
      return {
        open: 'meta_login',
        already: c.status === 'connected',
        status: c.status,
        because: args.because,
        note: 'Flux de connexion SIMULÉ : aucune vraie app Meta, aucun vrai compte, aucun jeton utilisable.',
      }
    }

    /* ── la Page ─────────────────────────────────────────────────────── */
    case 'read_page': {
      const c = connection(ctx.sessionId)
      if (c.status !== 'connected') return { error: "Meta n'est pas connecté — il n'y a pas de Page.", needs: 'connect_meta' }
      const pages = surfacesOf(c).filter((a) => a.kind === 'page')
      if (!pages.length) return { error: "Aucune Page dans les actifs accordés." }
      const a = pages[0]
      const posts = page.postsOf(a.id)
      return {
        page: a.name, followers: a.followers,
        stats: page.pageStats(a.id),
        published: posts.filter((p) => p.status === 'published').slice(0, 8).map((p) => ({
          id: p.id, kind: p.kind, caption: p.caption, reach: p.reach, likes: p.likes,
          shares: p.shares, saves: p.saves, comments: p.n_comments, comments_open: p.n_open,
          hours_ago: Math.round((Date.now() - p.published_at) / 3_600_000),
        })),
        scheduled: posts.filter((p) => p.status === 'scheduled').map((p) => ({
          id: p.id, kind: p.kind, caption: p.caption,
          in_hours: Math.round((p.scheduled_at - Date.now()) / 3_600_000),
        })),
        note: "Page SIMULÉE : rien n'est publié chez Facebook. Les portées sont à l'échelle d'une vraie Page de cette taille, ce ne sont pas des mesures.",
      }
    }

    case 'schedule_post': {
      const c = connection(ctx.sessionId)
      if (c.status !== 'connected') return { error: "Meta n'est pas connecté.", needs: 'connect_meta' }
      const a = surfacesOf(c).find((x) => x.kind === 'page')
      if (!a) return { error: "Aucune Page dans les actifs accordés." }
      const h = Number(args.in_hours)
      const r = page.schedulePost(a.id, {
        kind: args.kind, caption: args.caption,
        media: isUrl(args.image) ? args.image : null,
        when: Number.isFinite(h) && h > 0 ? Date.now() + h * 3_600_000 : null,
        sessionId: ctx.sessionId,
      })
      notify.push(ctx.sessionId, {
        kind: 'post', ref: r.id, goto: 'meta',
        key: r.status === 'scheduled' ? 'notif.post.scheduled' : 'notif.post.published',
        vars: { kind: r.kind, h: Math.round(h) },
        title: r.status === 'scheduled'
          ? `${r.kind} programmé dans ${Math.round(h)} h`
          : `${r.kind} publié sur la Page`,
        body: String(args.caption ?? '').slice(0, 120),
      })
      return { ...r, page: a.name, caption: args.caption,
        note: "Programmation SIMULÉE : aucune publication n'est créée chez Facebook." }
    }

    case 'answer_comments': {
      const c = connection(ctx.sessionId)
      if (c.status !== 'connected') return { error: "Meta n'est pas connecté.", needs: 'connect_meta' }
      const a = surfacesOf(c).find((x) => x.kind === 'page')
      if (!a) return { error: "Aucune Page dans les actifs accordés." }

      let ids = (args.comment_ids ?? []).map(Number).filter(Boolean)
      if (!ids.length) ids = page.openComments(a.id).map((x) => x.id)
      ids = ids.slice(0, Math.max(1, Math.min(8, Number(args.max) || 6)))

      const facts = shopFacts({ shop: ctx.shop, product: ctx.products?.[0]?.name, price_dzd: ctx.products?.[0]?.price })
      const answered = [], escalated = []
      // En série et pas en parallèle : huit appels d'un coup font tomber la
      // liaison vers api.meta.ai, qui lâche déjà une fois sur trois seule.
      for (const id of ids) {
        try {
          const d = await draftComment(id, facts)
          sendCommentReply(id, d)
          ;(d.can_answer && d.reply ? answered : escalated).push({
            id, person: d.person, asked: d.asked,
            reply: d.can_answer ? d.reply : null, needs: d.can_answer ? null : d.missing,
          })
        } catch (e) { escalated.push({ id, needs: e.message }) }
      }
      if (escalated.length) {
        notify.push(ctx.sessionId, {
          kind: 'comment', goto: 'meta',
          key: 'notif.comments.waiting', vars: { n: escalated.length },
          title: `${escalated.length} commentaire(s) attendent une réponse de toi`,
          body: escalated.map((x) => x.needs).filter(Boolean)[0] ?? null,
        })
      }
      return {
        answered, escalated,
        count: { answered: answered.length, escalated: escalated.length },
        say: "Les réponses publiées sont visibles de tout le monde. Celles que je n'ai pas écrites, je ne pouvais pas les prouver.",
      }
    }

    case 'read_inbox': {
      const c = connection(ctx.sessionId)
      if (c.status !== 'connected') return { error: 'Meta n\'est pas connecté — il n\'y a pas de boîte de réception.', needs: 'connect_meta' }
      const want = args.status ?? 'open'
      const rows = surfacesOf(c)
        .flatMap((a) => threads(a.id).map((t) => ({ ...t, asset_name: a.name })))
        .filter((t) => want === 'all' || t.status === want)
        .sort((x, y) => y.last_at - x.last_at)
      return {
        count: rows.length,
        threads: rows.slice(0, 12).map((t) => ({
          id: t.id, channel: t.channel, person: t.person, status: t.status,
          asked: t.last_text, needs_from_merchant: t.subject ?? null,
          minutes_ago: Math.round((Date.now() - t.last_at) / 60000),
        })),
      }
    }

    // The interesting one. Each thread gets its own model call, each decides
    // for itself whether it may answer, and the ones that may not are the
    // result worth showing.
    case 'answer_inbox': {
      const c = connection(ctx.sessionId)
      if (c.status !== 'connected') return { error: 'Meta n\'est pas connecté.', needs: 'connect_meta' }

      let ids = (args.thread_ids ?? []).map(Number).filter(Boolean)
      if (!ids.length) {
        ids = surfacesOf(c)
          .flatMap((a) => threads(a.id)).filter((t) => t.status === 'open')
          .sort((x, y) => y.last_at - x.last_at).slice(0, 6).map((t) => t.id)
      }
      if (!ids.length) return { answered: [], escalated: [], note: 'Personne n\'attend.' }

      const facts = shopFacts({
        product: args.product ?? ctx.productName ?? ctx.productGuess,
        price_dzd: args.price_dzd,
        shop: ctx.shop,
      })

      const answered = [], escalated = []
      for (const id of ids.slice(0, 8)) {
        onEvent({ type: 'progress', tool: 'answer_inbox', step: answered.length + escalated.length + 1, total: ids.length, label: `#${id}` })
        try {
          const draft = await draftReply(id, facts)
          sendReply(id, draft)
          const t = thread(id)
          const row = { id, person: t.person, channel: t.channel, asked: t.messages.find((m) => m.author === 'customer')?.text, reply: draft.reply, ms: draft.ms }
          if (draft.can_answer) answered.push(row)
          else escalated.push({ ...row, need_from_merchant: draft.missing })
        } catch (e) {
          escalated.push({ id, error: e.message })
        }
      }
      return {
        answered, escalated,
        summary: `${answered.length} répondus, ${escalated.length} renvoyés au marchand.`,
        note: 'Les réponses sont écrites par muse-spark, en darija. La page et les clients sont simulés.',
      }
    }

    case 'add_domain':
      return addDomain(Number(args.site_id), args.host, /\.sawt\.dz$/i.test(args.host) ? 'subdomain' : 'custom')

    case 'show_meta_setup':
      return { guide: ONBOARDING, step: args.step ?? null }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

/**
 * @param {object} o
 * @param {Array} o.history   prior messages, OpenAI shape
 * @param {string} o.input    what the merchant just said (already transcribed)
 * @param {object} o.ctx      { shop, products, photos, productName }
 * @param {function} o.onEvent called with each step so the UI can stream
 */
export async function runTurn({ history = [], input, ctx = {}, onEvent = () => {} }) {
  // Rebuilt on every turn, not cached: the state board is only useful if it
  // is current, and between two turns the merchant may have connected
  // Facebook, answered a customer or verified a domain in another tab.
  /* ⚠️ LA LANGUE DU MARCHAND EST DÉCIDÉE ICI, PAS DEVINÉE LÀ-BAS.
     La consigne n° 7 dit « if the merchant writes in darija, answer in
     darija », et c'est vrai — mais c'est une ligne au milieu d'un prompt de
     cent cinquante, et le modèle s'en souvient inégalement. Le même oubli a
     fait répondre en arabe à des clientes anglaises pendant tout un tournage.
     Le code sait lire un message ; il n'a aucune raison de laisser ça à
     l'inférence.

     Et la consigne va dans le message SYSTÈME, pas devant le texte du
     marchand : le tour est enregistré tel quel et réaffiché, donc un préfixe
     collé à l'entrée finirait dans sa propre bulle, à l'écran. */
  const langue = langueDu(input)
  const messages = [
    { role: 'system',
      content: systemPrompt({ ...ctx, state: ctx.sessionId ? briefing(ctx.sessionId) : '' })
        + `\n\nTHIS TURN: the merchant is writing to you in ${langue.nom}.`
        + ` Answer in ${langue.nom}. Nothing else about your reply changes.` },
    ...history,
    { role: 'user', content: input },
  ]
  const artifacts = []

  for (let step = 0; step < MAX_STEPS; step++) {
    // One message id per model turn, so the UI knows which bubble the tokens
    // belong to and can grow it in place instead of appending new ones.
    const mid = `m${Date.now().toString(36)}${step}`
    onEvent({ type: 'say:start', id: mid })

    const msg = await chatStream(messages, {
      tools: TOOLS,
      onDelta: (t) => onEvent({ type: 'say:delta', id: mid, text: t }),
      onReasoning: () => onEvent({ type: 'thinking', id: mid }),
    })
    const calls = msg.tool_calls ?? []
    const text = visibleAnswer(msg)
    onEvent({ type: 'say:end', id: mid, text })

    if (!calls.length) {
      messages.push({ role: 'assistant', content: text })
      await menuDeFin({ messages, artifacts, onEvent })
      return { text, artifacts, messages: messages.slice(1) }
    }

    messages.push({ role: 'assistant', content: text || null, tool_calls: calls })

    for (const call of calls) {
      const name = call.function?.name
      let args = {}
      try { args = JSON.parse(call.function?.arguments || '{}') } catch {}

      onEvent({ type: 'tool:start', name, args, simulated: SIMULATED.has(name), real: REAL.has(name) })

      let result
      try {
        result = await runTool(name, args, ctx, onEvent)
      } catch (e) {
        result = { error: e.message }
      }

      // Le débit, compté sur ce qui est VRAIMENT revenu : une scène reprise
      // du cache ne coûte rien, un appel en échec non plus. Il voyage avec
      // l'artefact pour que l'écran l'écrive à côté de ce qu'il montre, et
      // pas dans un relevé qu'on irait chercher ailleurs.
      const facture = charge(ctx.sessionId, consomme(name, result), name)
      const artifact = {
        name, args, result, simulated: SIMULATED.has(name), real: REAL.has(name),
        cost: facture.credits ? facture : null,
      }
      artifacts.push(artifact)
      onEvent({ type: 'tool:end', ...artifact })

      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 6000) })

      // A missing detail stops everything. Asking beats guessing, and guessing
      // is exactly what the transcription failure would otherwise cause.
      if (name === 'ask_merchant') {
        return { text: args.question, blocked: true, missing: args.missing, artifacts, messages: messages.slice(1) }
      }
    }
  }

  return { text: 'Stopped after too many steps.', artifacts, messages: messages.slice(1) }
}
