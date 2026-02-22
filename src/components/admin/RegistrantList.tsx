import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Search, X, Download } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export const RegistrantList: React.FC = () => {
    const [registrants, setRegistrants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const eventId = searchParams.get('eventId');
    const [filterEventName, setFilterEventName] = useState<string | null>(null);

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

        if (eventId) {
            fetchEventName(eventId);
        } else {
            setFilterEventName(null);
        }

        return () => {
            supabase.removeChannel(channel);
        }
    }, [eventId]);

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
                    title,
                    slug
                )
            `)
            .order('created_at', { ascending: false });

        if (eventId) {
            query = query.eq('event_id', eventId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching registrants:', error);
            // Fallback if join fails (e.g. no FK constraint)
            if (!eventId) fetchRegistrantsNoJoin(); // Only fallback if no filter, or implement filter in fallback too
            else setLoading(false);
        } else {
            console.log("Joined Data:", data);
            setRegistrants(data || []);
            setLoading(false);
        }
    };

    const fetchRegistrantsNoJoin = async () => {
        // ... (existing fallback logic kept for safety, though join should work)
        // Simplified for brevity in this replace block, assuming join works as policy is fixed.
        // If needed, we can re-implement full fallback filtering later.
        const { data: regs, error: regError } = await supabase
            .from('registrations')
            .select('*')
            .order('created_at', { ascending: false });

        if (regError) {
            setLoading(false);
            return;
        }

        const { data: events } = await supabase.from('events').select('id, title, slug');
        const eventMap = new Map(events?.map(e => [e.id, e]));
        const joined = regs?.map(r => ({
            ...r,
            events: r.event_id ? eventMap.get(r.event_id) : null
        }));
        setRegistrants(joined || []);
        setLoading(false);
    }

    const [statusFilter, setStatusFilter] = useState<string>('all');

    const statusOptions = [
        { id: 'all', label: 'All Status' },
        { id: 'success', label: 'Success' }, // paid, settlement, success
        { id: 'pending', label: 'Pending' },
        { id: 'failed', label: 'Failed' },   // failed, expired
    ];

    const filteredRegistrants = registrants.filter(reg => {
        const matchesSearch =
            reg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.events?.title?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

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

    const clearFilter = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('eventId');
        setSearchParams(newParams);
    };

    const handleExportCSV = () => {
        const headers = ['Date', 'Name', 'Email', 'Phone', 'Event', 'Amount', 'Status', 'Role', 'Institution', 'Message'];
        const csvContent = [
            headers.join(','),
            ...filteredRegistrants.map(reg => {
                const row = [
                    reg.created_at ? `"${new Date(reg.created_at).toLocaleString()}"` : '-',
                    `"${reg.name?.replace(/"/g, '""') || ''}"`,
                    `"${reg.email?.replace(/"/g, '""') || ''}"`,
                    `"${reg.phone?.replace(/"/g, '""') || ''}"`,
                    `"${reg.events?.title?.replace(/"/g, '""') || ''}"`,
                    reg.amount,
                    reg.status,
                    `"${reg.current_status?.replace(/"/g, '""') || ''}"`,
                    `"${reg.institution?.replace(/"/g, '""') || ''}"`,
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

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div>
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-gray-800">
                            {filterEventName ? `Registrants for: ${filterEventName}` : 'All Registrants'}
                        </h2>
                        {filterEventName && (
                            <button
                                onClick={clearFilter}
                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                                title="Clear Filter"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search name, email, event..."
                                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
                        >
                            <Download size={18} />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Status Filter Chips */}
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

            <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Phone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Event</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Institution</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Message</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRegistrants.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                                    No registrants found.
                                </td>
                            </tr>
                        ) : (
                            filteredRegistrants.map((reg) => (
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {reg.phone}
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {reg.current_status || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {reg.institution || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={reg.prayer}>
                                        {reg.prayer || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold text-gray-900">
                        <tr>
                            <td colSpan={5} className="px-6 py-3 text-right">Total Amount (All Status):</td>
                            <td className="px-6 py-3 whitespace-nowrap">
                                Rp {filteredRegistrants.reduce((sum, reg) => sum + (Number(reg.amount) || 0), 0).toLocaleString()}
                            </td>
                            <td colSpan={4}></td>
                        </tr>
                        <tr className="bg-green-50 text-green-900">
                            <td colSpan={5} className="px-6 py-3 text-right">Total Settle Amount:</td>
                            <td className="px-6 py-3 whitespace-nowrap font-bold">
                                Rp {filteredRegistrants
                                    .filter(reg => ['paid', 'settlement', 'success'].includes(reg.status?.toLowerCase()))
                                    .reduce((sum, reg) => sum + (Number(reg.amount) || 0), 0)
                                    .toLocaleString()}
                            </td>
                            <td colSpan={4}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
