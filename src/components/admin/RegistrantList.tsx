import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Search, X, Download, Mail, CheckCheck, FileText } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

type RegistrantListMode = 'transactions' | 'paid';

interface RegistrantListProps {
    mode?: RegistrantListMode;
}

const SUCCESS_STATUSES = ['paid', 'settlement', 'success'];

export const RegistrantList: React.FC<RegistrantListProps> = ({ mode = 'transactions' }) => {
    const [registrants, setRegistrants] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [manualCheckinId, setManualCheckinId] = useState<string | null>(null);
    const [sendingTicketId, setSendingTicketId] = useState<string | null>(null);
    const [selectedRegistrant, setSelectedRegistrant] = useState<any | null>(null);
    const [isBulkSending, setIsBulkSending] = useState(false);
    const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [searchParams, setSearchParams] = useSearchParams();
    const eventId = searchParams.get('eventId') || 'all';
    const [filterEventName, setFilterEventName] = useState<string | null>(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        fetchRegistrants();

        // Realtime subscription
        const channel = supabase
            .channel('registrations-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'registrations',
                },
                (payload) => {
                    console.log('Realtime update received:', payload);
                    fetchRegistrants(); // Re-fetch data to reflect changes (e.g. status update)
                }
            )
            .subscribe();

        if (eventId !== 'all') {
            fetchEventName(eventId);
        } else {
            setFilterEventName(null);
        }

        return () => {
            supabase.removeChannel(channel);
        }
    }, [eventId, mode]);

    useEffect(() => {
        if (eventId === 'all') {
            setFilterEventName(null);
            return;
        }

        const selectedEvent = events.find((event) => event.id === eventId);
        if (selectedEvent) {
            setFilterEventName(selectedEvent.title);
        }
    }, [eventId, events]);

    const fetchEvents = async () => {
        const { data } = await supabase
            .from('events')
            .select('id, title')
            .order('title', { ascending: true });

        setEvents(data || []);
    };

    const fetchEventName = async (id: string) => {
        const { data } = await supabase.from('events').select('title').eq('id', id).single();
        if (data) setFilterEventName(data.title);
    };

    const fetchRegistrants = async () => {
        setLoading(true);
        // Fetch registrations with event details
        let query = supabase
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
            .order('created_at', { ascending: false });

        if (eventId !== 'all') {
            query = query.eq('event_id', eventId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching registrants:', error);
            fetchRegistrantsNoJoin();
        } else {
            const normalizedData = data || [];
            if (mode === 'paid') {
                setRegistrants(normalizedData.filter((reg) => SUCCESS_STATUSES.includes(reg.status?.toLowerCase())));
            } else {
                setRegistrants(normalizedData);
            }
            setLoading(false);
        }
    };

    const fetchRegistrantsNoJoin = async () => {
        // ... (existing fallback logic kept for safety, though join should work)
        // Simplified for brevity in this replace block, assuming join works as policy is fixed.
        // If needed, we can re-implement full fallback filtering later.
        let regQuery = supabase
            .from('registrations')
            .select('*')
            .order('created_at', { ascending: false });

        if (eventId !== 'all') {
            regQuery = regQuery.eq('event_id', eventId);
        }

        const { data: regs, error: regError } = await regQuery;

        if (regError) {
            setLoading(false);
            return;
        }

        const { data: events } = await supabase
            .from('events')
            .select('id, title, slug, date_time, location, location_detail, location_link');
        const eventMap = new Map(events?.map(e => [e.id, e]));
        const joined = regs?.map(r => ({
            ...r,
            events: r.event_id ? eventMap.get(r.event_id) : null
        })) || [];

        if (mode === 'paid') {
            setRegistrants(joined.filter((reg) => SUCCESS_STATUSES.includes(reg.status?.toLowerCase())));
        } else {
            setRegistrants(joined);
        }

        setLoading(false);
    }

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [checkinFilter, setCheckinFilter] = useState<string>('all');

    const statusOptions = [
        { id: 'all', label: 'All Status' },
        { id: 'success', label: 'Success' }, // paid, settlement, success
        { id: 'pending', label: 'Pending' },
        { id: 'failed', label: 'Failed' },   // failed, expired
    ];

    const checkinOptions = [
        { id: 'all', label: 'Semua Check-in' },
        { id: 'checked-in', label: 'Sudah Check-in' },
        { id: 'not-checked-in', label: 'Belum Check-in' },
    ];

    const filteredRegistrants = registrants.filter(reg => {
        const matchesSearch =
            reg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.events?.title?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (mode === 'paid') {
            if (!SUCCESS_STATUSES.includes(reg.status?.toLowerCase())) return false;

            if (checkinFilter === 'checked-in') {
                return !!reg.is_attended;
            }

            if (checkinFilter === 'not-checked-in') {
                return !reg.is_attended;
            }

            return true;
        }

        if (statusFilter === 'all') return true;

        const status = reg.status?.toLowerCase() || 'pending';
        if (statusFilter === 'success') {
            return ['paid', 'settlement', 'success'].includes(status);
        }
        if (statusFilter === 'pending') {
            return status === 'pending';
        }
        if (statusFilter === 'failed') {
            return ['failed', 'expired'].includes(status);
        }
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filteredRegistrants.length / pageSize));
    const paginatedRegistrants = filteredRegistrants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, checkinFilter, eventId, mode]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'settlement':
            case 'success':
            case 'paid':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
            case 'expired':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getCheckinColor = (isAttended: boolean) => {
        return isAttended ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
    };

    const totalPaidRegistrants = registrants.length;
    const totalCheckedIn = registrants.filter((reg) => reg.is_attended).length;
    const totalNotCheckedIn = totalPaidRegistrants - totalCheckedIn;
    const totalTransactions = registrants.length;
    const totalSuccessTransactions = registrants.filter((reg) => SUCCESS_STATUSES.includes(reg.status?.toLowerCase())).length;
    const totalPendingTransactions = registrants.filter((reg) => (reg.status?.toLowerCase() || 'pending') === 'pending').length;

    const clearFilter = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('eventId');
        setSearchParams(newParams);
    };

    const handleEventFilterChange = (value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value === 'all') {
            newParams.delete('eventId');
        } else {
            newParams.set('eventId', value);
        }
        setSearchParams(newParams);
    };

    const handleManualCheckin = async (registrationId: string) => {
        setManualCheckinId(registrationId);
        try {
            const { error } = await supabase
                .from('registrations')
                .update({ is_attended: true })
                .eq('id', registrationId);

            if (error) {
                throw error;
            }

            await fetchRegistrants();
            alert('Check-in manual berhasil disimpan.');
        } catch (error: any) {
            console.error('Failed manual check-in:', error);
            alert(error?.message || 'Gagal melakukan check-in manual.');
        } finally {
            setManualCheckinId(null);
        }
    };

    const sendTicketEmail = async (reg: any) => {
        const payload = {
            email: reg.email,
            name: reg.name,
            eventName: reg.events?.title || 'Acara',
            eventId: reg.event_id || reg.events?.id,
            ticketId: reg.ticket_id || `TICKET-${reg.id}`,
            date_time: reg.events?.date_time,
            location: reg.events?.location,
            location_detail: reg.events?.location_detail,
            location_link: reg.events?.location_link,
        };

        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const rawBody = await response.text();
        let result: any = {};
        try {
            result = rawBody ? JSON.parse(rawBody) : {};
        } catch {
            result = {};
        }

        if (!response.ok || result?.success === false) {
            const fallbackMessage = rawBody?.includes('<!doctype html')
                ? 'Endpoint /api/send-email tidak ditemukan. Jika testing lokal, jalankan dengan vercel dev atau deploy ke Vercel.'
                : `HTTP ${response.status} ${response.statusText}`;

            throw new Error(result?.message || fallbackMessage || 'Gagal kirim email tiket.');
        }
    };

    const handleResendTicket = async (reg: any) => {
        setSendingTicketId(reg.id);
        try {
            await sendTicketEmail(reg);

            alert(`Tiket berhasil dikirim ulang ke ${reg.email}.`);
        } catch (error: any) {
            console.error('Failed resend ticket:', error);
            alert(error?.message || 'Gagal mengirim ulang tiket.');
        } finally {
            setSendingTicketId(null);
        }
    };

    const handleBulkResendTicket = async () => {
        if (isBulkSending) return;

        const targets = filteredRegistrants.filter((reg) => !!reg.email);
        if (targets.length === 0) {
            alert('Tidak ada peserta pada filter saat ini yang bisa dikirimi tiket.');
            return;
        }

        const confirmed = window.confirm(`Kirim tiket ke ${targets.length} peserta sesuai filter saat ini?`);
        if (!confirmed) return;

        setIsBulkSending(true);
        setBulkProgress({ done: 0, total: targets.length });

        let successCount = 0;
        let failedCount = 0;

        for (let index = 0; index < targets.length; index += 1) {
            const reg = targets[index];
            try {
                await sendTicketEmail(reg);
                successCount += 1;
            } catch (error) {
                console.error('Bulk resend failed for:', reg.email, error);
                failedCount += 1;
            } finally {
                setBulkProgress({ done: index + 1, total: targets.length });
            }
        }

        setIsBulkSending(false);
        setBulkProgress(null);
        alert(`Bulk send selesai. Berhasil: ${successCount}, Gagal: ${failedCount}.`);
    };

    const handleExportCSV = () => {
        const headers = ['Date', 'Name', 'Email', 'Phone', 'Domicile', 'Info Source', 'Event', 'Amount', 'Status', 'Check-in', 'Gender', 'Role', 'Instansi / Kampus', 'Jabatan / Jurusan', 'Use Mouse/Keyboard External', 'Mouse Brand', 'Factors', 'Message'];
        const csvContent = [
            headers.join(','),
            ...filteredRegistrants.map(reg => {
                const row = [
                    reg.created_at ? `"${new Date(reg.created_at).toLocaleString()}"` : '-',
                    `"${reg.name?.replace(/"/g, '""') || ''}"`,
                    `"${reg.email?.replace(/"/g, '""') || ''}"`,
                    `"${reg.phone?.replace(/"/g, '""') || ''}"`,
                    `"${reg.domicile?.replace(/"/g, '""') || ''}"`,
                    `"${(reg.info_source === 'Others' ? reg.info_source_others : reg.info_source)?.replace(/"/g, '""') || ''}"`,
                    `"${reg.events?.title?.replace(/"/g, '""') || ''}"`,
                    reg.amount,
                    reg.status,
                    reg.is_attended ? 'Checked In' : 'Not Checked In',
                    `"${reg.gender?.replace(/"/g, '""') || ''}"`,
                    `"${reg.current_status?.replace(/"/g, '""') || ''}"`,
                    `"${reg.current_status === 'student' ? (reg.university?.replace(/"/g, '""') || '') : (reg.institution?.replace(/"/g, '""') || '')}"`,
                    `"${reg.current_status === 'student' ? (reg.major?.replace(/"/g, '""') || '') : (reg.role?.replace(/"/g, '""') || '')}"`,
                    reg.uses_external_peripherals ? 'YES' : 'NO',
                    `"${reg.mouse_brand?.replace(/"/g, '""') || ''}"`,
                    `"${(reg.work_device_factors?.join(', ') || '') + (reg.work_device_factors_others ? `: ${reg.work_device_factors_others}` : '')}"`,
                    `"${reg.prayer?.replace(/"/g, '""') || ''}"`
                ];
                return row.join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `registrants_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const detailItems = selectedRegistrant ? [
        { label: 'Tanggal Daftar', value: selectedRegistrant.created_at ? new Date(selectedRegistrant.created_at).toLocaleString() : '-' },
        { label: 'Nama', value: selectedRegistrant.name || '-' },
        { label: 'Email', value: selectedRegistrant.email || '-' },
        { label: 'Phone', value: selectedRegistrant.phone || '-' },
        { label: 'Domisili', value: selectedRegistrant.domicile || '-' },
        { label: 'Event', value: selectedRegistrant.events?.title || '-' },
        { label: 'Amount', value: `Rp ${(Number(selectedRegistrant.amount) || 0).toLocaleString()}` },
        { label: 'Status Pembayaran', value: selectedRegistrant.status || '-' },
        { label: 'Status Check-in', value: selectedRegistrant.is_attended ? 'Checked-in' : 'Belum' },
        { label: 'Gender', value: selectedRegistrant.gender || '-' },
        { label: 'Role', value: selectedRegistrant.current_status || '-' },
        { label: 'Instansi / Kampus', value: selectedRegistrant.current_status === 'student' ? (selectedRegistrant.university || '-') : (selectedRegistrant.institution || '-') },
        { label: 'Jabatan / Jurusan', value: selectedRegistrant.current_status === 'student' ? (selectedRegistrant.major || '-') : (selectedRegistrant.role || '-') },
        { label: 'Info Source', value: selectedRegistrant.info_source === 'Others' ? selectedRegistrant.info_source_others : (selectedRegistrant.info_source || '-') },
        { label: 'Perangkat External', value: selectedRegistrant.uses_external_peripherals ? 'YES' : 'NO' },
        { label: 'Mouse Brand', value: selectedRegistrant.mouse_brand || '-' },
        { label: 'Factors', value: (selectedRegistrant.work_device_factors?.join(', ') || '-') + (selectedRegistrant.work_device_factors_others ? ` (${selectedRegistrant.work_device_factors_others})` : '') },
        { label: 'Message', value: selectedRegistrant.prayer || '-' },
    ] : [];

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div>
            <div className="flex flex-col gap-4 mb-6">
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {mode === 'transactions' ? 'Transaksi' : 'Registrants'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {mode === 'transactions'
                            ? 'Pantau status pembayaran dan nilai transaksi per event.'
                            : 'Kelola peserta untuk kebutuhan check-in event.'}
                    </p>
                    {filterEventName && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium max-w-full">
                            <span className="truncate">Event: {filterEventName}</span>
                            <button
                                onClick={clearFilter}
                                className="text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-red-50 transition-colors"
                                title="Clear Filter"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 w-full">
                        <select
                            className="h-10 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white w-full sm:min-w-[220px]"
                            value={eventId}
                            onChange={(e) => handleEventFilterChange(e.target.value)}
                        >
                            <option value="all">Semua Event</option>
                            {events.map((event) => (
                                <option key={event.id} value={event.id}>{event.title}</option>
                            ))}
                        </select>
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search name, email, event..."
                                className="h-10 pl-10 pr-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full sm:min-w-[220px]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleExportCSV}
                            className="h-10 flex items-center justify-center gap-2 bg-green-600 text-white px-4 rounded-lg font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
                        >
                            <Download size={18} />
                            Export CSV
                        </button>
                        {mode === 'paid' && (
                            <button
                                onClick={handleBulkResendTicket}
                                disabled={isBulkSending || filteredRegistrants.length === 0}
                                className="h-10 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-60"
                            >
                                {isBulkSending ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                                {isBulkSending && bulkProgress
                                    ? `Mengirim ${bulkProgress.done}/${bulkProgress.total}`
                                    : 'Bulk Send Ticket'}
                            </button>
                        )}
                        {mode === 'paid' && eventId !== 'all' && (
                            <Link
                                to={`/admin/dashboard?tab=scanner&eventId=${eventId}`}
                                className="h-10 flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors whitespace-nowrap"
                            >
                                Buka Scanner Event Ini
                            </Link>
                        )}
                </div>

                {/* Status Filter Chips */}
                {mode === 'transactions' && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                                <p className="text-xs text-gray-500">Total Transaksi</p>
                                <p className="text-xl font-bold text-gray-900">{totalTransactions}</p>
                            </div>
                            <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                                <p className="text-xs text-green-700">Pembayaran Berhasil</p>
                                <p className="text-xl font-bold text-green-900">{totalSuccessTransactions}</p>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3">
                                <p className="text-xs text-yellow-700">Pending</p>
                                <p className="text-xl font-bold text-yellow-900">{totalPendingTransactions}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {statusOptions.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setStatusFilter(option.id)}
                                    className={`
                                        px-4 py-2 rounded-full text-sm font-medium transition-colors border
                                        ${statusFilter === option.id
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}
                                    `}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {mode === 'paid' && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                                <p className="text-xs text-gray-500">Total Registrants Lunas</p>
                                <p className="text-xl font-bold text-gray-900">{totalPaidRegistrants}</p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
                                <p className="text-xs text-emerald-700">Sudah Check-in</p>
                                <p className="text-xl font-bold text-emerald-900">{totalCheckedIn}</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                                <p className="text-xs text-amber-700">Belum Check-in</p>
                                <p className="text-xl font-bold text-amber-900">{totalNotCheckedIn}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {checkinOptions.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setCheckinFilter(option.id)}
                                    className={`
                                        px-4 py-2 rounded-full text-sm font-medium transition-colors border
                                        ${checkinFilter === option.id
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}
                                    `}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Event</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Check-in</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRegistrants.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                    No registrants found.
                                </td>
                            </tr>
                        ) : (
                            paginatedRegistrants.map((reg) => (
                                <tr key={reg.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {reg.created_at ? new Date(reg.created_at).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {reg.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {reg.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {reg.events?.title || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        Rp {reg.amount?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(reg.status)}`}>
                                            {reg.status || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getCheckinColor(!!reg.is_attended)}`}>
                                            {reg.is_attended ? 'Checked-in' : 'Belum'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex flex-col gap-2 min-w-[180px]">
                                            <button
                                                onClick={() => setSelectedRegistrant(reg)}
                                                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                            >
                                                <FileText size={14} />
                                                Detail
                                            </button>

                                            {mode === 'paid' && (
                                                <>
                                                    <button
                                                        onClick={() => handleResendTicket(reg)}
                                                        disabled={sendingTicketId === reg.id}
                                                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                                                    >
                                                        {sendingTicketId === reg.id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <Mail size={14} />
                                                        )}
                                                        Kirim Tiket
                                                    </button>

                                                    <button
                                                        onClick={() => handleManualCheckin(reg.id)}
                                                        disabled={!!reg.is_attended || manualCheckinId === reg.id}
                                                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                                    >
                                                        {manualCheckinId === reg.id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <CheckCheck size={14} />
                                                        )}
                                                        {reg.is_attended ? 'Sudah Check-in' : 'Check-in Manual'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold text-gray-900">
                        {mode === 'transactions' ? (
                            <>
                                <tr>
                                    <td colSpan={4} className="px-6 py-3 text-right">Total Amount (All Status):</td>
                                    <td className="px-6 py-3 whitespace-nowrap">
                                        Rp {filteredRegistrants.reduce((sum, reg) => sum + (Number(reg.amount) || 0), 0).toLocaleString()}
                                    </td>
                                    <td colSpan={3}></td>
                                </tr>
                                <tr className="bg-green-50 text-green-900">
                                    <td colSpan={4} className="px-6 py-3 text-right">Total Settle Amount:</td>
                                    <td className="px-6 py-3 whitespace-nowrap font-bold">
                                        Rp {filteredRegistrants
                                            .filter(reg => SUCCESS_STATUSES.includes(reg.status?.toLowerCase()))
                                            .reduce((sum, reg) => sum + (Number(reg.amount) || 0), 0)
                                            .toLocaleString()}
                                    </td>
                                    <td colSpan={3}></td>
                                </tr>
                            </>
                        ) : (
                            <tr className="bg-green-50 text-green-900">
                                <td colSpan={4} className="px-6 py-3 text-right">Total Paid Amount:</td>
                                <td className="px-6 py-3 whitespace-nowrap font-bold">
                                    Rp {filteredRegistrants
                                        .reduce((sum, reg) => sum + (Number(reg.amount) || 0), 0)
                                        .toLocaleString()}
                                </td>
                                <td colSpan={3}></td>
                            </tr>
                        )}
                    </tfoot>
                </table>
            </div>

            {filteredRegistrants.length > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-gray-600">
                        Menampilkan {(currentPage - 1) * pageSize + 1}
                        -{Math.min(currentPage * pageSize, filteredRegistrants.length)} dari {filteredRegistrants.length} data
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Prev
                        </button>

                        <span className="text-sm text-gray-700 px-2">
                            Halaman {currentPage} / {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {selectedRegistrant && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Detail Registrant</h3>
                            <button
                                onClick={() => setSelectedRegistrant(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(85vh-72px)]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {detailItems.map((item) => (
                                    <div key={item.label} className="border border-gray-200 rounded-lg p-3">
                                        <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                                        <p className="text-sm font-medium text-gray-900 break-words">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
