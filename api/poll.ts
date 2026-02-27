import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase credentials in serverless environment");
            return res.status(500).json({ error: 'Server misconfiguration: Missing DB credentials' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { execution_id } = req.query;
        if (!execution_id) return res.status(400).json({ error: 'Missing execution_id' });

        // Query Supabase directly to check if the status updated to completed or failed
        const { data, error } = await supabase
            .from('execution_logs')
            .select('status, total_links, relevant_links, spreadsheet_url, error_message')
            .eq('id', execution_id)
            .maybeSingle();

        if (error) {
            console.error("Supabase Error:", error);
            return res.status(500).json({ error: 'Database query failed', details: error });
        }

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
    } catch (err: any) {
        console.error("Poll Error:", err);
        return res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
}
