import { NextFunction, Response } from "express";
import { paginatedResponse, successResponse } from "../../utils/response";
import { HandoverNoteService } from "./handover-note.service";
import {
  createHandoverNoteSchema,
  handoverNoteQuerySchema,
} from "./handover-note.validation";
import { AuthRequest } from "@/middlewares/auth.middleware";

export class HandoverNoteController {
  private readonly handoverNoteService: HandoverNoteService;

  constructor(handoverNoteService: HandoverNoteService) {
    this.handoverNoteService = handoverNoteService;
  }

  /**
   * Mengambil daftar catatan kendala & logistik piket.
   */
  getAll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = handoverNoteQuerySchema.parse(req.query);
      const { data, meta } = await this.handoverNoteService.getAllNotes(query);

      paginatedResponse({
        res,
        message: "Berhasil mengambil daftar catatan kendala & logistik piket",
        data,
        meta,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Menyimpan catatan kendala & logistik piket baru.
   */
  create = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = createHandoverNoteSchema.parse(req.body);
      const note = await this.handoverNoteService.createNote(
        req.userId as string,
        data,
      );

      successResponse({
        res,
        statusCode: 201,
        message: "Catatan kendala & logistik piket berhasil disimpan",
        data: note,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Menghapus catatan kendala & logistik piket berdasarkan ID.
   */
  delete = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      await this.handoverNoteService.deleteNote(id);

      successResponse({
        res,
        message: "Catatan piket berhasil dihapus",
      });
    } catch (error) {
      next(error);
    }
  };
}
