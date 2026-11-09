import { z } from "zod";

export enum LoanStatus {
  BORROWED = "BORROWED",
  RETURNED = "RETURNED",
  OVERDUE = "OVERDUE",
  LOST = "LOST",
}

export enum BookCondition {
  GOOD = "GOOD",
  MINOR_DAMAGE = "MINOR_DAMAGE",
  MAJOR_DAMAGE = "MAJOR_DAMAGE",
  LOST = "LOST",
}

export const createReservationSchema = z.object({
  bookId: z.string().min(1, "ID atau kode buku wajib diisi"),
  pickupCounter: z
    .string()
    .max(50, "Nama loket maksimal 50 karakter")
    .optional()
    .default("Loket Sirkulasi A-2"),
});

export const quickCheckoutSchema = z.object({
  memberIdentifier: z
    .string()
    .min(1, "ID atau Kode Barcode Anggota wajib diisi (contoh: RM-2026-0089)")
    .trim(),

  bookIdentifier: z
    .string()
    .min(1, "Kode Barcode atau ISBN Buku wajib diisi (contoh: BK-FS-0001)")
    .trim(),

  reservationCode: z.string().trim().optional(),

  durationDays: z
    .union([
      z
        .string()
        .regex(/^\d+$/)
        .transform((v) => parseInt(v, 10)),
      z.number().int().min(1).max(30),
    ])
    .optional()
    .default(14),
});

export const quickReturnSchema = z.object({
  bookIdentifier: z
    .string()
    .min(1, "Kode Barcode Buku, ISBN, atau Kode Pinjam wajib diisi")
    .trim(),

  memberIdentifier: z.string().trim().optional(),

  returnCondition: z.nativeEnum(BookCondition, {
    error:
      "Kondisi buku tidak valid. Pilih: GOOD, MINOR_DAMAGE, MAJOR_DAMAGE, atau LOST",
  }),

  notes: z
    .string()
    .max(500, "Catatan pengembalian maksimal 500 karakter")
    .trim()
    .optional(),
});

export const loanQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, "Page harus berupa angka")
    .optional()
    .default("1"),

  limit: z
    .string()
    .regex(/^\d+$/, "Limit harus berupa angka")
    .optional()
    .default("10"),

  status: z.nativeEnum(LoanStatus).optional(),

  search: z.string().max(100).trim().optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type QuickCheckoutInput = z.infer<typeof quickCheckoutSchema>;
export type QuickReturnInput = z.infer<typeof quickReturnSchema>;
export type LoanQueryInput = z.infer<typeof loanQuerySchema>;
