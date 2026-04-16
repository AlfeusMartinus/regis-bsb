import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateDigest(body: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function generateSignature(
    clientId: string,
    requestId: string,
    requestTimestamp: string,
    requestTarget: string,
    digest: string,
    secretKey: string
) {
    const stringToSign =
        `Client-Id:${clientId}\n` +
        `Request-Id:${requestId}\n` +
        `Request-Timestamp:${requestTimestamp}\n` +
        `Request-Target:${requestTarget}\n` +
        `Digest:${digest}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const key = await crypto.subtle.importKey(
        "raw",
        keyData,
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

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const {
            amount,
            name,
            email,
            phone,
            domicile,
            prayer,
            eventId,
            eventName,
            eventSlug,
            gender,
            currentStatus,
            university,
            major,
            institution,
            role,
            uses_external_peripherals,
            mouse_brand,
            work_device_factors,
            work_device_factors_others,
            info_source,
            info_source_others,
            share_data_sponsor,
            existingRegistrationId,  // if set, update instead of insert
        } = await req.json();

        // Initialize Supabase Client (Service Role for Bypass RLS)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: event, error: eventError } = await supabaseClient
            .from('events')
            .select('minimum_donation')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            return new Response(JSON.stringify({ error: "Event not found" }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const minAmount = event.minimum_donation || 1000;

        if (!amount || amount < minAmount) {
            return new Response(JSON.stringify({ error: "Minimum amount is Rp 1.000" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── IDEMPOTENCY CHECK (skip when re-generating for existing expired reg) ──
        if (!existingRegistrationId) {
            const expiryThreshold = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

            const { data: existingReg } = await supabaseClient
                .from('registrations')
                .select('id, payment_link, created_at')
                .eq('email', email)
                .eq('event_id', eventId)
                .eq('status', 'pending')
                .gt('created_at', expiryThreshold)   // not yet expired
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existingReg?.payment_link) {
                console.log(`Idempotency hit: reusing existing pending registration ${existingReg.id} for ${email}`);
                return new Response(
                    JSON.stringify({ link: existingReg.payment_link, transaction: existingReg, reused: true }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                );
            }
        }
        // ── END IDEMPOTENCY CHECK ──────────────────────────────────────────────

        // DOKU Configuration
        const dokuClientId = Deno.env.get('DOKU_CLIENT_ID');
        const dokuSecretKey = Deno.env.get('DOKU_SECRET_KEY');
        const dokuApiUrl = Deno.env.get('DOKU_API_URL') || "https://api-sandbox.doku.com";

        if (!dokuClientId || !dokuSecretKey) {
            throw new Error("DOKU configuration missing (DOKU_CLIENT_ID or DOKU_SECRET_KEY)");
        }

        const timestamp = new Date().toISOString().split('.')[0] + "Z";
        const requestId = crypto.randomUUID();
        const invoiceNumber = `INV-${Date.now()}`;
        const description = eventName ? `DONASI - ${eventName}` : "DONASI BSB WEBINAR";
        const sanitizedDescription = sanitizeString(description).substring(0, 50);
        const sanitizedCustomerName = sanitizeString(name).substring(0, 50);
        const sanitizedEventId = sanitizeString(eventId || "DONASI").substring(0, 50);

        // Determine redirect URL
        const frontendUrl = Deno.env.get('FRONTEND_URL') || "http://localhost:5173";
        let redirectBaseUrl = frontendUrl;
        if (eventSlug) {
            redirectBaseUrl = `${frontendUrl}/e/${eventSlug}`;
        }

        const dokuBody = {
            order: {
                amount: amount,
                invoice_number: invoiceNumber,
                currency: "IDR",
                callback_url: `${redirectBaseUrl}?payment=success`,
                callback_url_cancel: `${redirectBaseUrl}?payment=cancel`,
                callback_url_result: `${redirectBaseUrl}?payment=success`,
                language: "ID",
                auto_redirect: true,
                disable_retry_payment: true,
                line_items: [
                    {
                        id: sanitizedEventId,
                        name: sanitizedDescription,
                        quantity: 1,
                        price: amount,
                        category: "Charity"
                    }
                ]
            },
            payment: {
                payment_due_date: 360,
                type: "SALE",
                payment_method_types: [
                    "VIRTUAL_ACCOUNT_BCA",
                    "VIRTUAL_ACCOUNT_BANK_MANDIRI",
                    "VIRTUAL_ACCOUNT_BRI",
                    "VIRTUAL_ACCOUNT_BNI",
                    "VIRTUAL_ACCOUNT_BANK_PERMATA",
                    "QRIS",
                    "EMONEY_SHOPEEPAY",
                    "EMONEY_OVO",
                    "EMONEY_DANA"
                ]
            },
            customer: {
                id: email,
                name: sanitizedCustomerName,
                email: email,
                phone: phone || "6281234567890"
            }
        };

        const bodyString = JSON.stringify(dokuBody);
        const digest = await generateDigest(bodyString);
        const signature = await generateSignature(
            dokuClientId,
            requestId,
            timestamp,
            "/checkout/v1/payment",
            digest,
            dokuSecretKey
        );

        console.log("Calling DOKU API...", {
            url: `${dokuApiUrl}/checkout/v1/payment`,
            invoiceNumber,
            requestId,
            timestamp
        });

        const dokuRes = await fetch(`${dokuApiUrl}/checkout/v1/payment`, {
            method: "POST",
            headers: {
                "Client-Id": dokuClientId,
                "Request-Id": requestId,
                "Request-Timestamp": timestamp,
                "Signature": `HMACSHA256=${signature}`,
                "Content-Type": "application/json"
            },
            body: bodyString
        });

        const dokuData = await dokuRes.json();
        console.log("DOKU Response Status:", dokuRes.status);
        console.log("DOKU Response Data:", JSON.stringify(dokuData, null, 2));

        if (!dokuRes.ok) {
            console.error("DOKU Error:", dokuData);
            throw new Error(`DOKU API Error (${dokuRes.status}): ${JSON.stringify(dokuData.error || dokuData.message || dokuData)}`);
        }

        // Support both wrapped 'response' and direct structure
        const actualResponse = dokuData.response || dokuData;

        if (!actualResponse.payment || !actualResponse.payment.url) {
            console.error("DOKU Response missing payment.url:", dokuData);
            throw new Error("DOKU API succeeded but did not return a payment URL.");
        }

        const paymentUrl = actualResponse.payment.url;

        // ── Save to Database ───────────────────────────────────────────────────
        let data: any;
        let error: any;

        if (existingRegistrationId) {
            // Update existing expired registration with new payment link + reset to pending
            console.log(`Updating existing registration ${existingRegistrationId} with new payment link.`);
            const result = await supabaseClient
                .from('registrations')
                .update({
                    status: 'pending',
                    payment_link: paymentUrl,
                    payment_link_id: invoiceNumber,
                    created_at: new Date().toISOString(), // reset expiry timer
                })
                .eq('id', existingRegistrationId)
                .select()
                .single();
            data = result.data;
            error = result.error;
        } else {
            // Insert new registration
            const result = await supabaseClient
                .from('registrations')
                .insert({
                    name,
                    email,
                    phone,
                    domicile,
                    amount,
                    status: 'pending',
                    payment_link_id: invoiceNumber,
                    payment_link: paymentUrl,
                    prayer: prayer || null,
                    event_id: eventId || null,
                    gender: gender || null,
                    current_status: currentStatus || null,
                    university: university || null,
                    major: major || null,
                    institution: institution || null,
                    role: role || null,
                    uses_external_peripherals: uses_external_peripherals,
                    mouse_brand: mouse_brand || null,
                    work_device_factors: work_device_factors || [],
                    work_device_factors_others: work_device_factors_others || null,
                    info_source: info_source || null,
                    info_source_others: info_source_others || null,
                    share_data_sponsor: share_data_sponsor || false
                })
                .select()
                .single();
            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error("DB Error:", error);
            throw error;
        }

        return new Response(JSON.stringify({ link: paymentUrl, transaction: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Error in create-payment:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});