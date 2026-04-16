import React from 'react';
import { CalendarDays, MapPin, Sparkles, Check } from 'lucide-react';
import type { SessionInfo, SessionKey } from '../../../components/features/registration/SessionSelector';

export interface BwaiEventSidebarProps {
    event: any;
    selectedSession: SessionKey | null;
    onSessionSelect: (session: SessionKey) => void;
}

function formatIDDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export const BwaiEventSidebar: React.FC<BwaiEventSidebarProps> = ({
    event,
    selectedSession,
    onSessionSelect,
}) => {
    const displayEvent = event ?? {};
    const eventDateStr = displayEvent?.date_time ? formatIDDate(displayEvent.date_time) : '';

    const sessions: SessionInfo[] = [
        {
            key: 'session1',
            label: 'SESI 1',
            time: displayEvent.session1_time || '',
            quota: displayEvent.session1_quota ?? 110,
            available: displayEvent.session1_available ?? displayEvent.session1_quota ?? 110,
        },
        {
            key: 'session2',
            label: 'SESI 2',
            time: displayEvent.session2_time || '',
            quota: displayEvent.session2_quota ?? 110,
            available: displayEvent.session2_available ?? displayEvent.session2_quota ?? 110,
        },
    ];

    const featuredSpeaker = Array.isArray(displayEvent.speakers) ? displayEvent.speakers[0] : null;

    const titlePillText = displayEvent?.title ? displayEvent.title : 'BWA1 2026';

    return (
        <div className="flex flex-col">
            {/* Top pill */}
            <div className="flex items-center gap-2 mb-6">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-[#6B7280] tracking-wide uppercase">
                    {titlePillText}
                </span>
            </div>

            {/* Hero poster (cropped) */}
            <div className="w-full mb-6">
                <img
                    src="/assets/events/bwai/layer_1.svg"
                    alt=""
                    className="w-full h-[200px] sm:h-[240px] object-cover object-left-top"
                    draggable={false}
                />
            </div>

            {/* Date + Location blocks */}
            <div className="mb-6">
                <div className="text-sm font-bold uppercase tracking-widest text-[#1F2937] mb-3">
                    DAFTAR YUK SEGERA
                </div>

                <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-primary/30 bg-white p-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#1F2937] mb-2">
                            <CalendarDays size={14} className="text-primary" />
                            Date
                        </div>
                        <div className="text-sm font-bold text-[#111814]">{eventDateStr || 'Kamis, 16 Apr 2026'}</div>
                    </div>

                    <div className="rounded-xl border border-emerald-500/30 bg-white p-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#1F2937] mb-2">
                            <MapPin size={14} className="text-emerald-600" />
                            Location
                        </div>
                        <div className="text-sm font-bold text-[#111814] break-words">
                            {displayEvent?.location || 'Hotel Bandung'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Track selector */}
            <div className="mb-8">
                <div className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">
                    CHOOSE YOUR TRACK
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sessions.map((session) => {
                        const isFull = session.available <= 0;
                        const isSelected = selectedSession === session.key;
                        const isClickable = !isFull;

                        return (
                            <button
                                key={session.key}
                                type="button"
                                disabled={!isClickable}
                                onClick={() => isClickable && onSessionSelect(session.key)}
                                className={[
                                    'rounded-xl border p-4 text-left transition-all duration-200',
                                    isSelected && !isFull
                                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
                                        : isFull
                                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                        : 'border-gray-200 bg-white hover:border-primary/40',
                                ].join(' ')}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="text-sm font-bold text-[#111814]">{session.label}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {session.time || 'Morning Session (08:00 - 12:00)'}
                                        </div>
                                    </div>
                                    {isSelected && !isFull && (
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-[#111814]">
                                            <Check size={16} />
                                        </span>
                                    )}
                                </div>

                                {!isFull && (
                                    <>
                                        <div className="mt-3 text-xs font-bold text-[#111814]">
                                            Sisa {session.available} kursi
                                        </div>

                                        {session.available <= 10 && (
                                            <div className="mt-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-600 uppercase">
                                                Filling Fast
                                            </div>
                                        )}
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Featured speaker */}
            <div className="mt-auto">
                <div className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">
                    FEATURED SPEAKER
                </div>

                {featuredSpeaker ? (
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                        <div className="flex items-center gap-3">
                            <img
                                src={
                                    featuredSpeaker.photo_url ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(featuredSpeaker.name || 'Speaker')}&background=0D8BFF&color=fff`
                                }
                                alt={featuredSpeaker.name}
                                className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-[#111814] truncate">{featuredSpeaker.name}</div>
                                <div className="text-xs text-gray-500 truncate">{featuredSpeaker.title}</div>
                            </div>
                        </div>
                        {featuredSpeaker?.title && (
                            <div className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase text-[#9CA3AF]">
                                <Sparkles size={14} className="text-primary" />
                                Featured
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-500">
                        Speaker akan ditampilkan setelah dipublish.
                    </div>
                )}
            </div>
        </div>
    );
};

