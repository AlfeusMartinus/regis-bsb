import React from 'react';

interface SuccessViewProps {
    onRegisterOther: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = () => {
    return (
        <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-10 relative w-full h-full min-h-[500px]">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]"></div>
                <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px]"></div>
            </div>

            <div className="relative w-full max-w-[520px] rounded-2xl bg-white dark:bg-[#1a2c22] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all duration-500 ease-out translate-y-0 opacity-100 animate-[fadeIn_0.5s_ease-out]">
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full w-full bg-primary origin-left animate-[grow_1s_ease-out]"></div>
                </div>

                <div className="flex flex-col items-center px-8 py-10 sm:px-12 sm:py-14 text-center">
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
                        Terima kasih telah mendaftar. Kami telah menerima detail pendaftaran dan pembayaran Anda.
                    </p>

                    <div className="flex w-full flex-col gap-4">
                        {/* WhatsApp Group link removed as per request */}
                    </div>


                    <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
                        Butuh bantuan? <a className="text-primary hover:underline underline-offset-2 decoration-primary/50" href="#">Hubungi Support</a>
                    </p>
                </div>
            </div>


            {/* Next Steps: Clean List Layout */}
            <div className="mt-12 w-full max-w-[520px] animate-[fadeIn_0.5s_ease-out_0.2s_both]">
                <div className="rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-100 dark:border-gray-800 p-2">
                    <div className="flex flex-col">
                        {/* Step 1 */}
                        <div className="flex gap-4 p-4 items-center">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-gray-800 shadow-sm text-primary">
                                <span className="material-symbols-outlined text-2xl font-bold">mail</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">Cek email Anda</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Kami telah mengirimkan email konfirmasi dengan kode QR tiket Anda.</p>
                            </div>
                        </div>

                        <div className="h-px bg-gray-200/50 dark:bg-gray-700/50 mx-4"></div>

                        {/* Step 2 */}
                        <div className="flex gap-4 p-4 items-center">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-gray-800 shadow-sm text-blue-500">
                                <span className="material-symbols-outlined text-2xl font-bold">group</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">Akses Komunitas</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Terhubung dengan peserta lain sebelum acara dimulai.</p>
                            </div>
                        </div>

                        <div className="h-px bg-gray-200/50 dark:bg-gray-700/50 mx-4"></div>

                        {/* Step 3 */}
                        <div className="flex gap-4 p-4 items-center">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-gray-800 shadow-sm text-orange-500">
                                <span className="material-symbols-outlined text-2xl font-bold">calendar_month</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">Tambahkan ke Kalender</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Jangan sampai terlewat. Simpan jadwal acara ke kalender pribadi Anda.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
