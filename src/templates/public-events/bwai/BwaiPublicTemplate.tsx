import React, { useState } from 'react';
import { MainLayout } from '../../../components/layout/MainLayout';
import { EventSidebar } from '../../../components/features/registration/EventSidebar';
import { RegistrationForm } from '../../../components/features/registration/RegistrationForm';
import { EventThemeProvider } from '../../../themes/EventThemeProvider';
import { bwaiTheme } from '../../../themes/events/bwai/bwaiTheme';
import type { SessionKey } from '../../../components/features/registration/SessionSelector';
import type { PublicEventTemplateProps } from '../types';

/**
 * Template publik untuk event `bwAI (build with ai)`.
 *
 * Catatan: saat ini masih memakai komponen layout publik yang sudah ada
 * (agar logic input/payment tidak berubah). Nanti ketika layout form baru dibuat,
 * komponen form/section tinggal diganti di file ini saja.
 */
export const BwaiPublicTemplate: React.FC<PublicEventTemplateProps> = ({ event }) => {
    const [selectedSession, setSelectedSession] = useState<SessionKey | null>(null);

    return (
        <EventThemeProvider theme={bwaiTheme}>
            <MainLayout
                sidebar={
                    <EventSidebar
                        event={event}
                        selectedSession={selectedSession}
                        onSessionSelect={setSelectedSession}
                    />
                }
            >
                <RegistrationForm
                    eventId={event.id}
                    eventName={event.title}
                    eventSlug={event.slug}
                    ticketPrice={event.ticket_price ?? 35000}
                    event={event}
                    selectedSession={selectedSession}
                    onSessionSelect={setSelectedSession}
                />
            </MainLayout>
        </EventThemeProvider>
    );
};

