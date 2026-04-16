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

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_LABELS: Record<SessionKey, string> = {
    session1: 'Sesi 1',
    session2: 'Sesi 2',
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
    selectedSession,
    onSessionSelect: _onSessionSelect,
}) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'cancel'>('idle');
    const [isLoading, setIsLoading] = useState(false);
    const [quotaError, setQuotaError] = useState<string | null>(null);

    const {
        register,
        trigger,
        getValues,
        formState: { errors },
    } = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        mode: 'onChange',
    });

    // ── Step 1: Validate & advance ──────────────────────────────────────────
    const handleNext = async () => {
        setQuotaError(null);
        const isValid = await trigger(['fullName', 'email', 'whatsapp', 'instansi', 'kategori']);
        if (!isValid) return;

        if (!selectedSession) {
            setQuotaError('Silakan pilih sesi terlebih dahulu di panel kiri.');
            return;
        }
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
                    instansi: formData.instansi,
                    kategori: formData.kategori,
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
                // Check for quota-full error from Edge Function
                const msg = error.message || '';
                if (msg.includes('kuota') || msg.includes('penuh') || msg.includes('quota')) {
                    setQuotaError('Mohon maaf, kuota sesi ini baru saja penuh. Silakan pilih sesi lain.');
                } else {
                    setQuotaError('Gagal membuat transaksi: ' + msg);
                }
                setIsLoading(false);
                return;
            }

            if (data?.link) {
                // Store pending data for post-payment processing
                sessionStorage.setItem('is_initiating_payment', 'true');
                sessionStorage.setItem('pending_registration_data', JSON.stringify({
                    email: formData.email,
                    name: formData.fullName,
                    whatsapp: formData.whatsapp,
                    instansi: formData.instansi,
                    kategori: formData.kategori,
                    session: selectedSession,
                    sessionLabel: SESSION_LABELS[selectedSession],
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

                    // Detect DOKU popup load via PerformanceObserver
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
                        // PerformanceObserver not supported
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

        if (paymentParam === 'success' || paymentParam === 'result') {
            setPaymentStatus('success');
            sessionStorage.removeItem('is_initiating_payment');
            window.history.replaceState({}, '', window.location.pathname);

            // Trigger email / QR Code sending
            const pendingStr = sessionStorage.getItem('pending_registration_data');
            if (pendingStr) {
                try {
                    const parsed = JSON.parse(pendingStr);
                    fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(parsed),
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
                } catch (e) {
                    console.error('Parse error:', e);
                }
                sessionStorage.removeItem('pending_registration_data');
            }
        } else if (paymentParam === 'cancel' || paymentParam === 'failed') {
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
    if (paymentStatus === 'success') return <SuccessView onRegisterOther={handleRegisterOther} />;
    if (paymentStatus === 'cancel') return <CancelView onRetry={handleRetryPayment} />;

    // ── Render: no session selected yet ────────────────────────────────────
    const sessionSelected = Boolean(selectedSession);

    return (
        <div className="w-full">
            <Stepper currentStep={currentStep} steps={STEPS} />

            <form className="flex flex-col gap-6 mt-8" onSubmit={(e) => e.preventDefault()}>

                {/* ── Step 1: Data Diri ─────────────────────────────────── */}
                {currentStep === 1 && (
                    <section className="bg-white p-6 md:p-8 rounded-xl border border-[#e5e7eb] shadow-sm animate-[fadeIn_0.3s_ease-in-out]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center justify-center size-8 rounded-full bg-primary text-[#111814] font-bold text-sm shrink-0">1</div>
                            <h3 className="text-xl font-bold text-[#111814]">Data Peserta</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Nama Lengkap */}
                            <InputField id="fullName" label="Nama Lengkap" required error={errors.fullName?.message}>
                                <input
                                    {...register('fullName')}
                                    id="fullName"
                                    type="text"
                                    placeholder="cth. Budi Santoso"
                                    className={clsx(
                                        'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none text-sm',
                                        errors.fullName ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                    )}
                                />
                            </InputField>

                            {/* Email */}
                            <InputField id="email" label="Alamat Email" required error={errors.email?.message}>
                                <input
                                    {...register('email')}
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

                            {/* Instansi */}
                            <InputField id="instansi" label="Instansi / Universitas" required error={errors.instansi?.message}>
                                <input
                                    {...register('instansi')}
                                    id="instansi"
                                    type="text"
                                    placeholder="cth. Universitas Indonesia"
                                    className={clsx(
                                        'w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none text-sm',
                                        errors.instansi ? 'border-red-400 bg-red-50' : 'border-gray-300'
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
                                        <option value="umum">Umum</option>
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
                        </div>

                        {/* Session reminder */}
                        {!sessionSelected && (
                            <div className="mt-5 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-800">
                                    Pastikan Anda sudah memilih sesi di panel kiri sebelum melanjutkan.
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
                                {[
                                    { label: 'Nama', value: getValues('fullName') || '—' },
                                    { label: 'Email', value: getValues('email') || '—' },
                                    { label: 'WhatsApp', value: `+62 ${getValues('whatsapp') || '—'}` },
                                    { label: 'Instansi', value: getValues('instansi') || '—' },
                                    {
                                        label: 'Kategori', value: (() => {
                                            const k = getValues('kategori');
                                            return k ? k.charAt(0).toUpperCase() + k.slice(1) : '—';
                                        })()
                                    },
                                ].map(({ label, value }) => (
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
                    Pembayaran aman diproses oleh <span className="font-semibold text-slate-500">DOKU</span>
                </footer>
            </form>
        </div>
    );
};
