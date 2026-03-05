import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

type Recipient = {
    email: string;
    name?: string;
};

const applyTemplate = (template: string, recipient: Recipient) => {
    const name = (recipient.name || '').trim() || 'Peserta';
    const email = recipient.email || '';

    return template
        .replace(/{{\s*name\s*}}/gi, name)
        .replace(/{{\s*email\s*}}/gi, email);
};

const escapeHtml = (text: string) =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');

const toHtmlBody = (body: string) => {
    const safe = escapeHtml(body).replace(/\n/g, '<br/>');
    return `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; color: #1f2937;">
            <div style="white-space: normal; line-height: 1.7; font-size: 14px;">${safe}</div>
            <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                Email ini dikirim oleh Admin Event BSB.
            </div>
        </div>
    `;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return res.status(500).json({
            success: false,
            message: 'SMTP credentials are not configured. Please set SMTP_USER and SMTP_PASS.',
        });
    }

    const { recipients, subject, body } = req.body as {
        recipients?: Recipient[];
        subject?: string;
        body?: string;
    };

    const cleanRecipients = (recipients || [])
        .filter((item) => !!item?.email)
        .map((item) => ({
            email: String(item.email).trim(),
            name: item?.name ? String(item.name).trim() : '',
        }))
        .filter((item) => item.email.length > 0);

    if (cleanRecipients.length === 0) {
        return res.status(400).json({ success: false, message: 'Recipients cannot be empty.' });
    }

    if (!subject?.trim()) {
        return res.status(400).json({ success: false, message: 'Subject is required.' });
    }

    if (!body?.trim()) {
        return res.status(400).json({ success: false, message: 'Body is required.' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: 'mail.spacemail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const fromAddress = `"Informasi Event BSB" <${process.env.SMTP_USER}>`;

        let successCount = 0;
        let failedCount = 0;
        const failedRecipients: string[] = [];

        for (const recipient of cleanRecipients) {
            try {
                const personalizedSubject = applyTemplate(subject.trim(), recipient);
                const personalizedBody = applyTemplate(body.trim(), recipient);

                await transporter.sendMail({
                    from: fromAddress,
                    to: recipient.email,
                    subject: personalizedSubject,
                    text: personalizedBody,
                    html: toHtmlBody(personalizedBody),
                });
                successCount += 1;
            } catch (error) {
                failedCount += 1;
                failedRecipients.push(recipient.email);
                console.error('Failed sending broadcast to', recipient.email, error);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Broadcast processed',
            total: cleanRecipients.length,
            successCount,
            failedCount,
            failedRecipients,
        });
    } catch (error: any) {
        console.error('Error sending broadcast email:', error);
        const message = error?.message || error?.response || 'Failed to process broadcast email';
        return res.status(500).json({ success: false, message });
    }
}
