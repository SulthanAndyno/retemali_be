import { AppError } from "@/middlewares/error.middleware";
import { BookBookmark, PrismaClient } from "../../../generated/prisma";

interface FindAllBookmarkOptions {
  userId: string;
  skip: number;
  take: number;
}

export class BookmarkRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Mengambil daftar buku yang disimpan (bookmark) oleh anggota dengan pagination.
   */
  async findAllByUser(
    options: FindAllBookmarkOptions,
  ): Promise<{ data: BookBookmark[]; total: number }> {
    const { userId, skip, take } = options;

    const where = { userId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.bookBookmark.findMany({
        where,
        skip,
        take,
        include: {
          book: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.bookBookmark.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Menyimpan atau menghapus simpanan bacaan (toggle / tambah bookmark).
   */
  async toggleOrCreate(
    userId: string,
    bookIdentifier: string,
  ): Promise<{ bookmarked: boolean; data: BookBookmark | null }> {
    const book = await this.prisma.book.findFirst({
      where: {
        OR: [
          { id: bookIdentifier },
          { bookCode: bookIdentifier },
          { slug: bookIdentifier },
        ],
      },
    });

    if (!book) {
      throw new AppError("Koleksi buku tidak ditemukan", 404);
    }

    const existing = await this.prisma.bookBookmark.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId: book.id,
        },
      },
      include: { book: true },
    });

    if (existing) {
      await this.prisma.bookBookmark.delete({
        where: { id: existing.id },
      });
      return { bookmarked: false, data: null };
    }

    const created = await this.prisma.bookBookmark.create({
      data: {
        userId,
        bookId: book.id,
      },
      include: {
        book: true,
      },
    });

    return { bookmarked: true, data: created };
  }

  /**
   * Menghapus buku dari daftar simpanan bacaan berdasarkan ID / kode buku.
   */
  async deleteByBook(userId: string, bookIdentifier: string): Promise<void> {
    const book = await this.prisma.book.findFirst({
      where: {
        OR: [
          { id: bookIdentifier },
          { bookCode: bookIdentifier },
          { slug: bookIdentifier },
        ],
      },
    });

    if (!book) {
      throw new AppError("Koleksi buku tidak ditemukan", 404);
    }

    const existing = await this.prisma.bookBookmark.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId: book.id,
        },
      },
    });

    if (!existing) {
      throw new AppError("Buku belum ada di daftar simpanan bacaan Anda", 404);
    }

    await this.prisma.bookBookmark.delete({
      where: { id: existing.id },
    });
  }
}
