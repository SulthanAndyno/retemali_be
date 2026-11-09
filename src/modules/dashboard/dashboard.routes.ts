import { Router } from "express";
import { DashboardController } from "./dashboard.controller";
import { DashboardRepository } from "./dashboard.repository";
import { DashboardService } from "./dashboard.service";
import { prisma } from "@/lib/prisma";
import { authenticate, authorizeRoles } from "@/middlewares/auth.middleware";

const router: Router = Router();

const dashboardRepository = new DashboardRepository(prisma);
const dashboardService = new DashboardService(dashboardRepository);
const dashboardController = new DashboardController(dashboardService);

/**
 * @route   GET /api/dashboard/public
 * @desc    Statistik Beranda Publik (koleksi, anggota, buku populer, kegiatan)
 * @access  Public
 */
router.get("/public", dashboardController.getPublic);

/**
 * @route   GET /api/dashboard/member
 * @desc    Data Portal Anggota (Kartu Digital, pinjaman aktif, reservasi, tiket)
 * @access  Private (Member)
 */
router.get("/member", authenticate, dashboardController.getMember);

/**
 * @route   GET /api/dashboard/volunteer
 * @desc    Data Meja Operasional Relawan (shift aktif, metrik hari ini, antrean donasi)
 * @access  Private (Volunteer / Admin)
 */
router.get(
  "/volunteer",
  authenticate,
  authorizeRoles("VOLUNTEER", "ADMIN"),
  dashboardController.getVolunteer,
);

/**
 * @route   GET /api/dashboard/admin
 * @desc    Data Konsol Administrator (4 KPI, peringatan sirkulasi, approval, audit)
 * @access  Private (Admin)
 */
router.get(
  "/admin",
  authenticate,
  authorizeRoles("ADMIN"),
  dashboardController.getAdmin,
);

export default router;
