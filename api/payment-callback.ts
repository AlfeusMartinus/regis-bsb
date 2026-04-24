/**
 * Vercel Serverless Function: /api/payment-callback
 *
 * DOKU Payment Gateway Webhook Handler
 * Handles SUCCESS, FAILED, and EXPIRED payment notifications.
 *
 * Configure in DOKU Dashboard → Webhook URL:
 *   https://your-domain.com/api/payment-callback
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import crypto from 'crypto';

// ─── Supabase admin client ────────────────────────────────────────────────────
const getSupabaseAdmin = () =>
    createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

// ─── Email helpers ────────────────────────────────────────────────────────────
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/Bi6smJ5bsKJ7O21S03rbe8?mode=gi_t';

async function sendTicketEmail(params: {
    email: string;
    name: string;
    eventName: string;
    eventId: string;
    registrationId: string;
    sessionLabel: string;
    dateTime: string | null;
    location: string | null;
    locationDetail: string | null;
    locationLink: string | null;
    amount: number;
}) {
    const transporter = nodemailer.createTransport({
        host:   'mail.spacemail.com',
        port:   465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER!,
            pass: process.env.SMTP_PASS!,
        },
    });

    const eventDateObj = params.dateTime ? new Date(params.dateTime) : new Date();
    const endDateObj   = new Date(eventDateObj.getTime() + 2 * 60 * 60 * 1000);
    const dateStr = eventDateObj.toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta'
    });
    const timeStr = eventDateObj.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
    }) + ' WIB';

    // ICS calendar attachment
    const formatForIcs = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const icsContent = [
        'BEGIN:VCALENDAR', 'VERSION:2.0',
        'PRODID:-//BSB//Registration//ID', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `DTSTART:${formatForIcs(eventDateObj)}`,
        `DTEND:${formatForIcs(endDateObj)}`,
        `DTSTAMP:${formatForIcs(new Date())}`,
        `UID:${params.registrationId}@bsb.event`,
        `SUMMARY:${params.sessionLabel} — ${params.eventName}`,
        `LOCATION:${params.location || ''}`,
        `DESCRIPTION:ID Tiket: ${params.registrationId}\\\\nSesi: ${params.sessionLabel}\\\\nTanggal: ${dateStr}\\\\nWaktu: ${timeStr}`,
        'STATUS:CONFIRMED', 'SEQUENCE:0',
        'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');

    // QR code payload: registrationId for scanner lookup
    const qrPayload   = `checkin:${params.eventId}:${encodeURIComponent(params.email.trim().toLowerCase())}`;
    const qrBuffer    = await QRCode.toBuffer(qrPayload, {
        errorCorrectionLevel: 'H',
        margin: 1,
        color: { dark: '#1a2c22', light: '#ffffff' },
    });
    const qrCid = `qrcode-${Date.now()}@bsb.ticket`;

    const amountFormatted = `Rp ${params.amount.toLocaleString('id-ID')}`;

    await transporter.sendMail({
        from:    `"Registrasi BSB" <${process.env.SMTP_USER}>`,
        to:      params.email,
        subject: `✅ Tiket Anda — ${params.sessionLabel} | ${params.eventName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #1a2c22; margin: 0;">Pembayaran Berhasil!</h1>
                    <p style="color: #6b7280; margin-top: 8px;">E-tiket Anda telah disiapkan</p>
                </div>

                <p style="color: #4b5563; line-height: 1.6;">
                    Halo <strong>${params.name}</strong>,<br/>
                    Pembayaran tiket <strong>${params.sessionLabel}</strong> untuk acara <strong>${params.eventName}</strong> telah berhasil dikonfirmasi.
                </p>

                <!-- Ticket Info -->
                <div style="background-color: #f8fafc; border-left: 4px solid #13ec6d; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0 0 8px 0; color: #1f2937;"><strong>🎫 ID Tiket:</strong> ${params.registrationId}</p>
                    <p style="margin: 0 0 8px 0; color: #1f2937;"><strong>🪑 Sesi:</strong> ${params.sessionLabel}</p>
                    <p style="margin: 0 0 8px 0; color: #1f2937;"><strong>💰 Total Dibayar:</strong> ${amountFormatted}</p>
                    <p style="margin: 0 0 8px 0; color: #1f2937;"><strong>📅 Tanggal:</strong> ${dateStr}</p>
                    <p style="margin: 0 0 8px 0; color: #1f2937;"><strong>⏰ Waktu:</strong> ${timeStr}</p>
                    <p style="margin: 0; color: #1f2937;"><strong>📍 Lokasi:</strong> ${params.location || '-'}</p>
                    ${params.locationDetail ? `<p style="margin: 4px 0 0; color: #475569; font-size: 13px;"><em>${params.locationDetail}</em></p>` : ''}
                    ${params.locationLink ? `<p style="margin: 8px 0 0;"><a href="${params.locationLink}" style="color: #2563eb; font-size: 13px;">📌 Buka di Google Maps</a></p>` : ''}
                </div>

                <!-- QR Code -->
                <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                    <p style="margin: 0 0 16px; font-size: 15px; font-weight: bold; color: #1f2937;">Tunjukkan QR Code ini saat check-in</p>
                    <div style="display: inline-block; padding: 10px; background: white; border-radius: 8px; border: 2px solid #e5e7eb;">
                        <img src="cid:${qrCid}" alt="QR Code Tiket" width="240" height="240" style="display: block;" />
                    </div>
                    <p style="margin: 12px 0 0; font-size: 12px; color: #9ca3af;">${params.registrationId}</p>
                </div>

                <!-- WhatsApp Group -->
                <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 12px; color: #065f46; font-weight: bold;">📲 Gabung Grup WhatsApp Peserta</p>
                    <a href="${WHATSAPP_GROUP_URL}" style="display: inline-block; padding: 10px 20px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Join Grup WhatsApp
                    </a>
                </div>

                <div style="border-top: 1px solid #eaeaea; padding-top: 16px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">Email ini dikirim otomatis. Harap tidak membalas.</p>
                </div>
            </div>
        `,
        attachments: [
            { filename: 'tiket-qrcode.png', content: qrBuffer, cid: qrCid, contentType: 'image/png', contentDisposition: 'inline' as const },
            { filename: 'tambah-ke-kalender.ics', content: Buffer.from(icsContent), contentType: 'text/calendar' },
        ],
    });
}

// ─── Verify DOKU webhook signature ───────────────────────────────────────────
function verifyDokuSignature(req: VercelRequest): boolean {
    const secret    = process.env.DOKU_SECRET_KEY;
    const signature = req.headers['doku-signature'] as string;
    if (!secret || !signature) return false;

    const body      = JSON.stringify(req.body);
    const computed  = crypto.createHmac('sha256', secret).update(body).digest('base64');
    return computed === signature;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Verify DOKU signature (skip in development)
    if (process.env.NODE_ENV === 'production' && !verifyDokuSignature(req)) {
        console.error('Invalid DOKU signature');
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const body = req.body;
    console.log('DOKU Callback received:', JSON.stringify(body, null, 2));

    // Extract key fields from DOKU payload
    // DOKU v1 payload shape (adjust if using v2/Jokul)
    const orderId       = body?.order?.invoice_number || body?.INVOICE || body?.order_id;
    const dokuStatus    = (body?.transaction?.status || body?.STATUS || '').toUpperCase();
    const amount        = body?.order?.amount || body?.AMOUNT;

    if (!orderId) {
        return res.status(400).json({ message: 'Missing order ID in callback' });
    }

    const admin = getSupabaseAdmin();

    // Fetch registration by registration_id
    const { data: registration, error: fetchErr } = await admin
        .from('registrations')
        .select('id, event_id, session, email, name, status, expired_at')
        .eq('registration_id', orderId)
        .maybeSingle();

    if (fetchErr || !registration) {
        console.error('Registration not found for order:', orderId, fetchErr);
        return res.status(200).json({ message: 'Registration not found — acknowledged.' });
    }

    // Already processed idempotency guard
    if (registration.status === 'paid' || registration.status === 'success') {
        return res.status(200).json({ message: 'Already processed.' });
    }

    const isPaid   = ['SUCCESS', 'SETTLEMENT', 'CAPTURE', 'PAID'].includes(dokuStatus);
    const isFailed = ['FAILED', 'EXPIRED', 'CANCEL', 'DENY', 'CHALLENGE'].includes(dokuStatus);

    // ── SUCCESS ───────────────────────────────────────────────────────────────
    if (isPaid) {
        // 1. Mark registration as paid
        const { error: updateErr } = await admin
            .from('registrations')
            .update({ status: 'paid', expired_at: null })
            .eq('id', registration.id);

        if (updateErr) {
            console.error('Failed to update status to paid:', updateErr);
            return res.status(500).json({ message: 'DB update failed' });
        }

        // 2. Fetch event details for email
        const { data: event } = await admin
            .from('events')
            .select('id, title, date_time, location, location_detail, location_link')
            .eq('id', registration.event_id)
            .maybeSingle();

        // 3. Send e-ticket email with QR Code
        if (process.env.SMTP_USER && process.env.SMTP_PASS && event) {
            try {
                await sendTicketEmail({
                    email:          registration.email,
                    name:           registration.name,
                    eventName:      event.title,
                    eventId:        event.id,
                    registrationId: orderId,
                    sessionLabel:   registration.session === 'session1' ? 'Sesi 1' : 'Sesi 2',
                    dateTime:       event.date_time,
                    location:       event.location,
                    locationDetail: event.location_detail,
                    locationLink:   event.location_link,
                    amount:         Number(amount) || 35000,
                });
                console.log('E-ticket email sent to', registration.email);
            } catch (emailErr) {
                // Non-fatal: log but don't fail the webhook response
                console.error('Email send failed (non-fatal):', emailErr);
            }
        }

        return res.status(200).json({ message: 'Payment confirmed. Ticket sent.' });
    }

    // ── FAILED / EXPIRED ──────────────────────────────────────────────────────
    if (isFailed) {
        // 1. Update status
        await admin
            .from('registrations')
            .update({ status: 'failed' })
            .eq('id', registration.id);

        // 2. Restore quota (+1) only if slot was previously held (PENDING)
        if (registration.status === 'pending' && registration.session && registration.event_id) {
            const { error: restoreErr } = await admin.rpc('restore_session_quota', {
                p_event_id: registration.event_id,
                p_session:  registration.session,
            });
            if (restoreErr) {
                console.error('Quota restore failed:', restoreErr);
            } else {
                console.log(`Quota restored for ${registration.session} of event ${registration.event_id}`);
            }
        }

        return res.status(200).json({ message: 'Payment failed. Quota restored.' });
    }

    // Unknown status — acknowledge receipt
    console.warn('Unhandled DOKU status:', dokuStatus);
    return res.status(200).json({ message: 'Acknowledged — unhandled status: ' + dokuStatus });
}
