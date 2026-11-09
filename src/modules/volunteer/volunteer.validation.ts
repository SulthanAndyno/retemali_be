import { z } from "zod";

export enum VolunteerApplicationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum ShiftType {
  SHIFT_PAGI = "SHIFT_PAGI",
  SHIFT_SIANG = "SHIFT_SIANG",
  SHIFT_SORE = "SHIFT_SORE",
  SHIFT_MALAM = "SHIFT_MALAM",
}

export enum ShiftApprovalStatus {
  ONGOING = "ONGOING",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export const applyVolunteerSchema = z.object({
  majorOrJob: z
    .string()
    .min(2, "Jurusan atau pekerjaan wajib diisi (contoh: Sastra Indonesia)")
    .max(100, "Jurusan/pekerjaan maksimal 100 karakter")
    .trim(),

  institution: z
    .string()
    .min(2, "Kampus atau instansi wajib diisi (contoh: Univ. Indonesia)")
    .max(100, "Kampus/instansi maksimal 100 karakter")
    .trim(),

  division: z
    .string()
    .min(2, "Divisi pilihan wajib diisi (contoh: Kelas Cerita, Teknologi IT, Bimbingan Baca)")
    .max(50, "Divisi maksimal 50 karakter")
    .trim(),

  motivation: z
    .string()
    .min(10, "Motivasi bergabung minimal 10 karakter")
    .max(1000, "Motivasi maksimal 1000 karakter")
    .trim(),
});

export const reviewApplicationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"], {
    error: "Status review harus APPROVED atau REJECTED",
  }),
  rejectionNote: z.string().max(500).trim().optional(),
});

export const clockInSchema = z.object({
  shiftType: z.nativeEnum(ShiftType, {
    error:
      "Shift piket tidak valid. Pilih: SHIFT_PAGI, SHIFT_SIANG, SHIFT_SORE, atau SHIFT_MALAM",
  }),
  location: z
    .string()
    .max(100)
    .trim()
    .optional()
    .default("RT 05 RW 14 Jatirangga • Pos Utama"),
  taskSummary: z.string().max(300).trim().optional(),
});

export const clockOutSchema = z.object({
  taskSummary: z
    .string()
    .min(3, "Ringkasan tugas piket wajib diisi (contoh: Penyortiran Buku Anak & Registrasi Pengunjung)")
    .max(300, "Ringkasan tugas maksimal 300 karakter")
    .trim(),
  durationHours: z
    .union([
      z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/)
        .transform((val) => parseFloat(val)),
      z.number().positive(),
    ])
    .optional(),
});

export const volunteerQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default("1"),
  limit: z.string().regex(/^\d+$/).optional().default("10"),
  status: z.string().optional(),
});

export type ApplyVolunteerInput = z.infer<typeof applyVolunteerSchema>;
export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;
export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type VolunteerQueryInput = z.infer<typeof volunteerQuerySchema>;
