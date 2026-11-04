# Sawt — صوت

**Starting a business no longer takes capital or a product. It takes knowing how to run ads —
and that is a profession. This agent is that profession.**

You give it a product and its photos. If you have no product, you pick one from the
catalogue. From there it builds the shop, writes the ad, draws the creative from *your* photo,
launches the campaign, watches what each order actually costs, replaces the creative that
wears out, and answers the customers who reply — including the ones who answer with a voice
note of their own.

You talk to it. By voice, in Algerian darija, if that is how you talk.

**You never open Ads Manager. You never learn what a lookalike audience is.**

---

## Who this is for, and why it is not a niche

Two people have the same problem from opposite ends.

**The beginner** has a little money saved and no idea where to start. Finding something to
sell is a solved problem — suppliers and dropshipping catalogues are one search away. What
stops them is that advertising is a trade: pixels, audiences, creatives, cost per
acquisition, attribution windows. They do not fail at commerce. They fail at the console.

**The professional** climbed that curve years ago and is tired of it. The work is daily,
repetitive and never finished — watch the cost per order, pause what is bleeding, write
another creative because last week's stopped converting, answer the same forty questions
from forty customers. They do not need to be taught. They need it off their hands.

One agent serves both, because underneath it is the same job: **turn a product into a
campaign that is watched and corrected without a human in the loop.**

### Cash on delivery is where I built it, not what it is

In Algeria almost nobody pays online. The parcel arrives, the customer pays cash — or refuses
it at the door, and the merchant pays the return. That is why this agent is built to refuse
to guess: here, a confident wrong answer has a price in dinars, the same day. See
**[The one rule](#the-one-rule)**.

Change the payment rail and the agent does not change. The local rules — carriers, tariffs
per commune, the language customers write in — plug in underneath it.

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
it is also the only honest way to ship this: `ads_management` takes Meta weeks to approve, and
a judge has no Page to approve it against. So by default the Facebook side is staged — the
real consent flow, the real permission strings, a Business Manager, a Page, an Instagram
account, an inbox and campaign tables — and every surface of it is marked **SIMULÉ**.

Staged by default is not the same as staged only. **If you own a Meta app, the same code
drives your real Page and your real ad account** — see *[The Meta side](#the-meta-side-live-recorded-or-staged--and-the-badge-says-which)* below.

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

## The whole circuit, from nothing to a campaign that corrects itself

1. **Pick a product, or bring one.** The dropshipping catalogue is inside the app — browse
   it, import one. If you already sell something, send your own photos instead.
2. **It looks at the photo.** `sam-3.1` finds the product inside the frame, `ffmpeg` crops to
   it, and the vision model says what it is — and what the photo gets wrong.
3. **It builds the shop.** A storefront and a landing page per product, as real files, in the
   language you picked.
4. **It draws the creatives.** `muse-image` *edits* your cropped photo rather than inventing a
   picture from a description, so the ad shows the article you will actually ship.
5. **It launches.** Budget, audience, placements, campaign submitted.
6. **It watches the only number that matters.** Not clicks — cost per *delivered* order, and
   its drift. A campaign at 400 DA an order climbing 15 % a day will be at 800 within the
   week. Today's figure does not say that. The slope does.
7. **It corrects itself.** Scales what works by a factor it can justify, pauses what bleeds,
   and replaces a creative that has worn out — pausing the old ad instead of deleting it, so
   before and after stay comparable.
8. **It sells.** Customers comment and send Messenger messages, often as voice notes. It
   answers in darija, quotes the real shipping price for their commune, picks the variant,
   takes the order — and hands back the questions it must not answer.

Step 6 and step 7 are the ones a human never keeps up with, and they are the reason this is
an agent rather than a generator.

## Darija, and what the benchmark actually measures

Algerian darija mixes Arabic, French and Berber, has no standard orthography, and is written
in both Arabic and Latin script. It is also the language in which an entire country does
business, out loud, in voice notes.

I started this assuming transcription would be the wall. It is not: the models read darija
well, and the open-weights table below shows one writing it correctly too. So the benchmark
in [`bench/`](bench/) does not measure word error rate — that would measure the part that
already works, and measure it badly, because WER needs a reference spelling this language
does not have.

It measures what survives the transcription, because that is what decides a sale:

- **intent accuracy** — price, sizes, delivery time, availability, objection, cancellation
- **entity extraction** — wilaya, commune, quantity, size

A rough transcription that returns the right wilaya and the right size is a commercial
success. A perfect transcription that loses the wilaya is worthless: the customer is quoted
the wrong shipping price, and in cash on delivery a wrong price is a parcel refused at the
door, with the merchant paying the return.

```bash
npm run bench     # regenerates the table below from the clips in bench/clips/
```

> Results table is produced by `bench/run.mjs` and will be published here before submission.

## The Meta side: live, recorded, or staged — and the badge says which

The default connects nothing, because the organisers asked that a judge be able to run this
without an account of their own. But the real path is not a paragraph promising one: it is
code, and the recorded exchanges shipped in `fixtures/graph.json` came out of it.

| Mode | How you get it | Meta's models | The Facebook / Instagram side |
|---|---|---|---|
| `replay` | `npm start`, no key at all | nothing live, no network | recorded real exchanges, dated on screen |
| `live` | a `MODEL_API_KEY` in `.env` | **live** | staged, every surface marked `SIMULÉ` |
| `real` | your own Meta app — [SETUP.md](SETUP.md) | **live** | **live Graph API**, your Page, your ad account |

The mode is *derived* from what is present in the environment, never from a flag nobody
passes, and the badge in the corner of the rail is a claim about what just happened. It used
to default to `replay` while the server happily made real model calls behind the label, which
is the one kind of inaccuracy this project cannot afford.

**`real` mode calls the real Graph API** — `src/meta-graph/index.js`, five endpoints:
`GET /{page}/conversations`, `GET /{post}/comments`, `POST /{thread}/messages`,
`POST /act_{id}/campaigns`, `POST /act_{id}/ads`. Real campaign creation is forced to
`status: PAUSED`. **An agent that can start spending your money without a human saying so is
not a feature.**

**The recorded exchanges are real exchanges.** Every entry in `fixtures/graph.json` carries
the date and the call that produced it — *"2026-10-30, POST /act_…/campaigns, status PAUSED,
no spend"* — and the screen replaying one shows that line, so you never have to wonder whether
it was invented. Account identifiers are redacted to their last four characters; the returned
object ids are the ones Meta actually returned.

**The permissions are the real strings**, with the real consequences: `pages_show_list`,
`pages_read_engagement`, `pages_manage_engagement`, `pages_messaging`,
`pages_manage_metadata`, `instagram_basic`, `instagram_manage_comments`,
`instagram_manage_messages`, `ads_management`, `business_management`, `catalog_management`.
Refuse one in the consent screen and the thing it unlocks really disappears — decline
`instagram_manage_messages` and the Instagram inbox comes back empty, naming the scope as the
reason. That is the one screen I would ask you to click through yourself.

### Already have a Meta app? You are five lines from live

```bash
META_APP_ID=…          # your app in Meta for Developers
META_APP_SECRET=…
META_PAGE_ID=…         # the Page the agent manages
META_PAGE_TOKEN=…      # a Page access token with the scopes above
META_AD_ACCOUNT_ID=…   # without the act_ prefix
```

`npm start` then reports `mode: real`, and [SETUP.md](SETUP.md) lists, call by call, which
permission each one needs and what it does in each mode. An app still in development mode is
enough for the Page and ad accounts you administer — which is how the recorded exchanges above
were produced.

## Built with

| Model | Used for |
|---|---|
| `muse-spark-1.3` | the agent loop, tool calls, the landing copy, the darija replies |
| `muse-spark-1.3` (vision) | reading the product photo — what it is, what the photo gets wrong, what looks counterfeit |
| `muse-voice-transcribe-1.0` | merchant and customer voice notes, **two readings of every clip** |
| `muse-image-1.0` | ad creatives, the four landing-page scenes, and the catalog photography — all **edits of the real product photo**, never generated from a description |
| **`sam-3.1`** | finding the product inside a cluttered photo, so the creative shows **their** product |
| `muse-spark-open` (Baseten) | the open-weights path — no Meta account needed |

### Why `sam-3.1` earns its place

The vision model kept saying things like *"white polo, green collar — cluttered
background, reshoot it"*. It could see the problem and had no way to fix it. Worse,
the creative never started from the photo at all: it started from a **description**
of the photo, so a merchant selling one specific article got a picture of the model's
idea of that article. Close enough to look right, and not their product.

Now `sam-3.1` locates the product, `ffmpeg` crops to the box, and `muse-image` *edits*
that crop. Measured on a real photo: the shoe went from **33% of the frame** to filling
it, and the resulting ad is the same shoe — same patent leather, same canvas toe.

The landing page's four section images run through that same path. They used to be
text-to-image, which is how a white polo with a green collar came back as a plain dark
one. Two rules make the difference, and both are in the prompt rather than in hope:
the fidelity clause goes **first**, and the product's colour and material are confined
to two dedicated fields and **banned from every scene description** — an image model
follows those words more than it follows the attached photo. When a scene fails, the
section falls back to the real photograph, so the page is always complete and always
truthful.

`sam-3.1` is not on `/chat/completions`; the API says so and points at `/v1/responses`.
It answers with tokens, not JSON: `<|box;x1=…|>` and a `<|mask;…|>` whose encoding is
undocumented. We read the box and say plainly that we ignore the mask — decoding a blob
by guesswork three days before a deadline is how you lose the three days. ffmpeg was
already required for voice notes, so cropping adds no dependency.

Everything else is Node and nothing else: no framework, no bundler, no `node_modules`.
The database is SQLite through `node:sqlite`, so the whole app is `git clone` then `npm start`.

### The open-weights path is a switch, not a paragraph

Click the badge at the bottom of the rail and the next turn runs on **Muse Spark Open**
through Baseten. The badge turns green, the settings screen names the model, and the
agent keeps working — tools and all.

```bash
npm run baseten     # re-runs the measurement below, ~25 s
```

| Capability | On the open weights | Measured |
|---|---|---|
| Conversation | ✅ | clean `content`; the reasoning arrives in a separate field |
| Darija | ✅ | *«الصباط يدير 4500 دج والدفع عند الاستلام»* |
| Tool calling | ✅ | including **streamed**, arguments valid JSON |
| Vision | ✅ | differential test: *"Polo blanc vert"* vs *"Baskets beiges"* |
| Image generation | ❌ | no open-weights endpoint here — stays on `muse-image-1.0` |
| Transcription | ❌ | no open-weights endpoint here — stays on `muse-voice-transcribe` |

**So the agent's head runs entirely on open weights; its hands and ears do not.**
Claiming "100% open weights" would be false, and the script above checks it in 25 seconds.

The vision row took three attempts to measure honestly. A 1×1 pixel and *"what colour?"*
cannot tell seeing from guessing — a model that drops the image answers just as
confidently. Naming the expected object does not work either: my word list said
"shoe" and the model correctly answered *"Polo blanc"*, so the test failed a right
answer. The differential version asks the same question of two different images and
requires two different answers, which assumes nothing about either photo.

## The one rule

**A missing detail is a question, never a guess.**

The customer does not always say the size. The merchant has not always given the stock. Both
are the same problem — the answer is not in the conversation — and guessing either one costs
a real delivery. So the agent asks instead of inferring, and the rule holds in both
directions:

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

Everything in `src/`, `web/`, `bench/` and `fixtures/` was written during the event.
Repository created 30 October 2026 and pushed daily — see the commit history.

## Where the problem comes from — and what is not in this repository

I build and run **Dropdz**, a cash-on-delivery commerce platform used by Algerian merchants
since 2024. That is where this problem was handed to me, repeatedly, by the people living it:
merchants who have a product, a supplier and a phone, and who stall at the ad account. Some
never start at all. The ones who do spend their evenings watching numbers nobody taught them
to read, and asking me what to do about them.

So this is not a problem I invented in order to have something to build this week. It is the
one I get asked, and the reason I knew which number to put on the first screen.

**No Dropdz code is in this repository.** Everything in `src/`, `web/`, `bench/` and
`fixtures/` was written during the event. The agent *can* call Dropdz over its public HTTP API
for **domain data only** — per-commune shipping rates, product catalogue, order persistence —
and that integration is optional and off by default.

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
