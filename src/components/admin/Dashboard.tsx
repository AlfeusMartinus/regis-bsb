import React from 'react';
import { EventList } from './EventList';
import { RegistrantList } from './RegistrantList';
import { Scanner } from './Scanner';
import { RegistrationOverview } from './RegistrationOverview';
import { Calendar, Users, QrCode } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export const Dashboard: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    // Get tab from URL or default to 'events'
    const rawTab = searchParams.get('tab') || 'events';
    const activeTab = rawTab === 'registrants' ? 'transactions' : rawTab;

    const setTab = (tab: string) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', tab);
        setSearchParams(newParams);
    };

    return (
        <div className="space-y-5">
            <RegistrationOverview />

            {/* Tabs */}
            <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
                <nav className="flex flex-wrap gap-2" aria-label="Tabs">
                    <button
                        onClick={() => setTab('events')}
                        className={`
                            group inline-flex items-center py-2.5 px-4 rounded-lg font-medium text-sm transition-colors
                            ${activeTab === 'events'
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}
                        `}
                    >
                        <Calendar
                            className={`
                                mr-2 h-4 w-4
                                ${activeTab === 'events' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}
                            `}
                        />
                        Events
                    </button>

                    <button
                        onClick={() => setTab('transactions')}
                        className={`
                            group inline-flex items-center py-2.5 px-4 rounded-lg font-medium text-sm transition-colors
                            ${activeTab === 'transactions'
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}
                        `}
                    >
                        <Users
                            className={`
                                mr-2 h-4 w-4
                                ${activeTab === 'transactions' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}
                            `}
                        />
                        Data Transaksi
                    </button>

                    <button
                        onClick={() => setTab('paid-registrants')}
                        className={`
                            group inline-flex items-center py-2.5 px-4 rounded-lg font-medium text-sm transition-colors
                            ${activeTab === 'paid-registrants'
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}
                        `}
                    >
                        <Users
                            className={`
                                mr-2 h-4 w-4
                                ${activeTab === 'paid-registrants' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}
                            `}
                        />
                        Registrants
                    </button>

                    <button
                        onClick={() => setTab('scanner')}
                        className={`
                            group inline-flex items-center py-2.5 px-4 rounded-lg font-medium text-sm transition-colors
                            ${activeTab === 'scanner'
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}
                        `}
                    >
                        <QrCode
                            className={`
                                mr-2 h-4 w-4
                                ${activeTab === 'scanner' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}
                            `}
                        />
                        Scanner
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm">
                {activeTab === 'events' && <EventList />}
                {activeTab === 'transactions' && <RegistrantList mode="transactions" />}
                {activeTab === 'paid-registrants' && <RegistrantList mode="paid" />}
                {activeTab === 'scanner' && <Scanner />}
            </div>
        </div>
    );
};
