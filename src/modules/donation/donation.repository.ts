import { AppError } from "@/middlewares/error.middleware";
import {
  FinancialDonation,
  PhysicalBookDonation,
  PrismaClient,
} from "../../../generated/prisma";
import {
  CreateBookDonationInput,
  CreateFinancialDonationInput,
  PaymentWebhookInput,
  VerifyBookDonationInput,
} from "./donation.validation";

export class DonationRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private async generateReceiptCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.financialDonation.count();
    const seq = String(count + 1).padStart(4, "0");
    return `INV-RM-${year}-${seq}`;
  }

  private async generateBatchCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.physicalBookDonation.count();
    const seq = String(count + 1).padStart(4, "0");
    return `BDN-${year}-${seq}`;
  }

  /**
   * Mengambil ringkasan kampanye donasi kuartal aktif beserta Live Feed Jejak Kebaikan Donatur.
   */
  async getPublicSummary() {
    const activeCampaign = await this.prisma.donationCampaign.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    const recentFinancial = await this.prisma.financialDonation.findMany({
      where: { paymentStatus: "VERIFIED" },
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    const recentBooks = await this.prisma.physicalBookDonation.findMany({
      where: { status: "ACCEPTED" },
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    const sahabatLiterasiCount = await this.prisma.financialDonation.count({
      where: { isRecurring: true, paymentStatus: "VERIFIED" },
    });

    return {
      campaign: activeCampaign,
      sahabatLiterasiMembers: sahabatLiterasiCount,
      recentFinancialDonations: recentFinancial,
      recentBookDonations: recentBooks,
    };
  }

  /**
   * Membuat transaksi Donasi Finansial baru.
   */
  async createFinancialDonation(
    data: CreateFinancialDonationInput,
    proofImagePath?: string,
    userId?: string,
  ): Promise<FinancialDonation> {
    const receiptCode = await this.generateReceiptCode();
    const activeCampaign = await this.prisma.donationCampaign.findFirst({
      where: { isActive: true },
    });

    const finalDonorName =
      data.isAnonymous || !data.donorName ? "Hamba Allah" : data.donorName;

    // Untuk QRIS instan di lingkungan demo/komunitas, langsung VERIFIED & update campaign
    const isInstantVerified = data.paymentMethod === "QRIS";

    return this.prisma.$transaction(async (tx) => {
      if (isInstantVerified && activeCampaign) {
        await tx.donationCampaign.update({
          where: { id: activeCampaign.id },
          data: {
            collectedAmount: { increment: data.amount },
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: userId ?? null,
            title: "Rekonsiliasi Donasi QRIS Berhasil",
            description: `Pemasukan Rp${data.amount.toLocaleString("id-ID")} dari ${finalDonorName} (${data.purposeLabel}) disinkronkan ke kas operasional.`,
            category: "DONATION",
          },
        });
      }

      return tx.financialDonation.create({
        data: {
          receiptCode,
          campaignId: activeCampaign?.id ?? null,
          userId: userId ?? null,
          donorName: finalDonorName,
          donorEmail: data.donorEmail ?? null,
          isAnonymous: data.isAnonymous ?? false,
          amount: data.amount,
          purposeLabel: data.purposeLabel,
          paymentMethod: data.paymentMethod,
          isRecurring: data.isRecurring ?? false,
          proofImage: proofImagePath ?? null,
          paymentStatus: isInstantVerified ? "VERIFIED" : "PENDING",
          verifiedAt: isInstantVerified ? new Date() : null,
        },
      });
    });
  }

  /**
   * Memproses webhook pembayaran / verifikasi donasi finansial.
   */
  async verifyFinancialWebhook(
    payload: PaymentWebhookInput,
  ): Promise<FinancialDonation> {
    const donation = await this.prisma.financialDonation.findUnique({
      where: { receiptCode: payload.receiptCode },
    });

    if (!donation) {
      throw new AppError("Transaksi donasi tidak ditemukan", 404);
    }

    if (donation.paymentStatus === "VERIFIED") {
      return donation;
    }

    return this.prisma.$transaction(async (tx) => {
      if (payload.status === "VERIFIED" && donation.campaignId) {
        await tx.donationCampaign.update({
          where: { id: donation.campaignId },
          data: {
            collectedAmount: { increment: donation.amount },
          },
        });
      }

      return tx.financialDonation.update({
        where: { id: donation.id },
        data: {
          paymentStatus: payload.status,
          verifiedAt: payload.status === "VERIFIED" ? new Date() : null,
        },
      });
    });
  }

  /**
   * Mengambil kuitansi digital berdasarkan receiptCode.
   */
  async findByReceiptCode(
    receiptCode: string,
  ): Promise<FinancialDonation | null> {
    return this.prisma.financialDonation.findUnique({
      where: { receiptCode },
      include: { campaign: true },
    });
  }

  /**
   * Mengambil daftar transaksi donasi finansial (read-only) untuk Laporan Kas.
   */
  async findAllFinancialDonations(options: {
    skip: number;
    take: number;
    status?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: Record<string, unknown> = {
      ...(options.status && { paymentStatus: options.status }),
      ...((options.from || options.to) && {
        createdAt: {
          ...(options.from ? { gte: options.from } : {}),
          ...(options.to ? { lte: options.to } : {}),
        },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.financialDonation.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.financialDonation.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Membuat penyerahan Donasi Buku Fisik baru.
   */
  async createBookDonation(
    data: CreateBookDonationInput,
    conditionImagePath?: string,
    userId?: string,
  ): Promise<PhysicalBookDonation> {
    const batchCode = await this.generateBatchCode();

    return this.prisma.physicalBookDonation.create({
      data: {
        batchCode,
        userId: userId ?? null,
        donorName: data.isAnonymous ? "Titipan Drop-box" : data.donorName,
        donorBadge:
          data.donorBadge ?? (data.isAnonymous ? "Anonim" : "Warga RW 14"),
        isAnonymous: data.isAnonymous ?? false,
        packageTitle: data.packageTitle,
        totalBooks: data.totalBooks,
        conditionNote: data.conditionNote,
        conditionImage: conditionImagePath ?? null,
        deliveryMethod: data.deliveryMethod,
        status: "PENDING_CURATION",
      },
    });
  }

  /**
   * Mengambil daftar batch donasi buku fisik.
   */
  async findAllBookDonations(options: {
    skip: number;
    take: number;
    status?: string;
  }): Promise<{ data: PhysicalBookDonation[]; total: number }> {
    const { skip, take, status } = options;
    const where: Record<string, unknown> = {
      ...(status && { status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.physicalBookDonation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.physicalBookDonation.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Memverifikasi / menerima batch donasi buku fisik di Meja Operasional Relawan.
   */
  async verifyBookDonation(
    id: string,
    curatedById: string,
    data: VerifyBookDonationInput,
  ): Promise<PhysicalBookDonation> {
    const batch = await this.prisma.physicalBookDonation.findUnique({
      where: { id },
    });

    if (!batch) {
      throw new AppError("Batch donasi buku fisik tidak ditemukan", 404);
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.status === "ACCEPTED") {
        await tx.auditLog.create({
          data: {
            actorId: curatedById,
            title: `Inventarisasi Donasi Buku (${batch.batchCode})`,
            description: `Relawan menerima ${batch.totalBooks} buku dari paket "${batch.packageTitle}" (${batch.donorName}).`,
            category: "INVENTORY",
          },
        });
      }

      return tx.physicalBookDonation.update({
        where: { id },
        data: {
          status: data.status,
          curatedById,
          curatedAt: new Date(),
          curationNote: data.curationNote ?? null,
        },
      });
    });
  }

  async getPaymentSetting() {
    let setting = await this.prisma.paymentSetting.findUnique({
      where: { id: "default" },
    });
    if (!setting) {
      setting = await this.prisma.paymentSetting.create({
        data: {
          id: "default",
          bankMandiri: "1234567890",
          bankMandiriName: "Yayasan Taman Baca Rete Mali",
          bankBca: "0987654321",
          bankBcaName: "Yayasan Taman Baca Rete Mali",
          qrisNmid: "ID1024389271649",
        },
      });
    }
    return setting;
  }

  async updatePaymentSetting(data: {
    bankMandiri?: string;
    bankMandiriName?: string;
    bankBca?: string;
    bankBcaName?: string;
    qrisImageUrl?: string;
    qrisNmid?: string;
  }) {
    return this.prisma.paymentSetting.upsert({
      where: { id: "default" },
      update: data,
      create: {
        id: "default",
        bankMandiri: data.bankMandiri ?? "1234567890",
        bankMandiriName: data.bankMandiriName ?? "Yayasan Taman Baca Rete Mali",
        bankBca: data.bankBca ?? "0987654321",
        bankBcaName: data.bankBcaName ?? "Yayasan Taman Baca Rete Mali",
        qrisImageUrl: data.qrisImageUrl,
        qrisNmid: data.qrisNmid ?? "ID1024389271649",
      },
    });
  }

  /**
   * Kanal pembayaran donasi yang bisa diaktifkan/dinonaktifkan satu per satu.
   * Data lama (PaymentSetting) dipakai sebagai nilai awal saat tabel masih kosong.
   */
  private async ensureDefaultPaymentAccounts(): Promise<void> {
    const total = await this.prisma.paymentAccount.count();
    if (total > 0) return;

    const legacy = await this.prisma.paymentSetting.findUnique({
      where: { id: "default" },
    });

    await this.prisma.paymentAccount.createMany({
      data: [
        {
          type: "QRIS",
          providerName: "QRIS Statis",
          accountName: legacy?.bankMandiriName ?? "Yayasan Taman Baca Rete Mali",
          qrisImageUrl: legacy?.qrisImageUrl ?? null,
          qrisNmid: legacy?.qrisNmid ?? "ID1024389271649",
          isActive: true,
          sortOrder: 0,
        },
        {
          type: "BANK_TRANSFER",
          providerName: "Bank Mandiri",
          accountNumber: legacy?.bankMandiri ?? "1234567890",
          accountName: legacy?.bankMandiriName ?? "Yayasan Taman Baca Rete Mali",
          isActive: true,
          sortOrder: 1,
        },
        {
          type: "BANK_TRANSFER",
          providerName: "Bank BCA",
          accountNumber: legacy?.bankBca ?? "0987654321",
          accountName: legacy?.bankBcaName ?? "Yayasan Taman Baca Rete Mali",
          isActive: true,
          sortOrder: 2,
        },
      ],
    });
  }

  async findAllPaymentAccounts(activeOnly: boolean) {
    await this.ensureDefaultPaymentAccounts();

    return this.prisma.paymentAccount.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async findPaymentAccountById(id: string) {
    const account = await this.prisma.paymentAccount.findUnique({ where: { id } });
    if (!account) {
      throw new AppError("Kanal pembayaran tidak ditemukan", 404);
    }
    return account;
  }

  async createPaymentAccount(
    data: {
      type: "QRIS" | "BANK_TRANSFER";
      providerName: string;
      accountNumber?: string;
      accountName?: string;
      qrisNmid?: string;
      isActive?: boolean;
      sortOrder?: number;
    },
    qrisImageUrl?: string,
  ) {
    return this.prisma.paymentAccount.create({
      data: {
        type: data.type,
        providerName: data.providerName,
        accountNumber: data.accountNumber ?? null,
        accountName: data.accountName ?? null,
        qrisImageUrl: qrisImageUrl ?? null,
        qrisNmid: data.type === "QRIS" ? (data.qrisNmid ?? null) : null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 99,
      },
    });
  }

  async updatePaymentAccount(
    id: string,
    data: {
      type?: "QRIS" | "BANK_TRANSFER";
      providerName?: string;
      accountNumber?: string;
      accountName?: string;
      qrisNmid?: string;
      isActive?: boolean;
      sortOrder?: number;
    },
    qrisImageUrl?: string,
  ) {
    await this.findPaymentAccountById(id);

    const updateData: Record<string, unknown> = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.providerName !== undefined) updateData.providerName = data.providerName;
    if (data.accountNumber !== undefined) updateData.accountNumber = data.accountNumber;
    if (data.accountName !== undefined) updateData.accountName = data.accountName;
    if (data.qrisNmid !== undefined) updateData.qrisNmid = data.qrisNmid;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (qrisImageUrl !== undefined) updateData.qrisImageUrl = qrisImageUrl;

    return this.prisma.paymentAccount.update({
      where: { id },
      data: updateData,
    });
  }

  async deletePaymentAccount(id: string) {
    await this.findPaymentAccountById(id);
    return this.prisma.paymentAccount.delete({ where: { id } });
  }
}
