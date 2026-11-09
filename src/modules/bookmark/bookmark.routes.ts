import { Router } from "express";
import { BookmarkController } from "./bookmark.controller";
import { BookmarkRepository } from "./bookmark.repository";
import { BookmarkService } from "./bookmark.service";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/middlewares/auth.middleware";

const router: Router = Router();

const bookmarkRepository = new BookmarkRepository(prisma);
const bookmarkService = new BookmarkService(bookmarkRepository);
export const bookmarkController = new BookmarkController(bookmarkService);

/**
 * @route   GET /api/bookmarks
 * @desc    Mengambil daftar buku yang disimpan oleh anggota yang sedang login
 * @access  Private (Member)
 */
router.get("/", authenticate, bookmarkController.getMyBookmarks);

/**
 * @route   POST /api/bookmarks
 * @desc    Menyimpan / toggle buku ke daftar simpanan bacaan
 * @access  Private (Member)
 */
router.post("/", authenticate, bookmarkController.toggle);

/**
 * @route   DELETE /api/bookmarks/:bookId
 * @desc    Menghapus buku dari daftar simpanan bacaan
 * @access  Private (Member)
 */
router.delete("/:bookId", authenticate, bookmarkController.remove);

export default router;
