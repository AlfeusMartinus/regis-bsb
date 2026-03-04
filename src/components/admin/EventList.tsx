import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Loader2, Plus, ExternalLink, Calendar, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDialog } from '../ui/DialogContext';

export const EventList: React.FC = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { role, loading: authLoading } = useAuth();
    const { showAlert, showConfirm } = useDialog();

    useEffect(() => {
        if (!authLoading) {
            fetchEvents();
        }
    }, [role, authLoading]);

    const fetchEvents = async () => {
        let query = supabase
            .from('events')
            .select('*')
            .order('created_at', { ascending: false });

        if (role === 'sponsor') {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) {
                setEvents([]);
                setLoading(false);
                return;
            }
            const { data: myEvents } = await supabase.from('sponsor_events').select('event_id').eq('user_id', userId);
            const myEventIds = myEvents?.map(e => e.event_id) || [];
            if (myEventIds.length === 0) {
                setEvents([]);
                setLoading(false);
                return;
            }
            query = query.in('id', myEventIds);
        }

        const { data: eventsData, error: eventsError } = await query;

        if (eventsError) {
            console.error(eventsError);
            setLoading(false);
            return;
        }

        // 2. Fetch all registration counts grouped by event_id manually
        const { data: regData, error: regError } = await supabase
            .from('registrations')
            .select('event_id');

        if (regError) {
            console.error(regError);
            setEvents(eventsData || []);
            setLoading(false);
            return;
        }

        // Count occurrences
        const counts: Record<string, number> = {};
        regData?.forEach((reg: any) => {
            if (reg.event_id) {
                counts[reg.event_id] = (counts[reg.event_id] || 0) + 1;
            }
        });

        // Merge counts into events
        const eventsWithCounts = eventsData?.map((event) => ({
            ...event,
            registrant_count: counts[event.id] || 0
        }));

        setEvents(eventsWithCounts || []);
        setLoading(false);
    };

    const handleTogglePublish = async (eventId: string, currentValue: boolean) => {
        const action = currentValue ? 'jadikan Draft' : 'Publish';
        const isConfirmed = await showConfirm(`Yakin ingin ${action} event ini?`);
        if (!isConfirmed) return;

        const { error } = await supabase
            .from('events')
            .update({ is_published: !currentValue })
            .eq('id', eventId);

        if (error) {
            console.error('Failed to toggle publish:', error);
            await showAlert({ message: 'Gagal mengubah status event.', severity: 'error' });
        } else {
            // Update local state instantly without full re-fetch
            setEvents(prev => prev.map(e =>
                e.id === eventId ? { ...e, is_published: !currentValue } : e
            ));
        }
    };

    const handleDelete = async (eventId: string) => {
        const isConfirmed = await showConfirm('Are you sure you want to delete this event?');
        if (isConfirmed) {
            const { error } = await supabase.from('events').delete().eq('id', eventId);
            if (error) {
                console.error("Failed to delete", error);
                await showAlert({ message: "Failed to delete event.", severity: "error" });
            } else {
                fetchEvents();
            }
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    const totalEvents = events.length;
    const publishedEvents = events.filter((event) => event.is_published).length;
    const draftEvents = totalEvents - publishedEvents;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Events</h2>
                    <p className="text-sm text-gray-500 mt-1">Kelola jadwal event dan pantau jumlah registrasi per event.</p>
                </div>
                {role === 'superadmin' && (
                    <Link
                        to="/admin/events/create"
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                    >
                        <Plus size={20} />
                        New Event
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
                <div className="border border-gray-200 rounded-lg px-4 py-3 bg-white">
                    <p className="text-xs text-gray-500">Total Event</p>
                    <p className="text-xl font-bold text-gray-900">{totalEvents}</p>
                </div>
                <div className="border border-gray-200 rounded-lg px-4 py-3 bg-white">
                    <p className="text-xs text-gray-500">Published</p>
                    <p className="text-xl font-bold text-emerald-700">{publishedEvents}</p>
                </div>
                <div className="border border-gray-200 rounded-lg px-4 py-3 bg-white">
                    <p className="text-xs text-gray-500">Draft</p>
                    <p className="text-xl font-bold text-amber-700">{draftEvents}</p>
                </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrants</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {events.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No events found. Create your first one!
                                </td>
                            </tr>
                        ) : (
                            events.map((event) => (
                                <tr key={event.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{event.title}</div>
                                        <div className="text-sm text-gray-500">/e/{event.slug}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-gray-500">
                                            <Calendar size={16} className="mr-2" />
                                            {new Date(event.date_time).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Link
                                            to={`/admin/dashboard?tab=transactions&eventId=${event.id}`}
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                                            title="View Registrants"
                                        >
                                            {event.registrant_count} Registrants
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {event.location}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {role === 'superadmin' ? (
                                            <button
                                                onClick={() => handleTogglePublish(event.id, event.is_published)}
                                                title={event.is_published ? 'Klik untuk jadikan Draft' : 'Klik untuk Publish'}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${event.is_published ? 'bg-green-500' : 'bg-gray-300'
                                                    }`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${event.is_published ? 'translate-x-6' : 'translate-x-1'
                                                    }`} />
                                            </button>
                                        ) : (
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${event.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {event.is_published ? 'Published' : 'Draft'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-3">
                                            <a href={`/e/${event.slug}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700" title="View Public Page">
                                                <ExternalLink size={16} />
                                            </a>
                                            {role === 'superadmin' && (
                                                <>
                                                    <Link to={`/admin/events/edit/${event.id}`} className="text-indigo-600 hover:text-indigo-900" title="Edit Event">
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button onClick={() => handleDelete(event.id)} className="text-red-600 hover:text-red-900" title="Delete Event">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
