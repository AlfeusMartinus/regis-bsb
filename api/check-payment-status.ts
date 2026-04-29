/**
 * Vercel Serverless Function: /api/check-payment-status
 *
 * Digunakan oleh client untuk polling status pembayaran setelah redirect dari DOKU.
 * Menggunakan service role key agar bisa bypass RLS Supabase.
 *
 * Query params:
 *   email    - email peserta
 *   eventId  - ID event
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Allow CORS for same-origin and production domain
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email, eventId } = req.query;

    if (!email || !eventId) {
        return res.status(400).json({ error: 'Missing required query params: email, eventId' });
    }

    // VITE_SUPABASE_URL is available in Vercel Node.js runtime (all env vars are readable server-side)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await admin
        .from('registrations')
        .select('status')
        .eq('email', String(email).trim().toLowerCase())
        .eq('event_id', String(eventId).trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[check-payment-status] DB error:', error);
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ status: data?.status ?? null });
}
