# Sawt — صوت

**An AI agent that runs social media marketing by voice — and understands Algerian darija,
the dialect today's models handle worst.**

You send it a voice note. It writes the ad, generates the creative, launches the campaign,
and then answers the customers who reply — including the ones who answer with a voice note
of their own. Nobody clicks a button.

---

## Run it without any account

No Meta account. No Facebook Page. No ad account. No `npm install` — there are no
dependencies, on purpose.

```bash
git clone https://github.com/abdelrahmene/sawt
cd sawt
npm start            # → http://localhost:7070
```

Needs **Node 22.5 or newer** (the database is `node:sqlite`, which ships with Node).
Add `MODEL_API_KEY` to `.env` to make the models live; without one the app still opens and
says so in the corner.

**You never have to connect a Meta account.** The organisers asked for that explicitly, and
it is also the only honest way to ship this: `ads_management` takes Meta weeks to approve,
and a judge has no Page to approve it against. So the Facebook side is a staged environment —
the real consent flow, the real permission strings, a Business Manager, a Page, an Instagram
account, an inbox and campaign tables — and every surface of it is marked **SIMULÉ**.

What is *not* staged is the AI. The darija it writes, the pictures it draws, the pages it
builds and its refusal to answer what it cannot verify are all real model calls.
**Réglages → the two tables** says which is which, line by line.

---

## What you'll see

| Screen | What it is |
|---|---|
| **Agent** | Talk to it, by voice in darija or by text. It builds, decides, and asks when something is missing. |
| **Studio** | Every knob on a landing page — tone, audience, length, template, colours, which sections, how many generated visuals — with the cost printed *before* the button. |
| **Sites** | The pages and shops it built, as real files, plus domains. The DNS check is a **real** lookup. |
| **Pubs** | Campaigns, their state and their KPIs, from one row per ad per placement per day. |
| **Messages** | Comments and Messenger. The agent answers in darija — and hands back the ones it must not answer. |
| **Meta** | The staged "Continue with Facebook", then the Business Manager it unlocks. Refuse a permission and the thing it unlocks really disappears. |

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
| `muse-spark` | the agent loop, tool calls, the landing copy, the darija replies |
| `muse-spark` (vision) | reading the product photo — what it is, what the photo gets wrong, what looks counterfeit |
| `muse-voice-transcribe` | merchant and customer voice notes, **two readings of every clip** |
| `muse-image` | ad creatives, and one generated visual per landing-page section |
| `muse-spark-open` (Baseten) | the open-weights path — no Meta account needed |

Everything else is Node and nothing else: no framework, no bundler, no `node_modules`.
The database is SQLite through `node:sqlite`, so the whole app is `git clone` then `npm start`.

## The one rule

**A missing detail is a question, never a guess.**

Transcription drops words, and it drops the one that matters: the size, the quantity, the
commune. So the agent asks instead of inferring — and the same rule applies to customers:

| A customer asks | What it does |
|---|---|
| *بشحال؟* — how much? | Answers. It knows the price. |
| *كاين توصيل لتيزي وزو؟* — delivery to Tizi Ouzou? | Answers. It knows the coverage. |
| *البوانتير 43 كاين؟* — is size 43 in stock? | **Refuses**, and tells the merchant it needs the stock per size. |
| *وين وصل الكولي؟* — where is my parcel? | **Refuses**, and asks for the tracking. |
| *واش أصلي ولا ريبليكا؟* — original or replica? | **Refuses**. It has never seen the supplier's paperwork. |

Every other demo of this answers all five. A confident wrong *"yes, 43 is available"* is a
refused delivery, the return shipping, and a customer who never comes back.

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

- **The Facebook side is staged, not live.** The connection, the Page, the Business Manager,
  the customers and the campaign numbers are simulated, and every screen that shows one says
  so. Driving a real Page and ad account is an optional third mode — see [SETUP.md](SETUP.md).
- **No voice replies.** Meta's API has no text-to-speech, so the agent answers in text.
- **No testimonials, no countdown, no fake scarcity**, and the switches for them are visible
  in the Studio, off, with the reason. They sell. They are also fabricated proof on a page
  submitted to Meta, which is how an ad account gets banned.
- **Simulated numbers are deterministic**, seeded from the campaign id — the same campaign
  always tells the same story, so the demo is reproducible. They are still not measurements.

## Licence

MIT — see [LICENSE](LICENSE).
