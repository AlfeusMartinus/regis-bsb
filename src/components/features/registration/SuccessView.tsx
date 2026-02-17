import React from 'react';

interface SuccessViewProps {
    onRegisterOther: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({ onRegisterOther }) => {
    return (
        <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-10 relative w-full h-full min-h-[500px]">
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]"></div>
                <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px]"></div>
            </div>

            {/* Success Card */}
            <div className="relative w-full max-w-[520px] rounded-2xl bg-white dark:bg-[#1a2c22] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all duration-500 ease-out translate-y-0 opacity-100 animate-[fadeIn_0.5s_ease-out]">
                {/* Status Bar */}
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full w-full bg-primary origin-left animate-[grow_1s_ease-out]"></div>
                </div>

                <div className="flex flex-col items-center px-8 py-10 sm:px-12 sm:py-14 text-center">
                    {/* Icon Animation Wrapper */}
                    <div className="relative mb-8">
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
                            <span className="material-symbols-outlined text-[48px] font-bold">check_circle</span>
                        </div>
                    </div>

                    <h1 className="mb-3 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Registrasi Berhasil!
                    </h1>
                    <p className="mb-8 text-base text-gray-500 dark:text-gray-400 max-w-[360px] leading-relaxed">
                        Terima kasih telah mendaftar. Kami telah menerima detail donasi dan pembarayan Anda.
                    </p>

                    {/* Ticket/Info Summary Box */}
                    <div className="mb-8 w-full rounded-xl bg-gray-50 dark:bg-background-dark/50 border border-dashed border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">ID Pesanan</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-200">#REG-88349</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tanggal</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-200">24 Okt 2024</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex w-full flex-col gap-4">
                        <button className="group relative flex w-full items-center justify-center gap-3 rounded-lg bg-primary py-3.5 px-6 text-sm font-bold text-background-dark shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-primary/40 focus:ring-4 focus:ring-primary/30">
                            {/* WhatsApp SVG Icon */}
                            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"></path>
                            </svg>
                            Gabung Grup WhatsApp
                        </button>
                        <button
                            onClick={onRegisterOther}
                            className="flex w-full items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                        >
                            Daftar untuk event lain
                        </button>
                    </div>

                    <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
                        Butuh bantuan? <a className="text-primary hover:underline underline-offset-2 decoration-primary/50" href="#">Hubungi Support</a>
                    </p>
                </div>
            </div>

            {/* Additional Context / Features below the card */}
            <div className="mt-12 grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="flex flex-col items-center text-center p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <span className="material-symbols-outlined">mail</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Cek email Anda</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Kami telah mengirimkan email konfirmasi dengan kode QR tiket Anda.</p>
                </div>
                <div className="flex flex-col items-center text-center p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <span className="material-symbols-outlined">group</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Akses Komunitas</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Terhubung dengan peserta lain sebelum acara dimulai.</p>
                </div>
                <div className="flex flex-col items-center text-center p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <span className="material-symbols-outlined">calendar_month</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Tambahkan ke Kalender</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Jangan sampai terlewat. Tambahkan jadwal acara ke kalender pribadi Anda.</p>
                </div>
            </div>
        </div>
    );
};
