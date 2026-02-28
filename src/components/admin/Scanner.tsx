import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type ScanResult = {
    status: 'success' | 'error' | 'idle';
    message: string;
    details?: any;
};

export const Scanner: React.FC = () => {
    const [scanResult, setScanResult] = useState<ScanResult>({ status: 'idle', message: 'Tunggu scan...' });
    const [isProcessing, setIsProcessing] = useState(false);

    // Prevent double scanning the same QR too fast
    const lastScannedRef = useRef<string | null>(null);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
            false
        );

        const onScanSuccess = async (decodedText: string) => {
            if (isProcessing) return;

            // Prevent immediate double scans
            if (decodedText === lastScannedRef.current) return;
            lastScannedRef.current = decodedText;

            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                lastScannedRef.current = null;
            }, 3000);

            setIsProcessing(true);

            try {
                // Expected format: checkin:{eventId}:{email}
                if (!decodedText.startsWith('checkin:')) {
                    throw new Error('QR Code tidak valid atau bukan QR event kami.');
                }

                const parts = decodedText.split(':');
                if (parts.length !== 3) {
                    throw new Error('Format QR Code rusak.');
                }

                const [_, eventId, email] = parts;
                console.log("Processing checkin for:", eventId, email);

                // Query the database
                const { data: reg, error } = await supabase
                    .from('registrations')
                    .select('id, name, status, is_attended, email, event_id')
                    .eq('email', email)
                    .eq('event_id', eventId)
                    .single();

                if (error || !reg) {
                    throw new Error('Peserta tidak ditemukan di sistem.');
                }

                // Verify payment status
                const validStatuses = ['paid', 'settlement', 'success'];
                if (!validStatuses.includes(reg.status?.toLowerCase())) {
                    throw new Error(`Pembayaran peserta ini berstatus: ${reg.status}. Tidak dapat check-in.`);
                }

                // Check if already attended
                if (reg.is_attended) {
                    throw new Error(`Peserta atas nama ${reg.name} sudah melakukan check-in sebelumnya.`);
                }

                // Update is_attended
                const { error: updateError } = await supabase
                    .from('registrations')
                    .update({ is_attended: true })
                    .eq('id', reg.id);

                if (updateError) {
                    throw new Error('Gagal menandai kehadiran di database.');
                }

                setScanResult({
                    status: 'success',
                    message: 'Check-in Berhasil!',
                    details: reg
                });

            } catch (err: any) {
                console.error("Scan error:", err);
                setScanResult({
                    status: 'error',
                    message: err.message || 'Terjadi kesalahan saat validasi.'
                });
            } finally {
                setIsProcessing(false);
            }
        };

        const onScanFailure = (/* error: any */) => {
            // we do nothing on failure usually, just keep scanning
        };

        scanner.render(onScanSuccess, onScanFailure);

        return () => {
            scanner.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const resetScan = () => {
        setScanResult({ status: 'idle', message: 'Tunggu scan...' });
        lastScannedRef.current = null;
    };

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">QR Scanner</h1>
                <p className="text-gray-500">Arahkan kamera ke QR Code di tiket peserta.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Scanner View */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col items-center">
                    <div className="w-full bg-slate-50 p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-700 text-center">Kamera</h2>
                    </div>
                    <div className="w-full p-4">
                        <div id="reader" className="w-full h-auto min-h-[300px] border-none"></div>
                    </div>
                </div>

                {/* Result View */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full justify-center min-h-[350px]">
                        {isProcessing ? (
                            <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                <p className="text-gray-600 font-medium">Memverifikasi tiket...</p>
                            </div>
                        ) : scanResult.status === 'idle' ? (
                            <div className="flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                <span className="material-symbols-outlined text-[64px] mb-4 opacity-50">qr_code_scanner</span>
                                <h3 className="text-lg font-semibold text-gray-700 mb-1">Siap Memindai</h3>
                                <p className="text-sm">Hasil scan akan muncul di sini.</p>
                            </div>
                        ) : scanResult.status === 'success' ? (
                            <div className="flex flex-col items-center text-center p-4">
                                <div className="size-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{scanResult.message}</h3>
                                <div className="bg-gray-50 w-full rounded-lg p-4 mt-4 border border-gray-100 text-left">
                                    <p className="text-sm text-gray-500 mb-1">Nama Peserta:</p>
                                    <p className="font-semibold text-gray-900 mb-4">{scanResult.details?.name}</p>

                                    <p className="text-sm text-gray-500 mb-1">Email:</p>
                                    <p className="font-semibold text-gray-900">{scanResult.details?.email}</p>
                                </div>
                                <button
                                    onClick={resetScan}
                                    className="mt-6 px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors w-full"
                                >
                                    Scan Tiket Lain
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center p-4">
                                <div className="size-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                                    <XCircle size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Check-in Gagal</h3>
                                <p className="text-red-600 mt-2 p-3 bg-red-50 rounded-lg w-full text-sm border border-red-100">
                                    {scanResult.message}
                                </p>
                                <button
                                    onClick={resetScan}
                                    className="mt-6 px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors w-full"
                                >
                                    Coba Lagi / Scan Baru
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
