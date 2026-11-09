import { NextFunction, Response } from "express";
import { successResponse } from "../../utils/response";
import { DashboardService } from "./dashboard.service";
import { AuthRequest } from "@/middlewares/auth.middleware";

export class DashboardController {
  private readonly dashboardService: DashboardService;

  constructor(dashboardService: DashboardService) {
    this.dashboardService = dashboardService;
  }

  getPublic = async (
    _req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = await this.dashboardService.getPublicStats();
      successResponse({
        res,
        message: "Berhasil mengambil statistik publik Taman Baca Rete Mali",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getMember = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = await this.dashboardService.getMemberDashboard(
        req.userId as string,
      );
      successResponse({
        res,
        message: "Berhasil mengambil data Portal Anggota",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getVolunteer = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = await this.dashboardService.getVolunteerDashboard(
        req.userId as string,
      );
      successResponse({
        res,
        message: "Berhasil mengambil data Meja Operasional Relawan",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getAdmin = async (
    _req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = await this.dashboardService.getAdminDashboard();
      successResponse({
        res,
        message: "Berhasil mengambil data Konsol Administrator",
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}
