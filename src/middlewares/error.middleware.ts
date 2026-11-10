import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error | ZodError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ZodError) {
    const issues = (err as any).issues ?? (err as any).errors ?? [];
    const errorMessages = issues.map((e: any) => e.message).join(", ");
    res.status(400).json({
      status: "error",
      message: errorMessages || "Data input tidak valid",
    });
    return;
  }

  if (err.name === "MulterError") {
    res.status(400).json({
      status: "error",
      message: `Upload error: ${err.message}`,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
    return;
  }

  if (err.message?.includes("Record to update not found")) {
    res.status(404).json({
      status: "error",
      message: "Data tidak ditemukan",
    });
    return;
  }

  // Handle Prisma Database Connection Error (ECONNREFUSED)
  const isDbConnectionError =
    (err as any).code === "ECONNREFUSED" ||
    err.name === "PrismaClientInitializationError" ||
    err.message?.includes("Can't reach database server");

  if (isDbConnectionError) {
    console.error("❌ Database Connection Error:", err.message);
    res.status(503).json({
      status: "error",
      message:
        "Koneksi database PostgreSQL gagal (ECONNREFUSED di port 5432). Pastikan service PostgreSQL sudah berjalan dan konfigurasi DATABASE_URL di .env sudah benar.",
    });
    return;
  }

  console.error("Unexpected error:", err);
  res.status(500).json({
    status: "error",
    message: err.message || "Internal server error",
  });
};
