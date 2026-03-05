import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Search, MessageCircle, PhoneOff, Clock, RefreshCcw } from 'lucide-react';

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

const buildWAMessagePending = (reg: any): string => {
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

const buildWAMessageExpired = (reg: any, newLink: string): string => {
    const eventName = reg.events?.title || 'Event';
    const amount = `Rp ${(Number(reg.amount) || 0).toLocaleString('id-ID')}`;

    const message = `Halo ${reg.name},

Kami dari tim *${eventName}* melihat bahwa link pembayaran Anda sebelumnya telah *kedaluwarsa*.

Kami telah menyiapkan link pembayaran baru untuk Anda:

*Detail Registrasi:*
- Nama: ${reg.name}
- Event: ${eventName}
- Total: ${amount}

Silakan selesaikan pembayaran melalui tautan berikut:
${newLink}

Terima kasih dan kami tunggu kehadiran Anda!`;

    return encodeURIComponent(message);
};

const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
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

declare global {
    interface Window {
        loadJokulCheckout: (url: string) => void;
    }
}

export const WAReminder: React.FC = () => {
    const [registrants, setRegistrants] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [eventFilter, setEventFilter] = useState('all');
    const [statusTab, setStatusTab] = useState<'pending' | 'expired'>('pending');
    const [generatingLinkId, setGeneratingLinkId] = useState<string | null>(null);
    // Store generated links per reg id so we can show WA button after generation
    const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});

    useEffect(() => {
        const init = async () => {
            await checkAndExpireTransactions();
            await Promise.all([fetchRegistrants(), fetchEvents()]);
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

    const fetchRegistrants = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('registrations')
            .select(`
                *,
                events (
                    id,
                    title,
                    slug,
                    date_time,
                    location,
                    location_detail,
                    location_link
                )
            `)
            .in('status', ['pending', 'expired'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching registrants:', error);
        } else {
            setRegistrants(data || []);
        }
        setLoading(false);
    };

    // Invoke create-payment edge function and update the registration
    const handleGenerateNewLink = async (reg: any) => {
        setGeneratingLinkId(reg.id);
        try {
            const { data, error } = await supabase.functions.invoke('create-payment', {
                body: {
                    amount: Number(reg.amount),
                    name: reg.name,
                    email: reg.email,
                    phone: reg.phone,
                    domicile: reg.domicile,
                    prayer: reg.prayer,
                    eventId: reg.event_id,
                    eventName: reg.events?.title,
                    eventSlug: reg.events?.slug,
                    gender: reg.gender,
                    currentStatus: reg.current_status,
                    university: reg.university,
                    major: reg.major,
                    institution: reg.institution,
                    role: reg.role,
                    uses_external_peripherals: reg.uses_external_peripherals,
                    mouse_brand: reg.mouse_brand,
                    work_device_factors: reg.work_device_factors,
                    work_device_factors_others: reg.work_device_factors_others,
                    info_source: reg.info_source,
                    info_source_others: reg.info_source_others,
                    share_data_sponsor: reg.share_data_sponsor || false,
                    // Pass existing reg id so edge function can update instead of insert
                    existingRegistrationId: reg.id,
                }
            });

            if (error) throw error;

            const newLink = data?.link;
            if (!newLink) throw new Error('Tidak mendapatkan payment link baru.');

            // Update status back to pending + new payment_link
            const { error: updateError } = await supabase
                .from('registrations')
                .update({ status: 'pending', payment_link: newLink, created_at: new Date().toISOString() })
                .eq('id', reg.id);

            if (updateError) throw updateError;

            // Store the new link so we can show the WA button
            setGeneratedLinks((prev) => ({ ...prev, [reg.id]: newLink }));

            // Open Doku popup if available
            if (window.loadJokulCheckout) {
                window.loadJokulCheckout(newLink);
            }

            // Refresh list
            await checkAndExpireTransactions();
            await fetchRegistrants();
        } catch (err: any) {
            console.error('Failed to generate new payment link:', err);
            alert(err?.message || 'Gagal membuat link pembayaran baru.');
        } finally {
            setGeneratingLinkId(null);
        }
    };

    const pending = registrants.filter((r) => r.status === 'pending');
    const expired = registrants.filter((r) => r.status === 'expired');
    const currentList = statusTab === 'pending' ? pending : expired;

    const filteredRegistrants = currentList.filter((reg) => {
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
                    Kirim pengingat via WhatsApp. Untuk peserta <strong>expired</strong>, buat link pembayaran baru dengan data yang sama.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3">
                    <p className="text-xs text-yellow-700">Pending</p>
                    <p className="text-xl font-bold text-yellow-900">{pending.length}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    <p className="text-xs text-red-700">Expired</p>
                    <p className="text-xl font-bold text-red-900">{expired.length}</p>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setStatusTab('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusTab === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Pending ({pending.length})
                </button>
                <button
                    onClick={() => setStatusTab('expired')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusTab === 'expired'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Expired ({expired.length})
                </button>
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
                        await fetchRegistrants();
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Waktu Daftar</th>
                            {statusTab === 'pending' && (
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Sisa Waktu</th>
                            )}
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRegistrants.length === 0 ? (
                            <tr>
                                <td colSpan={statusTab === 'pending' ? 6 : 5} className="px-6 py-10 text-center text-gray-500">
                                    Tidak ada transaksi {statusTab}.
                                </td>
                            </tr>
                        ) : (
                            filteredRegistrants.map((reg) => {
                                const phone = formatPhoneNumber(reg.phone || '');
                                const hasPhone = !!phone;
                                const { text: timeRemaining } = statusTab === 'pending'
                                    ? getTimeRemaining(reg.created_at)
                                    : { text: '' };

                                // For pending — WA with existing payment_link
                                const waLinkPending = hasPhone && reg.payment_link
                                    ? `https://wa.me/${phone}?text=${buildWAMessagePending(reg)}`
                                    : null;

                                // For expired — WA after generating new link
                                const newLink = generatedLinks[reg.id];
                                const waLinkExpired = hasPhone && newLink
                                    ? `https://wa.me/${phone}?text=${buildWAMessageExpired(reg, newLink)}`
                                    : null;

                                const isGenerating = generatingLinkId === reg.id;

                                return (
                                    <tr key={reg.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{reg.name}</div>
                                            <div className="text-xs text-gray-500">{reg.email}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {reg.phone || <span className="text-gray-400 italic">Tidak ada</span>}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            Rp {(Number(reg.amount) || 0).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {reg.created_at ? new Date(reg.created_at).toLocaleString('id-ID') : '-'}
                                        </td>
                                        {statusTab === 'pending' && (
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                    <Clock size={11} />
                                                    {timeRemaining}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {statusTab === 'pending' ? (
                                                // ── PENDING: kirim WA dengan link yang sudah ada ──
                                                waLinkPending ? (
                                                    <a
                                                        href={waLinkPending}
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
                                                )
                                            ) : (
                                                // ── EXPIRED: generate link baru dulu, baru WA ──
                                                <div className="flex flex-col gap-2">
                                                    {!newLink ? (
                                                        <button
                                                            onClick={() => handleGenerateNewLink(reg)}
                                                            disabled={isGenerating}
                                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-60 whitespace-nowrap"
                                                        >
                                                            {isGenerating
                                                                ? <Loader2 size={14} className="animate-spin" />
                                                                : <RefreshCcw size={14} />}
                                                            {isGenerating ? 'Membuat Link...' : 'Buat Link Baru'}
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <span className="text-xs text-green-700 bg-green-50 border border-green-100 rounded px-2 py-1">
                                                                ✓ Link baru berhasil dibuat
                                                            </span>
                                                            {waLinkExpired ? (
                                                                <a
                                                                    href={waLinkExpired}
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
                                                        </>
                                                    )}
                                                </div>
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
                    Menampilkan {filteredRegistrants.length} transaksi {statusTab}.
                    {statusTab === 'expired' && ' Klik "Buat Link Baru" untuk generate payment link dengan data peserta yang sama.'}
                </p>
            )}
        </div>
    );
};
