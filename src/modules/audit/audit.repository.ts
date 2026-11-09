import { AuditLog, PrismaClient } from "../../../generated/prisma";

interface FindAllAuditOptions {
  skip: number;
  take: number;
  category?: string;
}

export class AuditRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(
    options: FindAllAuditOptions,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const { skip, take, category } = options;

    const where: Record<string, unknown> = {
      ...(category && { category }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: {
          actor: {
            select: {
              id: true,
              memberCode: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }
}
