import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AdminLayout: React.FC = () => {
    // We already use useAuth globally, let's just destructure it here too for the navbar info.
    // Replaced standard Auth fetched session with useAuth for consistency and extracting the role.
    const { session, role, email, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/admin/login" replace />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600 hidden sm:block">
                            <span className="font-semibold text-gray-900">{email}</span>
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 uppercase text-gray-700 border border-gray-200">{role || 'user'}</span>
                        </div>
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="bg-red-50 text-sm text-red-600 hover:text-red-800 hover:bg-red-100 font-medium px-4 py-2 rounded-lg transition-colors border border-red-200"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    );
};
