import { Router } from "express";
import { HandoverNoteController } from "./handover-note.controller";
import { HandoverNoteRepository } from "./handover-note.repository";
import { HandoverNoteService } from "./handover-note.service";
import { prisma } from "@/lib/prisma";
import { authenticate, authorizeRoles } from "@/middlewares/auth.middleware";

const router: Router = Router();

const handoverNoteRepository = new HandoverNoteRepository(prisma);
const handoverNoteService = new HandoverNoteService(handoverNoteRepository);
export const handoverNoteController = new HandoverNoteController(
  handoverNoteService,
);

/**
 * @route   GET /api/handover-notes
 * @desc    Mengambil daftar catatan kendala & logistik piket
 * @access  Private (Volunteer / Admin)
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  handoverNoteController.getAll,
);

/**
 * @route   POST /api/handover-notes
 * @desc    Menyimpan catatan kendala & logistik piket untuk shift berikutnya
 * @access  Private (Volunteer / Admin)
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  handoverNoteController.create,
);

/**
 * @route   DELETE /api/handover-notes/:id
 * @desc    Menghapus catatan piket berdasarkan ID
 * @access  Private (Volunteer / Admin)
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  handoverNoteController.delete,
);

export default router;
