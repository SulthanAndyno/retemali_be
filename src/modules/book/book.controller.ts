import { NextFunction, Response } from "express";
import { paginatedResponse, successResponse } from "../../utils/response";
import { BookService } from "./book.service";
import {
  bookQuerySchema,
  createBookSchema,
  updateBookSchema,
} from "./book.validation";
import { AuthRequest } from "@/middlewares/auth.middleware";

export class BookController {
  private readonly bookService: BookService;

  constructor(bookService: BookService) {
    this.bookService = bookService;
  }

  /**
   * Mengambil daftar semua buku dengan pagination, filter, dan pencarian.
   */
  getAll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = bookQuerySchema.parse(req.query);
      const { data, meta } = await this.bookService.getAllBooks(query);

      paginatedResponse({
        res,
        message: "Berhasil mengambil katalog buku",
        data,
        meta,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Mengambil detail satu buku berdasarkan ID, bookCode, ISBN, atau slug.
   */
  getById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const book = await this.bookService.getBookById(id);

      successResponse({
        res,
        message: "Berhasil mengambil detail buku",
        data: book,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Menambahkan koleksi buku baru.
   */
  create = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = createBookSchema.parse(req.body);
      const book = await this.bookService.createBook(data, req.file);

      successResponse({
        res,
        statusCode: 201,
        message: "Koleksi buku berhasil ditambahkan",
        data: book,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Mengupdate data koleksi buku berdasarkan ID.
   */
  update = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const data = updateBookSchema.parse(req.body);
      const book = await this.bookService.updateBook(id, data, req.file);

      successResponse({
        res,
        message: "Koleksi buku berhasil diupdate",
        data: book,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Menghapus koleksi buku berdasarkan ID secara permanen.
   */
  delete = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      await this.bookService.deleteBook(id);

      successResponse({
        res,
        message: "Koleksi buku berhasil dihapus",
      });
    } catch (error) {
      next(error);
    }
  };
}
