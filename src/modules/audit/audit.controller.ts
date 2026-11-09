import { NextFunction, Response } from "express";
import { paginatedResponse } from "../../utils/response";
import { AuditService } from "./audit.service";
import { auditQuerySchema } from "./audit.validation";
import { AuthRequest } from "@/middlewares/auth.middleware";

export class AuditController {
  private readonly auditService: AuditService;

  constructor(auditService: AuditService) {
    this.auditService = auditService;
  }

  getAll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = auditQuerySchema.parse(req.query);
      const { data, meta } = await this.auditService.getAllAuditLogs(query);

      paginatedResponse({
        res,
        message: "Berhasil mengambil daftar Audit Aktivitas Sistem",
        data,
        meta,
      });
    } catch (error) {
      next(error);
    }
  };
}
