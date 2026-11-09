import { Router } from "express";
import { DonationController } from "./donation.controller";
import { DonationRepository } from "./donation.repository";
import { DonationService } from "./donation.service";
import { prisma } from "@/lib/prisma";
import { authenticate, authorizeRoles } from "@/middlewares/auth.middleware";
import { createUpload } from "@/middlewares/upload.middleware";

const upload = createUpload("donations", "donation");

const router: Router = Router();

const donationRepository = new DonationRepository(prisma);
const donationService = new DonationService(donationRepository);
const donationController = new DonationController(donationService);

/**
 * @route   GET /api/donations/summary
 * @desc    Mengambil capaian kampanye kuartal & Live Feed Jejak Kebaikan Donatur
 * @access  Public
 */
router.get("/summary", donationController.getSummary);

/**
 * @route   POST /api/donations/financial
 * @desc    Membuat transaksi Donasi Finansial (QRIS / Transfer / Sahabat Literasi)
 * @access  Public
 */
router.post(
  "/financial",
  upload.single("proofImage"),
  donationController.createFinancial,
);

/**
 * @route   POST /api/donations/webhook
 * @desc    Webhook callback untuk verifikasi otomatis pembayaran donasi
 * @access  Public (Webhook)
 */
router.post("/webhook", donationController.webhook);

/**
 * @route   GET /api/donations/financial/:receiptCode
 * @desc    Mengambil kuitansi digital donasi finansial
 * @access  Public
 */
router.get("/financial/:receiptCode", donationController.getReceipt);

/**
 * @route   POST /api/donations/books
 * @desc    Mengirim form pendataan Donasi Buku Fisik (+ upload conditionImage)
 * @access  Public
 */
router.post(
  "/books",
  upload.single("conditionImage"),
  donationController.createBookDonation,
);

/**
 * @route   GET /api/donations/books
 * @desc    Mengambil daftar antrean kurasi donasi buku fisik masuk
 * @access  Private (Volunteer / Admin)
 */
router.get(
  "/books",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  donationController.getAllBookDonations,
);

/**
 * @route   PATCH /api/donations/books/:id/verify
 * @desc    Memverifikasi & menerima batch donasi buku fisik oleh relawan
 * @access  Private (Volunteer / Admin)
 */
router.patch(
  "/books/:id/verify",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  donationController.verifyBookDonation,
);

export default router;
