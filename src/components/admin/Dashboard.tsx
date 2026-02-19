import React from 'react';
import { EventList } from './EventList';
import { RegistrantList } from './RegistrantList';
import { Calendar, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export const Dashboard: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    // Get tab from URL or default to 'events'
    const activeTab = searchParams.get('tab') || 'events';

    const setTab = (tab: string) => {
        setSearchParams({ tab });
    };

    return (
        <div className="space-y-6">

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setTab('events')}
                        className={`
                            group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'events'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <Calendar
                            className={`
                                -ml-0.5 mr-2 h-5 w-5
                                ${activeTab === 'events' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}
                            `}
                        />
                        Events
                    </button>

                    <button
                        onClick={() => setTab('registrants')}
                        className={`
                            group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'registrants'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <Users
                            className={`
                                -ml-0.5 mr-2 h-5 w-5
                                ${activeTab === 'registrants' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}
                            `}
                        />
                        Registrants
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="mt-6">
                {activeTab === 'events' && <EventList />}
                {activeTab === 'registrants' && <RegistrantList />}
            </div>
        </div>
    );
};
