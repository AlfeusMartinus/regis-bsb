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
export const Analytics: React.FC = () => {
    const [loading, setLoading] = useState(true);

    // raw data
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const [{ data: regs }, { data: evs }] = await Promise.all([
            supabase.from('registrations').select('id, created_at, status, amount, event_id, gender, domicile, current_status'),
            supabase.from('events').select('id, title, is_published'),
        ]);
        setRegistrations(regs || []);
        setEvents(evs || []);
        setLoading(false);
    };

    // ── Derived metrics ──────────────────────────────────────────────────────
    const SUCCESS = ['paid', 'settlement', 'success'];
    const paid = registrations.filter(r => SUCCESS.includes(r.status?.toLowerCase()));
    const pending = registrations.filter(r => (r.status?.toLowerCase() || 'pending') === 'pending');
    const failed = registrations.filter(r => ['failed', 'expired'].includes(r.status?.toLowerCase()));

    const totalRevenue = paid.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const conversionRate = registrations.length
        ? Math.round((paid.length / registrations.length) * 100)
        : 0;

    const statCards = [
        { label: 'Total Registrasi', value: registrations.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Total Revenue', value: currency(totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Pembayaran Lunas', value: paid.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    ];

    // ── 1. Daily Registrations (last 30 days) ────────────────────────────────
    const dailyMap: Record<string, { registrations: number; revenue: number }> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        dailyMap[key] = { registrations: 0, revenue: 0 };
    }
    registrations.forEach(r => {
        const d = new Date(r.created_at);
        const key = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        if (dailyMap[key]) {
            dailyMap[key].registrations += 1;
            if (SUCCESS.includes(r.status?.toLowerCase())) {
                dailyMap[key].revenue += Number(r.amount) || 0;
            }
        }
    });
    const dailyData = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v }));

    // ── 2. Payment Status Donut ──────────────────────────────────────────────
    const statusData = [
        { name: 'Lunas', value: paid.length },
        { name: 'Pending', value: pending.length },
        { name: 'Gagal', value: failed.length },
    ].filter(d => d.value > 0);

    // ── 3. Per-Event Registrants ─────────────────────────────────────────────
    const eventMap: Record<string, { title: string; paid: number; pending: number; failed: number }> = {};
    events.forEach(e => {
        eventMap[e.id] = { title: e.title.length > 28 ? e.title.slice(0, 26) + '…' : e.title, paid: 0, pending: 0, failed: 0 };
    });
    registrations.forEach(r => {
        if (!eventMap[r.event_id]) return;
        const s = r.status?.toLowerCase() || 'pending';
        if (SUCCESS.includes(s)) eventMap[r.event_id].paid++;
        else if (s === 'pending') eventMap[r.event_id].pending++;
        else if (['failed', 'expired'].includes(s)) eventMap[r.event_id].failed++;
    });
    const perEventData = Object.values(eventMap);

    // ── 4. Gender Breakdown ──────────────────────────────────────────────────
    const genderCount: Record<string, number> = {};
    registrations.forEach(r => {
        const g = r.gender || 'Tidak diisi';
        genderCount[g] = (genderCount[g] || 0) + 1;
    });
    const genderData = Object.entries(genderCount).map(([name, value]) => ({ name, value }));

    // ── 5. Top Domicile ──────────────────────────────────────────────────────
    const domicileCount: Record<string, number> = {};
    registrations.forEach(r => {
        const d = r.domicile?.trim() || 'Tidak diisi';
        domicileCount[d] = (domicileCount[d] || 0) + 1;
    });
    const domicileData = Object.entries(domicileCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }));

    // ── 6. Peserta Role (student / professional / etc) ───────────────────────
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

            {/* Area Chart — Daily Trend */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4">Tren Registrasi Harian (30 hari terakhir)</h3>
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <defs>
                            <linearGradient id="gradReg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} interval={4} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                            tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area yAxisId="left" type="monotone" dataKey="registrations" name="Registrasi"
                            stroke="#6366f1" fill="url(#gradReg)" strokeWidth={2} dot={false} />
                        <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue (Rp)"
                            stroke="#10b981" fill="url(#gradRev)" strokeWidth={2} dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
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
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="paid" name="Lunas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="pending" name="Pending" stackId="a" fill="#f59e0b" />
                            <Bar dataKey="failed" name="Gagal" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Donut */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
                    <h3 className="font-semibold text-gray-800 mb-4">Status Pembayaran</h3>
                    <div className="flex-1 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={85}
                                    paddingAngle={3} dataKey="value"
                                >
                                    {statusData.map((_, i) => (
                                        <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: any) => [`${v} peserta`]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {statusData.map((d, i) => (
                            <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS_PIE[i] }} />
                                {d.name}: <span className="font-semibold text-gray-800">{d.value}</span>
                            </div>
                        ))}
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
