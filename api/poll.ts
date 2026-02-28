import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        return res.status(200).end();
    }

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    // CORS Validation
    const origin = req.headers.origin || req.headers.referer || '';
    const allowedOrigin = process.env.FRONTEND_URL || 'https://echo-beta-wheat.vercel.app';
    if (origin && !origin.includes('localhost') && !origin.startsWith(allowedOrigin)) {
        return res.status(403).json({ error: 'Forbidden: Invalid Origin' });
    }

    // Input Validation (UUID format)
    const { execution_id } = req.query;
    if (!execution_id || typeof execution_id !== 'string') {
        return res.status(400).json({ error: 'Missing execution_id' });
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(execution_id)) {
        return res.status(400).json({ error: 'Invalid execution_id format' });
    }

    try {
        // Enforce pure server-side env vars only
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase credentials in serverless environment");
            return res.status(500).json({ error: 'Server misconfiguration: Missing DB credentials' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('execution_logs')
            .select('status, total_links, relevant_links, spreadsheet_url, error_message')
            .eq('id', execution_id)
            .maybeSingle();

        if (error) {
            console.error("Supabase Error:", error);
            return res.status(500).json({ error: 'Database query failed' });
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
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
