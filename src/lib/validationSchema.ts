import { z } from 'zod';

export const personalBaseSchema = z.object({
    fullName: z.string().min(3, { message: "Nama lengkap minimal 3 karakter" }),
    email: z.string().email({ message: "Format email tidak valid" }),
    whatsapp: z.string().min(10, { message: "Nomor WhatsApp minimal 10 digit" }).regex(/^\d+$/, { message: "Hanya boleh angka" }),
    domicile: z.string().min(1, { message: "Domisili wajib diisi" }),
    gender: z.enum(['Laki-laki', 'Perempuan'], {
        message: "Jenis kelamin wajib dipilih"
    }),
    status: z.enum(['student', 'professional'], {
        message: "Pilih status Anda"
    }),
    university: z.string().optional(),
    major: z.string().optional(),
    institution: z.string().optional(),
    role: z.string().optional(),
    uses_external_peripherals: z.boolean({ message: "Pilihan wajib diisi" }),
    mouse_brand: z.string().optional(),
    work_device_factors: z.array(z.string()).min(1, { message: "Pilih minimal 1 faktor" }),
    work_device_factors_others: z.string().optional(),
    info_source: z.string().min(1, { message: "Pilih salah satu sumber informasi" }),
    info_source_others: z.string().optional(),
});

export const personalSchema = personalBaseSchema.superRefine((data, ctx) => {
    if (data.status === 'student') {
        if (!data.university) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Universitas/Perguruan Tinggi wajib diisi",
                path: ['university'],
            });
        }
        if (!data.major) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Jurusan wajib diisi",
                path: ['major'],
            });
        }
    }
    if (data.status === 'professional') {
        if (!data.institution) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Instansi/Perusahaan wajib diisi",
                path: ['institution'],
            });
        }
        if (!data.role) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Jabatan/Role wajib diisi",
                path: ['role'],
            });
        }
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
    if (data.info_source === 'Others' && !data.info_source_others) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Sebutkan darimana Anda mengetahui event ini",
            path: ['info_source_others'],
        });
    }
});

export const donationSchema = z.object({
    amount: z.string().min(1, { message: "Nominal donasi wajib diisi" }),
    prayer: z.string().optional(),
});

export type PersonalFormData = z.infer<typeof personalSchema>;
export type DonationFormData = z.infer<typeof donationSchema>;
