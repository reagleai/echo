import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || "",
    process.env.VITE_SUPABASE_ANON_KEY || ""
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).end();

    const { execution_id } = req.query;
    if (!execution_id) return res.status(400).json({ error: 'Missing execution_id' });

    // Query Supabase directly to check if the status updated to completed or failed
    const { data, error } = await supabase
        .from('execution_logs')
        .select('status, total_links, relevant_links, spreadsheet_url, error_message')
        .eq('id', execution_id)
        .maybeSingle();

    if (data && (data.status === 'completed' || data.status === 'failed')) {
        return res.status(200).json({
            ready: true,
            status: data.status === 'completed' ? 'success' : 'failed',
            total_links: data.total_links,
            relevant_links: data.relevant_links,
            spreadsheet_url: data.spreadsheet_url,
            error: data.error_message
        });
    }

    return res.status(200).json({ ready: false });
}
