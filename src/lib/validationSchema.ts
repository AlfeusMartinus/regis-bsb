import { z } from 'zod';

// ─── Step 1: Personal Data Schema ─────────────────────────────────────────────
export const registrationBaseSchema = z.object({
    fullName:           z.string().min(3, { message: 'Nama lengkap minimal 3 karakter' }),
    email:              z.string().email({ message: 'Format email tidak valid' }),
    whatsapp:           z
        .string()
        .min(9,  { message: 'Nomor WhatsApp minimal 9 digit' })
        .max(15, { message: 'Nomor WhatsApp maksimal 15 digit' })
        .regex(/^\d+$/, { message: 'Hanya boleh angka' }),
    gender:             z.enum(['Laki-laki', 'Perempuan'], { message: 'Jenis kelamin wajib dipilih' }),
    domicile:           z.string().min(2, { message: 'Domisili wajib diisi' }),
    kategori:           z.enum(['mahasiswa', 'profesional'], { message: 'Pilih kategori Anda' }),
    // Profesional-only
    role:               z.string().optional(),
    institution:        z.string().optional(),
    // Mahasiswa-only
    major:              z.string().optional(),
    university:         z.string().optional(),
    // Extra
    info_source:        z.string().min(1, { message: 'Sumber informasi wajib dipilih' }),
    share_data_sponsor: z.enum(['true', 'false'], { message: 'Pilihan wajib diisi' }),
});

export const registrationSchema = registrationBaseSchema.superRefine((data, ctx) => {
    if (data.kategori === 'profesional') {
        if (!data.role || data.role.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Jabatan/Peran wajib diisi', path: ['role'] });
        }
        if (!data.institution || data.institution.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Instansi wajib diisi', path: ['institution'] });
        }
    }
    if (data.kategori === 'mahasiswa') {
        if (!data.major || data.major.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Jurusan wajib diisi', path: ['major'] });
        }
        if (!data.university || data.university.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Universitas wajib diisi', path: ['university'] });
        }
    }
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
