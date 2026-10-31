// Un tour d'agent, lisible. Affiche ce qu'il dit, ce qu'il appelle, et ce que
// l'outil a répondu — pour voir la boucle se dérouler, pas juste sa conclusion.
const [session, ...mots] = process.argv.slice(2)
const input = mots.join(' ')

const money = (n) => (n == null ? '—' : Number(n).toLocaleString('fr-FR') + ' DA')

const res = await fetch(`http://localhost:7070/api/chat?session=${session}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ input }),
})

const reader = res.body.getReader(), dec = new TextDecoder()
let buf = ''
console.log(`\n\u001b[1m> ${input}\u001b[0m\n`)

for (;;) {
  const { done, value } = await reader.read()
  if (done) break
  buf += dec.decode(value, { stream: true })
  const parts = buf.split('\n\n'); buf = parts.pop()
  for (const part of parts) {
    const line = part.replace(/^data: /, '').trim()
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }

    if (e.type === 'tool:start') console.log(`  [${e.name}]`)
    else if (e.type === 'say:end' && e.text?.trim()) console.log('\n' + e.text.trim() + '\n')
    else if (e.type === 'error') console.log('  ERREUR :', e.error)
    else if (e.type === 'tool:end') {
      const r = e.result ?? {}
      if (r.error) { console.log('    ! ' + r.error); continue }
      switch (e.name) {
        case 'configure_campaign':
          console.log(`    campagne #${r.id} « ${r.name} » — ${r.status} — ${money(r.daily_budget_dzd)}/jour`)
          console.log(`    ciblage ${r.geo.join(', ')} · ${r.age_min}-${r.age_max} ans · placements ${r.placements.join(', ')}`)
          console.log(`    ${r.ads?.length ?? 0} créative(s)`)
          break
        case 'launch_campaign':
          console.log(r.refused ? `    REFUSÉ — ${r.reason}` : `    statut ${r.status}`)
          break
        case 'simulate_days':
        case 'campaign_results': {
          if (!r.rows?.length) { console.log('    ' + (r.note ?? 'rien')); break }
          const t = r.totals
          console.log(`    ${r.days} jour(s) · ${money(t.spend_dzd)} dépensés · ${t.orders} commandes · ${money(t.cost_per_order_dzd)} / commande`)
          console.log('    par placement :')
          for (const p of r.by_placement) console.log(`      ${p.label.padEnd(22)} ${String(p.orders).padStart(3)} cmd   ${money(p.cost_per_order_dzd).padStart(12)} / cmd`)
          console.log('    jour par jour :')
          for (const d of r.by_day) console.log(`      ${d.day}   ${money(d.spend_dzd).padStart(10)}   ${String(d.orders).padStart(3)} cmd   ${money(d.cost_per_order_dzd).padStart(12)} / cmd`)
          break
        }
        case 'adjust_campaign':
          console.log(`    DÉCISION : ${r.applied.action}${r.applied.target ? ' → ' + r.applied.target : ''}`)
          console.log(`    parce que : ${r.applied.because}`)
          break
        case 'propose_choices':
          console.log('    choix : ' + (r.choices ?? []).map((c) => c.label).join(' | '))
          break
        case 'ask_merchant':
          console.log(`    QUESTION : ${r.question}  (manque : ${r.missing})`)
          break
        default:
          console.log('    ' + JSON.stringify(r).slice(0, 180))
      }
    }
  }
}
