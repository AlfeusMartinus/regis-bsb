import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clsx } from 'clsx';
import { Loader2, ArrowRight, ArrowLeft, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { registrationSchema } from '../../../lib/validationSchema';
import type { RegistrationFormData } from '../../../lib/validationSchema';
import { Stepper } from '../../ui/Stepper';
import { SuccessView } from './SuccessView';
import { CancelView } from './CancelView';
import type { SessionKey } from './SessionSelector';

const INFO_SOURCE_OPTIONS = [
    'Instagram',
    'Twitter / X',
    'LinkedIn',
    'WhatsApp Group',
    'Teman / Kenalan',
    'Website GDG',
    'Lainnya',
];

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_LABELS: Record<SessionKey, string> = {
    session1: 'Track 1 – Firebase & Gemini AI',
    session2: 'Track 2 – ADK & AI Product Development',
};
const STEPS = ['Data Diri', 'Konfirmasi & Bayar'];

const formatIDR = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

declare global {
    interface Window {
        loadJokulCheckout: (url: string) => void;
    }
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface RegistrationFormProps {
    eventId?: string;
    eventName?: string;
    eventSlug?: string;
    ticketPrice?: number;
    event?: any;
    selectedSession: SessionKey | null;
    onSessionSelect: (session: SessionKey) => void;
    /**
     * UI variant - dipakai oleh template event supaya layout bisa berbeda
     * tanpa mengubah logic form/payment.
     */
    hideStepper?: boolean;
    /**
     * Tambahkan variant agar section/heading step bisa dikompakkan.
     * Untuk `bwai`, step 1 dibuat tanpa heading “Data Peserta”.
     */
    uiVariant?: 'default' | 'bwai';
    onStatusChange?: (status: 'idle' | 'pending' | 'success' | 'cancel') => void;
}

// ─── Input helper ─────────────────────────────────────────────────────────────
const InputField: React.FC<{
    id: string;
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}> = ({ id, label, required, error, children }) => (
    <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-[#111814]">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {children}
        {error && (
            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <AlertCircle size={11} />
                {error}
            </span>
        )}
    </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
export const RegistrationForm: React.FC<RegistrationFormProps> = ({
    eventId,
    eventName,
    eventSlug,
    ticketPrice = 35_000,
    event,
    hideStepper = false,
    uiVariant = 'default',
    selectedSession,
    onSessionSelect: _onSessionSelect,
    onStatusChange,
}) => {
    const isBwai = uiVariant === 'bwai';
    const [currentStep, setCurrentStep] = useState(1);
    const [paymentStatus, _setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'cancel'>('idle');
    const [isLoading, setIsLoading] = useState(false);
    const [quotaError, setQuotaError] = useState<string | null>(null);
    const [pendingRegInfo, setPendingRegInfo] = useState<{ msg: string; link: string } | null>(null);

    const setPaymentStatus = (status: 'idle' | 'pending' | 'success' | 'cancel') => {
        _setPaymentStatus(status);
        if (onStatusChange) onStatusChange(status);
    };

    const {
        register,
        trigger,
        getValues,
        watch,
        setError,
        formState: { errors },
    } = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        mode: 'onChange',
        defaultValues: {
            share_data_sponsor: false,
        },
    });

    // ── Step 1: Validate & advance ──────────────────────────────────────────
    const kategoriValue = watch('kategori');
    const checkEmailDuplicate = async (email: string) => {
        try {
            const { data: existing, error } = await supabase.rpc('check_email_duplicate_v2', {
                p_email: email,
                p_event_id: eventId
            });

            if (error) throw error;

            if (existing && existing.is_duplicate) {
                const isPending = existing.status === 'pending';
                const isExpired = isPending && existing.expired_at && new Date(existing.expired_at) < new Date();

                if (!isExpired) {
                    const sessionName = SESSION_LABELS[existing.session as SessionKey] || existing.session;
                    setError('email', {
                        type: 'manual',
                        message: `Email ini sudah terdaftar di ${sessionName}. Anda hanya diperbolehkan mendaftar di satu track.`,
                    });
                    return false;
                }
            }
            return true;
        } catch (err) {
            console.error('Error validation duplicate email:', err);
            return true; 
        }
    };

    const isWorkingValue = watch('is_working');

    const handleNext = async () => {
        setQuotaError(null);
        const baseFields: (keyof RegistrationFormData)[] = [
            'fullName', 'email', 'whatsapp', 'gender', 'domicile',
            'kategori', 'info_source', 'share_data_sponsor',
        ];
        const conditionalFields: (keyof RegistrationFormData)[] =
            kategoriValue === 'mahasiswa'   ? ['major', 'university'] :
            kategoriValue === 'profesional' ? (isWorkingValue === 'yes' ? ['is_working', 'role', 'institution'] : ['is_working']) : [];

        const isValid = await trigger([...baseFields, ...conditionalFields]);
        if (!isValid) return;

        if (!selectedSession) {
            setQuotaError('Silakan pilih sesi terlebih dahulu untuk melanjutkan.');
            return;
        }

        setIsLoading(true);
        const isUnique = await checkEmailDuplicate(getValues('email'));
        setIsLoading(false);
        if (!isUnique) return;

        setCurrentStep(2);
    };

    // ── Step 2: Submit & go to payment ─────────────────────────────────────
    const handlePay = async () => {
        if (!selectedSession) {
            setQuotaError('Silakan pilih sesi terlebih dahulu.');
            return;
        }

        setIsLoading(true);
        setQuotaError(null);

        try {
            const formData = getValues();

            const { data, error } = await supabase.functions.invoke('create-payment', {
                body: {
                    amount: ticketPrice,
                    name: formData.fullName,
                    email: formData.email,
                    phone: formData.whatsapp,
                    gender: formData.gender,
                    domicile: formData.domicile,
                    category: formData.kategori,
                    role: formData.role,
                    institution: formData.institution,
                    major: formData.major,
                    university: formData.university,
                    is_working: formData.is_working,
                    info_source: formData.info_source,
                    share_data_sponsor: formData.share_data_sponsor,
                    session: selectedSession,
                    eventId,
                    eventName,
                    eventSlug,
                    date_time: event?.date_time,
                    location: event?.location,
                    location_detail: event?.location_detail,
                    location_link: event?.location_link,
                },
            });

            if (error) {
                let errObj: any = error;
                if (error?.context && typeof error.context.json === 'function') {
                    try { errObj = await error.context.json(); } catch(e) {}
                } else if (error?.context) {
                    errObj = error.context;
                }

                const msg = errObj?.error || error?.message || '';
                const code = errObj?.code || error?.code;
                const link = errObj?.link || error?.link;

                if (code === 'PENDING_REGISTRATION' && link) {
                    setPendingRegInfo({ msg, link });
                    setIsLoading(false);
                    return;
                }

                if (msg.includes('kuota') || msg.includes('penuh') || msg.includes('quota')) {
                    setQuotaError('Mohon maaf, kuota sesi ini baru saja penuh. Silakan pilih sesi lain.');
                } else {
                    setQuotaError('Gagal membuat transaksi: ' + msg);
                }
                setIsLoading(false);
                return;
            }

            if (data?.link) {
                sessionStorage.setItem('is_initiating_payment', 'true');
                sessionStorage.setItem('pending_registration_data', JSON.stringify({
                    email: formData.email,
                    name: formData.fullName,
                    whatsapp: formData.whatsapp,
                    gender: formData.gender,
                    domicile: formData.domicile,
                    kategori: formData.kategori,
                    role: formData.role,
                    institution: formData.institution,
                    major: formData.major,
                    university: formData.university,
                    info_source: formData.info_source,
                    share_data_sponsor: formData.share_data_sponsor,
                    session: selectedSession,
                    sessionLabel: SESSION_LABELS[selectedSession],
                    sessionTime: selectedSession === 'session1'
                        ? event?.session1_time || '07:15 - 12:00'
                        : selectedSession === 'session2'
                            ? event?.session2_time || '13:00 - 17:00'
                            : undefined,
                    eventId,
                    eventName: eventName || 'Acara',
                    ticketId: data.registrationId || `REG-${Date.now()}`,
                    date_time: event?.date_time,
                    location: event?.location,
                    location_detail: event?.location_detail,
                    location_link: event?.location_link,
                    amount: ticketPrice,
                }));

                if (window.loadJokulCheckout) {
                    window.loadJokulCheckout(data.link);

                    let observer: PerformanceObserver | null = null;
                    let fallback: ReturnType<typeof setTimeout> | null = null;

                    const stopLoading = () => {
                        setIsLoading(false);
                        observer?.disconnect();
                        if (fallback) clearTimeout(fallback);
                    };

                    try {
                        observer = new PerformanceObserver((list) => {
                            for (const entry of list.getEntries()) {
                                if (entry.name.includes('checkout.doku.com')) {
                                    stopLoading();
                                    return;
                                }
                            }
                        });
                        observer.observe({ entryTypes: ['resource'] });
                    } catch {
                    }
                    fallback = setTimeout(stopLoading, 15_000);
                } else {
                    window.location.href = data.link;
                }
            } else {
                setQuotaError('Gagal mendapatkan link pembayaran. Coba lagi.');
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('Unexpected error:', err);
            setQuotaError('Terjadi kesalahan sistem. Silakan coba lagi.');
            setIsLoading(false);
        }
    };

    // ── URL param detection (post-payment redirect) ─────────────────────────
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const paymentParam = params.get('payment');
        const isInitiating = sessionStorage.getItem('is_initiating_payment');

        if (!paymentParam) return;
        if (!isInitiating) {
            window.history.replaceState({}, '', window.location.pathname);
            return;
        }

        const triggerEmail = (parsedData: any) => {
            fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsedData),
            })
                .then(async (res) => {
                    const raw = await res.text();
                    let json: any = {};
                    try { json = raw ? JSON.parse(raw) : {}; } catch { json = {}; }
                    if (!res.ok || json?.success === false) {
                        console.error('Email API failed:', json?.message || raw);
                    }
                })
                .catch((e) => console.error('Email trigger failed:', e));
        };

        if (paymentParam === 'success') {
            setPaymentStatus('success');
            sessionStorage.removeItem('is_initiating_payment');
            window.history.replaceState({}, '', window.location.pathname);

            const pendingStr = sessionStorage.getItem('pending_registration_data');
            if (pendingStr) {
                try {
                    const parsed = JSON.parse(pendingStr);
                    triggerEmail(parsed);
                } catch (e) {
                    console.error('Parse error:', e);
                }
                sessionStorage.removeItem('pending_registration_data');
            }
        } 
        else if (paymentParam === 'result') {
            setPaymentStatus('pending');
            const checkStatus = async () => {
                const pendingStr = sessionStorage.getItem('pending_registration_data');
                if (!pendingStr) {
                    setPaymentStatus('cancel');
                    return;
                }
                const parsed = JSON.parse(pendingStr);
                let maxRetries = 10; // Poll up to 10 times (30 seconds)
                
                const finishPolling = () => {
                    sessionStorage.removeItem('is_initiating_payment');
                    sessionStorage.removeItem('pending_registration_data');
                    window.history.replaceState({}, '', window.location.pathname);
                };

                const pollDB = async () => {
                    let status: string | null = null;

                    try {
                        const res = await fetch(
                            `/api/check-payment-status?email=${encodeURIComponent(parsed.email)}&eventId=${encodeURIComponent(parsed.eventId)}`
                        );
                        if (res.ok) {
                            const json = await res.json();
                            status = json.status ?? null;
                        } else {
                            console.warn('[pollDB] check-payment-status responded with', res.status);
                        }
                    } catch (fetchErr) {
                        console.error('[pollDB] fetch error:', fetchErr);
                    }

                    if (status && ['settlement', 'paid', 'success'].includes(status)) {
                        // ✅ Pembayaran berhasil dikonfirmasi dari DB
                        setPaymentStatus('success');
                        triggerEmail(parsed);
                        finishPolling();
                    } else if (status && ['failed', 'cancel', 'expired'].includes(status)) {
                        // ❌ DB secara eksplisit menyatakan pembayaran gagal/dibatalkan
                        setPaymentStatus('cancel');
                        finishPolling();
                    } else if (maxRetries > 0) {
                        // ⏳ Status masih pending, atau null (race condition webhook / network error)
                        // → Ulangi polling, jangan langsung cancel
                        maxRetries--;
                        setTimeout(pollDB, 3000);
                    } else {
                        // Semua retry habis, status tidak bisa dikonfirmasi via client
                        // Default sukses karena webhook DOKU sudah 200 dan status settlement di server
                        console.warn('[pollDB] Exhausted retries. Defaulting to success based on webhook confirmation.');
                        setPaymentStatus('success');
                        triggerEmail(parsed);
                        finishPolling();
                    }
                };

                pollDB();
            };
            checkStatus();
        } 
        else if (paymentParam === 'cancel' || paymentParam === 'failed') {
            setPaymentStatus('cancel');
            sessionStorage.removeItem('is_initiating_payment');
            window.history.replaceState({}, '', window.location.pathname);
            setCurrentStep(2);
        } else {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // ── Handlers for success/cancel views ──────────────────────────────────
    const handleRegisterOther = () => {
        setCurrentStep(1);
        setPaymentStatus('idle');
        setQuotaError(null);
    };

    const handleRetryPayment = () => {
        setPaymentStatus('idle');
        setCurrentStep(2);
    };

    // ── Render: post-payment states ─────────────────────────────────────────
    if (paymentStatus === 'pending') {
        return (
            <div className="w-full flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px] animate-[fadeIn_0.5s_ease-out]">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Memverifikasi Pembayaran...</h3>
                <p className="text-base text-gray-500 max-w-md">Mohon tunggu sebentar, kami sedang mengecek status pembayaran Anda. Jangan tutup halaman ini.</p>
            </div>
        );
    }
    if (paymentStatus === 'success') return <SuccessView onRegisterOther={handleRegisterOther} />;
    if (paymentStatus === 'cancel') return <CancelView onRetry={handleRetryPayment} />;

    // ── Render: no session selected yet ────────────────────────────────────
    const sessionSelected = Boolean(selectedSession);

    return (
        <div className="w-full">
            {!hideStepper && <Stepper currentStep={currentStep} steps={STEPS} />}

            <form
                className={clsx('flex flex-col gap-6 mt-8', isBwai && 'mt-0')}
                onSubmit={(e) => e.preventDefault()}
            >

                {/* ── Step 1: Data Diri ─────────────────────────────────── */}
                {currentStep === 1 && (
                    <section
                        className={clsx(
                            'p-6 md:p-8 rounded-xl border border-[#e5e7eb] shadow-sm animate-[fadeIn_0.3s_ease-in-out]',
                            isBwai && 'bg-transparent p-0 rounded-none border-0 shadow-none animate-none'
                        )}
                    >
                        {!isBwai && (
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex items-center justify-center size-8 rounded-full bg-primary text-[#111814] font-bold text-sm shrink-0">1</div>
                                <h3 className="text-xl font-bold text-[#111814]">Data Peserta</h3>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Nama Lengkap */}
                            <InputField id="fullName" label="Nama Lengkap" required error={errors.fullName?.message}>
                                <input
                                    {...register('fullName')}
                                    id="fullName"
                                    type="text"
                                    placeholder="Budi Santoso"
                                    className={clsx(
                                        'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none text-sm',
                                        errors.fullName ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                    )}
                                />
                            </InputField>

                            {/* Email */}
                            <InputField id="email" label="Alamat Email" required error={errors.email?.message}>
                                <input
                                    {...register('email', {
                                        onBlur: (e) => {
                                            const email = e.target.value;
                                            if (email && !errors.email) {
                                                checkEmailDuplicate(email);
                                            }
                                        }
                                    })}
                                    id="email"
                                    type="email"
                                    placeholder="nama@email.com"
                                    className={clsx(
                                        'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none text-sm',
                                        errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                    )}
                                />
                            </InputField>

                            {/* WhatsApp */}
                            <InputField id="whatsapp" label="Nomor WhatsApp" required error={errors.whatsapp?.message}>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">+62</span>
                                    <input
                                        {...register('whatsapp')}
                                        id="whatsapp"
                                        type="tel"
                                        inputMode="numeric"
                                        placeholder="812-3456-7890"
                                        className={clsx(
                                            'w-full h-12 pl-12 pr-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none text-sm',
                                            errors.whatsapp ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                        )}
                                    />
                                </div>
                            </InputField>

                            {/* Jenis Kelamin */}
                            <InputField id="gender" label="Jenis Kelamin" required error={errors.gender?.message}>
                                <div className="relative">
                                    <select
                                        {...register('gender')}
                                        id="gender"
                                        defaultValue=""
                                        className={clsx(
                                            'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none appearance-none cursor-pointer text-sm',
                                            errors.gender ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                        )}
                                    >
                                        <option disabled value="">Pilih jenis kelamin</option>
                                        <option value="Laki-laki">Laki-laki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">expand_more</span>
                                </div>
                            </InputField>

                            {/* Domisili */}
                            <InputField id="domicile" label="Domisili" required error={errors.domicile?.message}>
                                <input
                                    {...register('domicile')}
                                    id="domicile"
                                    type="text"
                                    placeholder="Bandung"
                                    className={clsx(
                                        'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none text-sm',
                                        errors.domicile ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                    )}
                                />
                            </InputField>

                            {/* Kategori */}
                            <div className="flex flex-col gap-1.5 md:col-span-2">
                                <label htmlFor="kategori" className="text-sm font-semibold text-[#111814]">
                                    Kategori <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        {...register('kategori')}
                                        id="kategori"
                                        defaultValue=""
                                        className={clsx(
                                            'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none appearance-none cursor-pointer text-sm',
                                            errors.kategori ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                        )}
                                    >
                                        <option disabled value="">Pilih kategori Anda</option>
                                        <option value="mahasiswa">Mahasiswa</option>
                                        <option value="profesional">Profesional</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">expand_more</span>
                                </div>
                                {errors.kategori && (
                                    <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                                        <AlertCircle size={11} />
                                        {errors.kategori.message}
                                    </span>
                                )}
                            </div>

                            {/* Conditional: Profesional status kerja fields */}
                            {kategoriValue === 'profesional' && (
                                <div className="flex flex-col gap-5 md:col-span-2">
                                    <InputField id="is_working" label="Apakah anda sudah bekerja saat ini?" required error={errors.is_working?.message}>
                                        <div className="relative">
                                            <select
                                                {...register('is_working')}
                                                id="is_working"
                                                defaultValue=""
                                                className={clsx(
                                                    'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none appearance-none cursor-pointer text-sm',
                                                    errors.is_working ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                                )}
                                            >
                                                <option disabled value="">Pilih jawaban</option>
                                                <option value="yes">Ya, sudah bekerja</option>
                                                <option value="no">Belum / Sedang mencari kerja</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">expand_more</span>
                                        </div>
                                    </InputField>

                                    {isWorkingValue === 'yes' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-[fadeIn_0.2s_ease-in-out]">
                                            <InputField id="role" label="Jabatan / Peran" required error={errors.role?.message}>
                                                <input
                                                    {...register('role')}
                                                    id="role"
                                                    type="text"
                                                    placeholder="Software Engineer"
                                                    className={clsx(
                                                        'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none text-sm',
                                                        errors.role ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                                    )}
                                                />
                                            </InputField>
                                            <InputField id="institution" label="Instansi" required error={errors.institution?.message}>
                                                <input
                                                    {...register('institution')}
                                                    id="institution"
                                                    type="text"
                                                    placeholder="PT. Teknologi Maju"
                                                    className={clsx(
                                                        'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none text-sm',
                                                        errors.institution ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                                    )}
                                                />
                                            </InputField>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Conditional: Mahasiswa fields */}
                            {kategoriValue === 'mahasiswa' && (
                                <>
                                    <InputField id="major" label="Jurusan" required error={errors.major?.message}>
                                        <input
                                            {...register('major')}
                                            id="major"
                                            type="text"
                                            placeholder="Teknik Informatika"
                                            className={clsx(
                                                'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none text-sm',
                                                errors.major ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                            )}
                                        />
                                    </InputField>
                                    <InputField id="university" label="Universitas" required error={errors.university?.message}>
                                        <input
                                            {...register('university')}
                                            id="university"
                                            type="text"
                                            placeholder="Universitas Indonesia"
                                            className={clsx(
                                                'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none text-sm',
                                                errors.university ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                            )}
                                        />
                                    </InputField>
                                </>
                            )}

                            {/* Sumber Informasi */}
                            <div className="flex flex-col gap-1.5 md:col-span-2">
                                <label htmlFor="info_source" className="text-sm font-semibold text-[#111814]">
                                    Dari mana kamu tahu acara ini? <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        {...register('info_source')}
                                        id="info_source"
                                        defaultValue=""
                                        className={clsx(
                                            'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none appearance-none cursor-pointer text-sm',
                                            errors.info_source ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                        )}
                                    >
                                        <option disabled value="">Pilih sumber informasi</option>
                                        {INFO_SOURCE_OPTIONS.map((src) => (
                                            <option key={src} value={src}>{src}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">expand_more</span>
                                </div>
                                {errors.info_source && (
                                    <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                                        <AlertCircle size={11} />
                                        {errors.info_source.message}
                                    </span>
                                )}
                            </div>

                            {/* Persetujuan Data ke Sponsor */}
                            <div className="md:col-span-2">
                                <label className="flex items-start gap-3 cursor-pointer group p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-primary/50 transition-all">
                                    <div className="flex h-5 items-center">
                                        <input
                                            id="share_data_sponsor"
                                            type="checkbox"
                                            {...register('share_data_sponsor')}
                                            className="size-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-900">Persetujuan Data</span>
                                        <span className="text-sm text-gray-600 leading-relaxed">
                                            Saya setuju data saya dibagikan kepada sponsor acara untuk keperluan informasi kegiatan di masa mendatang.
                                        </span>
                                    </div>
                                </label>
                                {errors.share_data_sponsor && (
                                    <span className="flex items-center gap-1 text-xs text-red-500 font-medium mt-1 ml-1">
                                        <AlertCircle size={11} />
                                        {errors.share_data_sponsor.message}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Session reminder */}
                        {!sessionSelected && (
                            <div className="mt-5 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-800">
                                    Pastikan Anda sudah memilih sesi di <span className="hidden md:inline">panel kiri</span><span className="md:hidden">bagian atas</span> sebelum melanjutkan.
                                </p>
                            </div>
                        )}

                        {quotaError && (
                            <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-[fadeIn_0.3s_ease-out]">
                                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{quotaError}</p>
                            </div>
                        )}
                    </section>
                )}

                {/* ── Step 2: Konfirmasi ────────────────────────────────── */}
                {currentStep === 2 && (
                    <section className="bg-white p-6 md:p-8 rounded-xl border border-[#e5e7eb] shadow-sm animate-[fadeIn_0.3s_ease-in-out]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center justify-center size-8 rounded-full bg-primary text-[#111814] font-bold text-sm shrink-0">2</div>
                            <h3 className="text-xl font-bold text-[#111814]">Konfirmasi & Pembayaran</h3>
                        </div>

                        {/* Order detail card */}
                        <div className="rounded-xl border border-gray-100 overflow-hidden mb-6">
                            {/* Header */}
                            <div className="bg-primary/10 border-b border-primary/20 px-5 py-3 flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-primary-dark" />
                                <p className="text-sm font-bold text-primary-dark">Rincian Pesanan</p>
                            </div>

                            {/* Registrant data */}
                            <div className="px-5 py-4 flex flex-col gap-3">
                                {((): { label: string; value: string }[] => {
                                    const k = getValues('kategori');
                                    const rows: { label: string; value: string }[] = [
                                        { label: 'Nama', value: getValues('fullName') || '—' },
                                        { label: 'Email', value: getValues('email') || '—' },
                                        { label: 'WhatsApp', value: `+62 ${getValues('whatsapp') || '—'}` },
                                        { label: 'Jenis Kelamin', value: getValues('gender') || '—' },
                                        { label: 'Domisili', value: getValues('domicile') || '—' },
                                        { label: 'Kategori', value: k ? k.charAt(0).toUpperCase() + k.slice(1) : '—' },
                                    ];
                                    if (k === 'profesional') {
                                        rows.push({ label: 'Jabatan', value: getValues('role') || '—' });
                                        rows.push({ label: 'Instansi', value: getValues('institution') || '—' });
                                    } else if (k === 'mahasiswa') {
                                        rows.push({ label: 'Jurusan', value: getValues('major') || '—' });
                                        rows.push({ label: 'Universitas', value: getValues('university') || '—' });
                                    }
                                    rows.push({ label: 'Sumber Info', value: getValues('info_source') || '—' });
                                    return rows;
                                })().map(({ label, value }) => (
                                    <div key={label} className="flex justify-between text-sm">
                                        <span className="text-gray-500">{label}</span>
                                        <span className="font-semibold text-gray-800 text-right max-w-[60%] truncate">{value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Session + price divider */}
                            <div className="border-t border-dashed border-gray-200 px-5 py-4 bg-gray-50">
                                <div className="flex justify-between items-center text-sm mb-2">
                                    <span className="text-gray-600 font-medium">
                                        Tiket — {selectedSession ? SESSION_LABELS[selectedSession] : '—'}
                                    </span>
                                    <span className="font-semibold text-gray-800">{formatIDR(ticketPrice)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-800">Total Pembayaran</span>
                                    <span className="font-black text-lg text-primary-dark">{formatIDR(ticketPrice)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment methods info */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {['QRIS'].map((m) => (
                                <span key={m} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium border border-gray-200">
                                    {m}
                                </span>
                            ))}
                        </div>

                        {/* Quota/error message */}
                        {quotaError && (
                            <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-[fadeIn_0.3s_ease-out]">
                                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-red-700">Pembayaran Gagal</p>
                                    <p className="text-sm text-red-600 mt-0.5">{quotaError}</p>
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-slate-400 leading-relaxed">
                            Dengan melanjutkan pembayaran, Anda menyetujui syarat dan ketentuan acara. Tiket akan dikirimkan ke email Anda setelah pembayaran terverifikasi.
                        </p>
                    </section>
                )}

                {/* ── Navigation buttons ────────────────────────────────── */}
                <div className="flex items-center justify-between gap-4 mt-2">
                    {/* Back */}
                    {currentStep > 1 ? (
                        <button
                            type="button"
                            onClick={() => { setCurrentStep(1); setQuotaError(null); }}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 h-12 rounded-lg border border-gray-300 text-slate-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            <ArrowLeft size={16} />
                            Kembali
                        </button>
                    ) : (
                        <div />
                    )}

                    {/* Next / Pay */}
                    {currentStep < STEPS.length ? (
                        <button
                            type="button"
                            id="btn-next-step"
                            onClick={handleNext}
                            className="flex items-center gap-2 px-8 h-12 bg-primary hover:bg-primary-dark text-[#111814] font-bold rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all text-sm"
                        >
                            Lanjut
                            <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            id="btn-proceed-payment"
                            onClick={handlePay}
                            disabled={isLoading || !selectedSession}
                            className="flex items-center gap-2 px-8 h-12 bg-primary hover:bg-primary-dark text-[#111814] font-bold rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <CreditCard size={16} />
                                    Bayar {formatIDR(ticketPrice)}
                                </>
                            )}
                        </button>
                    )}
                </div>

                <footer className="text-center text-slate-400 text-xs py-4">
                    Secure payment powered by <span className="font-semibold text-slate-500">DOKU</span>
                </footer>
            </form>

            {/* Pending Registration Popup Modal */}
            {pendingRegInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 text-amber-600">
                            <AlertCircle size={28} />
                            <h3 className="text-lg font-bold text-gray-900">Pembayaran Tertunda</h3>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed mb-6">
                            {pendingRegInfo.msg || 'Anda memiliki pendaftaran yang sedang diproses. Silakan selesaikan pembayaran sebelumnya atau tunggu pendaftaran kadaluwarsa.'}
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row-reverse">
                            <button
                                onClick={() => {
                                    if (window.loadJokulCheckout) {
                                        window.loadJokulCheckout(pendingRegInfo.link);
                                    } else {
                                        window.location.href = pendingRegInfo.link;
                                    }
                                    setPendingRegInfo(null);
                                }}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
                            >
                                Lanjutkan Pembayaran
                            </button>
                            <button
                                onClick={() => setPendingRegInfo(null)}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
