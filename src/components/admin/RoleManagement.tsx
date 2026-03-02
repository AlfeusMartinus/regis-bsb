import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Plus, Edit2, ShieldCheck, Mail, Save, X, Trash2, Eye, EyeOff } from 'lucide-react';
import { useDialog } from '../ui/DialogContext';

export const RoleManagement: React.FC = () => {
    const { showAlert, showConfirm } = useDialog();
    const [users, setUsers] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [canScan, setCanScan] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        // Fetch events
        const { data: eventsData } = await supabase.from('events').select('id, title').order('created_at', { ascending: false });
        setEvents(eventsData || []);

        // Call Edge Function to list users (requires superadmin)
        try {
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://xukrtfptfvvxxedluhqy.supabase.co'}/functions/v1/manage-roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({ action: 'LIST_USERS' })
            });
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
            } else {
                console.error("Failed to fetch users:", data.error);
                alert("Gagal mengambil data user. Pastikan Anda superadmin.");
            }
        } catch (e) {
            console.error("Error listing users", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateSponsor = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://xukrtfptfvvxxedluhqy.supabase.co'}/functions/v1/manage-roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({
                    action: 'CREATE_SPONSOR',
                    email,
                    password,
                    assignedEvents: selectedEvents,
                    canScan
                })
            });

            const data = await res.json();
            if (data.success) {
                await showAlert({ message: "Sponsor berhasil dibuat!", severity: "success" });
                setIsCreateModalOpen(false);
                resetForm();
                fetchData();
            } else {
                await showAlert({ message: `Gagal membuat sponsor: ${data.error}`, severity: "error" });
            }
        } catch (error) {
            console.error(error);
            await showAlert({ message: "Terjadi kesalahan.", severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateSponsorEvents = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://xukrtfptfvvxxedluhqy.supabase.co'}/functions/v1/manage-roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({
                    action: 'UPDATE_SPONSOR_EVENTS',
                    targetUserId: selectedUser.id,
                    assignedEvents: selectedEvents,
                    canScan
                })
            });

            const data = await res.json();
            if (data.success) {
                await showAlert({ message: "Akses event sponsor berhasil diperbarui!", severity: "success" });
                setIsEditModalOpen(false);
                setSelectedUser(null);
                resetForm();
                fetchData();
            } else {
                await showAlert({ message: `Gagal memperbarui: ${data.error}`, severity: "error" });
            }
        } catch (error) {
            console.error(error);
            await showAlert({ message: "Terjadi kesalahan.", severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSponsor = async (user: any) => {
        const isConfirmed = await showConfirm(`Yakin ingin menghapus akun sponsor ${user.email}?\nTindakan ini tidak dapat dibatalkan.`);
        if (!isConfirmed) return;

        try {
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://xukrtfptfvvxxedluhqy.supabase.co'}/functions/v1/manage-roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({
                    action: 'DELETE_SPONSOR',
                    targetUserId: user.id
                })
            });

            const data = await res.json();
            if (data.success) {
                await showAlert({ message: "Akun sponsor berhasil dihapus.", severity: "success" });
                fetchData();
            } else {
                await showAlert({ message: `Gagal menghapus: ${data.error}`, severity: "error" });
            }
        } catch (error) {
            console.error(error);
            await showAlert({ message: "Terjadi kesalahan saat menghapus.", severity: "error" });
        }
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setSelectedEvents([]);
        setCanScan(false);
        setShowPassword(false);
    };

    const toggleEventSelection = (eventId: string) => {
        setSelectedEvents(prev =>
            prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
        );
    };

    const openEditModal = (user: any) => {
        setSelectedUser(user);
        setSelectedEvents(user.assigned_events?.map((e: any) => e.event_id) || []);
        setCanScan(user.can_scan || false);
        setIsEditModalOpen(true);
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Manajemen Role & Sponsor</h2>
                    <p className="text-sm text-gray-500">Buat akun sponsor dan atur hak akses melihat event tertentu.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm"
                >
                    <Plus size={18} />
                    Buat Akun
                </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akses Event</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Mail size={16} className="text-gray-400" />
                                        <span className="text-sm font-medium text-gray-900">{user.email}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'sponsor' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                                    >
                                        {user.role === 'superadmin' && <ShieldCheck size={14} className="mr-1" />}
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-2">
                                        {user.can_scan && (
                                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded w-fit">
                                                Akses Scanner
                                            </span>
                                        )}
                                        {user.role === 'superadmin' ? (
                                            <span className="text-sm text-gray-500 italic">Semua Event</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {user.assigned_events?.length > 0 ? (
                                                    user.assigned_events.map((ae: any) => (
                                                        <span key={ae.event_id} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded truncate max-w-[150px]">
                                                            {ae.events?.title || ae.event_id.slice(0, 6)}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-red-500 italic">Belum ada askes event</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {user.role === 'sponsor' && (
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
                                                title="Atur Akses"
                                            >
                                                <Edit2 size={14} /> Atur Akses
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSponsor(user)}
                                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors inline-flex items-center"
                                                title="Hapus Akun"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CREATE SPONSOR MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Buat Akun Sponsor</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateSponsor} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full h-10 px-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        placeholder="Minimal 6 karakter"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer pt-2">
                                    <input type="checkbox" checked={canScan} onChange={(e) => setCanScan(e.target.checked)} className="rounded text-primary focus:ring-primary w-4 h-4" />
                                    <span className="text-sm font-medium text-gray-700">Izinkan Akses Tab Scanner</span>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Akses Event Awal (Opsional)</label>
                                <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                                    {events.map(ev => (
                                        <label key={ev.id} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={selectedEvents.includes(ev.id)} onChange={() => toggleEventSelection(ev.id)} className="rounded text-primary focus:ring-primary" />
                                            <span className="text-sm text-gray-700">{ev.title}</span>
                                        </label>
                                    ))}
                                    {events.length === 0 && <span className="text-sm text-gray-500">Tidak ada data event.</span>}
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Batal</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium flex items-center justify-center gap-2 disabled:opacity-70">
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Simpan Akun
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT EVENT ACCESS MODAL */}
            {isEditModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Edit Akses Event</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUpdateSponsorEvents} className="p-6 space-y-4">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                                Mengatur hak akses untuk sponsor: <strong>{selectedUser.email}</strong>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer pt-1">
                                    <input type="checkbox" checked={canScan} onChange={(e) => setCanScan(e.target.checked)} className="rounded text-primary focus:ring-primary w-4 h-4" />
                                    <span className="text-sm font-medium text-gray-700">Izinkan Akses Tab Scanner</span>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Event</label>
                                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                                    {events.map(ev => (
                                        <label key={ev.id} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={selectedEvents.includes(ev.id)} onChange={() => toggleEventSelection(ev.id)} className="rounded text-primary focus:ring-primary" />
                                            <span className="text-sm text-gray-700">{ev.title}</span>
                                        </label>
                                    ))}
                                    {events.length === 0 && <span className="text-sm text-gray-500">Tidak ada data event.</span>}
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Batal</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium flex items-center justify-center gap-2 disabled:opacity-70">
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Perbarui Akses
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
