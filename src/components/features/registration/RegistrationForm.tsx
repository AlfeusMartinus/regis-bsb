import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stepper } from '../../ui/Stepper';
import { SuccessView } from './SuccessView';
import { personalSchema, donationSchema } from '../../../lib/validationSchema';
import { z } from 'zod';
import { clsx } from 'clsx';
import { supabase } from '../../../lib/supabase';

// Merge schemas for the full form state
const registrationSchema = personalSchema.merge(donationSchema);
type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
    eventId?: string;
    eventName?: string;
    eventSlug?: string;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ eventId, eventName, eventSlug }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success'>('idle');
    const [isLoading, setIsLoading] = useState(false);

    // Steps reduced to 2
    const steps = ["Data Diri", "Donasi"];

    const {
        register,
        trigger,
        watch,
        getValues,
        setValue,
        formState: { errors }
    } = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        mode: 'onChange',
        defaultValues: {
            amount: '',
        }
    });

    const status = watch('status');

    const handleNext = async () => {
        let isValid = false;
        if (currentStep === 1) {
            isValid = await trigger(['fullName', 'email', 'whatsapp', 'domicile', 'status', 'major', 'institution']);
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
                    amount: parseInt(formData.amount),
                    name: formData.fullName,
                    email: formData.email,
                    phone: formData.whatsapp,
                    prayer: formData.prayer,
                    eventId: eventId,
                    eventName: eventName,
                    eventSlug: eventSlug
                }
            });

            if (error) {
                console.error("Payment Function Error:", error);
                alert("Gagal membuat pembayaran: " + error.message);
                return;
            }

            if (data?.link) {
                // Redirect to Mayar
                window.location.href = data.link;
            } else {
                alert("Gagal mendapatkan link pembayaran.");
            }

        } catch (err) {
            console.error("Unexpected Error:", err);
            alert("Terjadi kesalahan sistem.");
        } finally {
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
        if (paymentParam === 'success') {
            setPaymentStatus('success');
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // If payment is successful, show the success view covering the form
    if (paymentStatus === 'success') {
        return <SuccessView onRegisterOther={handleRegisterOther} />;
    }

    return (
        <div className="w-full">
            <Stepper currentStep={currentStep} steps={steps} />

            <form className="flex flex-col gap-8 mt-8" onSubmit={(e) => e.preventDefault()}>

                {/* Step 1: Data Diri */}
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
                                        <span>Jika Mahasiswa, isi Jurusan. Jika Profesional, isi Instansi/Perusahaan.</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {status === 'student' && (
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
                                        )}
                                        {status === 'professional' && (
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
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Step 2: Donasi & Pembayaran */}
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
                                {/* Ramadhan / Charity Context Card */}
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
                                    <p className="text-emerald-700 text-sm">
                                        Ohiyaa untuk registrasinya kamu hanya cukup berdonasi tanpa minimal berapapun, seluruh donasi akan kami salurkan untuk yg membutuhkan. Sedekah dianjurkan di setiap waktu selagi kita memiliki kelapangan baik tenaga, pikiran, maupun harta.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-[#111814]" htmlFor="amount">Nominal Donasi (IDR)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                        <input
                                            {...register('amount')}
                                            className={clsx(
                                                "w-full h-12 pl-10 pr-4 rounded-lg border bg-white focus:border-primary focus:ring-primary/20 transition-all outline-none font-medium",
                                                errors.amount ? "border-red-500" : "border-gray-300"
                                            )}
                                            id="amount"
                                            placeholder="Masukkan nominal donasi..."
                                            type="number"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    {errors.amount && <span className="text-xs text-red-500">{errors.amount.message}</span>}
                                    <p className="text-xs text-slate-500">Donasi sukarela, berapapun nominalnya akan sangat berarti.</p>
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

                {/* Navigation Buttons */}
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
                        <div></div> // Spacer
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
                        // Final Step Action: Generate Payment Link
                        <button
                            type="button"
                            onClick={handleGeneratePayment}
                            disabled={isLoading}
                            className="px-8 h-12 bg-primary hover:bg-primary-dark text-[#111814] font-bold rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2"
                        >
                            {isLoading ? 'Memproses...' : 'Lanjut Pembayaran'}
                            {!isLoading && <span className="material-symbols-outlined text-sm">payments</span>}
                        </button>
                    )}
                </div>

                <footer className="text-center text-slate-400 text-sm py-4">
                    © 2026 {eventName && `• ${eventName}`}
                </footer>
            </form>
        </div>
    );
};
