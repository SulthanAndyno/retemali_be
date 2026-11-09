import { Router } from "express";
import { EventController } from "./event.controller";
import { EventRepository } from "./event.repository";
import { EventService } from "./event.service";
import { prisma } from "@/lib/prisma";
import { authenticate, authorizeRoles } from "@/middlewares/auth.middleware";
import { createUpload } from "@/middlewares/upload.middleware";

const upload = createUpload("events", "event");

const router: Router = Router();

const eventRepository = new EventRepository(prisma);
const eventService = new EventService(eventRepository);
const eventController = new EventController(eventService);

/**
 * @route   GET /api/events
 * @desc    Mengambil daftar agenda & kegiatan komunitas
 * @access  Public
 */
router.get("/", eventController.getAll);

/**
 * @route   GET /api/events/tickets/me
 * @desc    Mengambil daftar E-Tiket kegiatan milik sendiri
 * @access  Private (Member)
 */
router.get("/tickets/me", authenticate, eventController.getMyTickets);

/**
 * @route   POST /api/events/check-in
 * @desc    Presensi Kegiatan Warga via scan QR E-Tiket peserta
 * @access  Private (Volunteer / Admin)
 */
router.post(
  "/check-in",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  eventController.checkIn,
);

/**
 * @route   POST /api/events/propose
 * @desc    Usulkan kegiatan baru oleh warga (+ Usulkan)
 * @access  Private (Member)
 */
router.post(
  "/propose",
  authenticate,
  upload.single("bannerImage"),
  eventController.propose,
);

/**
 * @route   GET /api/events/:id
 * @desc    Mengambil detail satu kegiatan komunitas
 * @access  Public
 */
router.get("/:id", eventController.getById);

/**
 * @route   POST /api/events
 * @desc    Membuat kegiatan komunitas baru (+ upload bannerImage)
 * @access  Private (Volunteer / Admin)
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  upload.single("bannerImage"),
  eventController.create,
);

/**
 * @route   PATCH /api/events/:id
 * @desc    Mengupdate kegiatan komunitas
 * @access  Private (Volunteer / Admin)
 */
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  upload.single("bannerImage"),
  eventController.update,
);

/**
 * @route   DELETE /api/events/:id
 * @desc    Menghapus kegiatan komunitas secara permanen
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  eventController.delete,
);

/**
 * @route   POST /api/events/:id/register
 * @desc    Mendaftar kegiatan & menerbitkan E-Tiket QR (RETEMALI-EV-XXX)
 * @access  Private (Member)
 */
router.post("/:id/register", authenticate, eventController.registerParticipant);

/**
 * @route   POST /api/events/:id/report
 * @desc    Submit laporan paska-acara oleh relawan
 * @access  Private (Volunteer / Admin)
 */
router.post(
  "/:id/report",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  eventController.submitReport,
);

/**
 * @route   PATCH /api/events/:id/approve-report
 * @desc    Menyetujui laporan paska-acara oleh Admin
 * @access  Private (Admin)
 */
router.patch(
  "/:id/approve-report",
  authenticate,
  authorizeRoles("ADMIN"),
  eventController.approveReport,
);

export default router;
