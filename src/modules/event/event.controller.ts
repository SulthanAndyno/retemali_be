import { NextFunction, Response } from "express";
import { paginatedResponse, successResponse } from "../../utils/response";
import { EventService } from "./event.service";
import {
  attendanceReportQuerySchema,
  checkInTicketSchema,
  createEventSchema,
  eventQuerySchema,
  eventRegistrationQuerySchema,
  submitEventReportSchema,
  updateEventSchema,
  verifyEventPaymentSchema,
} from "./event.validation";
import { AuthRequest } from "@/middlewares/auth.middleware";

export class EventController {
  private readonly eventService: EventService;

  constructor(eventService: EventService) {
    this.eventService = eventService;
  }

  getAll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = eventQuerySchema.parse(req.query);
      const { data, meta } = await this.eventService.getAllEvents(query);

      paginatedResponse({
        res,
        message: "Berhasil mengambil daftar agenda kegiatan komunitas",
        data,
        meta,
      });
    } catch (error) {
      next(error);
    }
  };

  getAttendanceReport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = attendanceReportQuerySchema.parse(req.query);
      const report = await this.eventService.getAttendanceReport(query);

      successResponse({
        res,
        message: "Berhasil mengambil laporan presensi kegiatan",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const event = await this.eventService.getEventById(id);

      successResponse({
        res,
        message: "Berhasil mengambil detail kegiatan komunitas",
        data: event,
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = createEventSchema.parse(req.body);
      const event = await this.eventService.createEvent(data, req.file);

      successResponse({
        res,
        statusCode: 201,
        message: "Kegiatan komunitas berhasil ditambahkan",
        data: event,
      });
    } catch (error) {
      next(error);
    }
  };

  propose = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = createEventSchema.parse(req.body);
      const event = await this.eventService.proposeEvent(data, req.file);

      successResponse({
        res,
        statusCode: 201,
        message: "Usulan kegiatan berhasil dikirim dan menunggu kurasi",
        data: event,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const data = updateEventSchema.parse(req.body);
      const event = await this.eventService.updateEvent(id, data, req.file);

      successResponse({
        res,
        message: "Kegiatan komunitas berhasil diupdate",
        data: event,
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      await this.eventService.deleteEvent(id);

      successResponse({
        res,
        message: "Kegiatan komunitas berhasil dihapus",
      });
    } catch (error) {
      next(error);
    }
  };

  registerParticipant = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const eventId = req.params["id"] as string;
      const ticket = await this.eventService.registerParticipant(
        eventId,
        req.userId as string,
        req.file,
      );

      successResponse({
        res,
        statusCode: 201,
        message:
          ticket.paymentStatus === "PENDING"
            ? "Pendaftaran diterima. Bukti pembayaran menunggu verifikasi admin"
            : "Berhasil mendaftar kegiatan. E-Tiket QR telah diterbitkan",
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  };

  getRegistrations = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = eventRegistrationQuerySchema.parse(req.query);
      const report = await this.eventService.getRegistrations(query);

      successResponse({
        res,
        message: "Berhasil mengambil daftar pendaftar kegiatan",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  };

  verifyRegistrationPayment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const registrationId = req.params["registrationId"] as string;
      const data = verifyEventPaymentSchema.parse(req.body);
      const registration = await this.eventService.verifyRegistrationPayment(
        registrationId,
        req.userId as string,
        data,
      );

      successResponse({
        res,
        message:
          data.status === "VERIFIED"
            ? "Pembayaran peserta berhasil diverifikasi"
            : "Pembayaran peserta ditolak dan pendaftaran dibatalkan",
        data: registration,
      });
    } catch (error) {
      next(error);
    }
  };

  getMyTickets = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const tickets = await this.eventService.getMyTickets(
        req.userId as string,
      );

      successResponse({
        res,
        message: "Berhasil mengambil daftar tiket kegiatan saya",
        data: tickets,
      });
    } catch (error) {
      next(error);
    }
  };

  checkIn = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { ticketCode } = checkInTicketSchema.parse(req.body);
      const ticket = await this.eventService.checkInParticipant(
        ticketCode,
        req.userId as string,
      );

      successResponse({
        res,
        message: "Presensi check-in peserta berhasil diverifikasi",
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  };

  submitReport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const eventId = req.params["id"] as string;
      const { reportSummary } = submitEventReportSchema.parse(req.body);
      const event = await this.eventService.submitEventReport(
        eventId,
        reportSummary,
      );

      successResponse({
        res,
        message: "Laporan paska-acara berhasil dikirim",
        data: event,
      });
    } catch (error) {
      next(error);
    }
  };

  approveReport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const eventId = req.params["id"] as string;
      const event = await this.eventService.approveEventReport(eventId);

      successResponse({
        res,
        message: "Laporan paska-acara berhasil disetujui",
        data: event,
      });
    } catch (error) {
      next(error);
    }
  };
}
