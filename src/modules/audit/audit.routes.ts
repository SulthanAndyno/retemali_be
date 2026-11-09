import { Router } from "express";
import { AuditController } from "./audit.controller";
import { AuditRepository } from "./audit.repository";
import { AuditService } from "./audit.service";
import { prisma } from "@/lib/prisma";
import { authenticate, authorizeRoles } from "@/middlewares/auth.middleware";

const router: Router = Router();

const auditRepository = new AuditRepository(prisma);
const auditService = new AuditService(auditRepository);
const auditController = new AuditController(auditService);

/**
 * @route   GET /api/audit-logs
 * @desc    Mengambil daftar Audit Aktivitas Sistem (Live Feed)
 * @access  Private (Admin)
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  auditController.getAll,
);

export default router;
