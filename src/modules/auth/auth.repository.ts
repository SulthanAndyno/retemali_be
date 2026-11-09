import { PrismaClient, User } from "../../../generated/prisma";
import { RegisterInput, UpdateProfileInput } from "./auth.validation";

export class AuthRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Membuat kode anggota unik (Kartu Anggota Digital).
   * Format: RM-{YEAR}-{4 digit urut}, contoh: RM-2026-0089
   */
  private async generateMemberCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.user.count();
    const sequence = String(count + 1).padStart(4, "0");
    return `RM-${year}-${sequence}`;
  }

  /**
   * Mencari user berdasarkan email.
   *
   * @param email - Alamat email user
   * @returns User yang ditemukan atau null
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Mencari user berdasarkan ID.
   *
   * @param id - ID user (cuid)
   * @returns User yang ditemukan atau null
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Mengecek apakah email sudah digunakan oleh user lain.
   *
   * @param email - Email yang ingin dicek
   * @param excludeId - ID user yang dikecualikan
   * @returns User yang memiliki email tersebut atau null
   */
  async findByEmailExcludeId(
    email: string,
    excludeId: string,
  ): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Membuat user / anggota perpustakaan baru.
   *
   * @param data - Data registrasi
   * @param hashedPassword - Password yang sudah di-hash
   * @returns User yang baru dibuat
   */
  async createMember(
    data: RegisterInput,
    hashedPassword: string,
  ): Promise<User> {
    const memberCode = await this.generateMemberCode();

    return this.prisma.user.create({
      data: {
        memberCode,
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone ?? null,
        rtRw: data.rtRw ?? "RT05/RW14",
      },
    });
  }

  /**
   * Mengupdate profil user.
   *
   * @param id - ID user
   * @param data - Data profil yang diupdate
   * @param avatarPath - Path foto profil baru (opsional)
   * @returns User yang telah diupdate
   */
  async updateProfile(
    id: string,
    data: UpdateProfileInput,
    avatarPath?: string,
  ): Promise<User> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.rtRw !== undefined) updateData.rtRw = data.rtRw;
    if (data.readingTarget !== undefined)
      updateData.readingTarget = data.readingTarget;
    if (avatarPath !== undefined) updateData.avatar = avatarPath;

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Mengupdate password user.
   *
   * @param id - ID user
   * @param hashedPassword - Password baru yang sudah di-hash
   * @returns User yang telah diupdate
   */
  async updatePassword(id: string, hashedPassword: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }
}
