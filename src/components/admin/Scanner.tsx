import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, XCircle, Loader2, Camera, Upload, StopCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

type ScanResult = {
    status: 'success' | 'error' | 'idle';
    message: string;
    details?: any;
};

type ScannerProps = {
    fixedEventId?: string;
};

export const Scanner: React.FC<ScannerProps> = ({ fixedEventId }) => {
    const readerId = 'scanner-reader';
    const [scanResult, setScanResult] = useState<ScanResult>({ status: 'idle', message: 'Tunggu scan...' });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploadProcessing, setIsUploadProcessing] = useState(false);
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [cameraList, setCameraList] = useState<Array<{ id: string; label: string }>>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>('');
    const [useRearCamera, setUseRearCamera] = useState(true);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [isFullscreenScanner, setIsFullscreenScanner] = useState(false);
    const [isCameraRunning, setIsCameraRunning] = useState(false);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [scannerReady, setScannerReady] = useState(false);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isProcessingRef = useRef(false);
    const lastScannedRef = useRef<string | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [searchParams] = useSearchParams();

    const successStatuses = useMemo(() => ['paid', 'settlement', 'success'], []);

    const selectedEvent = useMemo(
        () => events.find((event) => event.id === selectedEventId) || null,
        [events, selectedEventId]
    );

    const selectedEventRegistrations = useMemo(() => {
        if (!selectedEvent) return [];
        return Array.isArray(selectedEvent.registrations) ? selectedEvent.registrations : [];
    }, [selectedEvent]);

    const paidCount = useMemo(() => {
        return selectedEventRegistrations.filter((r: any) => successStatuses.includes(r.status?.toLowerCase())).length;
    }, [selectedEventRegistrations, successStatuses]);

    const checkedInCount = useMemo(() => {
        return selectedEventRegistrations.filter((r: any) => successStatuses.includes(r.status?.toLowerCase()) && r.is_attended).length;
    }, [selectedEventRegistrations, successStatuses]);

    const notCheckedInCount = Math.max(0, paidCount - checkedInCount);

    const fetchEvents = async () => {
        setLoadingEvents(true);

        const { data, error } = await supabase
            .from('events')
            .select(`
                id,
                title,
                date_time,
                registrations (
                    id,
                    status,
                    is_attended
                )
            `)
            .order('date_time', { ascending: true });

        if (error) {
            console.error('Failed to fetch events:', error);
            setEvents([]);
            setLoadingEvents(false);
            return;
        }

        setEvents(data || []);

        if (fixedEventId) {
            setSelectedEventId(fixedEventId);
        } else {
            const requestedEventId = searchParams.get('eventId');
            const hasRequestedEvent = !!requestedEventId && (data || []).some((event) => event.id === requestedEventId);

            if (!selectedEventId) {
                if (hasRequestedEvent && requestedEventId) {
                    setSelectedEventId(requestedEventId);
                } else if (data?.[0]?.id) {
                    setSelectedEventId(data[0].id);
                }
            }
        }
        setLoadingEvents(false);
    };

    const tryDecode = (value: string) => {
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    };

    const parseQrPayload = (decodedText: string) => {
        const payload = decodedText.trim();

        // Format URL support, e.g. https://.../checkin?eventId=...&email=...
        if (payload.startsWith('http://') || payload.startsWith('https://')) {
            try {
                const url = new URL(payload);
                const eventId = url.searchParams.get('eventId') || url.searchParams.get('event_id') || '';
                const email = url.searchParams.get('email') || '';
                const ticketId = url.searchParams.get('ticketId') || url.searchParams.get('ticket_id') || '';

                if (eventId && (email || ticketId)) {
                    return {
                        type: 'checkin' as const,
                        eventId,
                        identifier: tryDecode((email || ticketId).trim()),
                    };
                }
            } catch {
                // fallback to other parser branches
            }
        }

        // JSON payload support
        if (payload.startsWith('{') && payload.endsWith('}')) {
            try {
                const json = JSON.parse(payload);
                const eventId = json.eventId || json.event_id || '';
                const identifier = json.email || json.ticketId || json.ticket_id || '';
                if (eventId && identifier) {
                    return {
                        type: 'checkin' as const,
                        eventId: String(eventId),
                        identifier: tryDecode(String(identifier).trim()),
                    };
                }
            } catch {
                // fallback to other parser branches
            }
        }

        if (payload.startsWith('checkin:')) {
            const parts = payload.split(':');
            if (parts.length < 3) {
                throw new Error('Format QR Code rusak.');
            }

            const eventId = parts[1];
            const rawIdentifier = parts.slice(2).join(':');
            const identifier = tryDecode(rawIdentifier).trim();

            return {
                type: 'checkin' as const,
                eventId,
                identifier,
            };
        }

        return {
            type: 'legacy' as const,
            raw: payload,
        };
    };

    const extractEmailFromText = (value: string) => {
        const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        return match ? match[0] : '';
    };

    const findRegistrationByEmail = async (eventId: string, email: string) => {
        const cleanedEmail = email.trim();
        if (!cleanedEmail) return null;

        const { data: exactMatch, error: exactError } = await supabase
            .from('registrations')
            .select('id, name, status, is_attended, email, event_id')
            .eq('event_id', eventId)
            .ilike('email', cleanedEmail)
            .limit(1);

        if (exactError) throw exactError;
        if (exactMatch?.[0]) return exactMatch[0];

        const { data: fuzzyMatch, error: fuzzyError } = await supabase
            .from('registrations')
            .select('id, name, status, is_attended, email, event_id')
            .eq('event_id', eventId)
            .ilike('email', `%${cleanedEmail}%`)
            .limit(1);

        if (fuzzyError) throw fuzzyError;
        return fuzzyMatch?.[0] || null;
    };

    const findRegistrationByTicket = async (eventId: string, ticketIdentifier: string) => {
        const cleanedIdentifier = ticketIdentifier.trim();
        if (!cleanedIdentifier) return null;

        // Some environments don't have ticket_id column yet.
        // Use TICKET-<registration_id> fallback to keep scanner working.
        const registrationId = cleanedIdentifier.replace(/^TICKET-/i, '');
        const { data: byId, error: idError } = await supabase
            .from('registrations')
            .select('id, name, status, is_attended, email, event_id')
            .eq('event_id', eventId)
            .eq('id', registrationId)
            .limit(1);

        if (idError) throw idError;
        return byId?.[0] || null;
    };

    const fetchRegistrationByPayload = async (decodedText: string) => {
        const parsed = parseQrPayload(decodedText);

        if (parsed.type === 'checkin') {
            const identifier = parsed.identifier.trim();
            const isEmail = identifier.includes('@');

            let payloadEventId = parsed.eventId;
            if (!payloadEventId.includes('-')) {
                const { data: eventBySlug } = await supabase
                    .from('events')
                    .select('id')
                    .eq('slug', payloadEventId)
                    .maybeSingle();
                if (eventBySlug?.id) {
                    payloadEventId = eventBySlug.id;
                }
            }

            const candidateEventIds = Array.from(new Set([
                selectedEventId,
                payloadEventId,
            ].filter(Boolean)));

            for (const eventId of candidateEventIds) {
                const byIdentifier = isEmail
                    ? await findRegistrationByEmail(eventId, identifier)
                    : await findRegistrationByTicket(eventId, identifier);

                if (byIdentifier) return byIdentifier;
            }

            // Fallback: find by email globally (for old tickets with mismatched event id/slug)
            if (isEmail) {
                const { data: fallbackByEmail, error: fallbackError } = await supabase
                    .from('registrations')
                    .select('id, name, status, is_attended, email, event_id, created_at')
                    .ilike('email', `%${identifier}%`)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (fallbackError) throw fallbackError;

                const bestMatch = (fallbackByEmail || []).find((row) => ['paid', 'settlement', 'success'].includes(row.status?.toLowerCase()))
                    || fallbackByEmail?.[0]
                    || null;

                return bestMatch;
            }

            return null;
        }

        const extractedEmail = extractEmailFromText(parsed.raw);
        if (!extractedEmail) {
            return null;
        }

        let legacyQuery = supabase
            .from('registrations')
            .select('id, name, status, is_attended, email, event_id')
            .ilike('email', `%${extractedEmail}%`)
            .order('created_at', { ascending: false });

        if (selectedEventId) {
            legacyQuery = legacyQuery.eq('event_id', selectedEventId);
        }

        const { data, error } = await legacyQuery.limit(1);
        if (error) throw error;
        return data?.[0] || null;
    };

    const processDecodedText = async (decodedText: string) => {
        if (!selectedEventId) {
            setScanResult({
                status: 'error',
                message: 'Pilih event terlebih dahulu sebelum check-in.',
            });
            return;
        }

        if (isProcessingRef.current) return;
        if (decodedText === lastScannedRef.current) return;

        lastScannedRef.current = decodedText;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            lastScannedRef.current = null;
        }, 3000);

        isProcessingRef.current = true;
        setIsProcessing(true);

        try {
            const reg = await fetchRegistrationByPayload(decodedText);

            if (!reg) {
                throw new Error('Peserta tidak ditemukan di sistem.');
            }

            if (reg.event_id !== selectedEventId) {
                throw new Error('QR ini milik event lain. Silakan pilih event yang sesuai.');
            }

            if (!successStatuses.includes(reg.status?.toLowerCase())) {
                throw new Error(`Pembayaran peserta ini berstatus: ${reg.status}. Tidak dapat check-in.`);
            }

            if (reg.is_attended) {
                throw new Error(`Peserta atas nama ${reg.name} sudah melakukan check-in sebelumnya.`);
            }

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
                details: reg,
            });

            await fetchEvents();
        } catch (err: any) {
            console.error('Scan error:', err);
            setScanResult({
                status: 'error',
                message: err.message || 'Terjadi kesalahan saat validasi.',
            });
        } finally {
            isProcessingRef.current = false;
            setIsProcessing(false);
        }
    };

    const startCamera = async () => {
        if (!scannerRef.current) {
            try {
                scannerRef.current = new Html5Qrcode(readerId);
                setScannerReady(true);
            } catch (error) {
                console.error('Failed to create scanner:', error);
                setScanResult({
                    status: 'error',
                    message: 'Scanner belum siap. Coba refresh halaman.',
                });
                return;
            }
        }

        if (isCameraRunning) return;

        try {
            const config = {
                fps: 18,
                disableFlip: false,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true,
                },
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.AZTEC,
                    Html5QrcodeSupportedFormats.CODABAR,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.CODE_93,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.DATA_MATRIX,
                    Html5QrcodeSupportedFormats.MAXICODE,
                    Html5QrcodeSupportedFormats.ITF,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.PDF_417,
                    Html5QrcodeSupportedFormats.RSS_14,
                    Html5QrcodeSupportedFormats.RSS_EXPANDED,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
                ],
                qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const qrboxSize = Math.max(220, Math.min(520, Math.floor(minEdge * 0.82)));
                    return { width: qrboxSize, height: qrboxSize };
                },
                aspectRatio: isMobileViewport ? undefined : 1.0,
            };

            if (useRearCamera) {
                await scannerRef.current.start(
                    { facingMode: "environment" },
                    config,
                    processDecodedText,
                    () => {}
                );
            } else if (selectedCameraId) {
                await scannerRef.current.start(
                    selectedCameraId,
                    config,
                    processDecodedText,
                    () => {}
                );
            } else {
                throw new Error("Tidak ada kamera yang dipilih.");
            }

            setIsCameraRunning(true);
        } catch (error) {
            console.error('Failed to start camera:', error);
            setScanResult({
                status: 'error',
                message: 'Kamera gagal aktif. Pastikan izin kamera sudah diberikan.',
            });
        }
    };

    const stopCamera = async () => {
        if (!scannerRef.current || !isCameraRunning) return;

        try {
            await scannerRef.current.stop();
        } catch {
            // ignore stop errors
        }
        setIsCameraRunning(false);
        setIsFullscreenScanner(false);
    };

    const handleUploadFile = async (file: File) => {
        if (!selectedEventId) {
            setScanResult({
                status: 'error',
                message: 'Pilih event terlebih dahulu sebelum check-in.',
            });
            return;
        }

        if (!scannerRef.current) {
            try {
                scannerRef.current = new Html5Qrcode(readerId);
                setScannerReady(true);
            } catch (error) {
                console.error('Failed to create scanner:', error);
                setScanResult({
                    status: 'error',
                    message: 'Scanner belum siap. Coba refresh halaman.',
                });
                return;
            }
        }

        try {
            setIsUploadProcessing(true);

            if (isCameraRunning && scannerRef.current) {
                try {
                    await scannerRef.current.stop();
                } catch {
                    // ignore stop errors
                }
                setIsCameraRunning(false);
            }

            const decodedText = await scannerRef.current.scanFile(file, true);
            await processDecodedText(decodedText);
        } catch (error: any) {
            console.error('Upload scan error:', error);
            setScanResult({
                status: 'error',
                message: error?.message || 'Gagal membaca barcode dari gambar.',
            });
        } finally {
            setIsUploadProcessing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    useEffect(() => {
        const media = window.matchMedia('(max-width: 767px)');
        const onViewportChange = () => {
            setIsMobileViewport(media.matches);
            if (!media.matches) {
                setIsFullscreenScanner(false);
            }
        };

        onViewportChange();
        media.addEventListener('change', onViewportChange);

        const init = async () => {
            try {
                const cameras = await Html5Qrcode.getCameras();
                const formatted = cameras.map((camera) => ({
                    id: camera.id,
                    label: camera.label || `Camera ${camera.id}`,
                }));
                setCameraList(formatted);
                
                const backCamera = formatted.find(cam => 
                    cam.label.toLowerCase().includes('back') || 
                    cam.label.toLowerCase().includes('rear') ||
                    cam.label.toLowerCase().includes('environment')
                );

                if (backCamera) {
                  setSelectedCameraId(backCamera.id);
                  setUseRearCamera(true);
                } else if (formatted[0]) {
                  setSelectedCameraId(formatted[0].id);
                }
                
                setScannerReady(true);
            } catch (error) {
                console.error('Failed to initialize scanner:', error);
                setScanResult({
                    status: 'error',
                    message: 'Gagal menginisialisasi scanner/kamera. Cek izin browser lalu refresh.',
                });
            }
        };

        init();
        fetchEvents();

        const channel = supabase
            .channel('scanner-events-refresh')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'registrations' },
                () => {
                    fetchEvents();
                }
            )
            .subscribe();

        return () => {
            media.removeEventListener('change', onViewportChange);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            supabase.removeChannel(channel);

            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {
                    // ignore
                });
                try {
                    scannerRef.current.clear();
                } catch {
                    // ignore clear errors
                }
                scannerRef.current = null;
            }
        };
    }, []);

    const resetScan = () => {
        setScanResult({ status: 'idle', message: 'Tunggu scan...' });
        lastScannedRef.current = null;
    };

    const scannerCardClass = isFullscreenScanner
        ? 'fixed inset-0 z-50 bg-black text-white overflow-y-auto'
        : 'xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden';

    const scannerViewportClass = isFullscreenScanner
        ? 'w-full h-[65dvh] min-h-[360px] overflow-hidden bg-black'
        : 'w-full min-h-[320px] md:min-h-[420px] overflow-hidden rounded-lg bg-black';

    return (
        <div className="w-full space-y-5">
            <div className="rounded-xl border border-gray-200 p-4 md:p-5 bg-gray-50/70">
                <h1 className="text-2xl font-bold text-gray-900">Check-in Peserta</h1>
                <p className="text-gray-500 mt-1">Pilih event terlebih dahulu, lalu scan QR melalui kamera atau upload gambar tiket.</p>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-3">
                    {!fixedEventId && (
                        <div className="lg:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Event</label>
                            <select
                                className="mt-1 w-full px-3 py-2 border rounded-lg bg-white"
                                value={selectedEventId}
                                onChange={(e) => setSelectedEventId(e.target.value)}
                                disabled={loadingEvents}
                            >
                                <option value="">Pilih Event</option>
                                {events.filter((event) => event?.id).map((event) => (
                                    <option key={event.id} value={event.id}>
                                        {event.title || 'Untitled Event'}{event.date_time ? ` • ${new Date(event.date_time).toLocaleDateString('id-ID')}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="border border-gray-200 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Peserta Lunas</p>
                        <p className="text-xl font-bold text-gray-900">{paidCount}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Checked-in / Belum</p>
                        <p className="text-xl font-bold text-gray-900">{checkedInCount} / {notCheckedInCount}</p>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isCameraRunning ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                        {isCameraRunning ? 'Kamera Aktif' : 'Kamera Nonaktif'}
                    </span>
                    {selectedEventId && (
                        <Link
                            to={fixedEventId
                                ? `/admin/events/${fixedEventId}?tab=paid-registrants`
                                : `/admin/dashboard?tab=paid-registrants&eventId=${selectedEventId}`}
                            className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                            Lihat Data Registrants Event Ini
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className={scannerCardClass}>
                    <div className={`p-4 border-b flex flex-col gap-3 ${isFullscreenScanner ? 'border-white/20 sticky top-0 bg-black/95 backdrop-blur-sm' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className={`font-semibold ${isFullscreenScanner ? 'text-white' : 'text-gray-800'}`}>Scanner</h2>
                            {isMobileViewport && (
                                <button
                                    onClick={() => setIsFullscreenScanner((prev) => !prev)}
                                    className={`h-9 px-3 text-xs rounded-lg border ${isFullscreenScanner
                                        ? 'border-white/40 text-white bg-white/10'
                                        : 'border-gray-200 text-gray-700 bg-gray-50'}`}
                                >
                                    {isFullscreenScanner ? 'Keluar Full Screen' : 'Full Screen'}
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className={`flex items-center gap-2 text-sm px-3 py-2 border rounded-lg cursor-pointer ${isFullscreenScanner
                              ? 'text-white bg-white/10 border-white/30'
                              : 'text-gray-700 bg-gray-50 border-gray-200'}`}>
                            <input
                              type="checkbox"
                              checked={useRearCamera}
                              onChange={(e) => setUseRearCamera(e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded border-gray-300"
                            />
                            Kamera Belakang (Auto)
                          </label>

                          {!useRearCamera && (
                                                        <select
                                value={selectedCameraId}
                                onChange={(e) => {
                                  setSelectedCameraId(e.target.value);
                                  setUseRearCamera(false);
                                }}
                                                                className="h-10 px-3 py-2 border rounded-lg bg-white text-sm w-full md:w-72"
                                disabled={cameraList.length === 0}
                            >
                                {cameraList.length === 0 && <option value="">Tidak ada kamera</option>}
                                {cameraList.map((camera) => (
                                    <option key={camera.id} value={camera.id}>{camera.label}</option>
                                ))}
                            </select>
                          )}

                            <button
                                onClick={startCamera}
                                disabled={(!useRearCamera && !selectedCameraId) || isCameraRunning}
                                className="h-10 inline-flex items-center justify-center gap-2 px-4 text-sm rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                            >
                                <Camera size={16} />
                                Scan Camera
                            </button>

                            <button
                                onClick={stopCamera}
                                disabled={!isCameraRunning}
                                className="h-10 inline-flex items-center justify-center gap-2 px-4 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                            >
                                <StopCircle size={16} />
                                Stop
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handleUploadFile(file);
                                    }
                                }}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadProcessing}
                                className="h-10 inline-flex items-center justify-center gap-2 px-4 text-sm rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                            >
                                {isUploadProcessing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                Upload QR
                            </button>
                        </div>
                        <p className={`text-xs ${isFullscreenScanner ? 'text-white/80' : 'text-gray-500'}`}>
                            Tips: dekatkan barcode ke area tengah, jaga tangan stabil 1-2 detik, dan hindari glare lampu.
                        </p>
                    </div>

                    <div className={`p-4 ${isFullscreenScanner ? 'pb-8' : ''}`}>
                        {!scannerReady && (
                            <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                Menyiapkan scanner...
                            </div>
                        )}
                        <div id={readerId} className={scannerViewportClass} />
                    </div>
                </div>

                <div className={`${isFullscreenScanner ? 'hidden xl:flex' : 'flex'} bg-white rounded-xl border border-gray-200 p-6 flex-col justify-center min-h-[350px]`}>
                    {isProcessing || isUploadProcessing ? (
                        <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                            <p className="text-gray-600 font-medium">Memverifikasi tiket...</p>
                        </div>
                    ) : scanResult.status === 'idle' ? (
                        <div className="flex flex-col items-center justify-center text-center p-6 text-gray-400">
                            <span className="material-symbols-outlined text-[64px] mb-4 opacity-50">qr_code_scanner</span>
                            <h3 className="text-lg font-semibold text-gray-700 mb-1">Siap Memindai</h3>
                            <p className="text-sm">Pilih event dan lakukan scan untuk memulai check-in.</p>
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
    );
};
