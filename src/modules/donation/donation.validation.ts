import { z } from "zod";

export enum PaymentMethod {
  QRIS = "QRIS",
  BANK_MANDIRI = "BANK_MANDIRI",
  BANK_BCA = "BANK_BCA",
  GOPAY = "GOPAY",
  OVO = "OVO",
  DANA = "DANA",
  SHOPEEPAY = "SHOPEEPAY",
}

export enum BookDonationDeliveryMethod {
  DROP_OFF = "DROP_OFF",
  COURIER = "COURIER",
}

export enum BookDonationStatus {
  PENDING_CURATION = "PENDING_CURATION",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

export const createFinancialDonationSchema = z.object({
  amount: z.union([
    z
      .string()
      .min(1, "Nominal donasi wajib diisi")
      .regex(/^\d+(\.\d{1,2})?$/, "Format nominal donasi tidak valid")
      .transform((val) => parseFloat(val)),
    z.number().min(10000, "Minimal donasi Rp 10.000"),
  ]),

  paymentMethod: z.nativeEnum(PaymentMethod, {
    error:
      "Metode pembayaran tidak valid. Pilih: QRIS, BANK_MANDIRI, BANK_BCA, GOPAY, OVO, DANA, atau SHOPEEPAY",
  }),

  donorName: z
    .string()
    .max(100, "Nama donatur maksimal 100 karakter")
    .trim()
    .optional(),

  donorEmail: z.string().email("Format email tidak valid").optional(),

  isAnonymous: z
    .union([z.string().transform((v) => v === "true"), z.boolean()])
    .optional()
    .default(false),

  purposeLabel: z
    .string()
    .max(150, "Label peruntukan maksimal 150 karakter")
    .trim()
    .optional()
    .default("Donasi Operasional & Pustaka"),

  isRecurring: z
    .union([z.string().transform((v) => v === "true"), z.boolean()])
    .optional()
    .default(false),
});

export const paymentWebhookSchema = z.object({
  receiptCode: z.string().min(1, "Kode kuitansi wajib diisi"),
  status: z.enum(["VERIFIED", "FAILED"]).default("VERIFIED"),
});

export const createBookDonationSchema = z.object({
  donorName: z
    .string()
    .min(2, "Nama donatur / label titipan wajib diisi")
    .max(100, "Nama donatur maksimal 100 karakter")
    .trim(),

  donorBadge: z
    .string()
    .max(50, "Label donatur maksimal 50 karakter (contoh: Warga RW 14)")
    .trim()
    .optional(),

  isAnonymous: z
    .union([z.string().transform((v) => v === "true"), z.boolean()])
    .optional()
    .default(false),

  packageTitle: z
    .string()
    .min(3, "Judul / ringkasan paket buku wajib diisi (contoh: 25 Buku Sains Populer)")
    .max(150, "Judul paket maksimal 150 karakter")
    .trim(),

  totalBooks: z.union([
    z
      .string()
      .regex(/^\d+$/, "Jumlah buku harus berupa angka")
      .transform((val) => parseInt(val, 10)),
    z.number().int().min(1),
  ]),

  conditionNote: z
    .string()
    .min(3, "Deskripsi kondisi fisik buku wajib diisi")
    .max(500, "Deskripsi kondisi maksimal 500 karakter")
    .trim(),

  deliveryMethod: z
    .nativeEnum(BookDonationDeliveryMethod)
    .default(BookDonationDeliveryMethod.DROP_OFF),
});

export const verifyBookDonationSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
  curationNote: z.string().max(500).trim().optional(),
});

export const donationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default("1"),
  limit: z.string().regex(/^\d+$/).optional().default("10"),
  status: z.string().optional(),
});

export type CreateFinancialDonationInput = z.infer<
  typeof createFinancialDonationSchema
>;
export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
export type CreateBookDonationInput = z.infer<typeof createBookDonationSchema>;
export type VerifyBookDonationInput = z.infer<typeof verifyBookDonationSchema>;
export type DonationQueryInput = z.infer<typeof donationQuerySchema>;
