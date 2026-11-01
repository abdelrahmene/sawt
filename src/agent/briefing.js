// What the agent knows when the turn starts.
//
// This is the file that made the difference between an assistant and an agent.
//
// Before it, every turn began from nothing: the model was handed the role, the
// rules and the conversation, and that was all. So it asked for the shop name
// it had been given twice, offered to build a landing page that already
// existed, and had no idea that four customers were waiting in the inbox or
// that yesterday's cost per order was up forty percent. It read as not very
// intelligent because it was not very informed — the state was all in the
// database and none of it in the prompt.
//
// Now the turn opens with a briefing: what exists, what is connected, what is
// waiting, and which way the numbers are moving. Kept short on purpose — this
// goes in front of every single request, so it is a status board, not a dump.
import { all, one, unJ, setting } from '../db.js'
import { PLACEMENTS } from '../meta-sim/campaigns.js'

const money = (n) => `${Number(n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ')} DZD`
const ago = (ms) => {
  const h = (Date.now() - ms) / 3600_000
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min ago`
  if (h < 48) return `${Math.round(h)} h ago`
  return `${Math.round(h / 24)} days ago`
}

export function briefing(sessionId) {
  const lines = []

  /* ── a-t-il seulement quelque chose à vendre ? ─────────────────────────
     La question qui vient avant toutes les autres, et que l'agent ne posait
     jamais : il supposait que le marchand avait de la marchandise et une
     photo. La plupart n'ont ni l'une ni l'autre — ils cherchent un produit
     à vendre, ce qui est un métier à part entière ici. */
  const owned = all('SELECT product,selling FROM imports WHERE session=?', sessionId)
  const hasPhoto = one('SELECT 1 x FROM photos WHERE session=? LIMIT 1', sessionId)
  if (!owned.length && !hasPhoto) {
    lines.push('THE MERCHANT HAS NOTHING TO SELL YET — no product imported, no photo sent.')
    lines.push('  Do not ask for a photo. Offer the two paths as tappable choices (rule 11):')
    lines.push('  their own product, or a product from the supplier catalog. browse_catalog lists it.')
  } else if (owned.length) {
    lines.push(`FROM THE CATALOG, ALREADY IN THEIR SHOP — ${owned.length}. These have their own photos:`)
    lines.push('  never ask the merchant to send you a picture of one of these.')
  }

  /* ── what has been built ─────────────────────────────────────────────── */
  const sites = all('SELECT id,shop,home_url FROM sites WHERE session=? ORDER BY id DESC LIMIT 3', sessionId)
  const pages = all(
    `SELECT p.id,p.product,p.url,p.price_dzd,
            (SELECT COUNT(*) FROM orders WHERE page=p.id) orders
     FROM pages p WHERE p.session=? ORDER BY p.id DESC LIMIT 8`, sessionId)

  if (pages.length) {
    lines.push('PAGES THAT ALREADY EXIST — do not offer to build these again:')
    for (const p of pages) {
      lines.push(`  · ${p.product} — ${money(p.price_dzd)} — ${p.url}${p.orders ? ` — ${p.orders} real order(s) from the form` : ''}`)
    }
  }
  /* Les visuels que l'agent a lui-même produits. Ils étaient en base et dans
     aucun briefing : à « prépare une campagne sur ces trois visuels », il
     répondait « envoie-moi les trois visuels ». Une photo envoyée par le
     marchand et une créative dessinée par l'agent sont deux tables
     différentes, et seule la première remontait jusqu'au modèle. */
  const creas = all('SELECT url,angle FROM creatives WHERE session=? ORDER BY id DESC LIMIT 8', sessionId)
  if (creas.length) {
    lines.push(`CREATIVES YOU HAVE ALREADY PRODUCED — ${creas.length} of them, ready to put in an ad.`)
    for (const c of creas) lines.push(`  · ${c.angle ?? 'no angle recorded'} — ${c.url}`)
    lines.push('  When the merchant says "these visuals", "the creatives" or "the three images",')
    lines.push('  they mean these. Never ask them to send you a creative you made yourself.')
  }

  if (sites.length) {
    for (const s of sites) {
      const doms = all('SELECT host,status FROM domains WHERE site=?', s.id)
      lines.push(`  · site "${s.shop}" → ${s.home_url ?? '(no home page)'}${
        doms.length ? ` — domain(s): ${doms.map((d) => `${d.host} [${d.status}]`).join(', ')}` : ' — no domain yet'}`)
    }
  }

  /* ── the Meta side ───────────────────────────────────────────────────── */
  const conn = one('SELECT * FROM meta_connections WHERE session=? ORDER BY id DESC LIMIT 1', sessionId)
  if (!conn || conn.status !== 'connected') {
    lines.push('META: NOT CONNECTED. The merchant has not linked a Facebook account, so there is no Page,')
    lines.push('  no Instagram, no ad account and no inbox. If they want ads or customer replies, call')
    lines.push('  connect_meta first — it opens the connection screen for them. Do not pretend to post.')
  } else {
    const assets = all('SELECT kind,name,followers,external_id FROM meta_assets WHERE connection=?', conn.id)
    const declined = unJ(conn.declined, [])
    lines.push(`META: connected as ${conn.user_name} (SIMULATED connection — no real Meta account is involved).`)
    for (const a of assets) {
      lines.push(`  · ${a.kind}: ${a.name}${a.followers ? ` — ${a.followers.toLocaleString('fr-FR')} followers` : ''}`)
    }
    if (declined.length) {
      lines.push(`  · permissions REFUSED by the merchant: ${declined.join(', ')} — anything needing them is unavailable, say so by name.`)
    }

    /* ── the inbox ─────────────────────────────────────────────────────── */
    const ids = assets.map((a) => a.external_id)
    const inbox = all(
      `SELECT t.id, t.channel, t.person, t.status, t.subject, t.last_at,
              (SELECT text FROM thread_messages WHERE thread=t.id ORDER BY id DESC LIMIT 1) last
       FROM threads t
       WHERE t.asset IN (SELECT id FROM meta_assets WHERE connection=?)
       ORDER BY t.last_at DESC LIMIT 10`, conn.id)

    const waiting = inbox.filter((t) => t.status === 'open')
    const stuck = inbox.filter((t) => t.status === 'needs_merchant')
    if (waiting.length) {
      lines.push(`INBOX: ${waiting.length} customer(s) waiting for an answer.`)
      for (const t of waiting.slice(0, 5)) {
        lines.push(`  · #${t.id} ${t.channel} — ${t.person} (${ago(t.last_at)}): "${String(t.last ?? '').slice(0, 90)}"`)
      }
      lines.push('  Call answer_inbox to deal with them. You write the replies; you do NOT invent facts.')
    }
    /* Un fil bloqué sur le marchand y reste tant qu'il ne répond pas — et il
       ne répond pas, il est en train de faire autre chose. Sans mémoire de ce
       qu'on a déjà relayé, ce bloc redonnait la même consigne à chaque tour,
       et l'agent reposait sagement les QUATRE mêmes questions : « il me faut
       la pointure 43 », « il me faut le frais pour Béjaïa »... tour après
       tour, par-dessus ce que le marchand venait de demander. Insistant au
       point d'en devenir inutile.
       Donc on note ce qui est sorti une fois. Le briefing est construit
       exactement une fois par tour (runTurn), donc « affiché » = « demandé ».
       La liste est réécrite à chaque passage avec les seuls fils encore
       bloqués : elle se purge d'elle-même quand le marchand répond enfin. */
    if (stuck.length) {
      const memo = `inbox:relayed:${sessionId}`
      const vus = new Set(setting(memo) ?? [])
      const neufs = stuck.filter((t) => !vus.has(t.id))
      const redites = stuck.filter((t) => vus.has(t.id))

      if (neufs.length) {
        lines.push(`INBOX — WAITING ON THE MERCHANT, not on you (${neufs.length} new):`)
        for (const t of neufs.slice(0, 4)) {
          lines.push(`  · #${t.id} ${t.person} — you need from them: ${t.subject ?? 'a missing fact'}`)
        }
        lines.push('  Ask them for exactly these, ONCE. One short question each.')
      }
      if (redites.length) {
        lines.push(`  ${redites.length} other thread(s) were ALREADY relayed and are still unanswered: ${
          redites.slice(0, 6).map((t) => `#${t.id} ${t.person}`).join(', ')}.`)
        lines.push('  They heard you. Do NOT ask again — not rephrased, not "just a reminder".')
        lines.push('  Half a sentence at most, and only if it blocks what they just asked for.')
        lines.push('  Otherwise say nothing about them and get on with their request.')
      }
      setting(memo, [...redites, ...neufs].map((t) => t.id))
    }
  }

  /* ── campaigns ───────────────────────────────────────────────────────── */
  const camps = all(
    `SELECT c.*,
            (SELECT COALESCE(SUM(spend_dzd),0) FROM insights WHERE campaign=c.id) spend,
            (SELECT COALESCE(SUM(orders),0)    FROM insights WHERE campaign=c.id) orders,
            (SELECT COUNT(DISTINCT day)        FROM insights WHERE campaign=c.id) days
     FROM campaigns c WHERE c.session=? ORDER BY c.id DESC LIMIT 4`, sessionId)

  if (camps.length) {
    lines.push('CAMPAIGNS (all SIMULATED):')
    for (const c of camps) {
      const cpo = c.orders ? Math.round(c.spend / c.orders) : null
      lines.push(`  · #${c.id} "${c.name}" — ${c.status} — ${money(c.daily_budget_dzd)}/day — ${c.days} day(s) of data`)
      if (c.days) {
        lines.push(`      ${money(c.spend)} spent · ${c.orders} orders · ${cpo ? money(cpo) + ' per order' : 'no order yet'}`)
      }

      // The trend is what makes a decision defensible. A single day's cost per
      // order is a number; two days is an argument.
      const byDay = all(
        `SELECT day, SUM(spend_dzd) s, SUM(orders) o FROM insights WHERE campaign=? GROUP BY day ORDER BY day`, c.id)
      if (byDay.length >= 2) {
        const f = byDay[0], l = byDay.at(-1)
        const a = f.o ? f.s / f.o : null, b = l.o ? l.s / l.o : null
        if (a && b) {
          const pct = Math.round((100 * (b - a)) / a)
          lines.push(`      trend: cost per order ${pct >= 0 ? 'UP' : 'DOWN'} ${Math.abs(pct)}% since day 1 (${money(Math.round(a))} → ${money(Math.round(b))})`)
        }
      }

      const worst = one(
        `SELECT i.placement, SUM(i.spend_dzd) s, SUM(i.orders) o
         FROM insights i WHERE i.campaign=? GROUP BY i.placement
         HAVING o >= 0 ORDER BY (CASE WHEN o=0 THEN 9e9 ELSE CAST(s AS REAL)/o END) DESC LIMIT 1`, c.id)
      const best = one(
        `SELECT i.placement, SUM(i.spend_dzd) s, SUM(i.orders) o
         FROM insights i WHERE i.campaign=? GROUP BY i.placement
         HAVING o > 0 ORDER BY CAST(s AS REAL)/o ASC LIMIT 1`, c.id)
      if (worst && best && worst.placement !== best.placement) {
        const lab = (p) => PLACEMENTS[p]?.label ?? p
        lines.push(`      worst placement: ${lab(worst.placement)} (${worst.o ? money(Math.round(worst.s / worst.o)) : 'zero order'} per order)`)
        lines.push(`      best placement:  ${lab(best.placement)} (${money(Math.round(best.s / best.o))} per order)`)
      }

      const last = one('SELECT action,target,because FROM decisions WHERE campaign=? ORDER BY id DESC LIMIT 1', c.id)
      if (last) lines.push(`      last decision: ${last.action}${last.target ? ` → ${last.target}` : ''} — ${last.because}`)
    }
  }

  /* ── real orders ─────────────────────────────────────────────────────── */
  const o = one(
    `SELECT COUNT(*) n, SUM(qty*COALESCE(price,0)) v FROM orders
     WHERE page IN (SELECT id FROM pages WHERE session=?)`, sessionId)
  if (o?.n) {
    lines.push(`REAL ORDERS from the generated pages: ${o.n}, worth ${money(o.v)}. These are the only`)
    lines.push('  numbers in this project that nothing simulates — say so when you mention them.')
  }

  if (!lines.length) return ''
  return ['CURRENT STATE — read this before you answer. It is the truth about this shop right now,',
    'and it overrides anything you remember from earlier in the conversation.', '', ...lines].join('\n')
}
