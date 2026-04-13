/**
 * js/notify.js
 * Sends fire-and-forget Discord notifications via the Cloudflare Worker.
 *
 * SETUP REQUIRED:
 *  1. Deploy cloudflare/worker.js  (see cloudflare/README.md)
 *  2. Replace WORKER_URL below with your deployed worker URL.
 *  3. Replace NOTIFY_TOKEN below with the secret you used when running:
 *       npx wrangler secret put NOTIFY_SECRET
 */

const WORKER_URL = 'https://alumni-notifier.sandipansamanta2004.workers.dev';
const NOTIFY_TOKEN = 'niser-sms-alumni';

/**
 * Sends a notification to Discord via the Cloudflare Worker.
 * Fails silently — a notification error never blocks form submission.
 *
 * @param {'new_join'|'update_request'|'dm_message'} type
 * @param {object} data  — the payload to embed
 */
export async function notifyDiscord(type, data) {
    if (WORKER_URL.includes('YOUR_SUBDOMAIN')) return;
    try {
        await fetch(WORKER_URL, {
            method: 'POST',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NOTIFY_TOKEN}`,
            },
            body: JSON.stringify({ type, data }),
        });
    } catch (err) {
        console.warn('[notify] Discord notification failed:', err.message);
    }
}
