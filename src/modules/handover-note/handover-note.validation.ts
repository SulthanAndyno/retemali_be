import { z } from "zod";
import { ShiftType } from "../volunteer/volunteer.validation";

export const createHandoverNoteSchema = z.object({
  shiftType: z.nativeEnum(ShiftType, {
    error:
      "Shift piket tidak valid. Pilih: SHIFT_PAGI, SHIFT_SIANG, SHIFT_SORE, atau SHIFT_MALAM",
  }),

  content: z
    .string()
    .min(5, "Isi catatan piket minimal 5 karakter")
    .max(1000, "Isi catatan piket maksimal 1000 karakter")
    .trim(),

  tags: z
    .union([
      z.array(z.string().trim()),
      z
        .string()
        .transform((val) =>
          val
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        ),
    ])
    .optional()
    .default([]),
});

export const handoverNoteQuerySchema = z.object({
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

  shiftType: z.nativeEnum(ShiftType).optional(),
});

export type CreateHandoverNoteInput = z.infer<typeof createHandoverNoteSchema>;
export type HandoverNoteQueryInput = z.infer<typeof handoverNoteQuerySchema>;
