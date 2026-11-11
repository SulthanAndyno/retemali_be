import { NextFunction, Response } from "express";
import { paginatedResponse, successResponse } from "../../utils/response";
import { DonationService } from "./donation.service";
import {
  createBookDonationSchema,
  createFinancialDonationSchema,
  donationQuerySchema,
  paymentWebhookSchema,
  verifyBookDonationSchema,
} from "./donation.validation";
import { AuthRequest } from "@/middlewares/auth.middleware";

export class DonationController {
  private readonly donationService: DonationService;

  constructor(donationService: DonationService) {
    this.donationService = donationService;
  }

  getSummary = async (
    _req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const summary = await this.donationService.getPublicSummary();
      successResponse({
        res,
        message: "Berhasil mengambil ringkasan capaian donasi & jejak kebaikan",
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };

  createFinancial = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = createFinancialDonationSchema.parse(req.body);
      const donation = await this.donationService.createFinancialDonation(
        data,
        req.file,
        req.userId,
      );

      successResponse({
        res,
        statusCode: 201,
        message: "Transaksi donasi finansial berhasil dicatat",
        data: donation,
      });
    } catch (error) {
      next(error);
    }
  };

  webhook = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const payload = paymentWebhookSchema.parse(req.body);
      const donation = await this.donationService.processWebhook(payload);

      successResponse({
        res,
        message: "Status pembayaran donasi berhasil diperbarui",
        data: donation,
      });
    } catch (error) {
      next(error);
    }
  };

  getReceipt = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const receiptCode = req.params["receiptCode"] as string;
      const receipt = await this.donationService.getReceiptByCode(receiptCode);

      successResponse({
        res,
        message: "Berhasil mengambil kuitansi digital donasi",
        data: receipt,
      });
    } catch (error) {
      next(error);
    }
  };

  createBookDonation = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = createBookDonationSchema.parse(req.body);
      const batch = await this.donationService.createBookDonation(
        data,
        req.file,
        req.userId,
      );

      successResponse({
        res,
        statusCode: 201,
        message:
          "Pendataan donasi buku fisik berhasil dikirim dan menunggu kurasi relawan",
        data: batch,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllBookDonations = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = donationQuerySchema.parse(req.query);
      const { data, meta } =
        await this.donationService.getAllBookDonations(query);

      paginatedResponse({
        res,
        message: "Berhasil mengambil daftar donasi buku fisik",
        data,
        meta,
      });
    } catch (error) {
      next(error);
    }
  };

  verifyBookDonation = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const data = verifyBookDonationSchema.parse(req.body);
      const batch = await this.donationService.verifyBookDonation(
        id,
        req.userId as string,
        data,
      );

      successResponse({
        res,
        message: "Batch donasi buku fisik berhasil diverifikasi oleh relawan",
        data: batch,
      });
    } catch (error) {
      next(error);
    }
  };

  getPaymentSettings = async (
    _req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const settings = await this.donationService.getPaymentSetting();
      successResponse({
        res,
        message: "Berhasil mengambil pengaturan rekening & QRIS donasi",
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  };

  updatePaymentSettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {
        bankMandiri,
        bankMandiriName,
        bankBca,
        bankBcaName,
        qrisNmid,
        qrisImageUrl,
      } = req.body;

      const settings = await this.donationService.updatePaymentSetting(
        {
          bankMandiri,
          bankMandiriName,
          bankBca,
          bankBcaName,
          qrisNmid,
          qrisImageUrl,
        },
        req.file,
      );

      successResponse({
        res,
        message: "Pengaturan rekening dan QRIS donasi berhasil diperbarui",
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  };
}
