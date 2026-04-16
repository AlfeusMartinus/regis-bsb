import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { SessionSelector } from './SessionSelector';
import type { SessionKey, SessionInfo } from './SessionSelector';

interface Speaker {
    name: string;
    title: string;
    photo_url?: string;
}

interface EventData {
    title: string;
    category?: string;
    description?: string;
    date_time: string;
    location: string;
    location_detail?: string;
    location_link?: string;
    speakers?: Speaker[];
    moderator?: Speaker;
    // Session quota fields
    session1_quota?: number;
    session2_quota?: number;
    session1_available?: number;
    session2_available?: number;
    ticket_price?: number;
    // Session time labels (optional, fallback to generic)
    session1_time?: string;
    session2_time?: string;
}

interface EventSidebarProps {
    event?: EventData | null;
    loading?: boolean;
    selectedSession: SessionKey | null;
    onSessionSelect: (session: SessionKey) => void;
}

export const EventSidebar: React.FC<EventSidebarProps> = ({
    event,
    loading,
    selectedSession,
    onSessionSelect,
}) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                Loading Event...
            </div>
        );
    }

    const displayEvent = event || {
        title: 'GenAI Google Cloud ML Optimization',
        category: 'Cloud',
        description: 'Mastering serverless architecture with industry experts.',
        date_time: '2024-10-24T10:00:00',
        location: 'Online / Zoom',
        session1_quota: 110,
        session2_quota: 110,
        session1_available: 110,
        session2_available: 110,
        ticket_price: 35000,
        speakers: [],
        moderator: undefined,
    };

    const eventDate = new Date(displayEvent.date_time);
    const dateStr = eventDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    // Build session info for the selector
    const sessions: SessionInfo[] = [
        {
            key: 'session1',
            label: 'Sesi 1',
            time: displayEvent.session1_time || `${eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — Sesi Pagi`,
            quota: displayEvent.session1_quota ?? 110,
            available: displayEvent.session1_available ?? 110,
        },
        {
            key: 'session2',
            label: 'Sesi 2',
            time: displayEvent.session2_time || `${eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — Sesi Siang`,
            quota: displayEvent.session2_quota ?? 110,
            available: displayEvent.session2_available ?? 110,
        },
    ];

    return (
        <>
            {/* Dot grid ornament */}
            <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(#13ec6d_1px,transparent_1px)] [background-size:16px_16px]" />

            <div className="relative z-10 flex flex-col h-auto md:h-full p-6 md:p-10 lg:p-12 md:overflow-y-auto custom-scrollbar">
                {/* Lottie animation */}
                <div className="flex justify-center w-full mb-6 md:mb-8">
                    <div className="w-full max-w-[240px] md:max-w-[280px]">
                        <DotLottieReact
                            src="https://lottie.host/ca6648d4-f8a0-427f-962d-bbfdee204611/rfYtFmCLS4.lottie"
                            loop
                            autoplay
                        />
                    </div>
                </div>

                {/* Event info */}
                <div className="mb-6">
                    {displayEvent.category && (
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary-dark text-xs font-bold uppercase tracking-wider mb-3">
                            {displayEvent.category}
                        </div>
                    )}
                    <h1 className="text-2xl md:text-3xl font-black leading-[1.1] tracking-tight mb-3 text-[#111814] break-words">
                        {displayEvent.title}
                    </h1>
                    <div className="text-slate-500 text-sm leading-relaxed break-words event-description">
                        <style>
                            {`
                                .event-description * { font-family: inherit !important; font-size: inherit !important; color: inherit !important; background-color: transparent !important; line-height: inherit !important; }
                                .event-description ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin-bottom: 0.5rem !important; }
                                .event-description ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin-bottom: 0.5rem !important; }
                                .event-description li { margin-bottom: 0.25rem !important; }
                                .event-description p, .event-description div { margin-bottom: 0.5rem; }
                                .event-description b, .event-description strong { font-weight: 700 !important; color: #111814 !important; }
                            `}
                        </style>
                        <div dangerouslySetInnerHTML={{ __html: displayEvent.description || '' }} />
                    </div>
                </div>

                {/* Date & Location */}
                <div className="flex flex-col gap-3 mb-6 pb-6 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100 text-[#111814] shrink-0">
                            <span className="material-symbols-outlined block text-base">calendar_today</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Tanggal</p>
                            <p className="font-bold text-[#111814] text-sm">{dateStr}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100 text-[#111814] shrink-0">
                            <span className="material-symbols-outlined block text-base">location_on</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Lokasi</p>
                            <p className="font-bold text-[#111814] text-sm">{displayEvent.location}</p>
                            {displayEvent.location_detail && (
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{displayEvent.location_detail}</p>
                            )}
                            {displayEvent.location_link && (
                                <a
                                    href={displayEvent.location_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors mt-1"
                                >
                                    <span className="material-symbols-outlined text-[13px]">map</span>
                                    Buka di Google Maps
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Session Selector ── */}
                <SessionSelector
                    sessions={sessions}
                    selectedSession={selectedSession}
                    onSelect={onSessionSelect}
                    ticketPrice={displayEvent.ticket_price}
                />

                {/* Speakers */}
                {displayEvent.speakers && displayEvent.speakers.length > 0 && (
                    <div className="mt-6">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-1 h-5 bg-primary rounded-full" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pemateri</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            {displayEvent.speakers.map((speaker, idx) => (
                                <div
                                    key={idx}
                                    className="group flex items-center gap-3 p-2.5 rounded-xl border border-transparent bg-gray-50/50 hover:bg-white hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-default"
                                >
                                    <img
                                        src={speaker.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.name)}&background=random`}
                                        alt={speaker.name}
                                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white group-hover:ring-primary transition-all duration-200 shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <p className="font-bold text-[#111814] text-xs leading-tight truncate group-hover:text-primary transition-colors">{speaker.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{speaker.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Moderator */}
                {displayEvent.moderator && displayEvent.moderator.name && (
                    <div className="mt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-1 h-5 bg-blue-400 rounded-full" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Moderator</p>
                        </div>
                        <div className="group flex items-center gap-3 p-2.5 rounded-xl border border-transparent bg-blue-50/30 hover:bg-white hover:border-blue-400/30 transition-all duration-200 cursor-default">
                            <img
                                src={displayEvent.moderator.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayEvent.moderator.name)}&background=random`}
                                alt={displayEvent.moderator.name}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-white group-hover:ring-blue-400 transition-all duration-200 shrink-0"
                            />
                            <div className="min-w-0">
                                <p className="font-bold text-[#111814] text-xs leading-tight truncate">{displayEvent.moderator.name}</p>
                                <p className="text-xs text-slate-500 truncate">{displayEvent.moderator.title}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Organizer footer */}
                <div className="mt-8 md:mt-auto pt-6 border-t border-gray-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Diselenggarakan Oleh</p>
                    <div className="flex items-center gap-3 opacity-80 grayscale hover:grayscale-0 transition-all duration-300">
                        <div className="h-7 w-7 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-500">GDG</div>
                    </div>
                </div>
            </div>
        </>
    );
};
