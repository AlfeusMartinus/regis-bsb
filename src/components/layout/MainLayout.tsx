import React from 'react';

interface MainLayoutProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, children }) => {
    return (
        <div className="bg-background-light text-[#111814] min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row font-body">
            {/* Left Panel: Event Details (Sticky/Fixed on Desktop) */}
            <aside className="w-full md:w-5/12 lg:w-4/12 h-auto md:h-full bg-white border-b md:border-b-0 md:border-r border-[#e5e7eb] flex flex-col relative shrink-0 z-10">
                {sidebar}
            </aside>

            {/* Right Panel: Registration Form (Scrollable) */}
            <main className="flex-1 w-full h-auto md:h-full md:overflow-y-auto custom-scrollbar bg-background-light scroll-smooth relative">
                <div className="max-w-3xl mx-auto p-4 md:p-10 lg:p-16">
                    {children}
                </div>
            </main>
        </div>
    );
};
