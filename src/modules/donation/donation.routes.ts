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
 * @route   GET /api/donations/financial
 * @desc    Daftar transaksi donasi finansial (read-only) untuk Laporan Kas
 * @access  Private (Admin)
 */
router.get(
  "/financial",
  authenticate,
  authorizeRoles("ADMIN"),
  donationController.getFinancialDonations,
);

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

/**
 * @route   GET /api/donations/payment-settings
 * @desc    Mengambil informasi rekening bank & QRIS untuk donasi
 * @access  Public
 */
router.get("/payment-settings", donationController.getPaymentSettings);

/**
 * @route   GET /api/donations/payment-accounts
 * @desc    Kanal pembayaran donasi (QRIS & rekening bank) yang sedang AKTIF
 * @access  Public
 */
router.get("/payment-accounts", donationController.getPaymentAccounts);

/**
 * @route   GET /api/donations/payment-accounts/admin
 * @desc    Seluruh kanal pembayaran donasi (termasuk yang nonaktif) untuk admin
 * @access  Private (Admin)
 */
router.get(
  "/payment-accounts/admin",
  authenticate,
  authorizeRoles("ADMIN"),
  donationController.getAllPaymentAccounts,
);

/**
 * @route   POST /api/donations/payment-accounts
 * @desc    Menambah kanal pembayaran baru (QRIS / rekening bank) + upload QRIS
 * @access  Private (Admin)
 */
router.post(
  "/payment-accounts",
  authenticate,
  authorizeRoles("ADMIN"),
  upload.single("qrisImage"),
  donationController.createPaymentAccount,
);

/**
 * @route   PATCH /api/donations/payment-accounts/:id
 * @desc    Mengubah kanal pembayaran (nomor rekening, a.n., aktif/nonaktif, QRIS)
 * @access  Private (Admin)
 */
router.patch(
  "/payment-accounts/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  upload.single("qrisImage"),
  donationController.updatePaymentAccount,
);

/**
 * @route   DELETE /api/donations/payment-accounts/:id
 * @desc    Menghapus kanal pembayaran donasi
 * @access  Private (Admin)
 */
router.delete(
  "/payment-accounts/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  donationController.deletePaymentAccount,
);

/**
 * @route   PATCH /api/donations/payment-settings
 * @desc    Mengupdate nomor rekening bank & mengupload gambar QRIS baru
 * @access  Private (Admin)
 */
router.patch(
  "/payment-settings",
  authenticate,
  authorizeRoles("ADMIN"),
  upload.single("qrisImage"),
  donationController.updatePaymentSettings,
);

export default router;
