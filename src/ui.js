// Terminal presentation. The judge reads this output, so every replayed step
// has to say out loud that it is replayed, and where the recording came from.
const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  magenta: '\x1b[35m', cyan: '\x1b[36m', red: '\x1b[31m', grey: '\x1b[90m',
}

const w = (s) => process.stdout.write(s)

export const ui = {
  banner(mode) {
    const label = {
      replay: `${C.yellow}REPLAY${C.reset} ${C.grey}· nothing is live, no credentials used${C.reset}`,
      live: `${C.green}LIVE MODELS${C.reset} ${C.grey}· Meta models are real, Facebook side replayed${C.reset}`,
      real: `${C.red}REAL${C.reset} ${C.grey}· live models AND a real Meta app${C.reset}`,
    }[mode]
    w(`\n${C.bold}  Sawt${C.reset} ${C.grey}صوت${C.reset}  —  ${label}\n`)
    w(`${C.grey}  ${'─'.repeat(68)}${C.reset}\n`)
  },

  step(n, title) {
    w(`\n${C.bold}${C.blue}  ${n}. ${title}${C.reset}\n`)
  },

  // Anything that did not really happen in this run is labelled, as the
  // organisers asked: "any simulated parts should be labeled".
  replayed(what, provenance) {
    w(`${C.yellow}     [REPLAY]${C.reset} ${what}\n`)
    if (provenance) w(`${C.grey}       ↳ recorded ${provenance}${C.reset}\n`)
  },

  liveCall(what) {
    w(`${C.green}     [LIVE]${C.reset}   ${what}\n`)
  },

  speech(who, text, translation) {
    w(`${C.magenta}     ${who}${C.reset}  ${text}\n`)
    if (translation) w(`${C.grey}              “${translation}”${C.reset}\n`)
  },

  tool(name, args, result) {
    w(`${C.cyan}     → ${name}${C.reset}${C.grey}(${args})${C.reset}\n`)
    if (result !== undefined) w(`${C.grey}       ${result}${C.reset}\n`)
  },

  note(text) { w(`${C.grey}     ${text}${C.reset}\n`) },
  ok(text) { w(`${C.green}     ✓ ${text}${C.reset}\n`) },
  warn(text) { w(`${C.yellow}     ! ${text}${C.reset}\n`) },

  kv(k, v) { w(`${C.grey}     ${k.padEnd(18)}${C.reset}${v}\n`) },

  end(lines) {
    w(`\n${C.grey}  ${'─'.repeat(68)}${C.reset}\n`)
    for (const l of lines) w(`  ${l}\n`)
    w('\n')
  },
}
