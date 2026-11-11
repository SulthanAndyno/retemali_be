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

export const quickCheckoutSchema = z
  .object({
    memberIdentifier: z.string().trim().optional(),
    memberCode: z.string().trim().optional(),
    memberId: z.string().trim().optional(),

    bookIdentifier: z.string().trim().optional(),
    bookCode: z.string().trim().optional(),
    bookId: z.string().trim().optional(),

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
  })
  .transform((data) => {
    const memberIdentifier =
      data.memberIdentifier || data.memberCode || data.memberId;
    const bookIdentifier =
      data.bookIdentifier || data.bookCode || data.bookId;

    if (!memberIdentifier) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["memberIdentifier"],
          message:
            "ID atau Kode Barcode Anggota wajib diisi (contoh: RM-2026-0089)",
        },
      ]);
    }

    if (!bookIdentifier) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["bookIdentifier"],
          message:
            "Kode Barcode atau ISBN Buku wajib diisi (contoh: BK-FS-0001)",
        },
      ]);
    }

    return {
      memberIdentifier,
      bookIdentifier,
      reservationCode: data.reservationCode,
      durationDays: data.durationDays,
    };
  });

export const quickReturnSchema = z
  .object({
    bookIdentifier: z.string().trim().optional(),
    bookCode: z.string().trim().optional(),
    bookId: z.string().trim().optional(),

    memberIdentifier: z.string().trim().optional(),
    memberCode: z.string().trim().optional(),
    memberId: z.string().trim().optional(),

    returnCondition: z
      .nativeEnum(BookCondition, {
        error:
          "Kondisi buku tidak valid. Pilih: GOOD, MINOR_DAMAGE, MAJOR_DAMAGE, atau LOST",
      })
      .optional()
      .default(BookCondition.GOOD),

    notes: z
      .string()
      .max(500, "Catatan pengembalian maksimal 500 karakter")
      .trim()
      .optional(),
  })
  .transform((data) => {
    const bookIdentifier =
      data.bookIdentifier || data.bookCode || data.bookId;

    if (!bookIdentifier) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["bookIdentifier"],
          message: "Kode Barcode Buku, ISBN, atau Kode Pinjam wajib diisi",
        },
      ]);
    }

    return {
      bookIdentifier,
      memberIdentifier:
        data.memberIdentifier || data.memberCode || data.memberId,
      returnCondition: data.returnCondition ?? BookCondition.GOOD,
      notes: data.notes,
    };
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
