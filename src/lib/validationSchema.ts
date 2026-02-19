import { z } from 'zod';

export const personalSchema = z.object({
    fullName: z.string().min(3, { message: "Nama lengkap minimal 3 karakter" }),
    email: z.string().email({ message: "Format email tidak valid" }),
    whatsapp: z.string().min(10, { message: "Nomor WhatsApp minimal 10 digit" }).regex(/^\d+$/, { message: "Hanya boleh angka" }),
    domicile: z.string().min(1, { message: "Domisili wajib diisi" }),
    status: z.enum(['student', 'professional']),
    major: z.string().optional(),
    institution: z.string().optional(),
}).superRefine((data, ctx) => {
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
});

export const donationSchema = z.object({
    amount: z.string().min(1, { message: "Nominal donasi wajib diisi" }).refine((val) => parseInt(val) >= 1000, { message: "Minimal donasi Rp 1.000 (Sistem)" }),
    prayer: z.string().optional(),
});

export type PersonalFormData = z.infer<typeof personalSchema>;
export type DonationFormData = z.infer<typeof donationSchema>;
