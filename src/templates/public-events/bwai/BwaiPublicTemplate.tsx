import React, { useState } from 'react';
import { RegistrationForm } from '../../../components/features/registration/RegistrationForm';
import { EventThemeProvider } from '../../../themes/EventThemeProvider';
import { bwaiTheme } from '../../../themes/events/bwai/bwaiTheme';
import { BwaiPublicLayout } from './BwaiPublicLayout';
import { BwaiEventSidebar } from './BwaiEventSidebar';
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
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'cancel'>('idle');

    return (
        <EventThemeProvider theme={bwaiTheme}>
            <BwaiPublicLayout
                sidebar={
                    <BwaiEventSidebar
                        event={event}
                        selectedSession={selectedSession}
                        onSessionSelect={setSelectedSession}
                        hideTracks={paymentStatus === 'success' || paymentStatus === 'cancel'}
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
                    onStatusChange={setPaymentStatus}
                    hideStepper
                    uiVariant="bwai"
                />
            </BwaiPublicLayout>
        </EventThemeProvider>
    );
};

