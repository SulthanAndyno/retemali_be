import { z } from "zod";

export enum BookCategory {
  FIKSI_SASTRA = "FIKSI_SASTRA",
  SAINS_FAKTA = "SAINS_FAKTA",
  SEJARAH = "SEJARAH",
  PSIKOLOGI = "PSIKOLOGI",
  EDUKASI_ANAK = "EDUKASI_ANAK",
  ENSIKLOPEDIA = "ENSIKLOPEDIA",
  KOMIK_EDUKASI = "KOMIK_EDUKASI",
}

export enum BookStatus {
  AVAILABLE = "AVAILABLE",
  BORROWED = "BORROWED",
  MAINTENANCE = "MAINTENANCE",
}

export const createBookSchema = z.object({
  title: z
    .string()
    .min(1, "Judul buku wajib diisi")
    .min(3, "Judul buku minimal 3 karakter")
    .max(150, "Judul buku maksimal 150 karakter")
    .trim(),

  author: z
    .string()
    .min(1, "Nama penulis wajib diisi")
    .min(2, "Nama penulis minimal 2 karakter")
    .max(100, "Nama penulis maksimal 100 karakter")
    .trim(),

  category: z.nativeEnum(BookCategory, {
    error:
      "Kategori tidak valid. Pilih: FIKSI_SASTRA, SAINS_FAKTA, SEJARAH, PSIKOLOGI, EDUKASI_ANAK, ENSIKLOPEDIA, atau KOMIK_EDUKASI",
  }),

  shelfLocation: z
    .string()
    .min(1, "Lokasi rak fisik wajib diisi (contoh: Rak B-04)")
    .max(30, "Lokasi rak maksimal 30 karakter")
    .trim(),

  totalStock: z
    .union([
      z
        .string()
        .min(1, "Stok buku wajib diisi")
        .regex(/^\d+$/, "Stok harus berupa angka")
        .transform((val) => parseInt(val, 10)),
      z.number().int().min(1),
    ]),

  isbn: z
    .string()
    .max(30, "ISBN maksimal 30 karakter")
    .trim()
    .optional(),

  synopsis: z
    .string()
    .max(2000, "Sinopsis maksimal 2000 karakter")
    .trim()
    .optional(),

  publisher: z
    .string()
    .max(100, "Nama penerbit maksimal 100 karakter")
    .trim()
    .optional(),

  publishYear: z
    .union([
      z
        .string()
        .regex(/^\d{4}$/, "Tahun terbit harus 4 digit angka")
        .transform((val) => parseInt(val, 10)),
      z.number().int().min(1900).max(2100),
    ])
    .optional(),

  rating: z
    .union([
      z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, "Format rating tidak valid")
        .transform((val) => parseFloat(val)),
      z.number().min(1).max(5),
    ])
    .optional(),
});

export const updateBookSchema = createBookSchema.partial().extend({
  availableStock: z
    .union([
      z
        .string()
        .regex(/^\d+$/, "Stok tersedia harus berupa angka")
        .transform((val) => parseInt(val, 10)),
      z.number().int().min(0),
    ])
    .optional(),
  status: z.nativeEnum(BookStatus).optional(),
});

export const bookQuerySchema = z.object({
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

  category: z.nativeEnum(BookCategory).optional(),

  status: z.nativeEnum(BookStatus).optional(),

  shelfLocation: z.string().trim().optional(),

  sortBy: z.enum(["newest", "popular", "rating"]).optional().default("newest"),

  search: z
    .string()
    .max(100, "Keyword pencarian terlalu panjang")
    .trim()
    .optional(),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type BookQueryInput = z.infer<typeof bookQuerySchema>;
