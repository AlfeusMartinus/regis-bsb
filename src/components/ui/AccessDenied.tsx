import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

interface AccessDeniedProps {
    title?: string;
    message?: string;
    backUrl?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
    title = 'Akses Ditolak',
    message = 'Mohon maaf, Anda tidak diberi akses ke halaman ini atau halaman sudah dipindahkan.',
    backUrl = '/admin/dashboard'
}) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-red-50 text-red-500 p-6 rounded-full mb-6">
                <ShieldAlert size={64} />
            </div>

            <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">
                {title}
            </h1>

            <p className="text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
                {message}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-xs">
                <button
                    onClick={() => navigate(-1)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all"
                >
                    <ArrowLeft size={18} />
                    Kembali
                </button>
                <button
                    onClick={() => navigate(backUrl)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20 focus:outline-none focus:ring-4 focus:ring-primary/30 transition-all"
                >
                    <Home size={18} />
                    Dashboard
                </button>
            </div>
        </div>
    );
};
