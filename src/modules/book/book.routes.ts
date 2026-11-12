import { Router } from "express";
import { BookController } from "./book.controller";
import { BookRepository } from "./book.repository";
import { BookService } from "./book.service";
import { bookmarkController } from "../bookmark/bookmark.routes";
import { prisma } from "@/lib/prisma";
import { authenticate, authorizeRoles } from "@/middlewares/auth.middleware";
import { createUpload } from "@/middlewares/upload.middleware";

const upload = createUpload("books", "book");

const router: Router = Router();

const bookRepository = new BookRepository(prisma);
const bookService = new BookService(bookRepository);
const bookController = new BookController(bookService);

/**
 * @route   GET /api/books
 * @desc    Mengambil katalog buku dengan pagination, filter kategori/status/rak, sort, dan search
 * @access  Public
 */
router.get("/", bookController.getAll);

/**
 * @route   GET /api/books/bookmarks/me
 * @desc    Mengambil daftar buku yang disimpan oleh anggota yang sedang login
 * @access  Private (Member)
 */
router.get("/bookmarks/me", authenticate, bookmarkController.getMyBookmarks);

/**
 * @route   GET /api/books/:id
 * @desc    Mengambil detail buku berdasarkan ID, bookCode, ISBN, atau slug
 * @access  Public
 */
router.get("/:id", bookController.getById);

/**
 * @route   POST /api/books/:id/bookmark
 * @desc    Simpan / hapus simpanan bacaan (toggle bookmark buku)
 * @access  Private (Member)
 */
router.post("/:id/bookmark", authenticate, bookmarkController.toggle);

/**
 * @route   POST /api/books
 * @desc    Menambahkan koleksi buku baru (+ upload coverImage)
 * @access  Private (Admin only — relawan tidak boleh menambah koleksi)
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  upload.single("coverImage"),
  bookController.create,
);

/**
 * @route   PATCH /api/books/:id
 * @desc    Mengupdate data buku / lokasi rak / stok (+ ganti coverImage)
 * @access  Private (Admin / Volunteer)
 */
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER"),
  upload.single("coverImage"),
  bookController.update,
);

/**
 * @route   DELETE /api/books/:id
 * @desc    Menghapus koleksi buku secara permanen
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  bookController.delete,
);

export default router;
