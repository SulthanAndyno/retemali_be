import { Router } from "express";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/middlewares/auth.middleware";
import { createUpload } from "@/middlewares/upload.middleware";

const upload = createUpload("avatars", "avatar");

const router: Router = Router();

// Dependency injection
const authRepository = new AuthRepository(prisma);
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

/**
 * @route   POST /api/auth/register
 * @desc    Registrasi anggota baru & menerbitkan Kartu Anggota Digital (#RM-YYYY-XXXX)
 * @access  Public
 */
router.post("/register", authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login pengguna (Member / Volunter / Admin) dan mendapatkan JWT token
 * @access  Public
 */
router.post("/login", authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Mengambil profil pengguna yang sedang login
 * @access  Private (Token)
 */
router.get("/me", authenticate, authController.getProfile);

/**
 * @route   PATCH /api/auth/me
 * @desc    Mengupdate profil pengguna (+ foto avatar opsional)
 * @access  Private (Token)
 */
router.patch(
  "/me",
  authenticate,
  upload.single("avatar"),
  authController.updateProfile,
);

/**
 * @route   PATCH /api/auth/change-password
 * @desc    Mengganti password pengguna
 * @access  Private (Token)
 */
router.patch("/change-password", authenticate, authController.changePassword);

export default router;
