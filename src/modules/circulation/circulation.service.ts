import { BookLoan, BookReservation } from "../../../generated/prisma";
import {
  buildPaginationMeta,
  parsePagination,
  PaginationMeta,
} from "../../utils/pagination";
import { CirculationRepository } from "./circulation.repository";
import {
  CreateReservationInput,
  LoanQueryInput,
  LoanStatus,
  QuickCheckoutInput,
  QuickReturnInput,
} from "./circulation.validation";

export class CirculationService {
  private readonly circulationRepository: CirculationRepository;

  constructor(circulationRepository: CirculationRepository) {
    this.circulationRepository = circulationRepository;
  }

  async createReservation(
    userId: string,
    data: CreateReservationInput,
  ): Promise<BookReservation> {
    return this.circulationRepository.createReservation(userId, data);
  }

  async getMyReservations(userId: string): Promise<BookReservation[]> {
    return this.circulationRepository.findReservationsByUser(userId);
  }

  async cancelReservation(id: string): Promise<BookReservation> {
    return this.circulationRepository.cancelReservation(id);
  }

  async quickCheckout(
    processedById: string,
    data: QuickCheckoutInput,
  ): Promise<BookLoan> {
    return this.circulationRepository.quickCheckout(processedById, data);
  }

  async quickReturn(
    returnedById: string,
    data: QuickReturnInput,
  ): Promise<BookLoan> {
    return this.circulationRepository.quickReturn(returnedById, data);
  }

  async getAllLoans(
    query: LoanQueryInput,
  ): Promise<{ data: BookLoan[]; meta: PaginationMeta }> {
    const { skip, take, page, limit } = parsePagination(query);
    const { data, total } = await this.circulationRepository.findAllLoans({
      skip,
      take,
      status: query.status,
      search: query.search,
    });

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getMyLoans(
    userId: string,
    status?: LoanStatus,
  ): Promise<BookLoan[]> {
    return this.circulationRepository.findLoansByUser(userId, status);
  }

  async extendLoan(id: string, userId: string): Promise<BookLoan> {
    return this.circulationRepository.extendLoan(id, userId);
  }

  async markLoanAsLost(id: string): Promise<BookLoan> {
    return this.circulationRepository.markAsLost(id);
  }

  async sendWhatsappReminder(id: string) {
    return this.circulationRepository.recordWhatsappReminder(id);
  }

  async runCronDueReminders() {
    return this.circulationRepository.processCronReminders();
  }
}
