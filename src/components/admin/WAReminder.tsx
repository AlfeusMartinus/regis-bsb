import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Search, MessageCircle, PhoneOff, Clock } from 'lucide-react';

const EXPIRY_HOURS = 6;

export const checkAndExpireTransactions = async () => {
    const now = new Date();
    const expiryTime = new Date(now.getTime() - EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    const { data: pendingRegs, error } = await supabase
        .from('registrations')
        .select('id, created_at')
        .eq('status', 'pending')
        .lt('created_at', expiryTime);

    if (error) {
        console.error('Error checking for expired transactions:', error);
        return;
    }

    if (!pendingRegs || pendingRegs.length === 0) return;

    const idsToExpire = pendingRegs.map((r) => r.id);
    const { error: updateError } = await supabase
        .from('registrations')
        .update({ status: 'expired' })
        .in('id', idsToExpire);

    if (updateError) {
        console.error('Error expiring transactions:', updateError);
    } else {
        console.log(`Expired ${idsToExpire.length} transaction(s).`);
    }
};

const buildWAMessage = (reg: any): string => {
    const eventName = reg.events?.title || 'Event';
    const amount = `Rp ${(Number(reg.amount) || 0).toLocaleString('id-ID')}`;
    const paymentLink = reg.payment_link || '-';

    const message = `Halo ${reg.name},

Kami dari tim *${eventName}* ingin mengingatkan bahwa pembayaran Anda masih *tertunda*.

*Detail Registrasi:*
- Nama: ${reg.name}
- Event: ${eventName}
- Total: ${amount}

Silakan selesaikan pembayaran Anda melalui tautan berikut:
${paymentLink}

Batas waktu pembayaran adalah *6 jam* sejak registrasi. Segera selesaikan sebelum kedaluwarsa!

Terima kasih.`;

    return encodeURIComponent(message);
};

const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    // Remove leading 0 and replace with country code 62
    if (cleaned.startsWith('0')) {
        return '62' + cleaned.slice(1);
    }
    if (cleaned.startsWith('62')) {
        return cleaned;
    }
    return '62' + cleaned;
};

const getTimeRemaining = (createdAt: string): { text: string; isExpired: boolean } => {
    const created = new Date(createdAt);
    const expiresAt = new Date(created.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();

    if (diffMs <= 0) return { text: 'Expired', isExpired: true };

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
        return { text: `${diffHours}j ${diffMins}m lagi`, isExpired: false };
    }
    return { text: `${diffMins}m lagi`, isExpired: false };
};

export const WAReminder: React.FC = () => {
    const [registrants, setRegistrants] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [eventFilter, setEventFilter] = useState('all');

    useEffect(() => {
        const init = async () => {
            await checkAndExpireTransactions();
            await fetchPendingRegistrants();
            await fetchEvents();
        };
        init();
    }, []);

    const fetchEvents = async () => {
        const { data } = await supabase
            .from('events')
            .select('id, title')
            .order('title', { ascending: true });
        setEvents(data || []);
    };

    const fetchPendingRegistrants = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('registrations')
            .select(`
                *,
                events (
                    id,
                    title,
                    slug
                )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching pending registrants:', error);
        } else {
            setRegistrants(data || []);
        }
        setLoading(false);
    };

    const filteredRegistrants = registrants.filter((reg) => {
        const matchesSearch =
            reg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.phone?.includes(searchTerm);

        const matchesEvent = eventFilter === 'all' || reg.event_id === eventFilter;

        return matchesSearch && matchesEvent;
    });

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="space-y-1 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">WA Reminder</h2>
                <p className="text-sm text-gray-500">
                    Kirim pengingat pembayaran via WhatsApp ke peserta dengan status pending. Batas waktu pembayaran 6 jam sejak registrasi.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3">
                    <p className="text-xs text-yellow-700">Total Pending</p>
                    <p className="text-xl font-bold text-yellow-900">{registrants.length}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                    <p className="text-xs text-blue-700">Ditampilkan (filter)</p>
                    <p className="text-xl font-bold text-blue-900">{filteredRegistrants.length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <select
                    className="h-10 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white sm:min-w-[200px]"
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                >
                    <option value="all">Semua Event</option>
                    {events.map((event) => (
                        <option key={event.id} value={event.id}>{event.title}</option>
                    ))}
                </select>

                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Cari nama, email, atau no. HP..."
                        className="h-10 pl-10 pr-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    onClick={async () => {
                        await checkAndExpireTransactions();
                        await fetchPendingRegistrants();
                    }}
                    className="h-10 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                    <Loader2 size={16} />
                    Refresh
                </button>
            </div>

            {/* Table */}
            <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Nama</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">No. HP</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Event</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Waktu Daftar</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Sisa Waktu</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRegistrants.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                    Tidak ada transaksi pending.
                                </td>
                            </tr>
                        ) : (
                            filteredRegistrants.map((reg) => {
                                const phone = formatPhoneNumber(reg.phone || '');
                                const hasPhone = !!phone;
                                const waLink = hasPhone
                                    ? `https://wa.me/${phone}?text=${buildWAMessage(reg)}`
                                    : null;
                                const { text: timeRemaining, isExpired } = getTimeRemaining(reg.created_at);

                                return (
                                    <tr key={reg.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{reg.name}</div>
                                            <div className="text-xs text-gray-500">{reg.email}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {reg.phone || <span className="text-gray-400 italic">Tidak ada</span>}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {reg.events?.title || '-'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            Rp {(Number(reg.amount) || 0).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {reg.created_at ? new Date(reg.created_at).toLocaleString('id-ID') : '-'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isExpired
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                <Clock size={11} />
                                                {timeRemaining}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {waLink ? (
                                                <a
                                                    href={waLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                                                >
                                                    <MessageCircle size={15} />
                                                    Kirim WA
                                                </a>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-400 text-sm">
                                                    <PhoneOff size={13} />
                                                    No. HP kosong
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {filteredRegistrants.length > 0 && (
                <p className="mt-3 text-xs text-gray-400 text-center">
                    Menampilkan {filteredRegistrants.length} transaksi pending. Klik "Kirim WA" untuk membuka WhatsApp dengan pesan siap kirim.
                </p>
            )}
        </div>
    );
};
