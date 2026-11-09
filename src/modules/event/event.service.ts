import fs from "fs";
import path from "path";
import { CommunityEvent, EventRegistration } from "../../../generated/prisma";
import {
  buildPaginationMeta,
  parsePagination,
  PaginationMeta,
} from "../../utils/pagination";
import { EventRepository } from "./event.repository";
import {
  CreateEventInput,
  EventQueryInput,
  EventStatus,
  UpdateEventInput,
} from "./event.validation";
import { AppError } from "@/middlewares/error.middleware";

export class EventService {
  private readonly eventRepository: EventRepository;

  constructor(eventRepository: EventRepository) {
    this.eventRepository = eventRepository;
  }

  private deleteBannerFile(bannerPath: string): void {
    const fullPath = path.join(process.cwd(), bannerPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async getAllEvents(
    query: EventQueryInput,
  ): Promise<{ data: CommunityEvent[]; meta: PaginationMeta }> {
    const { skip, take, page, limit } = parsePagination(query);
    const { data, total } = await this.eventRepository.findAll({
      skip,
      take,
      category: query.category,
      feeType: query.feeType,
      status: query.status,
      isFeatured: query.isFeatured,
      search: query.search,
    });

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getEventById(identifier: string): Promise<CommunityEvent> {
    const event = await this.eventRepository.findByIdOrSlug(identifier);
    if (!event) {
      throw new AppError("Kegiatan komunitas tidak ditemukan", 404);
    }
    return event;
  }

  async createEvent(
    data: CreateEventInput,
    file?: Express.Multer.File,
  ): Promise<CommunityEvent> {
    const bannerPath = file ? `uploads/events/${file.filename}` : undefined;
    return this.eventRepository.create(data, bannerPath);
  }

  async proposeEvent(
    data: CreateEventInput,
    file?: Express.Multer.File,
  ): Promise<CommunityEvent> {
    const bannerPath = file ? `uploads/events/${file.filename}` : undefined;
    return this.eventRepository.create(
      { ...data, status: EventStatus.DRAFT },
      bannerPath,
    );
  }

  async updateEvent(
    id: string,
    data: UpdateEventInput,
    file?: Express.Multer.File,
  ): Promise<CommunityEvent> {
    const existing = await this.getEventById(id);

    let bannerPath: string | undefined;
    if (file) {
      if (existing.bannerImage) {
        this.deleteBannerFile(existing.bannerImage);
      }
      bannerPath = `uploads/events/${file.filename}`;
    }

    return this.eventRepository.update(existing.id, data, bannerPath);
  }

  async deleteEvent(id: string): Promise<void> {
    const existing = await this.getEventById(id);
    if (existing.bannerImage) {
      this.deleteBannerFile(existing.bannerImage);
    }
    await this.eventRepository.delete(existing.id);
  }

  async registerParticipant(
    eventId: string,
    userId: string,
  ): Promise<EventRegistration> {
    return this.eventRepository.registerParticipant(eventId, userId);
  }

  async getMyTickets(userId: string): Promise<EventRegistration[]> {
    return this.eventRepository.findTicketsByUser(userId);
  }

  async checkInParticipant(
    ticketCode: string,
    checkedInBy: string,
  ): Promise<EventRegistration> {
    return this.eventRepository.checkInParticipant(ticketCode, checkedInBy);
  }

  async submitEventReport(
    eventId: string,
    reportSummary: string,
  ): Promise<CommunityEvent> {
    const event = await this.getEventById(eventId);
    return this.eventRepository.submitReport(event.id, reportSummary);
  }

  async approveEventReport(eventId: string): Promise<CommunityEvent> {
    const event = await this.getEventById(eventId);
    return this.eventRepository.approveReport(event.id);
  }
}
