import { NextFunction, Response } from "express";
import { paginatedResponse, successResponse } from "../../utils/response";
import { BookmarkService } from "./bookmark.service";
import {
  bookmarkQuerySchema,
  createBookmarkSchema,
} from "./bookmark.validation";
import { AuthRequest } from "@/middlewares/auth.middleware";

export class BookmarkController {
  private readonly bookmarkService: BookmarkService;

  constructor(bookmarkService: BookmarkService) {
    this.bookmarkService = bookmarkService;
  }

  /**
   * Mengambil daftar buku yang disimpan oleh anggota yang sedang login.
   */
  getMyBookmarks = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = bookmarkQuerySchema.parse(req.query);
      const { data, meta } = await this.bookmarkService.getMyBookmarks(
        req.userId as string,
        query,
      );

      paginatedResponse({
        res,
        message: "Berhasil mengambil daftar simpanan bacaan",
        data,
        meta,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Menyimpan atau menghapus buku dari daftar bacaan (toggle bookmark).
   */
  toggle = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const bookIdFromParam = req.params["id"] as string | undefined;
      const bookId =
        bookIdFromParam ?? createBookmarkSchema.parse(req.body).bookId;

      const result = await this.bookmarkService.toggleBookmark(
        req.userId as string,
        bookId,
      );

      successResponse({
        res,
        statusCode: result.bookmarked ? 201 : 200,
        message: result.bookmarked
          ? "Buku berhasil disimpan ke daftar bacaan"
          : "Buku dihapus dari daftar simpanan bacaan",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Menghapus buku dari daftar simpanan bacaan berdasarkan ID / kode buku.
   */
  remove = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const bookId = req.params["bookId"] as string;
      await this.bookmarkService.removeBookmark(req.userId as string, bookId);

      successResponse({
        res,
        message: "Buku berhasil dihapus dari simpanan bacaan",
      });
    } catch (error) {
      next(error);
    }
  };
}
