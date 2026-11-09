import { Router } from "express";
import { CirculationController } from "./circulation.controller";
import { CirculationRepository } from "./circulation.repository";
import { CirculationService } from "./circulation.service";
import { prisma } from "@/lib/prisma";
import { authenticate, authorizeRoles } from "@/middlewares/auth.middleware";

const router: Router = Router();

const circulationRepository = new CirculationRepository(prisma);
const circulationService = new CirculationService(circulationRepository);
const circulationController = new CirculationController(circulationService);

/**
 * @route   POST /api/circulation/reservations
 * @desc    Membuat reservasi buku online (#RES-XXXX, tahan 48 jam)
 * @access  Private (Member)
 */
router.post(
  "/reservations",
  authenticate,
  circulationController.createReservation,
);

/**
 * @route   GET /api/circulation/reservations/me
 * @desc    Mengambil daftar reservasi buku milik anggota sendiri
 * @access  Private (Member)
 */
router.get(
  "/reservations/me",
  authenticate,
  circulationController.getMyReservations,
);

/**
 * @route   PATCH /api/circulation/reservations/:id/cancel
 * @desc    Membatalkan reservasi buku
 * @access  Private (Member / Volunteer / Admin)
 */
router.patch(
  "/reservations/:id/cancel",
  authenticate,
  circulationController.cancelReservation,
);

/**
 * @route   POST /api/circulation/quick-checkout
 * @desc    Sirkulasi Cepat (Peminjaman Baru) via scan barcode anggota & buku
 * @access  Private (Volunteer / Admin)
 */
router.post(
  "/quick-checkout",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  circulationController.quickCheckout,
);

/**
 * @route   POST /api/circulation/quick-return
 * @desc    Sirkulasi Cepat (Pengembalian Buku) via scan barcode buku
 * @access  Private (Volunteer / Admin)
 */
router.post(
  "/quick-return",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  circulationController.quickReturn,
);

/**
 * @route   GET /api/circulation/loans
 * @desc    Mengambil seluruh daftar transaksi peminjaman
 * @access  Private (Volunteer / Admin)
 */
router.get(
  "/loans",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  circulationController.getAllLoans,
);

/**
 * @route   GET /api/circulation/loans/me
 * @desc    Mengambil daftar peminjaman aktif & riwayat pinjam sendiri
 * @access  Private (Member)
 */
router.get("/loans/me", authenticate, circulationController.getMyLoans);

/**
 * @route   PATCH /api/circulation/loans/:id/extend
 * @desc    Memperpanjang masa pinjam buku (+7 Hari)
 * @access  Private (Member)
 */
router.patch(
  "/loans/:id/extend",
  authenticate,
  circulationController.extendLoan,
);

/**
 * @route   PATCH /api/circulation/loans/:id/mark-lost
 * @desc    Menandai buku yang terlambat sebagai LOST (Buku Hilang)
 * @access  Private (Admin)
 */
router.patch(
  "/loans/:id/mark-lost",
  authenticate,
  authorizeRoles("ADMIN"),
  circulationController.markAsLost,
);

/**
 * @route   POST /api/circulation/loans/:id/remind-wa
 * @desc    Membuat tautan & mencatat pengiriman pengingat WhatsApp
 * @access  Private (Volunteer / Admin)
 */
router.post(
  "/loans/:id/remind-wa",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  circulationController.remindWhatsapp,
);

/**
 * @route   POST /api/circulation/cron/due-reminders
 * @desc    Endpoint Cron Job untuk cek jatuh tempo H-2 & update status OVERDUE
 * @access  Public / System
 */
router.post("/cron/due-reminders", circulationController.runCronReminders);

export default router;
