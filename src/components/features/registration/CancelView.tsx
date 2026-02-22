import React from 'react';

interface CancelViewProps {
    onRetry: () => void;
}

export const CancelView: React.FC<CancelViewProps> = ({ onRetry }) => {
    return (
        <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-10 relative w-full h-full min-h-[500px]">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-red-500/5 blur-[120px]"></div>
                <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full bg-orange-500/5 blur-[100px]"></div>
            </div>

            <div className="relative w-full max-w-[520px] rounded-2xl bg-white dark:bg-[#2c1a1a] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all duration-500 ease-out translate-y-0 opacity-100 animate-[fadeIn_0.5s_ease-out]">
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full w-full bg-red-500 origin-left"></div>
                </div>

                <div className="flex flex-col items-center px-8 py-10 sm:px-12 sm:py-14 text-center">
                    <div className="relative mb-8">
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10 text-red-500 ring-8 ring-red-500/5">
                            <span className="material-symbols-outlined text-[48px] font-bold">cancel</span>
                        </div>
                    </div>

                    <h1 className="mb-3 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Pembayaran Dibatalkan
                    </h1>
                    <p className="mb-8 text-base text-gray-500 dark:text-gray-400 max-w-[360px] leading-relaxed">
                        Sepertinya Anda membatalkan proses pembayaran. Jangan khawatir, data pendaftaran Anda masih tersimpan.
                    </p>

                    <div className="flex w-full flex-col gap-4">
                        <button
                            onClick={onRetry}
                            className="group relative flex w-full items-center justify-center gap-3 rounded-lg bg-[#111814] py-3.5 px-6 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-black focus:ring-4 focus:ring-gray-300"
                        >
                            Coba Bayar Lagi
                        </button>
                    </div>

                    <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
                        Butuh bantuan? <a className="text-primary hover:underline underline-offset-2 decoration-primary/50" href="#">Hubungi Support</a>
                    </p>
                </div>
            </div>
        </div>
    );
};
