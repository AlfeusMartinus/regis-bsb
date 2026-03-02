import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Search } from 'lucide-react';

export const AuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    id,
                    created_at,
                    action,
                    resource_type,
                    resource_id,
                    details,
                    user_id
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('Error fetching audit logs:', error);
            } else {
                setLogs(data || []);
            }
            setLoading(false);
        };

        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        const searchStr = searchTerm.toLowerCase();
        return (
            log.action.toLowerCase().includes(searchStr) ||
            log.resource_type.toLowerCase().includes(searchStr) ||
            (log.resource_id && log.resource_id.toLowerCase().includes(searchStr)) ||
            (log.user_id && log.user_id.toLowerCase().includes(searchStr)) ||
            (log.details && JSON.stringify(log.details).toLowerCase().includes(searchStr))
        );
    });

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Audit Logs</h2>
                    <p className="text-sm text-gray-500">Pantau aktivitas pengguna dan perubahan data di seluruh sistem.</p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="h-10 pl-10 pr-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor (User ID)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No logs found.</td>
                            </tr>
                        ) : (
                            filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500">
                                        {log.user_id || 'System / Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-md 
                                            ${log.action === 'VIEW' ? 'bg-blue-100 text-blue-800' :
                                                log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                                                    log.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                                                        log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                                                            log.action === 'EXPORT' ? 'bg-purple-100 text-purple-800' :
                                                                'bg-gray-100 text-gray-800'}`}
                                        >
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                                        <span className="font-semibold">{log.resource_type}</span>
                                        {log.resource_id && <div className="text-xs text-gray-400 font-mono mt-0.5">{log.resource_id.slice(0, 8)}...</div>}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 max-w-xs break-words font-mono text-xs">
                                        {log.details ? JSON.stringify(log.details) : '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
