import { AppError } from "@/middlewares/error.middleware";
import {
  BookLoan,
  BookReservation,
  PrismaClient,
} from "../../../generated/prisma";
import {
  BookCondition,
  CreateReservationInput,
  LoanStatus,
  QuickCheckoutInput,
  QuickReturnInput,
} from "./circulation.validation";

interface FindAllLoanOptions {
  skip: number;
  take: number;
  status?: LoanStatus;
  search?: string;
}

export class CirculationRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private async generateReservationCode(): Promise<string> {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `RES-${randomNum}`;
  }

  private async generateLoanCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.bookLoan.count();
    const seq = String(count + 1).padStart(4, "0");
    return `LN-${year}-${seq}`;
  }

  /**
   * Membuat reservasi buku baru (tahan stok selama 48 jam di Loket Sirkulasi).
   */
  async createReservation(
    userId: string,
    data: CreateReservationInput,
  ): Promise<BookReservation> {
    const book = await this.prisma.book.findFirst({
      where: {
        OR: [
          { id: data.bookId },
          { bookCode: data.bookId },
          { slug: data.bookId },
        ],
      },
    });

    if (!book) {
      throw new AppError("Buku tidak ditemukan", 404);
    }

    if (book.availableStock <= 0) {
      throw new AppError("Stok buku sedang kosong / sedang dipinjam semua", 400);
    }

    const existingActive = await this.prisma.bookReservation.findFirst({
      where: {
        userId,
        bookId: book.id,
        status: "READY_FOR_PICKUP",
      },
    });

    if (existingActive) {
      throw new AppError("Anda sudah mereservasi buku ini", 400);
    }

    const reservationCode = await this.generateReservationCode();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // +48 jam

    return this.prisma.$transaction(async (tx) => {
      const newAvailable = book.availableStock - 1;
      await tx.book.update({
        where: { id: book.id },
        data: {
          availableStock: newAvailable,
          status: newAvailable > 0 ? "AVAILABLE" : "BORROWED",
        },
      });

      return tx.bookReservation.create({
        data: {
          reservationCode,
          userId,
          bookId: book.id,
          pickupCounter: data.pickupCounter ?? "Loket Sirkulasi A-2",
          expiresAt,
          status: "READY_FOR_PICKUP",
        },
        include: {
          book: true,
        },
      });
    });
  }

  /**
   * Mengambil daftar reservasi buku milik user tertentu.
   */
  async findReservationsByUser(userId: string): Promise<BookReservation[]> {
    return this.prisma.bookReservation.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Membatalkan reservasi buku dan mengembalikan stok tersedia.
   */
  async cancelReservation(id: string): Promise<BookReservation> {
    const reservation = await this.prisma.bookReservation.findUnique({
      where: { id },
      include: { book: true },
    });

    if (!reservation) {
      throw new AppError("Data reservasi tidak ditemukan", 404);
    }

    if (reservation.status !== "READY_FOR_PICKUP") {
      throw new AppError("Reservasi ini sudah tidak aktif", 400);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: reservation.bookId },
        data: {
          availableStock: { increment: 1 },
          status: "AVAILABLE",
        },
      });

      return tx.bookReservation.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { book: true },
      });
    });
  }

  /**
   * Memproses Sirkulasi Cepat (Peminjaman Baru) di Meja Operasional Relawan.
   */
  async quickCheckout(
    processedById: string,
    data: QuickCheckoutInput,
  ): Promise<BookLoan> {
    const member = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: data.memberIdentifier },
          { memberCode: data.memberIdentifier },
          { email: data.memberIdentifier },
        ],
      },
    });

    if (!member) {
      throw new AppError(
        `Anggota dengan kode "${data.memberIdentifier}" tidak ditemukan`,
        404,
      );
    }

    const book = await this.prisma.book.findFirst({
      where: {
        OR: [
          { id: data.bookIdentifier },
          { bookCode: data.bookIdentifier },
          { isbn: data.bookIdentifier },
        ],
      },
    });

    if (!book) {
      throw new AppError(
        `Buku dengan kode/ISBN "${data.bookIdentifier}" tidak ditemukan`,
        404,
      );
    }

    const activeReservation = await this.prisma.bookReservation.findFirst({
      where: {
        userId: member.id,
        bookId: book.id,
        status: "READY_FOR_PICKUP",
        ...(data.reservationCode && { reservationCode: data.reservationCode }),
      },
    });

    if (!activeReservation && book.availableStock <= 0) {
      throw new AppError("Stok buku tidak tersedia untuk dipinjam", 400);
    }

    const loanCode = await this.generateLoanCode();
    const durationDays = data.durationDays ?? 14;
    const dueDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      if (activeReservation) {
        await tx.bookReservation.update({
          where: { id: activeReservation.id },
          data: { status: "CLAIMED" },
        });
        await tx.book.update({
          where: { id: book.id },
          data: { borrowCount: { increment: 1 } },
        });
      } else {
        const newAvailable = book.availableStock - 1;
        await tx.book.update({
          where: { id: book.id },
          data: {
            availableStock: newAvailable,
            status: newAvailable > 0 ? "AVAILABLE" : "BORROWED",
            borrowCount: { increment: 1 },
          },
        });
      }

      return tx.bookLoan.create({
        data: {
          loanCode,
          userId: member.id,
          bookId: book.id,
          reservationId: activeReservation?.id ?? null,
          processedById,
          dueDate,
          status: "BORROWED",
        },
        include: {
          user: {
            select: {
              id: true,
              memberCode: true,
              name: true,
              rtRw: true,
            },
          },
          book: true,
        },
      });
    });
  }

  /**
   * Memproses Sirkulasi Cepat (Pengembalian Buku) di Meja Operasional Relawan.
   */
  async quickReturn(
    returnedById: string,
    data: QuickReturnInput,
  ): Promise<BookLoan> {
    const activeLoan = await this.prisma.bookLoan.findFirst({
      where: {
        status: { in: ["BORROWED", "OVERDUE"] },
        OR: [
          { id: data.bookIdentifier },
          { loanCode: data.bookIdentifier },
          { book: { bookCode: data.bookIdentifier } },
          { book: { isbn: data.bookIdentifier } },
        ],
        ...(data.memberIdentifier && {
          user: {
            OR: [
              { id: data.memberIdentifier },
              { memberCode: data.memberIdentifier },
            ],
          },
        }),
      },
      include: { book: true, user: true },
      orderBy: { borrowedAt: "asc" },
    });

    if (!activeLoan) {
      throw new AppError(
        "Transaksi peminjaman aktif untuk buku tersebut tidak ditemukan",
        404,
      );
    }

    const now = new Date();
    const isOnTime = now <= activeLoan.dueDate;
    const addedPoints =
      data.returnCondition === BookCondition.GOOD && isOnTime ? 20 : 5;

    return this.prisma.$transaction(async (tx) => {
      if (data.returnCondition !== BookCondition.LOST) {
        await tx.book.update({
          where: { id: activeLoan.bookId },
          data: {
            availableStock: { increment: 1 },
            status: "AVAILABLE",
          },
        });
      }

      await tx.user.update({
        where: { id: activeLoan.userId },
        data: {
          points: { increment: addedPoints },
        },
      });

      return tx.bookLoan.update({
        where: { id: activeLoan.id },
        data: {
          returnedAt: now,
          returnedById,
          returnCondition: data.returnCondition,
          notes: data.notes ?? null,
          status:
            data.returnCondition === BookCondition.LOST ? "LOST" : "RETURNED",
        },
        include: {
          user: {
            select: {
              id: true,
              memberCode: true,
              name: true,
              points: true,
            },
          },
          book: true,
        },
      });
    });
  }

  /**
   * Mengambil semua daftar transaksi peminjaman dengan pagination & filter.
   */
  async findAllLoans(
    options: FindAllLoanOptions,
  ): Promise<{ data: BookLoan[]; total: number }> {
    const { skip, take, status, search } = options;

    const where: Record<string, unknown> = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { loanCode: { contains: search, mode: "insensitive" } },
          { user: { name: { contains: search, mode: "insensitive" } } },
          { user: { memberCode: { contains: search, mode: "insensitive" } } },
          { book: { title: { contains: search, mode: "insensitive" } } },
          { book: { bookCode: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.bookLoan.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              memberCode: true,
              name: true,
              phone: true,
              rtRw: true,
            },
          },
          book: true,
        },
        orderBy: { borrowedAt: "desc" },
      }),
      this.prisma.bookLoan.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Mengambil daftar pinjaman milik user tertentu.
   */
  async findLoansByUser(userId: string): Promise<BookLoan[]> {
    return this.prisma.bookLoan.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { borrowedAt: "desc" },
    });
  }

  /**
   * Memperpanjang masa pinjam (+7 hari, maks 1x per peminjaman).
   */
  async extendLoan(id: string, userId: string): Promise<BookLoan> {
    const loan = await this.prisma.bookLoan.findUnique({
      where: { id },
      include: { book: true },
    });

    if (!loan || loan.userId !== userId) {
      throw new AppError("Data peminjaman tidak ditemukan", 404);
    }

    if (loan.status !== "BORROWED") {
      throw new AppError(
        "Hanya peminjaman berstatus aktif yang dapat diperpanjang",
        400,
      );
    }

    if (loan.extendedCount >= 1) {
      throw new AppError(
        "Batas maksimal perpanjangan pinjaman (1x +7 hari) sudah tercapai",
        400,
      );
    }

    const newDueDate = new Date(loan.dueDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.bookLoan.update({
      where: { id },
      data: {
        dueDate: newDueDate,
        extendedCount: { increment: 1 },
      },
      include: { book: true },
    });
  }

  /**
   * Menandai peminjaman buku sebagai LOST (Buku Hilang).
   */
  async markAsLost(id: string): Promise<BookLoan> {
    return this.prisma.bookLoan.update({
      where: { id },
      data: {
        status: "LOST",
        returnCondition: "LOST",
      },
      include: { book: true, user: true },
    });
  }

  /**
   * Mencatat waktu pengiriman pengingat WhatsApp.
   */
  async recordWhatsappReminder(id: string) {
    const loan = await this.prisma.bookLoan.findUnique({
      where: { id },
      include: { user: true, book: true },
    });

    if (!loan) {
      throw new AppError("Transaksi peminjaman tidak ditemukan", 404);
    }

    const updated = await this.prisma.bookLoan.update({
      where: { id },
      data: { reminderSentAt: new Date() },
      include: { user: true, book: true },
    });

    const phone = loan.user.phone?.replace(/^0/, "62") ?? "6281200000000";
    const text = encodeURIComponent(
      `Halo Kak ${loan.user.name}, pengingat ramah dari Taman Baca Rete Mali: buku "${loan.book.title}" (${loan.book.bookCode}) memiliki tenggat pengembalian pada ${loan.dueDate.toLocaleDateString("id-ID")}. Terima kasih!`,
    );

    return {
      loan: updated,
      whatsappUrl: `https://wa.me/${phone}?text=${text}`,
    };
  }

  /**
   * Menjalankan pengecekan otomatis (Cron) untuk mengubah pinjaman lewat jatuh tempo menjadi OVERDUE
   * dan mengambil daftar pinjaman yang jatuh tempo dalam <= 2 hari (H-2).
   */
  async processCronReminders() {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const overdueUpdated = await this.prisma.bookLoan.updateMany({
      where: {
        status: "BORROWED",
        dueDate: { lt: now },
      },
      data: { status: "OVERDUE" },
    });

    const dueSoonLoans = await this.prisma.bookLoan.findMany({
      where: {
        status: "BORROWED",
        dueDate: { gte: now, lte: twoDaysFromNow },
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        book: { select: { id: true, title: true, bookCode: true } },
      },
    });

    return {
      overdueMarkedCount: overdueUpdated.count,
      dueSoonCount: dueSoonLoans.length,
      dueSoonLoans,
    };
  }
}
