import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

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
            {/* Right Panel: Registration Form (Scrollable) */}
            <main className="flex-1 w-full h-auto md:h-full md:overflow-y-auto custom-scrollbar bg-background-light scroll-smooth relative">
                {/* Background Ornament */}
                <div className="absolute top-0 left-0 w-full z-0 h-48 md:h-64 pointer-events-none overflow-hidden opacity-80 flex justify-between items-start">
                    {/* Left Ornament */}
                    <div className="w-1/3 h-full -ml-10 md:ml-0">
                        <DotLottieReact
                            src="https://lottie.host/d50bc601-1d95-4a92-928e-ee6980cf59c3/j01Ibitauu.lottie"
                            loop
                            autoplay
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {/* Center Ornament */}
                    <div className="w-1/3 h-full hidden md:block">
                        <DotLottieReact
                            src="https://lottie.host/d50bc601-1d95-4a92-928e-ee6980cf59c3/j01Ibitauu.lottie"
                            loop
                            autoplay
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {/* Right Ornament */}
                    <div className="w-1/3 h-full -mr-10 md:mr-0">
                        <DotLottieReact
                            src="https://lottie.host/d50bc601-1d95-4a92-928e-ee6980cf59c3/j01Ibitauu.lottie"
                            loop
                            autoplay
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                <div className="max-w-3xl mx-auto p-4 md:p-10 lg:p-16 relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
};
