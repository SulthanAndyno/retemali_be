import { z } from "zod";

export const auditQuerySchema = z.object({
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

  category: z.string().trim().optional(),
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
