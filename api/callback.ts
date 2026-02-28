import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Internal API Key Validation (n8n must send this header)
    const expectedKey = process.env.INTERNAL_API_KEY;
    const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
    if (expectedKey && authHeader !== expectedKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    try {
        // Strip VITE_ to enforce pure server-side env vars only
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase credentials in serverless environment");
            return res.status(500).json({ error: 'Server misconfiguration: Missing DB credentials' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { execution_id, total_links, relevant_links, spreadsheet_url, status, error } = body || {};

        if (!execution_id || typeof execution_id !== 'string' || execution_id.length > 50) {
            return res.status(400).json({ error: 'Missing or malformed execution_id in payload' });
        }

        let sanitizedUrl = null;
        if (spreadsheet_url) {
            try {
                const parsed = new URL(spreadsheet_url);
                if (!parsed.hostname.includes('google.com')) {
                    return res.status(400).json({ error: 'Invalid spreadsheet domain - must be google.com' });
                }
                sanitizedUrl = parsed.toString();
            } catch {
                return res.status(400).json({ error: 'Malformed spreadsheet URL' });
            }
        }

        const { error: dbError } = await supabase.from("execution_logs").update({
            status: status === "success" ? "completed" : "failed",
            total_links: typeof total_links === 'number' ? total_links : 0,
            relevant_links: typeof relevant_links === 'number' ? relevant_links : 0,
            spreadsheet_url: sanitizedUrl,
            error_message: (error || "").substring(0, 500),
            completed_at: new Date().toISOString()
        }).eq("id", execution_id);

        if (dbError) {
            console.error("Supabase Error:", dbError);
            return res.status(500).json({ error: 'Database update failed' });
        }

        return res.status(200).json({ ok: true });
    } catch (err: any) {
        console.error("Callback Error:", err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
