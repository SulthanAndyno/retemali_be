import { Router } from "express";
import { VolunteerController } from "./volunteer.controller";
import { VolunteerRepository } from "./volunteer.repository";
import { VolunteerService } from "./volunteer.service";
import { handoverNoteController } from "../handover-note/handover-note.routes";
import { prisma } from "@/lib/prisma";
import { authenticate, authorizeRoles } from "@/middlewares/auth.middleware";
import { createUpload } from "@/middlewares/upload.middleware";

const upload = createUpload("volunteers", "cv");

const router: Router = Router();

const volunteerRepository = new VolunteerRepository(prisma);
const volunteerService = new VolunteerService(volunteerRepository);
const volunteerController = new VolunteerController(volunteerService);

/**
 * @route   POST /api/volunteers/apply
 * @desc    Mendaftar menjadi Calon Relawan Baru (+ upload CV/berkas)
 * @access  Private (Member)
 */
router.post(
  "/apply",
  authenticate,
  upload.single("cvDocument"),
  volunteerController.apply,
);

/**
 * @route   GET /api/volunteers/applications
 * @desc    Mengambil daftar berkas calon relawan baru
 * @access  Private (Admin)
 */
router.get(
  "/applications",
  authenticate,
  authorizeRoles("ADMIN"),
  volunteerController.getAllApplications,
);

/**
 * @route   PATCH /api/volunteers/applications/:id/review
 * @desc    Menyetujui atau menolak berkas calon relawan baru
 * @access  Private (Admin)
 */
router.patch(
  "/applications/:id/review",
  authenticate,
  authorizeRoles("ADMIN"),
  volunteerController.reviewApplication,
);

/**
 * @route   POST /api/volunteers/shifts/clock-in
 * @desc    Clock-In tugas piket relawan
 * @access  Private (Volunteer / Admin)
 */
router.post(
  "/shifts/clock-in",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  volunteerController.clockIn,
);

/**
 * @route   PATCH /api/volunteers/shifts/clock-out
 * @desc    Clock-Out tugas piket relawan
 * @access  Private (Volunteer / Admin)
 */
router.patch(
  "/shifts/clock-out",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  volunteerController.clockOut,
);

/**
 * @route   GET /api/volunteers/shifts
 * @desc    Mengambil daftar riwayat & antrean verifikasi jam piket relawan
 * @access  Private (Volunteer / Admin)
 */
router.get(
  "/shifts",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  volunteerController.getAllShifts,
);

/**
 * @route   PATCH /api/volunteers/shifts/approve-all
 * @desc    Menyetujui semua antrean jam piket relawan pekan ini
 * @access  Private (Admin)
 */
router.patch(
  "/shifts/approve-all",
  authenticate,
  authorizeRoles("ADMIN"),
  volunteerController.approveAllShifts,
);

/**
 * @route   PATCH /api/volunteers/shifts/:id/approve
 * @desc    Menyetujui 1 sesi jam piket relawan
 * @access  Private (Admin)
 */
router.patch(
  "/shifts/:id/approve",
  authenticate,
  authorizeRoles("ADMIN"),
  volunteerController.approveShift,
);

/**
 * @route   GET /api/volunteers/handover-notes
 * @desc    Mengambil daftar catatan kendala & logistik piket
 * @access  Private (Volunteer / Admin)
 */
router.get(
  "/handover-notes",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  handoverNoteController.getAll,
);

/**
 * @route   POST /api/volunteers/handover-notes
 * @desc    Menyimpan catatan kendala & logistik piket untuk shift berikutnya
 * @access  Private (Volunteer / Admin)
 */
router.post(
  "/handover-notes",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  handoverNoteController.create,
);

export default router;
