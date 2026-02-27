import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory store (acceptable for Vercel warm instances, no DB needed)
export const executionResults = new Map<string, any>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    // Forward the n8n result back into the temporary Map.
    const { execution_id, total_links, relevant_links, spreadsheet_url, status } = req.body || {};

    if (!execution_id) return res.status(400).json({ error: 'Missing execution_id' });

    executionResults.set(execution_id, {
        execution_id,
        total_links,
        relevant_links,
        spreadsheet_url,
        status,
        received_at: Date.now()
    });

    return res.status(200).json({ ok: true });
}
