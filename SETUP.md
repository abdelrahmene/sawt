# Driving a real Facebook Page and ad account

**You do not need any of this to evaluate the project.** `npm start` replays a full
session with no account at all, and `npm run live` runs Meta's models for real with a
single API key. This page is for actually using Sawt on a shop — and for checking,
endpoint by endpoint, what the project asks of the Graph API.

It takes about 30 minutes. It is fiddly, and pretending otherwise would be dishonest.

## The three modes

The mode is **derived from the environment**, not from a flag nobody passes
(`src/config.js`). The badge in the corner of the app and the panel at the top of the
Meta screen both print the mode you are actually in.

| Mode | Command | Meta models | Graph API | The web screens | Needs in `.env` |
|---|---|---|---|---|---|
| `replay` | `npm start` | replayed | replayed from `fixtures/graph.json` | staged | nothing |
| `live` | `npm run live` | **live** | replayed from `fixtures/graph.json` | staged | `MODEL_API_KEY` |
| `real` | `npm run live -- --real` | **live** | **live, against your own app** | staged | the `META_*` block below |

`replay` is the default and stays the default: the organisers asked that a judge be
able to run everything without connecting an account.

**The web screens are staged in all three modes, on purpose.** They are the console a
judge clicks through with no Page and no ad account, and every surface that shows a
staged figure is marked `SIMULATED`. The real Graph calls are made from one file,
`src/meta-graph/index.js`, driven from the command line. Those two things are kept
apart deliberately — it is the only thing that makes the `SIMULATED` mark mean
anything.

## 1. Create your own Meta app

1. Go to **developers.facebook.com** → *My Apps* → *Create App*
2. Choose the **Business** type
3. Add the use cases you need:
   - *Engage with customers on Messenger* → `pages_messaging`, `pages_manage_metadata`
   - *Manage messages and comments* → `pages_manage_engagement`
   - *Create and manage ads with Marketing API* → `ads_management`
   - Instagram comments → `instagram_manage_comments`

**You are the admin of this app, so you stay on Standard Access.** Per Meta's own
documentation, an app *"only used by people who have a role on the app itself"* needs
**no App Review and no Business Verification**, and the Messenger docs state App Review is
*"not required if you only send and receive messages for your own Facebook Page."*

Advanced Access — and the review and verification that come with it — is what you need when
an app serves people who have **no role on it**. That is not this case.

## 2. Connect your Page and get a token

1. In the app dashboard, link the Page you administer
2. Generate a **Page access token** with the permissions above
3. Note your Page id and, for campaigns, your ad account id

## 3. Fill in `.env`

```bash
cp .env.example .env
```

| Variable | What the code does with it | Read by |
|---|---|---|
| `MODEL_API_KEY` | Bearer token for the Meta Model API (`muse-spark`, `muse-image`, `sam-3.1`, `muse-voice-transcribe`) | `src/config.js` |
| `META_APP_ID` | **Nothing is sent.** It identifies the app *you* created; you use it at developers.facebook.com to mint the Page token | `src/config.js` |
| `META_APP_SECRET` | **Nothing is sent.** Same: yours, for minting the token. Sawt sends the token, never the secret | `src/config.js` |
| `META_PAGE_ID` | Substituted into the request path, `/{page-id}/conversations` | `src/meta-graph/index.js` |
| `META_PAGE_TOKEN` | Sent as `Authorization: Bearer …` on **every** Graph call | `src/meta-graph/index.js` |
| `META_AD_ACCOUNT_ID` | Substituted into `/act_{ad-account-id}/…` — the **numeric id, without** the `act_` prefix; the code adds it | `src/meta-graph/index.js` |
| `META_GRAPH_VERSION` | The version segment of the URL. Defaults to `v21.0` | `src/config.js` |

Both app variables are read even though nothing sends them, for one reason: the Meta
screen can then say `set` or `missing` without ever printing a value, and a documented
variable is a variable the code actually reads.

## 4. Run it

```bash
npm run live -- --real
```

Campaigns are created **PAUSED**. An agent that can start spending money without a human
saying so is not a feature, and nothing here will change that for you.

## Every Graph call this repo implements, field by field

This table is not written next to the code. It **is** the table the code builds its
paths from (`CALLS` in `src/meta-graph/index.js`), served to the Meta screen by
`platform()`. An endpoint therefore cannot be documented without being wired, nor
wired without appearing on screen.

| What it does | Method + endpoint | Graph permission | In `replay` | In `real` |
|---|---|---|---|---|
| Read the Page's Messenger conversations | `GET /{page-id}/conversations?fields=messages{message,from,attachments}` | `pages_messaging`, `pages_read_engagement` | `fixtures/graph.json → inbox` | live request |
| Read the comments under a post | `GET /{post-id}/comments?fields=id,message,from` | `pages_read_engagement` | `fixtures/graph.json → comments` | live request |
| Send the reply the model wrote | `POST /{thread-id}/messages` | `pages_messaging` | `fixtures/graph.json → reply`, tagged `_replayed` | live request |
| Create the campaign | `POST /act_{ad-account-id}/campaigns` | `ads_management` | `fixtures/graph.json → createCampaign`, tagged `_replayed` | live request, **`status` forced to `PAUSED`** |
| Create the ad | `POST /act_{ad-account-id}/ads` | `ads_management` | `fixtures/graph.json → createAd`, tagged `_replayed` | live request, **`status` forced to `PAUSED`** |

Common to all five: base `https://graph.facebook.com/{META_GRAPH_VERSION}`, header
`Authorization: Bearer {META_PAGE_TOKEN}`, `Content-Type: application/json`. A non-2xx
answer throws with the status and the first 300 characters of Meta's error body —
Graph error payloads are the useful part and truncating them to "request failed" wastes
the only diagnosis you get.

### The bodies, field by field

```jsonc
// POST /{thread-id}/messages
{ "message": { "text": "<the reply the model wrote>" } }

// POST /act_{ad-account-id}/campaigns
{ "name": "…", "objective": "OUTCOME_SALES", "daily_budget": 200000,
  "special_ad_categories": [], "status": "PAUSED" }

// POST /act_{ad-account-id}/ads
{ "name": "…", "adset_id": "…", "creative": { "creative_id": "…" }, "status": "PAUSED" }
```

`daily_budget` is in **centimes** of the ad account currency, as the Marketing API
requires — 200000 is 2 000 DZD per day.

Three of the five are driven by the demo entry point (`npm run cli`, `src/index.js`):
`inbox`, `reply`, `createCampaign`. `comments` and `createAd` are implemented, have
recordings, and have **no caller** in this repo — public comments run through the staged
console (`src/meta-sim/posts.js`) and ad creation through the staged campaign screen.
Said here rather than left to be discovered.

`status: "PAUSED"` is not a default the caller can override. The code merges it *over*
whatever it was handed (`forces` in `CALLS`), so a caller that asks for `ACTIVE` still
gets a paused campaign. The repo has a probe for exactly this: intercept `fetch`, call
`graph.createCampaign({ …, status: 'ACTIVE' })` in `--real`, and read the body that
would have gone out.

## What is replayed, and from when

`replay` is not "made up". Each entry in `fixtures/graph.json` carries a `_recorded`
field, and `provenanceOf(name)` is what the Meta screen prints under every replayed
exchange:

| Fixture | Recorded |
|---|---|
| `inbox` | 2026-10-30, Messenger conversations on a test Page |
| `comments` | 2026-10-30, comments on a test Page post |
| `reply` | 2026-10-30, `POST /{thread-id}/messages` on a test Page |
| `createCampaign` | 2026-10-30, `POST /act_…/campaigns`, status PAUSED, no spend |
| `createAd` | 2026-10-30, `POST /act_…/ads`, status PAUSED, no spend |

Account identifiers are redacted to the last four characters; returned object ids are
kept as returned. **Staged is a different claim from replayed**: the Page, the Business
Manager, the assets and the eight inbox customers of the web screens are invented for
the demo (`src/meta-sim/`), and no real customer message, name or voice note is in this
repository. Page conversations are Platform Data.

## What Sawt does NOT call

Listed because the opposite is easy to assume from a screen full of Graph-shaped JSON.

- **No OAuth code exchange, no `appsecret_proof`.** There is no `/oauth/access_token`
  call and no `/dialog/oauth` redirect in this repo. You mint the Page token in your own
  app dashboard; Sawt consumes it.
- **No insights read-back.** There is no `/insights` call. Spend, reach, CPA and the
  wallet on the campaign screens are staged and labelled, and a staged number is never
  added to a measured one.
- **No `/me/accounts`, no `/me/permissions`.** The Meta screen's "Graph response" panel
  shows the *shape* those two return, generated by `graphEcho()` in
  `src/meta-sim/connect.js` with simulated data, and it says so on the panel itself.
- **No webhook subscription.** `pages_manage_metadata` is on the consent screen because
  a real deployment needs it; this repo polls, it does not subscribe.
- **Nothing on Instagram.** The Instagram scopes are on the consent screen and gate the
  staged assets; no Instagram endpoint is called from `src/meta-graph/index.js`.

## Before you point this at money

Two things to check with your own app in front of you, because they have only ever run
against the recordings:

- **The ads endpoints and the token.** All five calls send whatever is in
  `META_PAGE_TOKEN`. The Marketing API wants a token that carries `ads_management` on
  that ad account — in practice a System User token from Business Manager, not a Page
  token. There is one token field today, so put the ads-capable token there if you drive
  campaigns, or split the field.
- **The reply edge.** Sawt posts to `/{thread-id}/messages`, where the thread id comes
  straight from the `conversations` edge it just read. The Messenger Send API documents
  `POST /{page-id}/messages` with an explicit `recipient`. Confirm which one your app
  version accepts before you rely on it.

## Known rough edges

- **Marketing API rate limits.** A brand-new app sits on the lowest tier. For one merchant
  running their own account that is enough; the tier rises with use.
- **`GET /me/accounts`** may be gated by a portfolio-level *Access Verification* check that
  is separate from App Review. If your Pages do not appear, that is where to look.
- **Instagram DMs are not supported.** `instagram_manage_messages` is a separate grant and
  is out of scope here. Instagram comments work.
- **The link to `api.meta.ai` from Algiers drops often** (4 calls out of 13 timed out on
  2026-11-01). `src/models/llm.js` retries twice, never after the first token.
