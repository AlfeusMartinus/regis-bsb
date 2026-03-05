import React from 'react';
import { EventList } from './EventList';
import { RegistrationOverview } from './RegistrationOverview';
import { RoleManagement } from './RoleManagement';
import { AuditLogs } from './AuditLogs';
import { Analytics } from './Analytics';
import { EmailBroadcast } from './EmailBroadcast';
import { AccessDenied } from '../ui/AccessDenied';
import { Calendar, ShieldCheck, History, BarChart2, Mail } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const Dashboard: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { role, canViewAnalytics, loading } = useAuth();
    // Get tab from URL or default to 'events'
    const rawTab = searchParams.get('tab') || 'events';
    const activeTab = rawTab === 'registrants' ? 'transactions' : rawTab;

    const setTab = (tab: string) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', tab);
        setSearchParams(newParams);
    };

    if (loading) return null;

    return (
        <div className="space-y-5">
            <RegistrationOverview />

            {/* Tabs */}
            <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
                <nav className="flex flex-wrap gap-2" aria-label="Tabs">
                    <button
                        onClick={() => setTab('events')}
                        className={`group inline-flex items-center py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${activeTab === 'events' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
                    >
                        <Calendar className={`mr-2 h-4 w-4 ${activeTab === 'events' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        Events
                    </button>

                    {(role === 'superadmin' || (role === 'sponsor' && canViewAnalytics)) && (
                        <button
                            onClick={() => setTab('analytics')}
                            className={`group inline-flex items-center py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${activeTab === 'analytics' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
                        >
                            <BarChart2 className={`mr-2 h-4 w-4 ${activeTab === 'analytics' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />
                            Analytics
                        </button>
                    )}

                    {role === 'superadmin' && (
                        <button
                            onClick={() => setTab('email-broadcast')}
                            className={`group inline-flex items-center py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${activeTab === 'email-broadcast' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
                        >
                            <Mail className={`mr-2 h-4 w-4 ${activeTab === 'email-broadcast' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />
                            Email Broadcast
                        </button>
                    )}
                    {role === 'superadmin' && (
                        <>
                            <button
                                onClick={() => setTab('roles')}
                                className={`group inline-flex items-center py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${activeTab === 'roles' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                                <ShieldCheck className={`mr-2 h-4 w-4 ${activeTab === 'roles' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />
                                Role Management
                            </button>
                            <button
                                onClick={() => setTab('audit')}
                                className={`group inline-flex items-center py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${activeTab === 'audit' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                                <History className={`mr-2 h-4 w-4 ${activeTab === 'audit' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />
                                Audit Logs
                            </button>
                        </>
                    )}
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm">
                {activeTab === 'analytics' && (role === 'superadmin' || (role === 'sponsor' && canViewAnalytics)) ? (
                    <Analytics sponsorMode={role === 'sponsor'} />
                ) : activeTab === 'events' ? (
                    <EventList />
                ) : activeTab === 'email-broadcast' && role === 'superadmin' ? (
                    <EmailBroadcast />
                ) : activeTab === 'roles' && role === 'superadmin' ? (
                    <RoleManagement />
                ) : activeTab === 'audit' && role === 'superadmin' ? (
                    <AuditLogs />
                ) : (
                    <AccessDenied />
                )}
            </div>
        </div>
    );
};
