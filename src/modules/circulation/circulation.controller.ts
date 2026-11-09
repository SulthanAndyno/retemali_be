import { NextFunction, Response } from "express";
import { paginatedResponse, successResponse } from "../../utils/response";
import { CirculationService } from "./circulation.service";
import {
  createReservationSchema,
  loanQuerySchema,
  quickCheckoutSchema,
  quickReturnSchema,
} from "./circulation.validation";
import { AuthRequest } from "@/middlewares/auth.middleware";

export class CirculationController {
  private readonly circulationService: CirculationService;

  constructor(circulationService: CirculationService) {
    this.circulationService = circulationService;
  }

  createReservation = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = createReservationSchema.parse(req.body);
      const reservation = await this.circulationService.createReservation(
        req.userId as string,
        data,
      );

      successResponse({
        res,
        statusCode: 201,
        message: "Reservasi buku berhasil dibuat (Batas ambil 48 jam)",
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  };

  getMyReservations = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const reservations = await this.circulationService.getMyReservations(
        req.userId as string,
      );

      successResponse({
        res,
        message: "Berhasil mengambil daftar reservasi buku",
        data: reservations,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelReservation = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const reservation = await this.circulationService.cancelReservation(id);

      successResponse({
        res,
        message: "Reservasi buku berhasil dibatalkan",
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  };

  quickCheckout = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = quickCheckoutSchema.parse(req.body);
      const loan = await this.circulationService.quickCheckout(
        req.userId as string,
        data,
      );

      successResponse({
        res,
        statusCode: 201,
        message: "Sirkulasi peminjaman buku berhasil diproses",
        data: loan,
      });
    } catch (error) {
      next(error);
    }
  };

  quickReturn = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = quickReturnSchema.parse(req.body);
      const loan = await this.circulationService.quickReturn(
        req.userId as string,
        data,
      );

      successResponse({
        res,
        message: "Pengembalian buku berhasil diverifikasi",
        data: loan,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllLoans = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = loanQuerySchema.parse(req.query);
      const { data, meta } = await this.circulationService.getAllLoans(query);

      paginatedResponse({
        res,
        message: "Berhasil mengambil daftar peminjaman buku",
        data,
        meta,
      });
    } catch (error) {
      next(error);
    }
  };

  getMyLoans = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const loans = await this.circulationService.getMyLoans(
        req.userId as string,
      );

      successResponse({
        res,
        message: "Berhasil mengambil daftar pinjaman aktif Anda",
        data: loans,
      });
    } catch (error) {
      next(error);
    }
  };

  extendLoan = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const loan = await this.circulationService.extendLoan(
        id,
        req.userId as string,
      );

      successResponse({
        res,
        message: "Masa pinjam berhasil diperpanjang (+7 Hari)",
        data: loan,
      });
    } catch (error) {
      next(error);
    }
  };

  markAsLost = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const loan = await this.circulationService.markLoanAsLost(id);

      successResponse({
        res,
        message: "Status buku berhasil ditandai sebagai hilang (LOST)",
        data: loan,
      });
    } catch (error) {
      next(error);
    }
  };

  remindWhatsapp = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const result = await this.circulationService.sendWhatsappReminder(id);

      successResponse({
        res,
        message: "Tautan pengingat WhatsApp berhasil dibuat",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  runCronReminders = async (
    _req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.circulationService.runCronDueReminders();

      successResponse({
        res,
        message: "Cron pengecekan jatuh tempo berhasil dijalankan",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
