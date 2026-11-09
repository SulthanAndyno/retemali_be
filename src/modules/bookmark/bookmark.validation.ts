import { z } from "zod";

export const createBookmarkSchema = z.object({
  bookId: z
    .string()
    .min(1, "ID atau kode buku wajib diisi")
    .trim(),
});

export const bookmarkQuerySchema = z.object({
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
});

export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;
export type BookmarkQueryInput = z.infer<typeof bookmarkQuerySchema>;
