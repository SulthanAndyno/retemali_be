import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { User } from "../../../generated/prisma";
import { AuthRepository } from "./auth.repository";
import {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "./auth.validation";
import { AppError } from "@/middlewares/error.middleware";

const SALT_ROUNDS = 12;
const JWT_EXPIRES = "7d";

export type SafeUser = Omit<User, "password"> & {
  literacyBadge: string;
};

interface AuthResult {
  token: string;
  user: SafeUser;
}

const getLiteracyBadge = (points: number): string => {
  if (points >= 500) return "Duta Literasi Warga";
  if (points >= 250) return "Tingkat Penjelajah";
  if (points >= 100) return "Pembaca Aktif";
  return "Pembaca Pemula";
};

const toSafeUser = (user: User): SafeUser => {
  const { password: _password, ...rest } = user;
  return {
    ...rest,
    literacyBadge: getLiteracyBadge(user.points),
  };
};

export class AuthService {
  private readonly authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  private deleteAvatarFile(avatarPath: string): void {
    const fullPath = path.join(process.cwd(), avatarPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  /**
   * Registrasi anggota perpustakaan baru dan otomatis menerbitkan Kartu Anggota Digital.
   */
  async register(data: RegisterInput): Promise<AuthResult> {
    const existing = await this.authRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError("Email sudah terdaftar", 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await this.authRepository.createMember(data, hashedPassword);

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: JWT_EXPIRES },
    );

    return { token, user: toSafeUser(user) };
  }

  /**
   * Memproses login pengguna (Member / Volunter / Admin).
   */
  async login(data: LoginInput): Promise<AuthResult> {
    const user: User | null = await this.authRepository.findByEmail(data.email);

    const dummyHash = "$2b$12$dummyhashfortimingattackprevention123456789012";
    const passwordToCheck = user?.password ?? dummyHash;

    const isPasswordValid: boolean = await bcrypt.compare(
      data.password,
      passwordToCheck,
    );

    if (!user || !isPasswordValid) {
      throw new AppError("Email atau password salah", 401);
    }

    if (user.status === "SUSPENDED") {
      throw new AppError("Akun Anda sedang dinonaktifkan sementara", 403);
    }

    const token: string = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: JWT_EXPIRES },
    );

    return { token, user: toSafeUser(user) };
  }

  /**
   * Mengambil profil pengguna yang sedang login.
   */
  async getProfile(userId: string): Promise<SafeUser> {
    const user: User | null = await this.authRepository.findById(userId);

    if (!user) {
      throw new AppError("User tidak ditemukan", 404);
    }

    return toSafeUser(user);
  }

  /**
   * Mengupdate profil pengguna.
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileInput,
    file?: Express.Multer.File,
  ): Promise<SafeUser> {
    const user: User | null = await this.authRepository.findById(userId);

    if (!user) {
      throw new AppError("User tidak ditemukan", 404);
    }

    if (data.email && data.email !== user.email) {
      const emailTaken = await this.authRepository.findByEmailExcludeId(
        data.email,
        userId,
      );
      if (emailTaken) {
        throw new AppError("Email sudah digunakan oleh pengguna lain", 409);
      }
    }

    let avatarPath: string | undefined;
    if (file) {
      if (user.avatar) {
        this.deleteAvatarFile(user.avatar);
      }
      avatarPath = `uploads/avatars/${file.filename}`;
    }

    const updated = await this.authRepository.updateProfile(
      userId,
      data,
      avatarPath,
    );
    return toSafeUser(updated);
  }

  /**
   * Mengganti password pengguna.
   */
  async changePassword(
    userId: string,
    data: ChangePasswordInput,
  ): Promise<void> {
    const user: User | null = await this.authRepository.findById(userId);

    if (!user) {
      throw new AppError("User tidak ditemukan", 404);
    }

    const isCurrentPasswordValid: boolean = await bcrypt.compare(
      data.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new AppError("Password saat ini salah", 401);
    }

    const hashedPassword: string = await bcrypt.hash(
      data.newPassword,
      SALT_ROUNDS,
    );

    await this.authRepository.updatePassword(userId, hashedPassword);
  }
}
