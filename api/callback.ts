import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || "",
    process.env.VITE_SUPABASE_ANON_KEY || ""
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { execution_id, total_links, relevant_links, spreadsheet_url, status } = req.body || {};

    if (!execution_id) return res.status(400).json({ error: 'Missing execution_id' });

    // Directly update the DB instead of using memory Maps
    await supabase.from("execution_logs").update({
        status: status === "success" ? "completed" : "failed",
        total_links: total_links || 0,
        relevant_links: relevant_links || 0,
        spreadsheet_url: spreadsheet_url || null,
        completed_at: new Date().toISOString()
    }).eq("id", execution_id);

    return res.status(200).json({ ok: true });
}
