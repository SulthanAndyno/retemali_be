import { AppError } from "@/middlewares/error.middleware";
import {
  buildPaginationMeta,
  parsePagination,
} from "../../utils/pagination";
import { DonationRepository } from "./donation.repository";
import {
  CreateBookDonationInput,
  CreateFinancialDonationInput,
  DonationQueryInput,
  PaymentWebhookInput,
  VerifyBookDonationInput,
} from "./donation.validation";

export class DonationService {
  private readonly donationRepository: DonationRepository;

  constructor(donationRepository: DonationRepository) {
    this.donationRepository = donationRepository;
  }

  async getPublicSummary() {
    return this.donationRepository.getPublicSummary();
  }

  async createFinancialDonation(
    data: CreateFinancialDonationInput,
    file?: Express.Multer.File,
    userId?: string,
  ) {
    const proofPath = file ? `uploads/donations/${file.filename}` : undefined;
    return this.donationRepository.createFinancialDonation(
      data,
      proofPath,
      userId,
    );
  }

  async processWebhook(payload: PaymentWebhookInput) {
    return this.donationRepository.verifyFinancialWebhook(payload);
  }

  async getReceiptByCode(receiptCode: string) {
    const receipt =
      await this.donationRepository.findByReceiptCode(receiptCode);
    if (!receipt) {
      throw new AppError("Kuitansi donasi tidak ditemukan", 404);
    }
    return receipt;
  }

  async createBookDonation(
    data: CreateBookDonationInput,
    file?: Express.Multer.File,
    userId?: string,
  ) {
    const imagePath = file ? `uploads/donations/${file.filename}` : undefined;
    return this.donationRepository.createBookDonation(data, imagePath, userId);
  }

  async getAllBookDonations(query: DonationQueryInput) {
    const { skip, take, page, limit } = parsePagination(query);
    const { data, total } = await this.donationRepository.findAllBookDonations({
      skip,
      take,
      status: query.status,
    });

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async verifyBookDonation(
    id: string,
    curatedById: string,
    data: VerifyBookDonationInput,
  ) {
    return this.donationRepository.verifyBookDonation(id, curatedById, data);
  }

  async getPaymentSetting() {
    return this.donationRepository.getPaymentSetting();
  }

  async updatePaymentSetting(
    data: {
      bankMandiri?: string;
      bankMandiriName?: string;
      bankBca?: string;
      bankBcaName?: string;
      qrisNmid?: string;
      qrisImageUrl?: string;
    },
    file?: Express.Multer.File,
  ) {
    const qrisImageUrl = file
      ? `uploads/donations/${file.filename}`
      : data.qrisImageUrl;

    return this.donationRepository.updatePaymentSetting({
      ...data,
      ...(qrisImageUrl ? { qrisImageUrl } : {}),
    });
  }
}
