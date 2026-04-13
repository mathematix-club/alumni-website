/**
 * Alumni Hub - Discord Notification Worker
 * Deploy via: npx wrangler deploy  (from the cloudflare/ directory)
 *
 * Required environment secrets (set via wrangler secret put):
 *   DISCORD_WEBHOOK_URL  — the Discord channel webhook URL
 *   NOTIFY_SECRET        — shared token validated against frontend requests
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
        }

        const authHeader = request.headers.get('Authorization') || '';
        if (authHeader !== `Bearer ${env.NOTIFY_SECRET}`) {
            return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return new Response('Invalid JSON', { status: 400, headers: CORS_HEADERS });
        }

        const { type, data } = body;

        let embed;
        switch (type) {
            case 'new_join':      embed = buildJoinEmbed(data);   break;
            case 'update_request': embed = buildUpdateEmbed(data); break;
            case 'dm_message':    embed = buildDMEmbed(data);     break;
            default:
                return new Response('Unknown notification type', { status: 400, headers: CORS_HEADERS });
        }

        const discordRes = await fetch(env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] }),
        });

        if (!discordRes.ok) {
            const errText = await discordRes.text();
            console.error('Discord error:', errText);
            return new Response('Discord webhook failed', { status: 502, headers: CORS_HEADERS });
        }

        return new Response('OK', { status: 200, headers: CORS_HEADERS });
    },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function val(v, fallback = '—') {
    return (v && String(v).trim()) ? String(v).trim() : fallback;
}

function field(name, value, inline = false) {
    return { name, value: val(value), inline };
}

// ─── Join Embed ─────────────────────────────────────────────────────────────

function buildJoinEmbed(data) {
    const fields = [
        field('Name',               data.name,               true),
        field('Batch',              data.batch,              true),
        field('Position',           data.position,           true),
        field('Institute',          data.institute,          true),
        field('Email',              data.email,              true),
        field('Website',            data.website,            true),
        field('Research Interests', data.researchInterests,  false),
        field('Additional Info',    data.additionalInfo,     false),
    ].filter(f => f.value !== '—'); // omit truly empty fields

    return {
        title: '🎓 New Join Request',
        color: 0x22c55e,
        fields,
        thumbnail: data.photo ? { url: data.photo } : undefined,
        footer: { text: 'Review in Admin Dashboard → Update Requests' },
        timestamp: new Date().toISOString(),
    };
}

// ─── Update Embed (with diff) ────────────────────────────────────────────────

const DIFF_FIELDS = {
    position:          'Position',
    institute:         'Institute',
    email:             'Email',
    researchInterests: 'Research Interests',
    website:           'Website',
    additionalInfo:    'Notes',
    photo:             'Photo',
};

function buildUpdateEmbed(data) {
    const req      = data.request  || data;   // new submitted values
    const original = data.original || null;   // current DB values

    const changedFields  = [];
    const unchangedNames = [];

    for (const [key, label] of Object.entries(DIFF_FIELDS)) {
        const oldVal = val(original?.[key]);
        const newVal = val(req[key]);

        if (newVal === '—') {
            // Field not submitted — skip entirely
            continue;
        }

        if (!original || oldVal === newVal) {
            unchangedNames.push(label);
        } else {
            // Show as diff: strikethrough old → bold new
            changedFields.push({
                name:  label,
                value: `~~${oldVal}~~ → **${newVal}**`,
                inline: false,
            });
        }
    }

    const fields = [
        field('Name',  req.name,  true),
        field('Batch', req.batch, true),
    ];

    if (changedFields.length > 0) {
        fields.push({ name: '\u200b', value: '**Changed Fields**', inline: false });
        fields.push(...changedFields);
    } else {
        fields.push({ name: 'Changes', value: 'No field differences detected.', inline: false });
    }

    if (!original) {
        fields.push({ name: '⚠️ Note', value: 'Original record not found — may have been deleted.', inline: false });
    } else if (unchangedNames.length > 0) {
        fields.push({ name: 'Unchanged', value: unchangedNames.join(', '), inline: false });
    }

    return {
        title: '✏️ Profile Update Request',
        color: 0xf59e0b,
        fields,
        thumbnail: req.photo ? { url: req.photo } : undefined,
        footer: { text: 'Review in Admin Dashboard → Update Requests' },
        timestamp: new Date().toISOString(),
    };
}

// ─── DM Embed ────────────────────────────────────────────────────────────────

function buildDMEmbed(data) {
    return {
        title: '💬 New Message from Alumni',
        color: 0x6366f1,
        description: val(data.message, '*(no message body)*'),
        fields: [
            field('From',  data.name,  true),
            field('Batch', data.batch, true),
        ],
        footer: { text: 'Review in Admin Dashboard → Support Messages' },
        timestamp: new Date().toISOString(),
    };
}
