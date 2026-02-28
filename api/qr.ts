import type { VercelRequest, VercelResponse } from '@vercel/node';
import QRCode from 'qrcode';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { data } = req.query;

    if (!data || typeof data !== 'string') {
        return res.status(400).send('Data is required');
    }

    try {
        const qrCodeBuffer = await QRCode.toBuffer(data, {
            errorCorrectionLevel: 'H',
            margin: 1,
            color: {
                dark: '#1a2c22',
                light: '#ffffff'
            }
        });

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate'); // Cache for 24 hours
        return res.status(200).send(qrCodeBuffer);
    } catch (error) {
        console.error('Error generating QR:', error);
        return res.status(500).send('Failed to generate QR code');
    }
}
