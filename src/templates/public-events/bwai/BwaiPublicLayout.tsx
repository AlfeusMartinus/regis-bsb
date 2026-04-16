import React from 'react';

export interface BwaiPublicLayoutProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Layout publik untuk event `bwai` yang menggunakan poster Figma (`layer_1.svg`)
 * sebagai hero di sidebar (bukan background penuh), lalu menampilkan form
 * dalam 2 kolom dengan container card seperti desain Figma/Instagram.
 *
 * Catatan: logic input/pembayaran tidak diubah karena `children` masih berasal
 * dari komponen form publik yang ada.
 */
export const BwaiPublicLayout: React.FC<BwaiPublicLayoutProps> = ({ sidebar, children }) => {
    return (
        <div className="min-h-screen bg-[#F6F6F6]">
            <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
                <div className="bg-white border border-[#E6E1D7] rounded-2xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <aside className="p-5 sm:p-6 md:p-10 border-b md:border-b-0 md:border-r border-[#E6E1D7]">
                            {sidebar}
                        </aside>

                        <main className="p-5 sm:p-6 md:p-10">
                            {/* Keep scroll handling to outer content. On desktop it usually fits inside viewport. */}
                            {children}
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
};

