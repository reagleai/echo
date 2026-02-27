import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).end()

    const webhookUrl = process.env.N8N_WEBHOOK_URL
    if (!webhookUrl) {
        return res.status(500).json({ error: 'Webhook URL not configured on server' })
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        })
        const data = await response.text()

        // Try to safely parse the response as JSON to return it structured, otherwise return text
        try {
            const json = JSON.parse(data);
            res.status(response.status).json(json);
        } catch (e) {
            res.status(response.status).send(data);
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to reach n8n webhook' })
    }
}
