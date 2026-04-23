import React from 'react';
import { CalendarDays, MapPin, Check } from 'lucide-react';
import type { SessionInfo, SessionKey } from '../../../components/features/registration/SessionSelector';

interface Speaker {
    name: string;
    title: string;
    photo_url?: string;
}

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
            label: 'Track 1 – Firebase & Gemini AI',
            time: displayEvent.session1_time || '07:30 - 12:00',
            quota: displayEvent.session1_quota ?? 110,
            available: displayEvent.session1_available ?? displayEvent.session1_quota ?? 110,
        },
        {
            key: 'session2',
            label: 'Track 2 – ADK & AI Product Development',
            time: displayEvent.session2_time || '12:30 - 16:00',
            quota: displayEvent.session2_quota ?? 110,
            available: displayEvent.session2_available ?? displayEvent.session2_quota ?? 110,
        },
    ];

    const speakers = selectedSession === 'session1'
        ? [
              { 
                  name: 'Cassandra Chaidir', 
                  title: 'Tech Architecture Specialist at Accenture, GDE Cloud',
                  photo_url: 'https://qtwxxqfulqrpuerjmtya.supabase.co/storage/v1/object/public/event-images/9yw94ec3l9i.jpeg'
              },
              { 
                  name: 'Surahutomo Aziz Pradana', 
                  title: 'GDE Firebase, Cloud, & AI',
                  photo_url: 'https://qtwxxqfulqrpuerjmtya.supabase.co/storage/v1/object/public/event-images/ut9tuqgy9m.png'
              },
          ]
        : selectedSession === 'session2'
        ? [
              { 
                  name: 'Rendy Bambang Junior', 
                  title: 'VP of Data at Evermos, GDE Cloud & AI',
                  photo_url: 'https://qtwxxqfulqrpuerjmtya.supabase.co/storage/v1/object/public/event-images/81zpynfgpjj.jpg'
              },
              { 
                  name: 'Jessica Cecilia', 
                  title: 'Software Engineer at Omni HR, GDE Web',
                  photo_url: 'https://qtwxxqfulqrpuerjmtya.supabase.co/storage/v1/object/public/event-images/rovx1qohic.jpg'
              },
          ]
        : Array.isArray(displayEvent.speakers)
        ? displayEvent.speakers
        : [];

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
                    alt="BWA1 2026 Logo"
                    className="w-full h-auto object-contain object-center"
                    draggable={false}
                />
            </div>

            {/* Date + Location blocks */}
            <div className="mb-6">
                {displayEvent?.category && (
                    <div className="mb-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                            {displayEvent.category}
                        </span>
                    </div>
                )}

                <div
                    className="text-sm text-[#1F2937] mb-3"
                    dangerouslySetInnerHTML={{ __html: displayEvent?.description}}
                />

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
                        {displayEvent?.location_detail && (
                            <div className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                                {displayEvent.location_detail}
                            </div>
                        )}
                        {displayEvent?.location_link && (
                            <a 
                                href={displayEvent.location_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase hover:bg-emerald-100 transition-colors w-full justify-center border border-emerald-200/50"
                            >
                                Open in Google Maps
                            </a>
                        )}
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
                                            {session.time}
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

            {/* Speakers List */}
            {selectedSession && (
                <div className="mt-auto">
                    <div className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">
                        SPEAKERS
                    </div>

                    {speakers.length > 0 ? (
                        <div className="space-y-3">
                            {speakers.map((speaker: Speaker, index: number) => (
                                <div key={index} className="rounded-xl border border-gray-100 bg-white p-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={
                                                speaker.photo_url ||
                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                    speaker.name
                                                )}&background=0D8BFF&color=fff`
                                            }
                                            alt={speaker.name}
                                            className="w-12 h-12 rounded-lg object-cover"
                                        />
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-[#111814] truncate">
                                                {speaker.name}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">{speaker.title}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-500">
                            Speaker akan ditampilkan setelah dipublish.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

