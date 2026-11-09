import { AppError } from "@/middlewares/error.middleware";
import {
  PrismaClient,
  VolunteerApplication,
  VolunteerShift,
} from "../../../generated/prisma";
import {
  ApplyVolunteerInput,
  ClockInInput,
  ClockOutInput,
  ReviewApplicationInput,
} from "./volunteer.validation";

export class VolunteerRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Membuat berkas pendaftaran Calon Relawan Baru.
   */
  async createApplication(
    userId: string,
    data: ApplyVolunteerInput,
    cvPath?: string,
  ): Promise<VolunteerApplication> {
    const existing = await this.prisma.volunteerApplication.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new AppError(
        "Anda sudah pernah mengajukan pendaftaran relawan",
        400,
      );
    }

    return this.prisma.volunteerApplication.create({
      data: {
        userId,
        majorOrJob: data.majorOrJob,
        institution: data.institution,
        division: data.division,
        motivation: data.motivation,
        cvDocument: cvPath ?? null,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            memberCode: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * Mengambil daftar berkas calon relawan baru.
   */
  async findAllApplications(options: {
    skip: number;
    take: number;
    status?: string;
  }): Promise<{ data: VolunteerApplication[]; total: number }> {
    const { skip, take, status } = options;
    const where: Record<string, unknown> = {
      ...(status && { status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.volunteerApplication.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              memberCode: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.volunteerApplication.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Menyetujui atau menolak pendaftaran calon relawan baru oleh Admin.
   */
  async reviewApplication(
    id: string,
    adminId: string,
    data: ReviewApplicationInput,
  ): Promise<VolunteerApplication> {
    const application = await this.prisma.volunteerApplication.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!application) {
      throw new AppError("Berkas pendaftaran relawan tidak ditemukan", 404);
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.status === "APPROVED") {
        await tx.user.update({
          where: { id: application.userId },
          data: { role: "VOLUNTEER" },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminId,
            title: "Persetujuan Relawan Baru",
            description: `Akun ${application.user.name} disetujui menjadi Relawan divisi ${application.division}.`,
            category: "ACCESS_CONTROL",
          },
        });
      }

      return tx.volunteerApplication.update({
        where: { id },
        data: {
          status: data.status,
          reviewedById: adminId,
          reviewedAt: new Date(),
          rejectionNote: data.rejectionNote ?? null,
        },
        include: {
          user: {
            select: {
              id: true,
              memberCode: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });
  }

  /**
   * Memulai sesi piket relawan (Clock-In).
   */
  async clockIn(userId: string, data: ClockInInput): Promise<VolunteerShift> {
    const ongoing = await this.prisma.volunteerShift.findFirst({
      where: {
        userId,
        approvalStatus: "ONGOING",
      },
    });

    if (ongoing) {
      throw new AppError(
        "Anda masih memiliki sesi piket yang sedang berjalan (belum Clock-Out)",
        400,
      );
    }

    return this.prisma.volunteerShift.create({
      data: {
        userId,
        shiftType: data.shiftType,
        location: data.location,
        taskSummary: data.taskSummary ?? null,
        approvalStatus: "ONGOING",
      },
      include: {
        user: { select: { id: true, name: true, memberCode: true } },
      },
    });
  }

  /**
   * Mengakhiri sesi piket relawan (Clock-Out) dan menghitung jam kerja.
   */
  async clockOut(userId: string, data: ClockOutInput): Promise<VolunteerShift> {
    const ongoing = await this.prisma.volunteerShift.findFirst({
      where: {
        userId,
        approvalStatus: "ONGOING",
      },
      orderBy: { clockInAt: "desc" },
    });

    if (!ongoing) {
      throw new AppError(
        "Tidak ada sesi piket aktif yang sedang berjalan",
        404,
      );
    }

    const now = new Date();
    const diffHours =
      (now.getTime() - ongoing.clockInAt.getTime()) / (1000 * 60 * 60);
    const calculatedHours =
      data.durationHours ?? Math.max(0.5, Number(diffHours.toFixed(1)));

    return this.prisma.volunteerShift.update({
      where: { id: ongoing.id },
      data: {
        clockOutAt: now,
        taskSummary: data.taskSummary,
        durationHours: calculatedHours,
        approvalStatus: "PENDING_APPROVAL",
      },
      include: {
        user: { select: { id: true, name: true, memberCode: true } },
      },
    });
  }

  /**
   * Mengambil daftar shift & jam piket relawan.
   */
  async findAllShifts(options: {
    skip: number;
    take: number;
    status?: string;
  }): Promise<{ data: VolunteerShift[]; total: number }> {
    const { skip, take, status } = options;
    const where: Record<string, unknown> = {
      ...(status && { approvalStatus: status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.volunteerShift.findMany({
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
            },
          },
        },
        orderBy: { clockInAt: "desc" },
      }),
      this.prisma.volunteerShift.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Menyetujui 1 sesi jam piket relawan oleh Admin.
   */
  async approveShift(id: string, adminId: string): Promise<VolunteerShift> {
    return this.prisma.volunteerShift.update({
      where: { id },
      data: {
        approvalStatus: "APPROVED",
        approvedById: adminId,
        approvedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, memberCode: true } },
      },
    });
  }

  /**
   * Menyetujui semua antrean jam piket relawan (Setujui Semua).
   */
  async approveAllPendingShifts(adminId: string): Promise<{ count: number }> {
    return this.prisma.volunteerShift.updateMany({
      where: { approvalStatus: "PENDING_APPROVAL" },
      data: {
        approvalStatus: "APPROVED",
        approvedById: adminId,
        approvedAt: new Date(),
      },
    });
  }
}
