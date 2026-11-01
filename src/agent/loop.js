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
  draftComment, sendCommentReply } from '../meta-sim/inbox.js'
import * as page from '../meta-sim/posts.js'
import * as notify from '../meta-sim/notify.js'
import { addDomain } from '../sites.js'
import * as catalog from '../catalog.js'
import { charge } from '../credits.js'
import { setting } from '../db.js'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { OUT_DIR } from '../creative/landing.js'

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
function produitBoutique(ctx, nom) {
  const produits = ctx.products ?? []
  if (!produits.length) return null
  const cible = String(nom ?? '').toLowerCase()
  const mots = cible.split(/[^a-z0-9؀-ۿ]+/).filter((w) => w.length > 2)
  return produits.find((p) =>
    (p.aliases ?? [p.name]).some((alias) => {
      const n = String(alias ?? '').toLowerCase()
      if (!n) return false
      return mots.some((w) => n.includes(w)) ||
        n.split(/[^a-z0-9؀-ۿ]+/).some((w) => w.length > 2 && cible.includes(w))
    })
  ) ?? (produits.length === 1 ? produits[0] : null)
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
      const products = (args.products ?? []).map((p, i) => {
        // Le produit de la boutique AVANT la position dans le tableau : ses
        // photos et ses tailles sont les siennes, pas celles de son voisin.
        const mien = produitBoutique(ctx, p.name)
        return {
          ...p,
          images: mien?.images?.length ? mien.images : p.image ? [p.image] : (pool[i] ? [pool[i]] : []),
          image: p.image || mien?.image || pool[i] || pool[0] || null,
          variants: (mien?.sizes ?? []).length > 1 ? mien.sizes : [],
        }
      })
      return buildSite({
        ...args, products, sessionId: ctx.sessionId,
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
      const photos = ctx.photos ?? []
      const photo = photos[Number(args.product_image)] ?? photos.at(-1) ?? null
      // What the model saw in the photo beats what anyone typed: the creative
      // should depict the product that exists, not the one described.
      const subject = photo?.described?.product || ctx.productName || ctx.productGuess || 'the product'
      const seen = photo?.described?.details ? ` ${photo.described.details}` : ''

      let cut = null
      if (photo?.path) {
        onEvent({ type: 'progress', tool: 'generate_creatives', phase: 'isolate', label: subject })
        cut = await isolate(photo.path, subject)
      }

      const out = []
      const angles = (args.angles ?? ['default']).slice(0, 3)
      for (const angle of angles) {
        onEvent({ type: 'progress', tool: 'generate_creatives', phase: 'creative', step: out.length + 1, total: angles.length, label: angle })
        const prompt = headlinePrompt(subject + seen, angle)
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
        source_photo: photo?.url ?? null,
        isolated: cut?.ok
          ? { model: 'sam-3.1', url: cut.url, coverage: cut.found.coverage, gain: cut.gain,
              from: 'le produit a été détouré de la photo, puis la créative part de CE produit' }
          : cut ? { model: 'sam-3.1', failed: cut.why, from: 'créative générée depuis la description, pas depuis la photo' } : null,
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
        ...args, images: assetsFor(ctx, args.images), shop: ctx.shop,
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
  const messages = [
    { role: 'system', content: systemPrompt({ ...ctx, state: ctx.sessionId ? briefing(ctx.sessionId) : '' }) },
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
