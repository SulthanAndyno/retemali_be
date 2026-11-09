import { NextFunction, Response } from "express";
import { paginatedResponse, successResponse } from "../../utils/response";
import { VolunteerService } from "./volunteer.service";
import {
  applyVolunteerSchema,
  clockInSchema,
  clockOutSchema,
  reviewApplicationSchema,
  volunteerQuerySchema,
} from "./volunteer.validation";
import { AuthRequest } from "@/middlewares/auth.middleware";

export class VolunteerController {
  private readonly volunteerService: VolunteerService;

  constructor(volunteerService: VolunteerService) {
    this.volunteerService = volunteerService;
  }

  apply = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = applyVolunteerSchema.parse(req.body);
      const result = await this.volunteerService.applyVolunteer(
        req.userId as string,
        data,
        req.file,
      );

      successResponse({
        res,
        statusCode: 201,
        message: "Berkas pendaftaran relawan berhasil dikirim",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllApplications = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = volunteerQuerySchema.parse(req.query);
      const { data, meta } =
        await this.volunteerService.getAllApplications(query);

      paginatedResponse({
        res,
        message: "Berhasil mengambil daftar calon relawan baru",
        data,
        meta,
      });
    } catch (error) {
      next(error);
    }
  };

  reviewApplication = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const data = reviewApplicationSchema.parse(req.body);
      const result = await this.volunteerService.reviewApplication(
        id,
        req.userId as string,
        data,
      );

      successResponse({
        res,
        message:
          data.status === "APPROVED"
            ? "Calon relawan berhasil disetujui"
            : "Berkas calon relawan ditolak",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  clockIn = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = clockInSchema.parse(req.body);
      const shift = await this.volunteerService.clockIn(
        req.userId as string,
        data,
      );

      successResponse({
        res,
        statusCode: 201,
        message: "Clock-In piket relawan berhasil dimulai",
        data: shift,
      });
    } catch (error) {
      next(error);
    }
  };

  clockOut = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = clockOutSchema.parse(req.body);
      const shift = await this.volunteerService.clockOut(
        req.userId as string,
        data,
      );

      successResponse({
        res,
        message: "Clock-Out piket berhasil. Menunggu verifikasi jam piket Admin",
        data: shift,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllShifts = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = volunteerQuerySchema.parse(req.query);
      const { data, meta } = await this.volunteerService.getAllShifts(query);

      paginatedResponse({
        res,
        message: "Berhasil mengambil daftar jam piket relawan",
        data,
        meta,
      });
    } catch (error) {
      next(error);
    }
  };

  approveShift = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const shift = await this.volunteerService.approveShift(
        id,
        req.userId as string,
      );

      successResponse({
        res,
        message: "Sesi jam piket relawan berhasil disetujui",
        data: shift,
      });
    } catch (error) {
      next(error);
    }
  };

  approveAllShifts = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.volunteerService.approveAllShifts(
        req.userId as string,
      );

      successResponse({
        res,
        message: "Semua sesi jam piket berhasil disetujui",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
