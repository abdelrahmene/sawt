# Driving a real Facebook Page and ad account

**You do not need any of this to evaluate the project.** `npm start` replays a full
session with no account at all, and `npm run live` runs Meta's models for real with a
single API key. This page is for actually using Sawt on a shop.

It takes about 30 minutes. It is fiddly, and pretending otherwise would be dishonest.

## What you need

- A Facebook account in good standing, and a Page you administer
- An Instagram professional account linked to that Page, if you want Instagram
- An ad account (for campaigns)

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

```
MODEL_API_KEY=...            # or BASETEN_API_KEY for the open-weights path
META_PAGE_ID=...
META_PAGE_TOKEN=...
META_AD_ACCOUNT_ID=...
```

## 4. Run it

```bash
npm run live -- --real
```

Campaigns are created **PAUSED**. An agent that can start spending money without a human
saying so is not a feature, and nothing here will change that for you.

## Known rough edges

- **Marketing API rate limits.** A brand-new app sits on the lowest tier. For one merchant
  running their own account that is enough; the tier rises with use.
- **`GET /me/accounts`** may be gated by a portfolio-level *Access Verification* check that
  is separate from App Review. If your Pages do not appear, that is where to look.
- **Instagram DMs are not supported.** `instagram_manage_messages` is a separate grant and
  is out of scope here. Instagram comments work.
