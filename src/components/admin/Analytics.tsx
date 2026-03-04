import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, TrendingUp, Users, DollarSign, CheckCircle } from 'lucide-react';
import {
    AreaChart, Area,
    BarChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
} from 'recharts';

// ─── Colour Palettes ────────────────────────────────────────────────────────
const COLORS_PIE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const COLORS_EVENT = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// ─── Tooltip helpers ─────────────────────────────────────────────────────────
const currency = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-lg px-4 py-3 text-sm">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color }} className="flex gap-2">
                    <span className="font-medium">{p.name}:</span>
                    <span>{typeof p.value === 'number' && p.name.toLowerCase().includes('revenue')
                        ? currency(p.value)
                        : p.value}</span>
                </p>
            ))}
        </div>
    );
};

// ─── Component ───────────────────────────────────────────────────────────────
interface AnalyticsProps {
    sponsorMode?: boolean;
}

export const Analytics: React.FC<AnalyticsProps> = ({ sponsorMode = false }) => {
    const [loading, setLoading] = useState(true);
    const [settledRange, setSettledRange] = useState<1 | 7 | 15 | 30>(7);

    // raw data
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);

        // For sponsor: first get their assigned event IDs to scope the data
        let eventFilter: string[] | null = null;
        if (sponsorMode) {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (userId) {
                const { data: seData } = await supabase
                    .from('sponsor_events')
                    .select('event_id')
                    .eq('user_id', userId);
                eventFilter = (seData || []).map((r: any) => r.event_id);
            }
        }

        const settlementStatuses = ['paid', 'settlement', 'success'];
        let regsQuery = supabase
            .from('registrations')
            .select('id, created_at, status, amount, event_id, gender, domicile, current_status')
            .in('status', settlementStatuses);
        if (eventFilter && eventFilter.length > 0) {
            regsQuery = regsQuery.in('event_id', eventFilter);
        } else if (sponsorMode) {
            // No events assigned — return empty
            setRegistrations([]);
            setEvents([]);
            setLoading(false);
            return;
        }

        let eventsQuery = supabase.from('events').select('id, title, is_published');
        if (eventFilter && eventFilter.length > 0) {
            eventsQuery = eventsQuery.in('id', eventFilter);
        }

        const [{ data: regs }, { data: evs }] = await Promise.all([regsQuery, eventsQuery]);
        setRegistrations(regs || []);
        setEvents(evs || []);
        setLoading(false);
    };

    // ── Derived metrics (settlement only) ───────────────────────────────────
    // `registrations` already contains only paid/settlement/success rows (filtered in query)
    const totalRevenue = registrations.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalSettled = registrations.length;

    const statCards = [
        { label: 'Peserta Lunas', value: totalSettled, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Total Revenue', value: currency(totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Rata-rata Donasi', value: totalSettled ? currency(Math.round(totalRevenue / totalSettled)) : 'Rp 0', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Pembayaran Lunas', value: totalSettled, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    ];

    // ── 1. Trend data helpers ─────────────────────────────────────────────────
    const now = new Date();
    const RANGE_OPTIONS: { value: 1 | 7 | 15 | 30; label: string }[] = [
        { value: 30, label: '30 Hari' },
        { value: 15, label: '15 Hari' },
        { value: 7, label: '7 Hari' },
        { value: 1, label: 'Hari Ini' },
    ];

    const buildKeys = (range: 1 | 7 | 15 | 30) => {
        if (range === 1) {
            return Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
        }
        return Array.from({ length: range }, (_, i) => {
            const d = new Date(now);
            d.setDate(d.getDate() - (range - 1 - i));
            return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        });
    };
    const getKey = (dateStr: string, range: 1 | 7 | 15 | 30) => {
        const d = new Date(dateStr);
        if (range === 1) return `${String(d.getHours()).padStart(2, '0')}:00`;
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    };
    const xInterval = (range: 1 | 7 | 15 | 30) =>
        range === 30 ? 4 : range === 15 ? 2 : range === 7 ? 0 : 2;

    // Settlement trend chart data
    const settledKeys = buildKeys(settledRange);
    const settledMap: Record<string, { registrants: number; revenue: number }> = {};
    settledKeys.forEach(k => { settledMap[k] = { registrants: 0, revenue: 0 }; });
    registrations.forEach(r => {
        const k = getKey(r.created_at, settledRange);
        if (!settledMap[k]) return;
        settledMap[k].registrants += 1;
        settledMap[k].revenue += Number(r.amount) || 0;
    });
    const settledData = Object.entries(settledMap).map(([date, v]) => ({ date, ...v }));

    // All-time trend (same data, different range selector)
    const allTxMap: Record<string, { registrants: number; revenue: number }> = {};
    registrations.forEach(r => {
        const k = getKey(r.created_at, settledRange);
        if (!allTxMap[k]) return;
        allTxMap[k].registrants += 1;
        allTxMap[k].revenue += Number(r.amount) || 0;
    });

    // Shared dropdown style
    const selectCls = 'text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer';

    // ── 3. Per-Event Registrants (settled only) ──────────────────────────────
    const eventMap: Record<string, { title: string; settled: number; revenue: number }> = {};
    events.forEach(e => {
        eventMap[e.id] = { title: e.title.length > 28 ? e.title.slice(0, 26) + '…' : e.title, settled: 0, revenue: 0 };
    });
    registrations.forEach(r => {
        if (!eventMap[r.event_id]) return;
        eventMap[r.event_id].settled++;
        eventMap[r.event_id].revenue += Number(r.amount) || 0;
    });
    const perEventData = Object.values(eventMap);

    // ── 4. Gender Breakdown (settled only) ──────────────────────────────────
    const genderCount: Record<string, number> = {};
    registrations.forEach(r => {
        const g = r.gender || 'Tidak diisi';
        genderCount[g] = (genderCount[g] || 0) + 1;
    });
    const genderData = Object.entries(genderCount).map(([name, value]) => ({ name, value }));

    // ── 5. Top Domicile (settled only) ──────────────────────────────────────
    const domicileCount: Record<string, number> = {};
    registrations.forEach(r => {
        const d = r.domicile?.trim() || 'Tidak diisi';
        domicileCount[d] = (domicileCount[d] || 0) + 1;
    });
    const domicileData = Object.entries(domicileCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }));

    // ── 6. Peserta Role (settled only) ──────────────────────────────────────
    const roleCount: Record<string, number> = {};
    registrations.forEach(r => {
        const s = r.current_status || 'Tidak diisi';
        roleCount[s] = (roleCount[s] || 0) + 1;
    });
    const roleData = Object.entries(roleCount).map(([name, value]) => ({ name, value }));

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-primary" size={32} />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Analytics</h2>
                <p className="text-sm text-gray-500 mt-1">Statistik dan insight keseluruhan event Anda.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {statCards.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
                        <div className={`${bg} rounded-xl p-3`}>
                            <Icon className={color} size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="text-lg font-bold text-gray-900">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Area Charts — split: All Transactions vs Settlement */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
                {/* Settlement Only */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-gray-800">Tren Registrant Lunas</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Hanya transaksi settlement / paid — termasuk revenue</p>
                        </div>
                        <select
                            value={settledRange}
                            onChange={e => setSettledRange(Number(e.target.value) as 1 | 7 | 15 | 30)}
                            className={selectCls}
                        >
                            {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={settledData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <defs>
                                <linearGradient id="gradSettled" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval={xInterval(settledRange)} />
                            <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Area yAxisId="left" type="monotone" dataKey="registrants" name="Registrants" stroke="#10b981" fill="url(#gradSettled)" strokeWidth={2} dot={false} />
                            <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue (Rp)" stroke="#6366f1" fill="url(#gradRevenue)" strokeWidth={1.5} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

            </div>

            {/* Row: Per Event Bar + Status Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Per Event */}
                <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-4">Registrasi per Event</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={perEventData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="title" tick={{ fontSize: 11 }} width={130} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="settled" name="Peserta Lunas" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue per Event */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
                    <h3 className="font-semibold text-gray-800 mb-4">Revenue per Event</h3>
                    <div className="flex-1 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={perEventData} layout="vertical" margin={{ left: 10, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                                <YAxis type="category" dataKey="title" tick={{ fontSize: 10 }} width={130} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                                    {perEventData.map((_: any, i: number) => (
                                        <Cell key={i} fill={COLORS_EVENT[i % COLORS_EVENT.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row: Domicile Bar + Gender Pie + Role Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Top Domicile */}
                <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-4">Top Domisili Peserta</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={domicileData} layout="vertical" margin={{ left: 5, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="value" name="Peserta" radius={[0, 4, 4, 0]}>
                                {domicileData.map((_, i) => (
                                    <Cell key={i} fill={COLORS_EVENT[i % COLORS_EVENT.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Gender Pie */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
                    <h3 className="font-semibold text-gray-800 mb-4">Demografi Gender</h3>
                    <div className="flex-1 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={genderData} cx="50%" cy="50%"
                                    outerRadius={75} dataKey="value"
                                >
                                    {genderData.map((_, i) => (
                                        <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: any) => [`${v} peserta`]} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Role / Status Peserta */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
                    <h3 className="font-semibold text-gray-800 mb-4">Role Peserta</h3>
                    <div className="flex-1 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={roleData} cx="50%" cy="50%"
                                    innerRadius={45} outerRadius={75}
                                    paddingAngle={3} dataKey="value"
                                >
                                    {roleData.map((_, i) => (
                                        <Cell key={i} fill={COLORS_EVENT[i % COLORS_EVENT.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: any) => [`${v} peserta`]} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
