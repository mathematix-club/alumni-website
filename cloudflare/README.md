# Discord Notification Worker — Setup Guide

This Cloudflare Worker acts as a secure bridge between the Alumni Hub frontend and your Discord server.

---

## How it works

```
User submits form  →  Firestore (data saved)
                   →  Cloudflare Worker (notification)
                               ↓
                        Discord Channel
```

The Worker URL is public but protected by a shared secret token. The Discord webhook URL **never** touches the frontend.

---

## Step 1 — Create a Discord Webhook

1. Open your Discord server.
2. Go to the channel where you want notifications.
3. Channel Settings → Integrations → Webhooks → **New Webhook**.
4. Copy the **Webhook URL** — keep it safe.

---

## Step 2 — Create a Cloudflare Account

Sign up free at [cloudflare.com](https://cloudflare.com). The Workers free tier allows **100,000 requests/day**, far more than needed.

---

## Step 3 — Install Wrangler CLI

From the project root directory:

```bash
npm install -g wrangler
wrangler login
```

This opens a browser to authenticate your Cloudflare account.

---

## Step 4 — Deploy the Worker

```bash
cd cloudflare
npx wrangler deploy
```

After deploy, the CLI will print a URL like:
```
https://alumni-notifier.YOUR_SUBDOMAIN.workers.dev
```
Copy this URL.

---

## Step 5 — Set Secrets

Set the two required environment secrets (they are stored encrypted in Cloudflare, never committed to Git):

```bash
npx wrangler secret put DISCORD_WEBHOOK_URL
# Paste your Discord webhook URL when prompted

npx wrangler secret put NOTIFY_SECRET
# Type a random secret string, e.g.: alumni-hub-notify-2024
```

---

## Step 6 — Configure the Frontend

Open `js/notify.js` and fill in the two values:

```javascript
const WORKER_URL   = 'https://alumni-notifier.YOUR_SUBDOMAIN.workers.dev';
const NOTIFY_TOKEN = 'alumni-hub-notify-2024';  // same string used in Step 5
```

---

## Testing

Push your site and submit a test join request. You should see a rich embed arrive in your Discord channel within a second or two.

To test the Worker directly:
```bash
curl -X POST https://alumni-notifier.sandipansamanta2004.workers.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer niser-sms-alumni" \
  -d '{"type":"dm_message","data":{"name":"Test","batch":"Int. MSc. 2020","message":"Hello!"}}'
```

---

## Notification Types

| Trigger | Type string | Discord colour |
|---|---|---|
| New Join form submitted | `new_join` | 🟢 Green |
| Update Request submitted | `update_request` | 🟡 Amber |
| DM to Admin sent | `dm_message` | 🟣 Indigo |
