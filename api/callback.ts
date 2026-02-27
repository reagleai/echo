import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // Fallback for Vercel to ensure Supabase variables exist before creating client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase credentials in serverless environment");
            return res.status(500).json({ error: 'Server misconfiguration: Missing DB credentials' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { execution_id, total_links, relevant_links, spreadsheet_url, status } = body || {};

        if (!execution_id) {
            return res.status(400).json({ error: 'Missing execution_id in payload' });
        }

        // Directly update the DB
        const { error: dbError } = await supabase.from("execution_logs").update({
            status: status === "success" ? "completed" : "failed",
            total_links: total_links || 0,
            relevant_links: relevant_links || 0,
            spreadsheet_url: spreadsheet_url || null,
            completed_at: new Date().toISOString()
        }).eq("id", execution_id);

        if (dbError) {
            console.error("Supabase Error:", dbError);
            return res.status(500).json({ error: 'Database update failed', details: dbError });
        }

        return res.status(200).json({ ok: true });
    } catch (err: any) {
        console.error("Callback Error:", err);
        return res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
}
