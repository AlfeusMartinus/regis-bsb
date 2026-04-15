/**
 * SUPABASE EDGE FUNCTION: create-payment (v2 — Session Quota System)
 *
 * Deploy this to: supabase/functions/create-payment/index.ts
 *
 * ENV VARS required (set in Supabase Dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   DOKU_CLIENT_ID, DOKU_SECRET_KEY
 *   DOKU_API_URL   (e.g. https://api-sandbox.doku.com for sandbox)
 *   FRONTEND_URL   (e.g. https://your-domain.com)
 */

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ticket price is now fetched from events.ticket_price (set by admin)
const PAYMENT_TIMEOUT = 60;      // minutes

// ─── DOKU Helpers (proven working signature implementation) ───────────────────

async function generateDigest(body: string): Promise<string> {
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest("SHA-256", encoder.encode(body));
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function generateSignature(
    clientId: string,
    requestId: string,
    requestTimestamp: string,
    requestTarget: string,
    digest: string,
    secretKey: string
): Promise<string> {
    const stringToSign =
        `Client-Id:${clientId}\n` +
        `Request-Id:${requestId}\n` +
        `Request-Timestamp:${requestTimestamp}\n` +
        `Request-Target:${requestTarget}\n` +
        `Digest:${digest}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secretKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(stringToSign));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function sanitizeString(str: string): string {
    if (!str) return "";
    return str.replace(/[^a-zA-Z0-9.\-/+,=_:'@% ]/g, "");
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const {
            // New session-based fields
            session,        // 'session1' | 'session2'
            instansi,
            kategori,
            // Standard fields
            name,
            email,
            phone,
            eventId,
            eventName,
            eventSlug,
        } = body;

        // ── Env vars ────────────────────────────────────────────────────────
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const dokuClientId = Deno.env.get('DOKU_CLIENT_ID') ?? '';
        const dokuSecretKey = Deno.env.get('DOKU_SECRET_KEY') ?? '';
        const dokuApiUrl = Deno.env.get('DOKU_API_URL') || 'https://api-sandbox.doku.com';
        const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';

        if (!dokuClientId || !dokuSecretKey) {
            throw new Error('DOKU configuration missing (DOKU_CLIENT_ID or DOKU_SECRET_KEY)');
        }

        const admin = createClient(supabaseUrl, supabaseKey);

        // ── Validate required fields ─────────────────────────────────────────
        if (!eventId || !session || !name || !email) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: eventId, session, name, email' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        if (!['session1', 'session2'].includes(session)) {
            return new Response(
                JSON.stringify({ error: 'Invalid session. Must be session1 or session2.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ── Fetch event (price + quota validation) ─────────────────────────
        const { data: event, error: eventError } = await admin
            .from('events')
            .select('ticket_price, session1_quota, session2_quota, session1_available, session2_available')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            return new Response(
                JSON.stringify({ error: 'Event tidak ditemukan.' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const ticketPrice = event.ticket_price || 35_000;

        // ── ATOMIC quota decrement ───────────────────────────────────────────
        console.log('[create-payment] Step 1: decrement_session_quota', { eventId, session });
        const { data: quotaResult, error: quotaError } = await admin.rpc(
            'decrement_session_quota',
            { p_event_id: eventId, p_session: session }
        );
        console.log('[create-payment] Step 1 result:', { quotaResult, quotaError });

        if (quotaError) {
            return new Response(
                JSON.stringify({ error: 'Gagal memeriksa kuota: ' + quotaError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        if (quotaResult === -1 || quotaResult === null) {
            return new Response(
                JSON.stringify({
                    error: 'Mohon maaf, kuota sesi ini baru saja penuh. Silakan pilih sesi lain.',
                    code: 'QUOTA_EXHAUSTED'
                }),
                { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ── Generate IDs & expiry ────────────────────────────────────────────
        const invoiceNumber = `INV-${Date.now()}`;
        const registrationId = invoiceNumber;
        const expiredAt = new Date(Date.now() + PAYMENT_TIMEOUT * 60 * 1000).toISOString();
        const sessionLabel = session === 'session1' ? 'Sesi 1' : 'Sesi 2';
        const redirectBaseUrl = eventSlug ? `${frontendUrl}/e/${eventSlug}` : frontendUrl;

        // ── Insert registration with PENDING status ──────────────────────────
        console.log('[create-payment] Step 2: inserting registration', { registrationId, session, kategori });
        const { data: regData, error: regError } = await admin
            .from('registrations')
            .insert({
                event_id: eventId,
                name,
                email,
                phone: phone || null,
                institution: instansi || null,
                kategori: kategori || null,
                session,
                registration_id: registrationId,
                amount: ticketPrice,
                status: 'pending',
                expired_at: expiredAt,
            })
            .select('id')
            .single();

        console.log('[create-payment] Step 2 result:', { regData, regError: regError ? JSON.stringify(regError) : null });

        if (regError) {
            // Restore quota on insert failure
            await admin.rpc('restore_session_quota', { p_event_id: eventId, p_session: session });
            return new Response(
                JSON.stringify({ error: 'Gagal menyimpan pendaftaran: ' + regError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ── Build DOKU payload ───────────────────────────────────────────────
        const description = sanitizeString(`Tiket ${sessionLabel} — ${eventName || 'Event'}`).substring(0, 50);
        const sanitizedName = sanitizeString(name).substring(0, 50);
        const timestamp = new Date().toISOString().split('.')[0] + 'Z';
        const requestId = crypto.randomUUID();
        const requestTarget = '/checkout/v1/payment';

        const dokuBody = {
            order: {
                amount: ticketPrice,
                invoice_number: invoiceNumber,
                currency: 'IDR',
                callback_url: `${redirectBaseUrl}?payment=success`,
                callback_url_cancel: `${redirectBaseUrl}?payment=cancel`,
                callback_url_result: `${redirectBaseUrl}?payment=success`,
                language: 'ID',
                auto_redirect: true,
                disable_retry_payment: true,
                line_items: [{
                    id: invoiceNumber,
                    name: description,
                    quantity: 1,
                    price: ticketPrice,
                    category: 'Event Ticket',
                }],
            },
            payment: {
                payment_due_date: PAYMENT_TIMEOUT,
                type: 'SALE',
                payment_method_types: ['QRIS', 'VIRTUAL_ACCOUNT_BCA', 'VIRTUAL_ACCOUNT_BANK_MANDIRI', 'VIRTUAL_ACCOUNT_BNI', 'EMONEY_SHOPEEPAY', 'EMONEY_OVO', 'EMONEY_DANA'],
            },
            customer: {
                id: email,
                name: sanitizedName,
                email: email,
                phone: phone || '6281234567890',
            },
        };

        const bodyString = JSON.stringify(dokuBody);
        const digest = await generateDigest(bodyString);
        const signature = await generateSignature(
            dokuClientId,
            requestId,
            timestamp,
            requestTarget,
            digest,
            dokuSecretKey
        );

        console.log('[create-payment] Step 3: calling DOKU', { invoiceNumber, requestId });

        // ── Call DOKU API ────────────────────────────────────────────────────
        const dokuRes = await fetch(`${dokuApiUrl}${requestTarget}`, {
            method: 'POST',
            headers: {
                'Client-Id': dokuClientId,
                'Request-Id': requestId,
                'Request-Timestamp': timestamp,
                'Signature': `HMACSHA256=${signature}`,
                'Content-Type': 'application/json',
            },
            body: bodyString,
        });

        const dokuData = await dokuRes.json();
        console.log('[create-payment] DOKU response:', dokuRes.status, JSON.stringify(dokuData));

        if (!dokuRes.ok) {
            // Restore quota since DOKU failed
            await admin.rpc('restore_session_quota', { p_event_id: eventId, p_session: session });
            await admin.from('registrations').update({ status: 'failed' }).eq('registration_id', registrationId);
            throw new Error(`DOKU API Error (${dokuRes.status}): ${JSON.stringify(dokuData)}`);
        }

        const actualResponse = dokuData.response || dokuData;
        const paymentUrl = actualResponse.payment?.url;

        if (!paymentUrl) {
            await admin.rpc('restore_session_quota', { p_event_id: eventId, p_session: session });
            throw new Error('DOKU did not return a payment URL.');
        }

        // ── Store payment link in registration record ─────────────────────
        await admin
            .from('registrations')
            .update({ payment_link: paymentUrl, payment_link_id: invoiceNumber })
            .eq('registration_id', registrationId);

        return new Response(
            JSON.stringify({ link: paymentUrl, registrationId, expiredAt, sessionLabel, ticketPrice }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err: any) {
        console.error('[create-payment] Unexpected error:', err.message);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
