import type { VercelRequest, VercelResponse } from '@vercel/node';
import { executionResults } from './callback';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).end();

    const { execution_id } = req.query;
    if (!execution_id) return res.status(400).json({ error: 'Missing execution_id' });

    const result = executionResults.get(execution_id as string);

    if (result) {
        executionResults.delete(execution_id as string); // clean up immediately upon retrieval
        return res.status(200).json({ ready: true, ...result });
    }

    return res.status(200).json({ ready: false });
}
