import slug from "slug";
import { AppError } from "@/middlewares/error.middleware";
import {
  CommunityEvent,
  EventRegistration,
  PrismaClient,
} from "../../../generated/prisma";
import {
  CreateEventInput,
  EventCategory,
  EventFeeType,
  EventStatus,
  UpdateEventInput,
} from "./event.validation";

interface FindAllEventOptions {
  skip: number;
  take: number;
  category?: EventCategory;
  feeType?: EventFeeType;
  status?: EventStatus;
  isFeatured?: boolean;
  search?: string;
}

export class EventRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private async generateTicketCode(): Promise<string> {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const count = await this.prisma.eventRegistration.count();
    return `RETEMALI-EV-${randomNum + count}`;
  }

  async findAll(
    options: FindAllEventOptions,
  ): Promise<{ data: CommunityEvent[]; total: number }> {
    const { skip, take, category, feeType, status, isFeatured, search } =
      options;

    const where: Record<string, unknown> = {
      ...(category && { category }),
      ...(feeType && { feeType }),
      ...(status && { status }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { facilitatorName: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.communityEvent.findMany({
        where,
        skip,
        take,
        orderBy: [{ isFeatured: "desc" }, { eventDate: "asc" }],
      }),
      this.prisma.communityEvent.count({ where }),
    ]);

    return { data, total };
  }

  async findByIdOrSlug(identifier: string): Promise<CommunityEvent | null> {
    return this.prisma.communityEvent.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
    });
  }

  async create(
    data: CreateEventInput,
    bannerImagePath?: string,
  ): Promise<CommunityEvent> {
    const baseSlug = slug(data.title, { lower: true });
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    return this.prisma.communityEvent.create({
      data: {
        title: data.title,
        slug: uniqueSlug,
        description: data.description,
        category: data.category,
        facilitatorName: data.facilitatorName,
        location: data.location,
        eventDate: data.eventDate,
        startTime: data.startTime,
        endTime: data.endTime,
        quota: data.quota,
        feeType: data.feeType,
        infaqAmount: data.infaqAmount ?? 0,
        materialsNote: data.materialsNote ?? null,
        bannerImage: bannerImagePath ?? null,
        isFeatured: data.isFeatured ?? false,
        status: data.status ?? "PUBLISHED",
      },
    });
  }

  async update(
    id: string,
    data: UpdateEventInput,
    bannerImagePath?: string,
  ): Promise<CommunityEvent> {
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.facilitatorName !== undefined)
      updateData.facilitatorName = data.facilitatorName;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.eventDate !== undefined) updateData.eventDate = data.eventDate;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.quota !== undefined) updateData.quota = data.quota;
    if (data.feeType !== undefined) updateData.feeType = data.feeType;
    if (data.infaqAmount !== undefined)
      updateData.infaqAmount = data.infaqAmount;
    if (data.materialsNote !== undefined)
      updateData.materialsNote = data.materialsNote;
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
    if (data.status !== undefined) updateData.status = data.status;
    if (bannerImagePath !== undefined) updateData.bannerImage = bannerImagePath;

    return this.prisma.communityEvent.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<CommunityEvent> {
    return this.prisma.communityEvent.delete({ where: { id } });
  }

  async registerParticipant(
    eventIdOrSlug: string,
    userId: string,
  ): Promise<EventRegistration> {
    const event = await this.findByIdOrSlug(eventIdOrSlug);

    if (!event) {
      throw new AppError("Kegiatan komunitas tidak ditemukan", 404);
    }

    if (event.registeredCount >= event.quota) {
      throw new AppError("Kuota kursi kegiatan ini sudah penuh", 400);
    }

    const existing = await this.prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: { eventId: event.id, userId },
      },
    });

    if (existing) {
      throw new AppError("Anda sudah terdaftar pada kegiatan ini", 400);
    }

    const ticketCode = await this.generateTicketCode();

    return this.prisma.$transaction(async (tx) => {
      await tx.communityEvent.update({
        where: { id: event.id },
        data: { registeredCount: { increment: 1 } },
      });

      return tx.eventRegistration.create({
        data: {
          ticketCode,
          eventId: event.id,
          userId,
          status: "REGISTERED",
        },
        include: {
          event: true,
        },
      });
    });
  }

  async findTicketsByUser(userId: string): Promise<EventRegistration[]> {
    return this.prisma.eventRegistration.findMany({
      where: { userId },
      include: { event: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async checkInParticipant(
    ticketCode: string,
    checkedInBy: string,
  ): Promise<EventRegistration> {
    const ticket = await this.prisma.eventRegistration.findUnique({
      where: { ticketCode },
      include: { event: true, user: true },
    });

    if (!ticket) {
      throw new AppError(
        `Tiket dengan kode "${ticketCode}" tidak ditemukan`,
        404,
      );
    }

    if (ticket.status === "CHECKED_IN") {
      throw new AppError("Peserta ini sudah melakukan check-in sebelumnya", 400);
    }

    return this.prisma.eventRegistration.update({
      where: { id: ticket.id },
      data: {
        status: "CHECKED_IN",
        checkedInAt: new Date(),
        checkedInBy,
      },
      include: {
        event: true,
        user: {
          select: { id: true, memberCode: true, name: true, rtRw: true },
        },
      },
    });
  }

  async submitReport(
    eventId: string,
    reportSummary: string,
  ): Promise<CommunityEvent> {
    return this.prisma.communityEvent.update({
      where: { id: eventId },
      data: {
        reportSummary,
        status: "COMPLETED",
      },
    });
  }

  async approveReport(eventId: string): Promise<CommunityEvent> {
    return this.prisma.communityEvent.update({
      where: { id: eventId },
      data: {
        reportApproved: true,
      },
    });
  }
}
