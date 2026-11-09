import { AppError } from "@/middlewares/error.middleware";
import { PrismaClient, ShiftHandoverNote } from "../../../generated/prisma";
import { ShiftType } from "../volunteer/volunteer.validation";
import { CreateHandoverNoteInput } from "./handover-note.validation";

interface FindAllHandoverNoteOptions {
  skip: number;
  take: number;
  shiftType?: ShiftType;
}

export class HandoverNoteRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Mengambil daftar catatan pergantian shift & logistik piket.
   */
  async findAll(
    options: FindAllHandoverNoteOptions,
  ): Promise<{ data: ShiftHandoverNote[]; total: number }> {
    const { skip, take, shiftType } = options;

    const where: Record<string, unknown> = {
      ...(shiftType && { shiftType }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.shiftHandoverNote.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              memberCode: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.shiftHandoverNote.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Mengambil satu catatan piket berdasarkan ID.
   */
  async findById(id: string): Promise<ShiftHandoverNote | null> {
    return this.prisma.shiftHandoverNote.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, memberCode: true, name: true, role: true },
        },
      },
    });
  }

  /**
   * Menyimpan catatan kendala & logistik piket baru untuk shift berikutnya.
   */
  async create(
    userId: string,
    data: CreateHandoverNoteInput,
  ): Promise<ShiftHandoverNote> {
    return this.prisma.shiftHandoverNote.create({
      data: {
        userId,
        shiftType: data.shiftType,
        tags: data.tags ?? [],
        content: data.content,
      },
      include: {
        user: {
          select: {
            id: true,
            memberCode: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Menghapus catatan piket berdasarkan ID.
   */
  async delete(id: string): Promise<ShiftHandoverNote> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new AppError("Catatan kendala & logistik piket tidak ditemukan", 404);
    }

    return this.prisma.shiftHandoverNote.delete({
      where: { id },
    });
  }
}
