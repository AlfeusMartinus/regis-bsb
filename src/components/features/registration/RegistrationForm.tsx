import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stepper } from '../../ui/Stepper';
import { SuccessView } from './SuccessView';
import { CancelView } from './CancelView';
import { personalBaseSchema, donationSchema } from '../../../lib/validationSchema';
import { z } from 'zod';
import { clsx } from 'clsx';
import { supabase } from '../../../lib/supabase';

const registrationBaseSchema = personalBaseSchema.merge(donationSchema);
type RegistrationFormData = z.infer<typeof registrationBaseSchema>;

const formatCurrency = (value: string) => {
    if (!value) return '';
    const numberString = value.replace(/[^0-9]/g, '');
    return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

declare global {
    interface Window {
        loadJokulCheckout: (url: string) => void;
    }
}

interface RegistrationFormProps {
    eventId?: string;
    eventName?: string;
    eventSlug?: string;
    minimumDonation?: number;
    event?: any;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ eventId, eventName, eventSlug, minimumDonation = 1000, event }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'cancel'>('idle');
    const [isLoading, setIsLoading] = useState(false);

    const steps = ["Data Diri", "Donasi"];

    const {
        register,
        trigger,
        watch,
        getValues,
        setValue,
        formState: { errors }
    } = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationBaseSchema.superRefine((data, ctx) => {
            // 1. Personal refinements
            if (data.status === 'student' && !data.major) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Jurusan wajib diisi untuk Mahasiswa",
                    path: ['major'],
                });
            }
            if (data.status === 'professional' && !data.institution) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Instansi/Perusahaan wajib diisi untuk Profesional",
                    path: ['institution'],
                });
            }
            if (data.uses_external_peripherals === true && !data.mouse_brand) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Merek mouse wajib diisi",
                    path: ['mouse_brand'],
                });
            }
            if (data.work_device_factors.includes('Others') && !data.work_device_factors_others) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Sebutkan faktor lainnya",
                    path: ['work_device_factors_others'],
                });
            }

            // 2. Donation refinements
            const rawAmount = data.amount.replace(/\./g, '');
            if (rawAmount && parseInt(rawAmount) < minimumDonation) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Minimal donasi adalah Rp ${minimumDonation.toLocaleString('id-ID')}`,
                    path: ['amount']
                });
            }
        })),
        mode: 'onChange',
        defaultValues: {
            amount: '',
            uses_external_peripherals: undefined,
            work_device_factors: [],
            mouse_brand: '',
            work_device_factors_others: ''
        }
    });

    const status = watch('status');
    const usesExternal = watch('uses_external_peripherals');
    const selectedFactors = watch('work_device_factors') || [];
    const infoSource = watch('info_source');

    const handleNext = async () => {
        let isValid = false;
        if (currentStep === 1) {
            isValid = await trigger([
                'fullName',
                'email',
                'whatsapp',
                'domicile',
                'gender',
                'status',
                'university',
                'major',
                'institution',
                'role',
                'uses_external_peripherals',
                'mouse_brand',
                'work_device_factors',
                'work_device_factors_others',
                'info_source',
                'info_source_others'
            ]);
        }

        if (isValid) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleGeneratePayment = async () => {
        const isValid = await trigger(['amount', 'prayer']);
        if (!isValid) return;

        setIsLoading(true);
        try {
            const formData = getValues();

            const { data, error } = await supabase.functions.invoke('create-payment', {
                body: {
                    amount: parseInt(formData.amount.replace(/\./g, '')),
                    name: formData.fullName,
                    email: formData.email,
                    phone: formData.whatsapp,
                    domicile: formData.domicile,
                    prayer: formData.prayer,
                    eventId: eventId,
                    eventName: eventName,
                    eventSlug: eventSlug,
                    gender: formData.gender,
                    currentStatus: formData.status,
                    university: formData.status === 'student' ? formData.university : null,
                    major: formData.status === 'student' ? formData.major : null,
                    institution: formData.status === 'professional' ? formData.institution : null,
                    role: formData.status === 'professional' ? formData.role : null,
                    uses_external_peripherals: formData.uses_external_peripherals,
                    mouse_brand: formData.mouse_brand,
                    work_device_factors: formData.work_device_factors,
                    work_device_factors_others: formData.work_device_factors_others,
                    info_source: formData.info_source,
                    info_source_others: formData.info_source_others
                }
            });

            if (error) {
                console.error("Payment Function Error:", error);
                alert("Gagal membuat pembayaran: " + error.message);
                setIsLoading(false);
                return;
            }

            if (data?.link) {
                sessionStorage.setItem('is_initiating_payment', 'true');
                sessionStorage.setItem('pending_registration_data', JSON.stringify({
                    email: formData.email,
                    name: formData.fullName,
                    whatsapp: formData.whatsapp,
                    domicile: formData.domicile,
                    eventId: eventId,
                    eventName: eventName || "Acara",
                    ticketId: `TKT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
                    date_time: event?.date_time,
                    location: event?.location,
                    location_detail: event?.location_detail,
                    location_link: event?.location_link,
                    university: formData.status === 'student' ? formData.university : null,
                    major: formData.status === 'student' ? formData.major : null,
                    institution: formData.status === 'professional' ? formData.institution : null,
                    role: formData.status === 'professional' ? formData.role : null,
                    info_source: formData.info_source,
                    info_source_others: formData.info_source_others
                }));

                if (window.loadJokulCheckout) {
                    window.loadJokulCheckout(data.link);
                } else {
                    window.location.href = data.link;
                }
            } else {
                alert("Gagal mendapatkan link pembayaran.");
                setIsLoading(false);
            }

        } catch (err) {
            console.error("Unexpected Error:", err);
            alert("Terjadi kesalahan sistem.");
            setIsLoading(false);
        }
    };

    const handleRegisterOther = () => {
        setCurrentStep(1);
        setPaymentStatus('idle');
        setValue('amount', '');
        setValue('prayer', '');
    };

    // Check URL params for payment success/failure on mount
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const paymentParam = params.get('payment');

        if (paymentParam === 'success' || paymentParam === 'result') {
            setPaymentStatus('success');
            sessionStorage.removeItem('is_initiating_payment');
            window.history.replaceState({}, '', window.location.pathname);

            // Trigger email sending
            const pendingDataString = sessionStorage.getItem('pending_registration_data');
            if (pendingDataString) {
                try {
                    const parsedData = JSON.parse(pendingDataString);
                    fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(parsedData)
                    }).then(res => res.json())
                        .then(data => console.log('Email API response:', data))
                        .catch(err => console.error('Failed to trigger email:', err));
                } catch (e) {
                    console.error('Error parsing pending registration data:', e);
                }
                sessionStorage.removeItem('pending_registration_data');
            }
        } else if (paymentParam === 'cancel') {
            setPaymentStatus('cancel');
            sessionStorage.removeItem('is_initiating_payment');
            window.history.replaceState({}, '', window.location.pathname);
            setCurrentStep(2);
        } else if (paymentParam) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleRetryPayment = () => {
        setPaymentStatus('idle');
        setCurrentStep(2);
    };

    // If payment is successful, show the success view covering the form
    if (paymentStatus === 'success') {
        return <SuccessView onRegisterOther={handleRegisterOther} />;
    }

    if (paymentStatus === 'cancel') {
        return <CancelView onRetry={handleRetryPayment} />;
    }

    return (
        <div className="w-full">
            <Stepper currentStep={currentStep} steps={steps} />

            <form className="flex flex-col gap-8 mt-8" onSubmit={(e) => e.preventDefault()}>

                {currentStep === 1 && (
                    <section className="bg-white p-6 md:p-8 rounded-xl border border-[#e5e7eb] shadow-sm animate-[fadeIn_0.3s_ease-in-out]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center justify-center size-8 rounded-full bg-primary text-[#111814] font-bold text-sm">1</div>
                            <h3 className="text-xl font-bold text-[#111814]">Informasi Pribadi</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-[#111814]" htmlFor="fullName">Nama Lengkap</label>
                                <input
                                    {...register('fullName')}
                                    className={clsx(
                                        "w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all outline-none",
                                        errors.fullName ? "border-red-500" : "border-gray-300"
                                    )}
                                    id="fullName"
                                    placeholder="cth. Budi Santoso"
                                    type="text"
                                />
                                {errors.fullName && <span className="text-xs text-red-500">{errors.fullName.message}</span>}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-[#111814]" htmlFor="email">Alamat Email</label>
                                <input
                                    {...register('email')}
                                    className={clsx(
                                        "w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all outline-none",
                                        errors.email ? "border-red-500" : "border-gray-300"
                                    )}
                                    id="email"
                                    placeholder="nama@email.com"
                                    type="email"
                                />
                                {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-[#111814]" htmlFor="whatsapp">Nomor WhatsApp</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">+62</span>
                                    <input
                                        {...register('whatsapp')}
                                        className={clsx(
                                            "w-full h-12 pl-12 pr-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all outline-none",
                                            errors.whatsapp ? "border-red-500" : "border-gray-300"
                                        )}
                                        id="whatsapp"
                                        placeholder="812-3456-7890"
                                        type="tel"
                                    />
                                </div>
                                {errors.whatsapp && <span className="text-xs text-red-500">{errors.whatsapp.message}</span>}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-[#111814]" htmlFor="domicile">Domisili</label>
                                <input
                                    {...register('domicile')}
                                    className={clsx(
                                        "w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all outline-none",
                                        errors.domicile ? "border-red-500" : "border-gray-300"
                                    )}
                                    id="domicile"
                                    placeholder="cth. Jakarta Selatan"
                                    type="text"
                                />
                                {errors.domicile && <span className="text-xs text-red-500">{errors.domicile.message}</span>}
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2 pt-2">
                                <label className="text-sm font-semibold text-[#111814]">Jenis Kelamin</label>
                                <div className="flex gap-6 mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="Laki-laki"
                                            {...register('gender')}
                                            className="size-4 accent-primary"
                                        />
                                        <span className="text-sm text-gray-700">Laki-laki</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="Perempuan"
                                            {...register('gender')}
                                            className="size-4 accent-primary"
                                        />
                                        <span className="text-sm text-gray-700">Perempuan</span>
                                    </label>
                                </div>
                                {errors.gender && <span className="text-xs text-red-500">{errors.gender.message}</span>}
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className="text-sm font-semibold text-[#111814]" htmlFor="status">Status Saat Ini</label>
                                <div className="relative">
                                    <select
                                        {...register('status')}
                                        className={clsx(
                                            "w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all outline-none appearance-none cursor-pointer",
                                            errors.status ? "border-red-500" : "border-gray-300"
                                        )}
                                        id="status"
                                        defaultValue=""
                                    >
                                        <option disabled value="">Pilih status Anda</option>
                                        <option value="student">Pelajar / Mahasiswa</option>
                                        <option value="professional">Profesional / Umum</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                </div>
                                {errors.status && <span className="text-xs text-red-500">{errors.status.message}</span>}
                            </div>

                            {/* Conditional Fields */}
                            {(status === 'student' || status === 'professional') && (
                                <div className="flex flex-col gap-2 md:col-span-2 p-4 bg-blue-50/50 rounded-lg border border-blue-100 animate-[fadeIn_0.3s_ease-out]">
                                    <div className="flex gap-2 text-xs text-blue-600 mb-2">
                                        <span className="material-symbols-outlined text-sm">info</span>
                                        <span>
                                            {status === 'student'
                                                ? 'Silakan isi Universitas dan Jurusan Anda.'
                                                : 'Silakan isi Instansi/Perusahaan dan Jabatan Anda.'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {status === 'student' && (
                                            <>
                                                <div className="flex flex-col gap-1 w-full">
                                                    <input
                                                        {...register('university')}
                                                        className={clsx(
                                                            "w-full h-10 px-3 rounded border text-sm focus:border-primary focus:ring-primary/20 transition-all",
                                                            errors.university ? "border-red-500" : "border-gray-300"
                                                        )}
                                                        placeholder="Universitas / Perguruan Tinggi"
                                                        type="text"
                                                    />
                                                    {errors.university && <span className="text-xs text-red-500">{errors.university.message}</span>}
                                                </div>
                                                <div className="flex flex-col gap-1 w-full">
                                                    <input
                                                        {...register('major')}
                                                        className={clsx(
                                                            "w-full h-10 px-3 rounded border text-sm focus:border-primary focus:ring-primary/20 transition-all",
                                                            errors.major ? "border-red-500" : "border-gray-300"
                                                        )}
                                                        placeholder="Jurusan"
                                                        type="text"
                                                    />
                                                    {errors.major && <span className="text-xs text-red-500">{errors.major.message}</span>}
                                                </div>
                                            </>
                                        )}
                                        {status === 'professional' && (
                                            <>
                                                <div className="flex flex-col gap-1 w-full">
                                                    <input
                                                        {...register('institution')}
                                                        className={clsx(
                                                            "w-full h-10 px-3 rounded border text-sm focus:border-primary focus:ring-primary/20 transition-all",
                                                            errors.institution ? "border-red-500" : "border-gray-300"
                                                        )}
                                                        placeholder="Instansi / Perusahaan"
                                                        type="text"
                                                    />
                                                    {errors.institution && <span className="text-xs text-red-500">{errors.institution.message}</span>}
                                                </div>
                                                <div className="flex flex-col gap-1 w-full">
                                                    <input
                                                        {...register('role')}
                                                        className={clsx(
                                                            "w-full h-10 px-3 rounded border text-sm focus:border-primary focus:ring-primary/20 transition-all",
                                                            errors.role ? "border-red-500" : "border-gray-300"
                                                        )}
                                                        placeholder="Jabatan / Role"
                                                        type="text"
                                                    />
                                                    {errors.role && <span className="text-xs text-red-500">{errors.role.message}</span>}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-2 md:col-span-2 pt-4 border-t border-gray-100">
                                <label className="text-sm font-semibold text-[#111814]">Apakah Anda menggunakan mouse/keyboard eksternal?</label>
                                <div className="flex gap-4 mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={usesExternal === true}
                                            onChange={() => setValue('uses_external_peripherals', true, { shouldValidate: true })}
                                            className="size-4 accent-primary"
                                        />
                                        <span className="text-sm">YA</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={usesExternal === false}
                                            onChange={() => setValue('uses_external_peripherals', false, { shouldValidate: true })}
                                            className="size-4 accent-primary"
                                        />
                                        <span className="text-sm">TIDAK</span>
                                    </label>
                                </div>
                                {errors.uses_external_peripherals && <span className="text-xs text-red-500">{errors.uses_external_peripherals.message}</span>}
                            </div>

                            {usesExternal === true && (
                                <div className="flex flex-col gap-2 md:col-span-2 animate-[fadeIn_0.3s_ease-out]">
                                    <label className="text-sm font-semibold text-[#111814]" htmlFor="mouse_brand">Apa merek mouse yang Anda gunakan saat ini?</label>
                                    <input
                                        {...register('mouse_brand')}
                                        className={clsx(
                                            "w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all outline-none",
                                            errors.mouse_brand ? "border-red-500" : "border-gray-300"
                                        )}
                                        id="mouse_brand"
                                        placeholder="cth. Logitech, Razer, dll."
                                        type="text"
                                    />
                                    {errors.mouse_brand && <span className="text-xs text-red-500">{errors.mouse_brand.message}</span>}
                                </div>
                            )}

                            <div className="flex flex-col gap-3 md:col-span-2 pt-4">
                                <label className="text-sm font-semibold text-[#111814]">
                                    Menurut Anda, apa faktor terpenting dalam memilih perangkat kerja (mouse/keyboard) sebagai perangkat harian Anda?
                                </label>
                                <p className="text-xs text-gray-500 italic">Anda dapat memilih lebih dari 1 poin</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                    {[
                                        { value: 'Quality', label: 'Quality - dapat digunakan dalam jangka waktu lama' },
                                        { value: 'Feature', label: 'Feature - mempermudah dan mempercepat alur kerja' },
                                        { value: 'Ergonomic', label: 'Ergonomic Design - Nyaman digenggam/digunakan berjam-jam' },
                                        { value: 'Price', label: 'Price - sebanding dengan fitur yang didapat' },
                                        { value: 'Brand', label: 'Brand - memiliki reputasi brand yang baik' },
                                        { value: 'Warranty', label: 'Official Warranty - memiliki layanan purna jual yang baik' },
                                        { value: 'ECO', label: 'ECO Friendly - Terbuat dari bahan ramah lingkungan dan nol karbon' },
                                        { value: 'Portable', label: 'Easy to go - mudah dibawa kemana-mana' },
                                        { value: 'Others', label: 'Lainnya' },
                                    ].map((factor) => (
                                        <label key={factor.value} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all">
                                            <input
                                                type="checkbox"
                                                value={factor.value}
                                                {...register('work_device_factors')}
                                                className="mt-1 size-4 accent-primary"
                                            />
                                            <span className="text-sm leading-tight text-gray-700">{factor.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.work_device_factors && <span className="text-xs text-red-500">{errors.work_device_factors.message}</span>}

                                {selectedFactors.includes('Others') && (
                                    <div className="mt-2 animate-[fadeIn_0.3s_ease-out]">
                                        <input
                                            {...register('work_device_factors_others')}
                                            className={clsx(
                                                "w-full h-12 px-4 rounded-lg border bg-gray-50 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all outline-none",
                                                errors.work_device_factors_others ? "border-red-500" : "border-gray-300"
                                            )}
                                            placeholder="Sebutkan faktor lainnya..."
                                            type="text"
                                        />
                                        {errors.work_device_factors_others && <span className="text-xs text-red-500">{errors.work_device_factors_others.message}</span>}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 md:col-span-2 pt-4">
                                <label className="text-sm font-semibold text-[#111814]">
                                    Darimana anda mengetahui event ini? <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-col gap-3 mt-1">
                                    {[
                                        'Social Media - Binary Nusantara',
                                        'Sosial Media - GDG Bandung',
                                        'Social Media - MXperience',
                                        'Whatsapp Group',
                                        'Teman',
                                        'Telegram',
                                        'Facebook',
                                        'X',
                                        'Email',
                                        'Others'
                                    ].map((source) => (
                                        <label key={source} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                value={source}
                                                {...register('info_source')}
                                                className="size-4 accent-primary"
                                            />
                                            {source === 'Others' ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span className="text-sm text-gray-700 whitespace-nowrap">Yang lain:</span>
                                                    <input
                                                        type="text"
                                                        {...register('info_source_others')}
                                                        disabled={infoSource !== 'Others'}
                                                        className={clsx(
                                                            "flex-1 h-8 border-b transition-all focus:outline-none focus:border-primary disabled:bg-transparent disabled:opacity-50",
                                                            errors.info_source_others ? "border-red-500" : "border-gray-300"
                                                        )}
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-700">{source}</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                                {errors.info_source && <span className="text-xs text-red-500">{errors.info_source.message}</span>}
                                {errors.info_source_others && infoSource === 'Others' && <span className="text-xs text-red-500">{errors.info_source_others.message}</span>}
                            </div>
                        </div>
                    </section>
                )}


                {currentStep === 2 && (
                    <section className="bg-white p-6 md:p-8 rounded-xl border border-[#e5e7eb] shadow-sm relative overflow-hidden animate-[fadeIn_0.3s_ease-in-out]">
                        <div className="absolute top-0 right-0 p-3 bg-yellow-100 rounded-bl-xl border-l border-b border-yellow-200">
                            <p className="text-xs font-bold text-yellow-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">volunteer_activism</span>
                                #BelajarSambilBeramal
                            </p>
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center justify-center size-8 rounded-full bg-primary text-[#111814] font-bold text-sm">2</div>
                            <h3 className="text-xl font-bold text-[#111814]">Donasi</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="flex flex-col gap-6">

                                <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                                        <span className="material-symbols-outlined text-[120px] text-emerald-800 -mr-8 -mt-8">mosque</span>
                                    </div>
                                    <h4 className="font-bold text-emerald-900 text-lg mb-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined">volunteer_activism</span>
                                        Sedekah di Bulan Suci
                                    </h4>
                                    <p className="text-emerald-800 text-sm leading-relaxed mb-4">
                                        <em>
                                            “Jika kamu menampakkan sedekah (mu), maka itu adalah baik sekali. Dan jika kamu menyembunyikannya dan kamu berikan kepada orang-orang fakir, maka menyembunyikan itu lebih baik bagimu. Dan Allah akan menghapuskan dari kamu sebagian kesalahan-kesalahanmu, dan Allah mengetahui apa yang kamu kerjakan”
                                        </em>
                                        <span className="block mt-1 font-semibold text-xs">(QS. Al-Baqarah: 271)</span>
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-[#111814]" htmlFor="amount">
                                        Nominal Donasi (IDR)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                        <input
                                            {...register('amount')}
                                            onChange={(e) => {
                                                const formatted = formatCurrency(e.target.value);
                                                setValue('amount', formatted, { shouldValidate: true });
                                            }}
                                            className={clsx(
                                                "w-full h-12 pl-10 pr-4 rounded-lg border bg-white focus:border-primary focus:ring-primary/20 transition-all outline-none font-medium",
                                                errors.amount ? "border-red-500" : "border-gray-300"
                                            )}
                                            id="amount"
                                            placeholder="Masukkan nominal donasi..."
                                            type="text"
                                            inputMode="numeric"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    {errors.amount && (
                                        <span className="text-xs text-red-500 font-medium">
                                            {errors.amount.message}
                                        </span>
                                    )}

                                    <p className="text-xs text-slate-500">
                                        Minimal donasi <span className="font-semibold text-slate-700">Rp {minimumDonation.toLocaleString('id-ID')}</span>. Kontribusi Anda sangat berarti bagi mereka.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-[#111814]" htmlFor="prayer">Doa / Harapan Terbaik</label>
                                    <p className="text-xs text-slate-500 mb-1">Tuliskan doa/harapan terbaikmu untuk acara ini (Akan ditampilkan di layar)</p>
                                    <textarea
                                        {...register('prayer')}
                                        className="w-full p-4 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all outline-none resize-none"
                                        id="prayer"
                                        placeholder="Semoga acaranya lancar dan berkah..."
                                        rows={4}
                                        disabled={isLoading}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <div className="flex items-center justify-between gap-4 mt-4">
                    {currentStep > 1 ? (
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={isLoading}
                            className="px-6 h-12 rounded-lg border border-gray-300 text-slate-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Kembali
                        </button>
                    ) : (
                        <div />
                    )}

                    {currentStep < steps.length ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="px-8 h-12 bg-primary hover:bg-primary-dark text-[#111814] font-bold rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2"
                        >
                            Lanjut
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleGeneratePayment}
                            disabled={isLoading}
                            className="px-8 h-12 bg-primary hover:bg-primary-dark text-[#111814] font-bold rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2"
                        >
                            {isLoading ? 'Memproses...' : (
                                <>
                                    Proses Donasi
                                    <span className="material-symbols-outlined text-sm">payments</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                <footer className="text-center text-slate-400 text-sm py-4">
                    © 2026 {eventName && `• ${eventName}`}
                </footer>
            </form>

            {isLoading && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center">
                        <div className="relative mb-6">
                            <div className="w-16 h-16 border-4 border-gray-100 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-2xl">payments</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Memproses Donasi</h3>
                        <p className="text-gray-500 text-sm">
                            Bismillah, sebentar yaa.. InsyaAllah kami siapkan halaman donasinya untukmu ✨
                        </p>
                    </div>
                </div>
            )}
        </div>

    );
};
