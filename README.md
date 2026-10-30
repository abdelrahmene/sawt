# Sawt — صوت

**An AI agent that runs social media marketing by voice — and understands Algerian darija,
the dialect today's models handle worst.**

You send it a voice note. It writes the ad, generates the creative, launches the campaign,
and then answers the customers who reply — including the ones who answer with a voice note
of their own. Nobody clicks a button.

---

## Run it without any account

No Meta account. No API key. No sign-up. No credit card.

```bash
git clone https://github.com/abdelrahmene/sawt
cd sawt
npm start
```

`npm start` replays a complete recorded session end to end: a merchant's darija voice
instruction, the generated creative, the campaign call, three customer messages, and the
moment the agent decides on its own to regenerate the ad. Every replayed step is printed
with a `[REPLAY]` label and the provenance of the recording it came from.

**Want to see the models actually run?** Add a key to `.env` and:

```bash
npm run live -- --audio bench/clips/01.m4a
```

That path calls Meta's models for real — transcription, reasoning and image generation —
while still replaying the Facebook/Instagram side, so you never have to connect an account
of your own. Driving a real Page and ad account is a third, optional mode: see
[SETUP.md](SETUP.md).

| | `npm start` | `npm run live` | real mode |
|---|---|---|---|
| Meta models | replayed | **live** | **live** |
| Facebook / Instagram | replayed | replayed | **live** |
| Credentials needed | **none** | one model key | your own Meta app |

---

## What it does

1. **Listens.** The merchant speaks, in darija: *"sors-moi une pub pour ce produit, 2000 DA par jour."*
2. **Creates.** `muse-image` generates the ad creative from the product photo.
3. **Launches.** The agent builds and submits the campaign.
4. **Sells.** Customers comment and send Messenger messages — often voice notes, because
   that is how people actually buy here. The agent answers in darija, quotes the real
   shipping price for their commune, picks the variant, and takes the order.
5. **Decides.** When the same objection comes back three times, it regenerates the creative
   to answer that objection. On its own.

## Why darija

Algerian darija mixes Arabic, French and Berber, has no standard orthography, and is written
in both Arabic and Latin script. It is the language where current models fail hardest — and
it is the language in which an entire country does business, out loud, in voice notes.

So the benchmark in [`bench/`](bench/) does not measure word error rate, which is meaningless
for a language with no fixed spelling. It measures what actually decides a sale:

- **intent accuracy** — price, sizes, delivery time, availability, objection, cancellation
- **entity extraction** — wilaya, commune, quantity, size

A rough transcription that returns the right wilaya and the right size is a commercial
success. A perfect transcription that loses the wilaya is worthless.

```bash
npm run bench     # regenerates the table below from the clips in bench/clips/
```

> Results table is produced by `bench/run.mjs` and will be published here before submission.

## Built with

| Model | Used for |
|---|---|
| `muse-spark` | the agent loop, tool calls, darija replies |
| `muse-voice-transcribe` | customer and merchant voice notes |
| `muse-image` | generating **and editing** the ad creative |
| `muse-spark-open` (Baseten) | the open-weights path — no Meta account needed |

---

## Built during the Hackathon (27 Oct – 4 Nov 2026)

Everything in `src/`, `bench/` and `fixtures/` was written during the event.
Repository created 30 October 2026 and pushed daily — see the commit history.

## Prior work — NOT part of this submission

I also build and run **Dropdz**, an existing cash-on-delivery commerce platform for Algerian
merchants (2024–). This agent can call Dropdz over its public HTTP API for **domain data
only**: per-commune shipping rates, product catalogue, order persistence. That integration is
optional and off by default.

**No Dropdz code is in this repository.** Everything here is new work written for this
hackathon.

## Honest limitations

- **Instagram DMs are out of scope.** The permission was never granted and App Review could
  not land inside the event window. Instagram *comments* work.
- **No voice replies.** Meta's API has no text-to-speech, so the agent answers in text.
- **Campaign values in replay are recorded**, not live spend. Every replayed step says so.

## Licence

MIT — see [LICENSE](LICENSE).
