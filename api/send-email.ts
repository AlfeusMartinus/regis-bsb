import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email, name, eventName, ticketId } = req.body;

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

        const qrCodeDataUrl = await QRCode.toDataURL(finalTicketId, {
            errorCorrectionLevel: 'H',
            margin: 1,
            color: {
                dark: '#1a2c22', // Match the main theme color
                light: '#ffffff'
            }
        });

        // Set up email options with the HTML layout
        const mailOptions = {
            from: process.env.SMTP_FROM || `"Event Registration" <${process.env.SMTP_USER}>`,
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
                    
                    <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0;">
                        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
                            Bukti Tiket Anda (ID: ${finalTicketId})
                        </p>
                        <div style="display: inline-block; padding: 10px; background: white; border-radius: 8px;">
                            <img src="${qrCodeDataUrl}" alt="QR Code Ticket" style="width: 200px; height: 200px; display: block;" />
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
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);

        return res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ success: false, message: 'Failed to send email', error });
    }
}
