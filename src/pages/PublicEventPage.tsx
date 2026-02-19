import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MainLayout } from '../components/layout/MainLayout';
import { EventSidebar } from '../components/features/registration/EventSidebar';
import { RegistrationForm } from '../components/features/registration/RegistrationForm';
import { Loader2 } from 'lucide-react';

export const PublicEventPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (slug) {
            fetchEvent(slug);
        }
    }, [slug]);

    const fetchEvent = async (slug: string) => {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('slug', slug)
            .eq('is_published', true)
            .single();

        if (error || !data) {
            console.error(error);
            setError(true);
        } else {
            setEvent(data);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (error || !event) {
        // Redirect to admin login or 404 page if event not found
        // For now, redirect to login or show simple 404
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
                <h1 className="text-4xl font-bold text-gray-800">Event Not Found</h1>
                <p className="text-gray-500">The event you are looking for does not exist or has been removed.</p>
                <a href="/admin/login" className="text-primary hover:underline">Go to Admin Login</a>
            </div>
        );
    }

    return (
        <MainLayout sidebar={<EventSidebar event={event} />}>
            <RegistrationForm eventId={event.id} eventName={event.title} eventSlug={event.slug} />
        </MainLayout>
    );
};
