import React from 'react';

export const EventSidebar: React.FC = () => {
    return (
        <>
            {/* Background Pattern/Image */}
            <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(#13ec6d_1px,transparent_1px)] [background-size:16px_16px]"></div>

            <div className="relative z-10 flex flex-col h-auto md:h-full p-6 md:p-10 lg:p-12 md:overflow-y-auto custom-scrollbar">
                {/* Header / Branding */}
                <div className="flex items-center gap-3 mb-8 md:mb-12">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-2xl">cloud</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">Regis-BSB</h2>
                </div>

                {/* Event Title */}
                <div className="mb-8 md:mb-auto">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary-dark text-xs font-bold uppercase tracking-wider mb-4">
                        Cloud
                    </div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-[1.1] tracking-tight mb-4 text-[#111814]">
                        GenAI Google Cloud ML Optimization
                    </h1>
                    <p className="text-slate-500 text-lg leading-relaxed">
                        Mastering serverless architecture with industry experts. Join us for a deep dive into modern cloud solutions.
                    </p>
                </div>

                {/* Event Meta Data */}
                <div className="flex flex-col gap-5 mt-8 md:mt-12">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-[#111814]">
                            <span className="material-symbols-outlined block">calendar_today</span>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Tanggal</p>
                            <p className="font-bold text-[#111814]">Sabtu, 24 Okt 2024</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-[#111814]">
                            <span className="material-symbols-outlined block">schedule</span>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Waktu</p>
                            <p className="font-bold text-[#111814]">10:00 - 14:00 WIB</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-[#111814]">
                            <span className="material-symbols-outlined block">videocam</span>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Lokasi</p>
                            <p className="font-bold text-[#111814]">Online / Zoom</p>
                        </div>
                    </div>
                </div>

                {/* Speakers & Moderator Section */}
                <div className="mt-8 flex flex-col gap-6">
                    {/* Speakers */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-1 h-5 bg-primary rounded-full"></span>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pemateri</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            {/* Speaker Card 1 */}
                            <div className="group flex items-center gap-4 p-3 rounded-xl border border-transparent bg-gray-50/50 hover:bg-white hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 transform hover:-translate-y-1 cursor-default">
                                <div className="relative shrink-0">
                                    <img
                                        src="https://i.pravatar.cc/150?u=a042581f4e29026024d"
                                        alt="Ahmad Fulan"
                                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white group-hover:ring-primary transition-all duration-300"
                                    />
                                    <div className="absolute -bottom-1 -right-1 bg-primary text-[10px] text-[#111814] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm">
                                        GDE
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[#111814] text-sm leading-tight group-hover:text-primary transition-colors truncate">Ahmad Fulan</p>
                                    <p className="text-xs text-slate-500 line-clamp-1 group-hover:text-slate-600">Google Developer Expert</p>
                                </div>
                            </div>

                            {/* Speaker Card 2 */}
                            <div className="group flex items-center gap-4 p-3 rounded-xl border border-transparent bg-gray-50/50 hover:bg-white hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 transform hover:-translate-y-1 cursor-default">
                                <div className="relative shrink-0">
                                    <img
                                        src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
                                        alt="Siti Aminah"
                                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white group-hover:ring-primary transition-all duration-300"
                                    />
                                    <div className="absolute -bottom-1 -right-1 bg-blue-500 text-[10px] text-white font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm">
                                        Cloud
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[#111814] text-sm leading-tight group-hover:text-primary transition-colors truncate">Siti Aminah</p>
                                    <p className="text-xs text-slate-500 line-clamp-1 group-hover:text-slate-600">Cloud Architect at Startup</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Moderator */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-1 h-5 bg-blue-400 rounded-full"></span>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Moderator</p>
                        </div>
                        <div className="group flex items-center gap-4 p-3 rounded-xl border border-transparent bg-blue-50/30 hover:bg-white hover:border-blue-400/30 hover:shadow-lg hover:shadow-blue-400/10 transition-all duration-300 transform hover:-translate-y-1 cursor-default">
                            <div className="relative shrink-0">
                                <img
                                    src="https://i.pravatar.cc/150?u=a04258114e29026704d"
                                    alt="Budi Setiawan"
                                    className="w-12 h-12 rounded-full object-cover ring-2 ring-white group-hover:ring-blue-400 transition-all duration-300"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-[#111814] text-sm leading-tight group-hover:text-blue-600 transition-colors truncate">Budi Setiawan</p>
                                <p className="text-xs text-slate-500 line-clamp-1 group-hover:text-slate-600">Community Lead</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organizer Footer */}
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
