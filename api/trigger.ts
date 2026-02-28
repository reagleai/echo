import type { VercelRequest, VercelResponse } from '@vercel/node'

const rateLimitMap = new Map<string, { count: number, lastReset: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 5;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-internal-key');
        return res.status(200).end();
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // CORS Validation
    const origin = req.headers.origin || req.headers.referer || '';
    const allowedOrigin = process.env.FRONTEND_URL || 'https://echo-beta-wheat.vercel.app';
    if (origin && !origin.includes('localhost') && !origin.startsWith(allowedOrigin)) {
        return res.status(403).json({ error: 'Forbidden: Invalid Origin' });
    }

    // Rate Limiting
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let rateData = rateLimitMap.get(ip);
    if (!rateData || now - rateData.lastReset > RATE_LIMIT_WINDOW_MS) {
        rateData = { count: 0, lastReset: now };
    }
    rateData.count++;
    rateLimitMap.set(ip, rateData);
    if (rateData.count > MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({ error: 'Too Many Requests' });
    }

    // Input Validation
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { keywords, limit, min_connections, session_id, callback_url } = body || {};

    if (!keywords || typeof keywords !== 'string' || keywords.length > 500) {
        return res.status(400).json({ error: 'Invalid or missing keywords' });
    }
    if (typeof limit !== 'number' || limit < 1 || limit > 50) {
        return res.status(400).json({ error: 'Invalid limit' });
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
        return res.status(500).json({ error: 'Webhook URL not configured' });
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords, limit, min_connections, session_id, callback_url }),
        });
        const data = await response.text();

        try {
            res.status(response.status).json(JSON.parse(data));
        } catch (e) {
            res.status(response.status).json({ success: true, message: data });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to reach backend trigger' });
    }
}
