import { Book } from "../../../generated/prisma";
import fs from "fs";
import path from "path";
import {
  buildPaginationMeta,
  parsePagination,
  PaginationMeta,
} from "../../utils/pagination";
import { BookRepository } from "./book.repository";
import {
  BookQueryInput,
  CreateBookInput,
  UpdateBookInput,
} from "./book.validation";
import { AppError } from "@/middlewares/error.middleware";

interface BookListResult {
  data: Book[];
  meta: PaginationMeta;
}

export class BookService {
  private readonly bookRepository: BookRepository;

  constructor(bookRepository: BookRepository) {
    this.bookRepository = bookRepository;
  }

  private deleteCoverFile(imagePath: string): void {
    const fullPath: string = path.join(process.cwd(), imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  /**
   * Mengambil daftar koleksi buku dengan pagination, filter, sort, dan pencarian.
   */
  async getAllBooks(query: BookQueryInput): Promise<BookListResult> {
    const { skip, take, page, limit } = parsePagination(query);

    const { data, total } = await this.bookRepository.findAll({
      skip,
      take,
      category: query.category,
      status: query.status,
      shelfLocation: query.shelfLocation,
      sortBy: query.sortBy,
      search: query.search,
    });

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Mengambil detail satu buku berdasarkan ID, bookCode, ISBN, atau slug.
   */
  async getBookById(identifier: string): Promise<Book> {
    const book: Book | null =
      await this.bookRepository.findByIdentifier(identifier);

    if (!book) {
      throw new AppError("Koleksi buku tidak ditemukan", 404);
    }

    return book;
  }

  /**
   * Menambahkan koleksi buku baru.
   */
  async createBook(
    data: CreateBookInput,
    file?: Express.Multer.File,
  ): Promise<Book> {
    const coverImagePath: string | undefined = file
      ? `uploads/books/${file.filename}`
      : undefined;

    return this.bookRepository.create(data, coverImagePath);
  }

  /**
   * Mengupdate data koleksi buku berdasarkan ID.
   */
  async updateBook(
    id: string,
    data: UpdateBookInput,
    file?: Express.Multer.File,
  ): Promise<Book> {
    const existingBook: Book = await this.getBookById(id);

    let coverImagePath: string | undefined;

    if (file) {
      if (existingBook.coverImage) {
        this.deleteCoverFile(existingBook.coverImage);
      }
      coverImagePath = `uploads/books/${file.filename}`;
    }

    return this.bookRepository.update(existingBook.id, data, coverImagePath);
  }

  /**
   * Menghapus koleksi buku secara permanen.
   */
  async deleteBook(id: string): Promise<void> {
    const existingBook: Book = await this.getBookById(id);

    if (existingBook.coverImage) {
      this.deleteCoverFile(existingBook.coverImage);
    }

    await this.bookRepository.delete(existingBook.id);
  }
}
