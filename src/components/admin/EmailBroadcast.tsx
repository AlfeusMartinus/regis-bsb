import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Mail, Send } from 'lucide-react';

type EventItem = {
    id: string;
    title: string;
};

type RegistrationItem = {
    id: string;
    name: string | null;
    email: string | null;
    status: string | null;
    event_id: string | null;
};

type StatusFilter = 'all' | 'success' | 'pending' | 'expired' | 'failed';
type RecipientSource = 'event' | 'manual';
type Recipient = { email: string; name?: string };

const SUCCESS_STATUSES = ['paid', 'settlement', 'success'];

const normalizeHeader = (header: string) =>
    header.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseCsvLine = (line: string) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
};

const parseRecipientsFromCsv = (csvText: string) => {
    const lines = csvText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length < 2) {
        return {
            recipients: [] as Recipient[],
            invalidCount: 0,
            rawRowCount: Math.max(0, lines.length - 1),
            error: 'Isi CSV minimal harus punya header dan 1 baris data.',
        };
    }

    const headers = parseCsvLine(lines[0]).map((item) => normalizeHeader(item));
    const emailIndex = headers.findIndex((header) => header.includes('email'));
    const nameIndex = headers.findIndex((header) => header.includes('nama') || header.includes('name'));

    if (emailIndex < 0) {
        return {
            recipients: [] as Recipient[],
            invalidCount: lines.length - 1,
            rawRowCount: lines.length - 1,
            error: 'Kolom email tidak ditemukan pada header CSV.',
        };
    }

    const recipients: Recipient[] = [];
    let invalidCount = 0;

    for (let i = 1; i < lines.length; i += 1) {
        const row = parseCsvLine(lines[i]);
        const email = (row[emailIndex] || '').trim().toLowerCase();
        const name = nameIndex >= 0 ? (row[nameIndex] || '').trim() : '';

        if (!email || !email.includes('@')) {
            invalidCount += 1;
            continue;
        }

        recipients.push({
            email,
            name: name || undefined,
        });
    }

    const deduped = Array.from(new Map(recipients.map((item) => [item.email, item])).values());

    return {
        recipients: deduped,
        invalidCount,
        rawRowCount: lines.length - 1,
        error: '',
    };
};

export const EmailBroadcast: React.FC = () => {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const [recipientSource, setRecipientSource] = useState<RecipientSource>('event');
    const [eventId, setEventId] = useState('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('success');
    const [manualRecipients, setManualRecipients] = useState<Recipient[]>([]);
    const [manualInvalidCount, setManualInvalidCount] = useState(0);
    const [manualRawRowCount, setManualRawRowCount] = useState(0);
    const [csvFileName, setCsvFileName] = useState('');
    const [csvError, setCsvError] = useState('');
    const [subject, setSubject] = useState('Informasi Penting Event');
    const [message, setMessage] = useState('Halo {{name}},\n\nKami ingin menyampaikan informasi terbaru terkait event.\n\nTerima kasih.');

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchEvents(), fetchRegistrations()]);
            setLoading(false);
        };
        init();
    }, []);

    const fetchEvents = async () => {
        const { data, error } = await supabase
            .from('events')
            .select('id, title')
            .order('title', { ascending: true });

        if (error) {
            console.error('Failed loading events:', error);
            return;
        }

        setEvents(data || []);
    };

    const fetchRegistrations = async () => {
        const { data, error } = await supabase
            .from('registrations')
            .select('id, name, email, status, event_id');

        if (error) {
            console.error('Failed loading registrations:', error);
            return;
        }

        setRegistrations((data || []) as RegistrationItem[]);
    };

    const eventRecipients = useMemo(() => {
        return registrations
            .filter((reg) => !!reg.email)
            .filter((reg) => (eventId === 'all' ? true : reg.event_id === eventId))
            .filter((reg) => {
                const status = (reg.status || '').toLowerCase();

                if (statusFilter === 'all') return true;
                if (statusFilter === 'success') return SUCCESS_STATUSES.includes(status);
                if (statusFilter === 'pending') return status === 'pending';
                if (statusFilter === 'expired') return status === 'expired';
                if (statusFilter === 'failed') return status === 'failed';

                return true;
            })
            .map((reg) => ({
                email: reg.email || '',
                name: reg.name || undefined,
            }));
    }, [registrations, eventId, statusFilter]);

    const recipients = useMemo(() => {
        if (recipientSource === 'manual') {
            return manualRecipients;
        }

        return eventRecipients;
    }, [recipientSource, manualRecipients, eventRecipients]);

    const eventName = useMemo(() => {
        if (eventId === 'all') return 'Semua Event';
        return events.find((item) => item.id === eventId)?.title || 'Event';
    }, [events, eventId]);

    const handleSendBroadcast = async () => {
        if (sending) return;

        if (!subject.trim()) {
            alert('Subjek email wajib diisi.');
            return;
        }

        if (!message.trim()) {
            alert('Isi pesan email wajib diisi.');
            return;
        }

        if (recipients.length === 0) {
            alert('Tidak ada penerima untuk filter saat ini.');
            return;
        }

        const scopeLabel = recipientSource === 'manual' ? 'List Manual' : eventName;
        const confirmed = window.confirm(`Kirim broadcast email ke ${recipients.length} penerima (${scopeLabel})?`);
        if (!confirmed) return;

        setSending(true);

        try {
            const response = await fetch('/api/broadcast-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients,
                    subject: subject.trim(),
                    body: message.trim(),
                }),
            });

            const rawBody = await response.text();
            let result: any = {};
            try {
                result = rawBody ? JSON.parse(rawBody) : {};
            } catch {
                result = {};
            }

            if (!response.ok || result?.success === false) {
                const fallbackMessage = response.status === 404
                    ? 'Endpoint /api/broadcast-email tidak ditemukan. Untuk local, jalankan `vercel dev` (default port 3000) atau sesuaikan `VITE_API_PROXY_TARGET` di env.'
                    : rawBody?.includes('<!doctype html')
                        ? 'Endpoint /api/broadcast-email tidak ditemukan. Untuk local, jalankan dengan vercel dev atau deploy ke Vercel.'
                        : `HTTP ${response.status} ${response.statusText}`;

                throw new Error(result?.message || fallbackMessage || 'Gagal mengirim broadcast email.');
            }

            alert(
                `Broadcast selesai.\nTotal: ${result.total || recipients.length}\nBerhasil: ${result.successCount || 0}\nGagal: ${result.failedCount || 0}`
            );
        } catch (error: any) {
            console.error('Failed sending broadcast email:', error);
            alert(error?.message || 'Gagal mengirim broadcast email.');
        } finally {
            setSending(false);
        }
    };

    const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('File harus berformat .csv');
            return;
        }

        const text = await file.text();
        const parsed = parseRecipientsFromCsv(text);

        setCsvFileName(file.name);
        setCsvError(parsed.error || '');
        setManualRecipients(parsed.recipients);
        setManualInvalidCount(parsed.invalidCount);
        setManualRawRowCount(parsed.rawRowCount);

        if (parsed.error) {
            alert(parsed.error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold text-gray-800">Email Broadcast</h2>
                <p className="text-sm text-gray-500">
                    Blast email informasi event ke peserta event atau list eksternal.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sumber Penerima</label>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setRecipientSource('event')}
                        className={`px-4 h-10 rounded-lg border text-sm font-medium transition-colors ${recipientSource === 'event'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Peserta Event
                    </button>
                    <button
                        type="button"
                        onClick={() => setRecipientSource('manual')}
                        className={`px-4 h-10 rounded-lg border text-sm font-medium transition-colors ${recipientSource === 'manual'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        List Manual (Eksternal)
                    </button>
                </div>
            </div>

            {recipientSource === 'event' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
                        <select
                            className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                            value={eventId}
                            onChange={(e) => setEventId(e.target.value)}
                        >
                            <option value="all">Semua Event</option>
                            {events.map((event) => (
                                <option key={event.id} value={event.id}>{event.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filter Status</label>
                        <select
                            className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        >
                            <option value="all">Semua Status</option>
                            <option value="success">Success (paid/settlement/success)</option>
                            <option value="pending">Pending</option>
                            <option value="expired">Expired</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                </div>
            )}

            {recipientSource === 'manual' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload CSV Nama & Email</label>
                    <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleCsvUpload}
                        className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white file:mr-3 file:border-0 file:bg-primary/10 file:text-primary file:px-3 file:py-1.5 file:rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Header minimal: kolom <strong>Email</strong>. Untuk personalisasi gunakan kolom <strong>Nama Lengkap</strong> atau <strong>Name</strong>.
                    </p>
                    {csvFileName && (
                        <p className="text-xs text-gray-600 mt-1">File: {csvFileName}</p>
                    )}
                    {csvError && (
                        <p className="text-xs text-red-600 mt-1">{csvError}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                        Total baris data: {manualRawRowCount} • Valid: {manualRecipients.length} • Invalid: {manualInvalidCount}
                    </p>
                </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
                <p className="font-medium">Target penerima: {recipients.length} email</p>
                <p className="text-blue-700 text-xs mt-1">
                    Filter aktif: {recipientSource === 'manual' ? 'List Manual' : `${eventName} • ${statusFilter}`}
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subjek Email</label>
                <input
                    type="text"
                    className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Contoh: Update Jadwal Event"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Isi Pesan</label>
                <textarea
                    className="w-full min-h-[200px] px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tulis informasi event yang ingin dikirim..."
                />
                <p className="text-xs text-gray-500 mt-1">
                    Placeholder yang didukung: {'{{name}}'}, {'{{email}}'}
                </p>
            </div>

            <button
                onClick={handleSendBroadcast}
                disabled={sending || recipients.length === 0}
                className="h-10 inline-flex items-center gap-2 bg-primary text-white px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? 'Mengirim Broadcast...' : 'Kirim Broadcast Email'}
            </button>

            <div className="text-xs text-gray-500 flex items-center gap-2">
                <Mail size={14} />
                Pengiriman dilakukan satu per satu agar status berhasil/gagal dapat terhitung dengan akurat.
            </div>
        </div>
    );
};
