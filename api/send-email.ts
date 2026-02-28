import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const {
        email, name, eventName, eventId, ticketId, date_time, location, location_detail, location_link
    } = req.body;

    if (!email || !name) {
        return res.status(400).json({ message: 'Email and name are required' });
    }

    // Generate a unique ticket ID if none provided
    const finalTicketId = ticketId || `TICKET-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    try {
        const transporter = nodemailer.createTransport({
            host: 'mail.spacemail.com',
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Date and Time Formatting
        const eventDateObj = date_time ? new Date(date_time) : new Date();
        const endDateObj = new Date(eventDateObj.getTime() + 2 * 60 * 60 * 1000); // add 2 hours
        const dateStr = eventDateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = eventDateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB";

        // Generate ICS contents
        const formatDateForIcs = (date: Date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Belajar Sambil Beramal//Registration//ID',
            'CALSCALE:GREGORIAN',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            `DTSTART:${formatDateForIcs(eventDateObj)}`,
            `DTEND:${formatDateForIcs(endDateObj)}`,
            `DTSTAMP:${formatDateForIcs(new Date())}`,
            `UID:${finalTicketId}@belajarsambilberamal.com`,
            `SUMMARY:Check-in: ${eventName || 'Acara'}`,
            `LOCATION:${location || ''}${location_detail ? ' (' + location_detail + ')' : ''}${location_link ? ' - ' + location_link : ''}`,
            `DESCRIPTION:Tiket ID: ${finalTicketId}\\n\\nInformasi Acara:\\n- Tanggal: ${dateStr}\\n- Waktu: ${timeStr}\\n- Lokasi: ${location}\\n- Detail: ${location_detail || '-'}\\n- Link: ${location_link || '-'}\\n\\nTerima kasih telah mendaftar acara ${eventName || 'Acara'}.`,
            'STATUS:CONFIRMED',
            'SEQUENCE:0',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        // Encode payload: checkin:eventId:email
        const checkinPayload = eventId ? `checkin:${eventId}:${email}` : finalTicketId;

        // Generate QR Code as a Buffer
        const qrCodeBuffer = await QRCode.toBuffer(checkinPayload, {
            errorCorrectionLevel: 'H',
            margin: 1,
            color: {
                dark: '#1a2c22',
                light: '#ffffff'
            }
        });

        // Unique CID formatted like an email address (Required for Mobile Gmail to reliably show inline CIDs)
        const qrCid = `qrcode-${Date.now()}@bsb.ticket`;

        // Set up email options with the HTML layout
        // Using explicit display name with matching SMTP_USER to avoid 553 error
        const fromAddress = `"Registrasi Event BSB" <${process.env.SMTP_USER}>`;
        console.log('Attempting to send email from:', fromAddress);

        const mailOptions = {
            from: fromAddress,
            to: email,
            subject: `Tiket Registrasi: ${eventName || 'Acara'}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #1a2c22; margin: 0;">Registrasi Berhasil!</h1>
                    </div>
                    
                    <p style="color: #4b5563; line-height: 1.6; text-align: left;">
                        Halo <strong>${name}</strong>,<br/>
                        Terima kasih telah mendaftar untuk acara <strong>${eventName || 'Acara'}</strong>. Pembayaran dan registrasi Anda telah kami terima dengan sukses.
                    </p>

                    <div style="background-color: #f8fafc; border-left: 4px solid #1a2c22; padding: 16px; margin: 20px 0; text-align: left;">
                        <p style="margin: 0 0 8px 0; color: #1f2937;"><strong>📅 Tanggal:</strong> ${dateStr}</p>
                        <p style="margin: 0 0 8px 0; color: #1f2937;"><strong>⏰ Waktu:</strong> ${timeStr}</p>
                        <p style="margin: 0 0 8px 0; color: #1f2937;"><strong>📍 Lokasi:</strong> ${location || 'Online'}</p>
                        ${location_detail ? `<p style="margin: 0 0 8px 0; color: #475569; font-size: 14px;"><em>${location_detail}</em></p>` : ''}
                        ${location_link ? `<p style="margin: 8px 0 0 0;"><a href="${location_link}" style="display: inline-block; padding: 6px 12px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: bold;">Buka di Google Maps &rarr;</a></p>` : ''}
                    </div>


                    
                    <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0;">
                        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
                            Bukti Tiket Anda (ID: ${finalTicketId})
                        </p>
                        <div style="display: inline-block; padding: 10px; background: white; border-radius: 8px;">
                            <img src="cid:${qrCid}" alt="QR Code Ticket" width="200" height="200" style="display: block; width: 100%; max-width: 200px; height: auto;" />
                        </div>
                        <p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                            Silakan tunjukkan QR code ini di meja registrasi saat menghadiri acara.
                        </p>
                    </div>

                    <p style="color: #4b5563; line-height: 1.6; text-align: center; margin-bottom: 30px;">
                        Dukungan Anda sangat berarti bagi kami. Sampai jumpa di lokasi acara!
                    </p>

                    <div style="border-top: 1px solid #eaeaea; padding-top: 20px; text-align: center;">
                        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                            Email ini dibuat secara otomatis. Harap tidak membalas email ini.
                        </p>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: 'qrcode.png',
                    content: qrCodeBuffer,
                    cid: qrCid,
                    contentType: 'image/png',
                    contentDisposition: 'inline' as const
                },
                {
                    filename: 'invite.ics',
                    content: Buffer.from(icsContent),
                    contentType: 'text/calendar'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);

        return res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ success: false, message: 'Failed to send email', error });
    }
}
