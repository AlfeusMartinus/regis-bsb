import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { RegistrantList } from './RegistrantList';
import { Scanner } from './Scanner';
import { WAReminder } from './WAReminder'; // Import WAReminder
import { ManualSponsorRegistration } from './ManualSponsorRegistration';
import { AccessDenied } from '../ui/AccessDenied';
import {
    Loader2, ArrowLeft, Calendar, MapPin, ExternalLink,
    Users, DollarSign, Clock, Globe, FileText, CheckCircle, QrCode, MessageCircle, UserPlus
} from 'lucide-react';

const SUCCESS_STATUSES = ['paid', 'settlement', 'success'];

const currency = (v: number) =>
    `Rp ${v.toLocaleString('id-ID')} `;

export const EventDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { role, canScan, loading: authLoading } = useAuth();

    const canAccessScanner = role === 'superadmin' || canScan;

    type TabType = 'info' | 'transactions' | 'paid-registrants' | 'scanner' | 'wa-reminder' | 'sponsor-media'; // Add 'sponsor-media' to TabType
    const initialTab = (searchParams.get('tab') as TabType) || 'info';
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [event, setEvent] = useState<any>(null);
    const [registrants, setRegistrants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        if (!authLoading && id) fetchData();
    }, [id, role, authLoading]);

    const fetchData = async () => {
        setLoading(true);

        // For sponsors: verify they have access to this event
        if (role === 'sponsor') {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) { setAccessDenied(true); setLoading(false); return; }

            const { data: sponsorEvent } = await supabase
                .from('sponsor_events')
                .select('event_id')
                .eq('user_id', userId)
                .eq('event_id', id)
                .maybeSingle();

            if (!sponsorEvent) {
                setAccessDenied(true);
                setLoading(false);
                return;
            }
        }

        // Fetch event
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (eventError || !eventData) {
            setAccessDenied(true);
            setLoading(false);
            return;
        }
        setEvent(eventData);

        // Fetch summary counts including session & status for quota analytics
        const { data: regsData } = await supabase
            .from('registrations')
            .select('id, status, amount, session')
            .eq('event_id', id);

        setRegistrants(regsData || []);
        setLoading(false);
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (accessDenied || !event) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-gray-500 font-medium">Event tidak ditemukan atau akses ditolak.</p>
                <button onClick={() => navigate(-1)} className="text-sm text-primary hover:underline flex items-center gap-1">
                    <ArrowLeft size={14} /> Kembali
                </button>
            </div>
        );
    }

    // ── Metrics ────────────────────────────────────────────────────────────────
    const paid = registrants.filter(r => SUCCESS_STATUSES.includes(r.status?.toLowerCase()));
    const pending = registrants.filter(r => r.status?.toLowerCase() === 'pending');
    const expired = registrants.filter(r => r.status?.toLowerCase() === 'expired');
    const totalRevenue = paid.reduce((s, r) => s + (Number(r.amount) || 0), 0);


    // ── Session-level quota breakdown ──────────────────────────────────────────
    const s1Quota = event.session1_quota ?? 0;
    const s2Quota = event.session2_quota ?? 0;
    const totalQuota = s1Quota + s2Quota;

    const s1Paid = registrants.filter(r => r.session === 'session1' && SUCCESS_STATUSES.includes(r.status?.toLowerCase())).length;
    const s1Pending = registrants.filter(r => r.session === 'session1' && r.status?.toLowerCase() === 'pending').length;
    const s2Paid = registrants.filter(r => r.session === 'session2' && SUCCESS_STATUSES.includes(r.status?.toLowerCase())).length;
    const s2Pending = registrants.filter(r => r.session === 'session2' && r.status?.toLowerCase() === 'pending').length;

    // Calculate availability dynamically based on paid count (as requested for live data)
    const s1Available = Math.max(0, s1Quota - s1Paid);
    const s2Available = Math.max(0, s2Quota - s2Paid);
    const totalAvailable = s1Available + s2Available;


    return (
        <div className="max-w-6xl mx-auto space-y-5 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <button
                    onClick={() => navigate('/admin/dashboard?tab=events')}
                    className="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                    title="Kembali ke Events"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${event.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {event.is_published ? 'Published' : 'Draft'}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 truncate">{event.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            {new Date(event.date_time).toLocaleString('id-ID', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <MapPin size={14} />
                            {event.location}
                        </span>
                        <a href={`/e/${event.slug}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline">
                            <Globe size={13} /> Halaman Publik <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
                {role === 'superadmin' && (
                    <Link
                        to={`/admin/events/edit/${event.id}`}
                        className="flex-shrink-0 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                    >
                        Edit Event
                    </Link>
                )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Registrasi', value: registrants.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Pembayaran Lunas', value: paid.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Total Revenue', value: currency(totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Sisa Kuota Total', value: `${totalAvailable} / ${totalQuota}`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                        <div className={`${bg} rounded-lg p-2.5`}>
                            <Icon className={color} size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="text-lg font-bold text-gray-900">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Session Quota Cards */}
            {(s1Quota > 0 || s2Quota > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { label: 'Sesi 1', quota: s1Quota, available: s1Available, paid: s1Paid, pending: s1Pending },
                        { label: 'Sesi 2', quota: s2Quota, available: s2Available, paid: s2Paid, pending: s2Pending },
                    ].map(({ label, quota, available, paid: paidCount, pending: pendingCount }) => {
                        const pct = quota > 0 ? Math.round((paidCount / quota) * 100) : 0;
                        const isFull = available <= 0;
                        const isLow = available > 0 && available <= 10;
                        return (
                            <div key={label} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-bold text-gray-800">{label}</p>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isFull ? 'bg-red-100 text-red-600' :
                                        isLow ? 'bg-orange-100 text-orange-600' :
                                            'bg-green-100 text-green-600'
                                        }`}>
                                        {isFull ? 'Penuh' : isLow ? `⚠ Sisa ${available}` : `${available} tersedia`}
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                                    <div
                                        className={`h-full rounded-full transition-all ${isFull ? 'bg-red-400' : isLow ? 'bg-orange-400' : 'bg-primary'
                                            }`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>

                                {/* Slot breakdown */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col items-center p-2 rounded-lg bg-green-50 border border-green-100">
                                        <span className="text-base font-bold text-green-700">{paidCount}</span>
                                        <span className="text-[10px] font-medium text-green-600 mt-0.5">✓ Lunas</span>
                                    </div>
                                    <div className="flex flex-col items-center p-2 rounded-lg bg-yellow-50 border border-yellow-100">
                                        <span className="text-base font-bold text-yellow-700">{pendingCount}</span>
                                        <span className="text-[10px] font-medium text-yellow-600 mt-0.5">⏳ Pending</span>
                                    </div>
                                    <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                                        <span className="text-base font-bold text-gray-600">{available}</span>
                                        <span className="text-[10px] font-medium text-gray-500 mt-0.5">Slot Kosong</span>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-400 mt-2 text-right">{paidCount}/{quota} slot terisi ({pct}%)</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
                <nav className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'info' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'} `}
                    >
                        <FileText size={15} /> Info Event
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'} `}
                    >
                        <Users size={15} /> Data Transaksi ({registrants.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('paid-registrants')}
                        className={`inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'paid-registrants' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'} `}
                    >
                        <CheckCircle size={15} /> Registrants Lunas ({paid.length})
                    </button>
                    {canAccessScanner && (
                        <button
                            onClick={() => setActiveTab('scanner')}
                            className={`inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'scanner' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'} `}
                        >
                            <QrCode size={15} /> Scanner Check-in
                        </button>
                    )}
                    {role === 'superadmin' && (
                        <>
                            <button
                                onClick={() => setActiveTab('wa-reminder')}
                                className={`inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'wa-reminder' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'} `}
                            >
                                <MessageCircle size={15} /> WA Reminder
                            </button>
                            <button
                                onClick={() => setActiveTab('sponsor-media')}
                                className={`inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'sponsor-media' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'} `}
                            >
                                <UserPlus size={15} /> Add Sponsor/Media
                            </button>
                        </>
                    )}
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">

                {/* ── Info Tab ─────────────────────────────────────────────── */}
                {activeTab === 'info' ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <InfoRow label="Nama Event" value={event.title} />
                                <InfoRow label="Slug / URL" value={`/e/${event.slug}`} />
                                <InfoRow label="Tanggal & Waktu" value={new Date(event.date_time).toLocaleString('id-ID', {
                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })} />
                                <InfoRow label="Lokasi" value={event.location} />
                                {event.location_detail && <InfoRow label="Detail Lokasi" value={event.location_detail} />}
                                {event.location_link && (
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Link Lokasi</p>
                                        <a href={event.location_link} target="_blank" rel="noopener noreferrer"
                                            className="text-sm text-primary hover:underline flex items-center gap-1">
                                            {event.location_link} <ExternalLink size={12} />
                                        </a>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <InfoRow label="Status" value={event.is_published ? 'Published' : 'Draft'} />
                                <InfoRow label="Minimum Donasi" value={currency(event.minimum_donation || 0)} />
                                <InfoRow label="Dibuat pada" value={new Date(event.created_at).toLocaleString('id-ID')} />
                                {event.updated_at && <InfoRow label="Terakhir diupdate" value={new Date(event.updated_at).toLocaleString('id-ID')} />}
                            </div>
                        </div>

                        {event.description && (
                            <div>
                                <p className="text-xs text-gray-500 mb-2">Deskripsi</p>
                                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
                                    <div dangerouslySetInnerHTML={{ __html: event.description }} />
                                </div>
                            </div>
                        )}

                        {/* Mini status breakdown */}
                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                            <StatPill label="Lunas" count={paid.length} color="text-green-700 bg-green-50 border-green-100" />
                            <StatPill label="Pending" count={pending.length} color="text-yellow-700 bg-yellow-50 border-yellow-100" />
                            <StatPill label="Expired" count={expired.length} color="text-red-700 bg-red-50 border-red-100" />
                        </div>
                    </div>
                ) : activeTab === 'transactions' ? (
                    <RegistrantList mode="transactions" fixedEventId={id} />
                ) : activeTab === 'paid-registrants' ? (
                    <RegistrantList mode="paid" fixedEventId={id} />
                ) : activeTab === 'scanner' && canAccessScanner ? (
                    <Scanner fixedEventId={id} />
                ) : activeTab === 'wa-reminder' && role === 'superadmin' ? (
                    <WAReminder fixedEventId={id} />
                ) : activeTab === 'sponsor-media' && role === 'superadmin' ? (
                    <ManualSponsorRegistration fixedEventId={id || ''} />
                ) : (
                    <AccessDenied />
                )}
            </div>
        </div>
    );
};

// ── Helper sub-components ────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
);

const StatPill: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
    <div className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-center ${color}`}>
        <span className="text-xl font-bold">{count}</span>
        <span className="text-xs font-medium">{label}</span>
    </div>
);
