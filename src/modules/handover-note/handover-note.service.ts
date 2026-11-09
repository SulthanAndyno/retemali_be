import {
  buildPaginationMeta,
  parsePagination,
} from "../../utils/pagination";
import { HandoverNoteRepository } from "./handover-note.repository";
import {
  CreateHandoverNoteInput,
  HandoverNoteQueryInput,
} from "./handover-note.validation";

export class HandoverNoteService {
  private readonly handoverNoteRepository: HandoverNoteRepository;

  constructor(handoverNoteRepository: HandoverNoteRepository) {
    this.handoverNoteRepository = handoverNoteRepository;
  }

  async getAllNotes(query: HandoverNoteQueryInput) {
    const { skip, take, page, limit } = parsePagination(query);
    const { data, total } = await this.handoverNoteRepository.findAll({
      skip,
      take,
      shiftType: query.shiftType,
    });

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createNote(userId: string, data: CreateHandoverNoteInput) {
    return this.handoverNoteRepository.create(userId, data);
  }

  async deleteNote(id: string): Promise<void> {
    await this.handoverNoteRepository.delete(id);
  }
}
