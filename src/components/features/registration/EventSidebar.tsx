import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

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
    speakers?: Speaker[];
    moderator?: Speaker;
}

interface EventSidebarProps {
    event?: EventData | null;
    loading?: boolean;
}

export const EventSidebar: React.FC<EventSidebarProps> = ({ event, loading }) => {
    if (loading) {
        return <div className="flex items-center justify-center h-full text-slate-400">Loading Event...</div>;
    }

    const displayEvent = event || {
        title: "GenAI Google Cloud ML Optimization",
        category: "Cloud",
        description: "Mastering serverless architecture with industry experts. Join us for a deep dive into modern cloud solutions.",
        date_time: "2024-10-24T10:00:00",
        location: "Online / Zoom",
        speakers: [
            { name: "Ahmad Fulan", title: "Google Developer Expert", photo_url: "https://i.pravatar.cc/150?u=a042581f4e29026024d" },
            { name: "Siti Aminah", title: "Cloud Architect at Startup", photo_url: "https://i.pravatar.cc/150?u=a042581f4e29026704d" }
        ],
        moderator: { name: "Budi Setiawan", title: "Community Lead", photo_url: "https://i.pravatar.cc/150?u=a04258114e29026704d" }
    };

    const eventDate = new Date(displayEvent.date_time);
    const dateStr = eventDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB";

    return (
        <>
            <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(#13ec6d_1px,transparent_1px)] [background-size:16px_16px]"></div>

            <div className="relative z-10 flex flex-col h-auto md:h-full p-6 md:p-10 lg:p-12 md:overflow-y-auto custom-scrollbar">
                <div className="flex justify-center w-full mb-6 md:mb-10">
                    <div className="w-full max-w-[280px] md:max-w-[320px]">
                        <DotLottieReact
                            src="https://lottie.host/ca6648d4-f8a0-427f-962d-bbfdee204611/rfYtFmCLS4.lottie"
                            loop
                            autoplay
                        />
                    </div>
                </div>

                <div className="mb-8 md:mb-auto">
                    {displayEvent.category && (
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary-dark text-xs font-bold uppercase tracking-wider mb-4">
                            {displayEvent.category}
                        </div>
                    )}
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black leading-[1.1] tracking-tight mb-4 text-[#111814] break-words">
                        {displayEvent.title}
                    </h1>
                    <p className="text-slate-500 text-base md:text-lg leading-relaxed break-words">
                        {displayEvent.description}
                    </p>
                </div>

                <div className="flex flex-col gap-5 mt-8 md:mt-12">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-[#111814]">
                            <span className="material-symbols-outlined block">calendar_today</span>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Tanggal</p>
                            <p className="font-bold text-[#111814]">{dateStr}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-[#111814]">
                            <span className="material-symbols-outlined block">schedule</span>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Waktu</p>
                            <p className="font-bold text-[#111814]">{timeStr}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-[#111814]">
                            <span className="material-symbols-outlined block">videocam</span>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Lokasi</p>
                            <p className="font-bold text-[#111814]">{displayEvent.location}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex flex-col gap-6">
                    {/* Speakers */}
                    {displayEvent.speakers && displayEvent.speakers.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="w-1 h-5 bg-primary rounded-full"></span>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pemateri</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                {displayEvent.speakers.map((speaker, idx) => (
                                    <div key={idx} className="group flex items-center gap-4 p-3 rounded-xl border border-transparent bg-gray-50/50 hover:bg-white hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 transform hover:-translate-y-1 cursor-default">
                                        <div className="relative shrink-0">
                                            <img
                                                src={speaker.photo_url || `https://ui-avatars.com/api/?name=${speaker.name}&background=random`}
                                                alt={speaker.name}
                                                className="w-12 h-12 rounded-full object-cover ring-2 ring-white group-hover:ring-primary transition-all duration-300"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-[#111814] text-sm leading-tight group-hover:text-primary transition-colors truncate">{speaker.name}</p>
                                            <p className="text-xs text-slate-500 line-clamp-1 group-hover:text-slate-600">{speaker.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Moderator */}
                    {displayEvent.moderator && displayEvent.moderator.name && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="w-1 h-5 bg-blue-400 rounded-full"></span>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Moderator</p>
                            </div>
                            <div className="group flex items-center gap-4 p-3 rounded-xl border border-transparent bg-blue-50/30 hover:bg-white hover:border-blue-400/30 hover:shadow-lg hover:shadow-blue-400/10 transition-all duration-300 transform hover:-translate-y-1 cursor-default">
                                <div className="relative shrink-0">
                                    <img
                                        src={displayEvent.moderator.photo_url || `https://ui-avatars.com/api/?name=${displayEvent.moderator.name}&background=random`}
                                        alt={displayEvent.moderator.name}
                                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white group-hover:ring-blue-400 transition-all duration-300"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[#111814] text-sm leading-tight group-hover:text-blue-600 transition-colors truncate">{displayEvent.moderator.name}</p>
                                    <p className="text-xs text-slate-500 line-clamp-1 group-hover:text-slate-600">{displayEvent.moderator.title}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 md:mt-auto pt-8 border-t border-gray-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Diselenggarakan Oleh</p>
                    <div className="flex items-center gap-4 opacity-80 grayscale hover:grayscale-0 transition-all duration-300">
                        {/* Placeholder logos */}
                        <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">GDG</div>
                        <span className="text-slate-300 text-xl">/</span>
                        <div className="h-8 w-auto px-2 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">Binary Nusantara</div>
                    </div>
                </div>
            </div>
        </>
    );
};
