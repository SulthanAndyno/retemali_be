import { z } from "zod";

export enum Role {
  MEMBER = "MEMBER",
  VOLUNTEER = "VOLUNTEER",
  DONOR = "DONOR",
  ADMIN = "ADMIN",
}

/**
 * Schema validasi untuk registrasi anggota perpustakaan baru.
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Nama lengkap wajib diisi")
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter")
    .trim(),

  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .trim()
    .toLowerCase(),

  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf kapital")
    .regex(/[0-9]/, "Password harus mengandung minimal 1 angka"),

  phone: z
    .string()
    .max(20, "Nomor telepon maksimal 20 karakter")
    .trim()
    .optional(),

  rtRw: z
    .string()
    .max(20, "Format RT/RW maksimal 20 karakter (contoh: RT05/RW14)")
    .trim()
    .optional(),
});

/**
 * Schema validasi untuk login.
 * Memastikan email valid dan password tidak kosong.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .trim()
    .toLowerCase(),

  password: z.string().min(1, "Password wajib diisi"),
});

/**
 * Schema validasi untuk ganti password.
 * Memastikan password baru cocok dengan konfirmasi dan berbeda dari password lama.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),

    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter")
      .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf kapital")
      .regex(/[0-9]/, "Password harus mengandung minimal 1 angka"),

    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Password baru tidak boleh sama dengan password saat ini",
    path: ["newPassword"],
  });

/**
 * Schema validasi untuk update profil pengguna.
 * Semua field opsional.
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter")
    .trim()
    .optional(),

  email: z
    .string()
    .email("Format email tidak valid")
    .trim()
    .toLowerCase()
    .optional(),

  phone: z
    .string()
    .max(20, "Nomor telepon maksimal 20 karakter")
    .trim()
    .optional(),

  rtRw: z
    .string()
    .max(20, "Format RT/RW maksimal 20 karakter")
    .trim()
    .optional(),

  readingTarget: z
    .union([z.string().regex(/^\d+$/).transform((v) => parseInt(v, 10)), z.number().int().positive()])
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
