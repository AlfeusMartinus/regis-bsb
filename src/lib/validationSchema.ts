import { z } from 'zod';

// ─── Step 1: Personal Data Schema ────────────────────────────────────────────
// Simplified per PRD: Nama, Email, WA, Instansi, Kategori
// Keeping WhatsApp and domicile for required data collection purposes
export const registrationSchema = z.object({
    fullName:  z.string().min(3, { message: 'Nama lengkap minimal 3 karakter' }),
    email:     z.string().email({ message: 'Format email tidak valid' }),
    whatsapp:  z
        .string()
        .min(9, { message: 'Nomor WhatsApp minimal 9 digit' })
        .max(15, { message: 'Nomor WhatsApp maksimal 15 digit' })
        .regex(/^\d+$/, { message: 'Hanya boleh angka' }),
    instansi:  z.string().min(2, { message: 'Instansi/Universitas wajib diisi' }),
    kategori:  z.enum(['mahasiswa', 'umum', 'profesional'], {
        message: 'Pilih kategori Anda',
    }),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

// ─── Legacy schemas (kept for admin manual registration & analytics) ──────────
export const personalBaseSchema = z.object({
    fullName:   z.string().min(3, { message: 'Nama lengkap minimal 3 karakter' }),
    email:      z.string().email({ message: 'Format email tidak valid' }),
    whatsapp:   z.string().min(10, { message: 'Nomor WhatsApp minimal 10 digit' }).regex(/^\d+$/, { message: 'Hanya boleh angka' }),
    domicile:   z.string().min(1, { message: 'Domisili wajib diisi' }),
    gender:     z.enum(['Laki-laki', 'Perempuan'], { message: 'Jenis kelamin wajib dipilih' }),
    status:     z.enum(['student', 'professional'], { message: 'Pilih status Anda' }),
    university: z.string().optional(),
    major:      z.string().optional(),
    institution: z.string().optional(),
    role:       z.string().optional(),
    uses_external_peripherals: z.boolean({ message: 'Pilihan wajib diisi' }).optional(),
    mouse_brand: z.string().optional(),
    work_device_factors: z.array(z.string()).optional(),
    work_device_factors_others: z.string().optional(),
    info_source: z.string().optional(),
    info_source_others: z.string().optional(),
    share_data_sponsor: z.boolean().optional(),
    instansi:   z.string().optional(),
    kategori:   z.enum(['mahasiswa', 'umum', 'profesional']).optional(),
});

export const personalSchema = personalBaseSchema.superRefine((data, ctx) => {
    if (data.status === 'student') {
        if (!data.university) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Universitas wajib diisi', path: ['university'] });
        }
        if (!data.major) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Jurusan wajib diisi', path: ['major'] });
        }
    }
    if (data.status === 'professional') {
        if (!data.institution) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Instansi wajib diisi', path: ['institution'] });
        }
        if (!data.role) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Jabatan wajib diisi', path: ['role'] });
        }
    }
});

export const donationSchema = z.object({
    amount: z.string().min(1, { message: 'Nominal donasi wajib diisi' }),
    prayer: z.string().optional(),
});

export type PersonalFormData = z.infer<typeof personalSchema>;
export type DonationFormData = z.infer<typeof donationSchema>;
