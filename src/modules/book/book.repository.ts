import slug from "slug";
import { AppError } from "@/middlewares/error.middleware";
import { Book, PrismaClient } from "../../../generated/prisma";
import {
  BookCategory,
  BookStatus,
  CreateBookInput,
  UpdateBookInput,
} from "./book.validation";

interface FindAllBookOptions {
  skip: number;
  take: number;
  category?: BookCategory;
  status?: BookStatus;
  shelfLocation?: string;
  sortBy?: "newest" | "popular" | "rating";
  search?: string;
}

interface FindAllBookResult {
  data: Book[];
  total: number;
}

export class BookRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Membuat kode barcode buku unik berdasarkan kategori.
   * Format: BK-{PREFIX}-{4 digit urut}, contoh: BK-FA-0042
   */
  private async generateBookCode(category: BookCategory): Promise<string> {
    const prefixMap: Record<BookCategory, string> = {
      [BookCategory.FIKSI_SASTRA]: "FS",
      [BookCategory.SAINS_FAKTA]: "SF",
      [BookCategory.SEJARAH]: "SJ",
      [BookCategory.PSIKOLOGI]: "PS",
      [BookCategory.EDUKASI_ANAK]: "EA",
      [BookCategory.ENSIKLOPEDIA]: "EN",
      [BookCategory.KOMIK_EDUKASI]: "KE",
    };

    const prefix = prefixMap[category] ?? "BK";
    const count = await this.prisma.book.count({
      where: { category },
    });

    const sequence = String(count + 1).padStart(4, "0");
    return `BK-${prefix}-${sequence}`;
  }

  /**
   * Mengambil semua koleksi buku dengan pagination, filter kategori/status/rak,
   * pengurutan (newest/popular/rating), dan pencarian judul/penulis/ISBN/rak.
   */
  async findAll(options: FindAllBookOptions): Promise<FindAllBookResult> {
    const { skip, take, category, status, shelfLocation, sortBy, search } =
      options;

    const where: Record<string, unknown> = {
      ...(category && { category }),
      ...(status === ("BORROWED" as BookStatus)
        ? {
            OR: [
              { status: "BORROWED" },
              { availableStock: { lte: 0 } },
              { loans: { some: { status: "BORROWED" } } },
            ],
          }
        : status
        ? { status }
        : {}),
      ...(shelfLocation && {
        shelfLocation: { contains: shelfLocation, mode: "insensitive" },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { author: { contains: search, mode: "insensitive" } },
          { isbn: { contains: search, mode: "insensitive" } },
          { bookCode: { contains: search, mode: "insensitive" } },
          { shelfLocation: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const orderBy =
      sortBy === "popular"
        ? { borrowCount: "desc" as const }
        : sortBy === "rating"
          ? { rating: "desc" as const }
          : { createdAt: "desc" as const };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.book.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      this.prisma.book.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Mengambil satu buku berdasarkan ID, bookCode, ISBN, atau slug.
   */
  async findByIdentifier(identifier: string): Promise<Book | null> {
    return this.prisma.book.findFirst({
      where: {
        OR: [
          { id: identifier },
          { bookCode: identifier },
          { isbn: identifier },
          { slug: identifier },
        ],
      },
    });
  }

  /**
   * Menambahkan koleksi buku baru ke database.
   */
  async create(data: CreateBookInput, coverImagePath?: string): Promise<Book> {
    if (data.isbn) {
      const existingIsbn = await this.prisma.book.findUnique({
        where: { isbn: data.isbn },
      });
      if (existingIsbn) {
        throw new AppError("Buku dengan ISBN tersebut sudah terdaftar", 400);
      }
    }

    const bookCode = await this.generateBookCode(data.category);
    const baseSlug = slug(data.title, { lower: true });
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    return this.prisma.book.create({
      data: {
        bookCode,
        isbn: data.isbn || null,
        title: data.title,
        slug: uniqueSlug,
        author: data.author,
        publisher: data.publisher ?? null,
        publishYear: data.publishYear ?? null,
        category: data.category,
        synopsis: data.synopsis ?? null,
        coverImage: coverImagePath ?? null,
        shelfLocation: data.shelfLocation,
        totalStock: data.totalStock,
        availableStock: data.totalStock,
        rating: data.rating ?? 5.0,
        status: data.totalStock > 0 ? "AVAILABLE" : "BORROWED",
      },
    });
  }

  /**
   * Mengupdate data koleksi buku berdasarkan ID.
   */
  async update(
    id: string,
    data: UpdateBookInput,
    coverImagePath?: string,
  ): Promise<Book> {
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.author !== undefined) updateData.author = data.author;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.shelfLocation !== undefined)
      updateData.shelfLocation = data.shelfLocation;
    if (data.totalStock !== undefined) updateData.totalStock = data.totalStock;
    if (data.availableStock !== undefined) {
      updateData.availableStock = data.availableStock;
      updateData.status =
        data.availableStock > 0 ? BookStatus.AVAILABLE : BookStatus.BORROWED;
    }
    if (data.isbn !== undefined) updateData.isbn = data.isbn || null;
    if (data.synopsis !== undefined) updateData.synopsis = data.synopsis;
    if (data.publisher !== undefined) updateData.publisher = data.publisher;
    if (data.publishYear !== undefined)
      updateData.publishYear = data.publishYear;
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.status !== undefined) updateData.status = data.status;
    if (coverImagePath !== undefined) updateData.coverImage = coverImagePath;

    return this.prisma.book.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Menghapus buku secara permanen berdasarkan ID.
   */
  async delete(id: string): Promise<Book> {
    return this.prisma.book.delete({ where: { id } });
  }
}
