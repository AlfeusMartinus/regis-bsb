import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Loader2, Plus, ExternalLink, Calendar, Edit } from 'lucide-react';

export const EventList: React.FC = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        // 1. Fetch all events
        const { data: eventsData, error: eventsError } = await supabase
            .from('events')
            .select('*')
            .order('created_at', { ascending: false });

        if (eventsError) {
            console.error(eventsError);
            setLoading(false);
            return;
        }

        // 2. Fetch all registration counts grouped by event_id manually
        // We fetch all 'event_id' from registrations to count them.
        // Optimized: .select('event_id', { count: 'exact' }) gives total count, not grouped.
        // So we might need to fetch all 'event_id' (lightweight) and count in JS.
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

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Your Events</h2>
                <Link
                    to="/admin/events/create"
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                >
                    <Plus size={20} />
                    New Event
                </Link>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
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
                                            to={`/admin/dashboard?tab=registrants&eventId=${event.id}`}
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
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${event.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {event.is_published ? 'Published' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-3">
                                            <a href={`/e/${event.slug}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700" title="View Public Page">
                                                <ExternalLink size={16} />
                                            </a>
                                            <Link to={`/admin/events/edit/${event.id}`} className="text-indigo-600 hover:text-indigo-900" title="Edit Event">
                                                <Edit size={16} />
                                            </Link>
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
