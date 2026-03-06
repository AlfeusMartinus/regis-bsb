import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

interface ManualSponsorRegistrationProps {
    fixedEventId: string;
}

export const ManualSponsorRegistration: React.FC<ManualSponsorRegistrationProps> = ({ fixedEventId }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            // Check if email already exists for this event
            const { data: existing } = await supabase
                .from('registrations')
                .select('id')
                .eq('event_id', fixedEventId)
                .eq('email', email)
                .maybeSingle();

            if (existing) {
                throw new Error("Email ini sudah terdaftar di event ini.");
            }

            const { error } = await supabase.from('registrations').insert({
                event_id: fixedEventId,
                name: name,
                email: email,
                phone: phone,
                amount: 0,
                status: 'settlement',
                current_status: 'professional',
                institution: 'Sponsor & Media',
                role: 'Sponsor & Media',
                info_source: 'Sponsor & Media',
                payment_link_id: `MANUAL-SPONSOR-${Date.now()}`
            });

            if (error) throw error;

            setSuccessMessage(`Berhasil menambahkan ${name} sebagai Sponsor & Media.`);
            setName('');
            setEmail('');
            setPhone('');
        } catch (error: any) {
            console.error('Error adding sponsor:', error);
            setErrorMessage(error.message || 'Gagal menambahkan data.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-xl shadow-sm mt-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <UserPlus size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Tambah Sponsor & Media</h2>
                    <p className="text-sm text-gray-500">Input manual untuk partner yang digratiskan (otomatis Lunas/Settlement).</p>
                </div>
            </div>

            {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg flex items-start gap-3">
                    <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-green-800">{successMessage}</p>
                </div>
            )}

            {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors outline-none"
                        placeholder="Contoh: Budi Santoso"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors outline-none"
                        placeholder="Contoh: budi@sponsor.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp / HP</label>
                    <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors outline-none"
                        placeholder="Contoh: 08123456789"
                    />
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center gap-4 text-sm text-gray-500 mb-2">
                    <p>Status: <strong>Profesional</strong></p>
                    <p>Role: <strong>Sponsor & Media</strong></p>
                    <p>Amount: <strong>0 (Gratis)</strong></p>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
                    {isLoading ? 'Memproses...' : 'Tambahkan Peserta'}
                </button>
            </form>
        </div>
    );
};
