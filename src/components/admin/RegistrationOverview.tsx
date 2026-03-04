import React, { useEffect, useMemo, useState } from 'react';
import { Users, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const SUCCESS_STATUSES = ['paid', 'settlement', 'success'];

export const RegistrationOverview: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [registrations, setRegistrations] = useState<any[]>([]);

    const fetchOverviewData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('registrations')
            .select('id, status, is_attended');

        if (error) {
            console.error('Failed to fetch registration overview:', error);
            setRegistrations([]);
            setLoading(false);
            return;
        }

        setRegistrations(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchOverviewData();

        const channel = supabase
            .channel('registration-overview-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'registrations',
                },
                () => {
                    fetchOverviewData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const metrics = useMemo(() => {
        const totalRegistrants = registrations.length;
        const paidRegistrants = registrations.filter((reg) => SUCCESS_STATUSES.includes(reg.status?.toLowerCase()));
        const pendingPayments = Math.max(0, totalRegistrants - paidRegistrants.length);
        const paymentRate = totalRegistrants > 0 ? Math.round((paidRegistrants.length / totalRegistrants) * 100) : 0;

        return {
            totalRegistrants,
            paidRegistrants: paidRegistrants.length,
            pendingPayments,
            paymentRate,
        };
    }, [registrations]);

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={20} />
            </div>
        );
    }

    const cards = [
        {
            title: 'Total Pendaftar',
            value: metrics.totalRegistrants,
            note: `${metrics.pendingPayments} belum bayar`,
            icon: Users,
            accent: 'text-blue-600 bg-blue-50',
        },
        {
            title: 'Pembayaran Berhasil',
            value: metrics.paidRegistrants,
            note: `${metrics.paymentRate}% konversi pembayaran`,
            icon: CreditCard,
            accent: 'text-green-600 bg-green-50',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div key={card.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">{card.title}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value.toLocaleString()}</p>
                                <p className="text-xs text-gray-500 mt-1">{card.note}</p>
                            </div>
                            <div className={`size-10 rounded-lg flex items-center justify-center ${card.accent}`}>
                                <Icon size={20} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
