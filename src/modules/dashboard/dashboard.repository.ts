import { PrismaClient } from "../../../generated/prisma";

export class DashboardRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Data agregat untuk halaman Beranda Publik & Katalog Header.
   */
  async getPublicStats() {
    const [
      totalBooksAgg,
      totalMembers,
      popularBooks,
      featuredEvents,
      activeCampaign,
    ] = await this.prisma.$transaction([
      this.prisma.book.aggregate({
        _sum: {
          totalStock: true,
          availableStock: true,
        },
        _count: { id: true },
      }),
      this.prisma.user.count({
        where: { status: "ACTIVE" },
      }),
      this.prisma.book.findMany({
        take: 6,
        orderBy: { borrowCount: "desc" },
      }),
      this.prisma.communityEvent.findMany({
        where: { status: "PUBLISHED" },
        take: 4,
        orderBy: [{ isFeatured: "desc" }, { eventDate: "asc" }],
      }),
      this.prisma.donationCampaign.findFirst({
        where: { isActive: true },
      }),
    ]);

    const totalStock = totalBooksAgg._sum.totalStock ?? 0;
    const availableStock = totalBooksAgg._sum.availableStock ?? 0;

    return {
      communityInfo: {
        name: "Taman Baca Rete Mali",
        area: "RT 05 RW 14 Kelurahan Jatirangga",
        openDays: "Selasa - Minggu",
        openHours: "09:00 - 18:00 WIB",
      },
      metrics: {
        totalTitles: totalBooksAgg._count.id,
        totalUnits: totalStock,
        readyToBorrowUnits: availableStock,
        currentlyBorrowedUnits: Math.max(0, totalStock - availableStock),
        activeMembers: totalMembers,
      },
      popularBooks,
      featuredEvents,
      activeCampaign,
    };
  }

  /**
   * Data agregat untuk Portal Anggota (Dashboard Member).
   */
  async getMemberDashboard(userId: string) {
    const [
      user,
      activeLoans,
      returnedLoansCount,
      readyReservations,
      myTickets,
      recommendedBooks,
    ] = await this.prisma.$transaction([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          memberCode: true,
          name: true,
          email: true,
          phone: true,
          rtRw: true,
          avatar: true,
          role: true,
          status: true,
          points: true,
          readingTarget: true,
        },
      }),
      this.prisma.bookLoan.findMany({
        where: {
          userId,
          status: { in: ["BORROWED", "OVERDUE"] },
        },
        include: { book: true },
        orderBy: { dueDate: "asc" },
      }),
      this.prisma.bookLoan.count({
        where: { userId, status: "RETURNED" },
      }),
      this.prisma.bookReservation.findMany({
        where: { userId, status: "READY_FOR_PICKUP" },
        include: { book: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.eventRegistration.findMany({
        where: { userId, status: { in: ["REGISTERED", "CHECKED_IN"] } },
        include: { event: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.book.findMany({
        where: { status: "AVAILABLE" },
        take: 4,
        orderBy: { rating: "desc" },
      }),
    ]);

    const readingTarget = user?.readingTarget ?? 20;
    const targetProgressPercent = Math.min(
      100,
      Math.round((returnedLoansCount / readingTarget) * 100),
    );

    return {
      memberCard: user,
      activitySummary: {
        activeLoansCount: activeLoans.length,
        readyPickupCount: readyReservations.length,
        booksReadCount: returnedLoansCount,
        readingTarget,
        targetProgressPercent,
        registeredEventsCount: myTickets.length,
      },
      readyReservations,
      activeLoans,
      myTickets,
      recommendedBooks,
    };
  }

  /**
   * Data agregat untuk Meja Operasional Relawan (Dashboard Volunteer).
   */
  async getVolunteerDashboard(userId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      ongoingShifts,
      borrowedTodayCount,
      returnedTodayCount,
      overdueCount,
      activeEvent,
      pendingBookDonations,
    ] = await this.prisma.$transaction([
      this.prisma.volunteerShift.findMany({
        where: { approvalStatus: "ONGOING" },
        include: {
          user: {
            select: { id: true, name: true, memberCode: true, avatar: true },
          },
        },
        orderBy: { clockInAt: "asc" },
      }),
      this.prisma.bookLoan.count({
        where: { borrowedAt: { gte: startOfToday } },
      }),
      this.prisma.bookLoan.count({
        where: { returnedAt: { gte: startOfToday } },
      }),
      this.prisma.bookLoan.count({
        where: { status: "OVERDUE" },
      }),
      this.prisma.communityEvent.findFirst({
        where: { status: { in: ["PUBLISHED", "ONGOING"] } },
        include: {
          registrations: {
            select: { id: true, status: true },
          },
        },
        orderBy: { eventDate: "asc" },
      }),
      this.prisma.physicalBookDonation.findMany({
        where: { status: "PENDING_CURATION" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const myActiveShift =
      ongoingShifts.find((s) => s.userId === userId) ?? null;
    const checkedInCount =
      activeEvent?.registrations.filter((r) => r.status === "CHECKED_IN")
        .length ?? 0;

    return {
      activeShiftDesk: {
        myActiveShift,
        onDutyVolunteers: ongoingShifts,
      },
      todayMetrics: {
        borrowedToday: borrowedTodayCount,
        returnedToday: returnedTodayCount,
        overdueCount,
        checkedInTickets: checkedInCount,
        totalEventQuota: activeEvent?.quota ?? 0,
      },
      ongoingEventAttendance: activeEvent
        ? {
            id: activeEvent.id,
            title: activeEvent.title,
            startTime: activeEvent.startTime,
            endTime: activeEvent.endTime,
            checkedInCount,
            registeredCount: activeEvent.registeredCount,
            quota: activeEvent.quota,
          }
        : null,
      pendingBookDonations,
    };
  }

  /**
   * Data agregat untuk Konsol Administrator (Dashboard Admin).
   */
  async getAdminDashboard() {
    const [
      totalBooksAgg,
      activeMembersCount,
      totalLoansCount,
      overdueLoans,
      activeCampaign,
      pendingVolunteerApps,
      pendingShifts,
      approvedShiftsAgg,
      recentAuditLogs,
    ] = await this.prisma.$transaction([
      this.prisma.book.aggregate({
        _sum: { totalStock: true },
        _count: { id: true },
      }),
      this.prisma.user.count({ where: { status: "ACTIVE" } }),
      this.prisma.bookLoan.count(),
      this.prisma.bookLoan.findMany({
        where: { status: "OVERDUE" },
        include: {
          user: {
            select: { id: true, name: true, memberCode: true, phone: true },
          },
          book: true,
        },
        orderBy: { dueDate: "asc" },
      }),
      this.prisma.donationCampaign.findFirst({
        where: { isActive: true },
      }),
      this.prisma.volunteerApplication.findMany({
        where: { status: "PENDING" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              memberCode: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.volunteerShift.findMany({
        where: { approvalStatus: "PENDING_APPROVAL" },
        include: {
          user: { select: { id: true, name: true, memberCode: true } },
        },
        orderBy: { clockInAt: "desc" },
      }),
      this.prisma.volunteerShift.aggregate({
        where: { approvalStatus: "APPROVED" },
        _sum: { durationHours: true },
      }),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const onTimeRate =
      totalLoansCount > 0
        ? Number(
            (
              ((totalLoansCount - overdueLoans.length) / totalLoansCount) *
              100
            ).toFixed(1),
          )
        : 100;

    const totalApprovedHours = Number(
      approvedShiftsAgg._sum.durationHours ?? 0,
    );
    const weeklyTargetHours = 24;

    return {
      kpiCards: {
        totalBookUnits: totalBooksAgg._sum.totalStock ?? 0,
        totalBookTitles: totalBooksAgg._count.id,
        activeMembersCount,
        totalCirculationLoans: totalLoansCount,
        onTimeReturnPercentage: onTimeRate,
        collectedDonationAmount: Number(activeCampaign?.collectedAmount ?? 0),
        targetDonationAmount: Number(activeCampaign?.targetAmount ?? 30000000),
      },
      overdueCirculationAlerts: overdueLoans,
      pendingVolunteerApplications: pendingVolunteerApps,
      shiftHoursVerification: {
        completedHoursThisWeek: totalApprovedHours,
        weeklyTargetHours,
        fulfillmentPercentage: Math.min(
          100,
          Math.round((totalApprovedHours / weeklyTargetHours) * 100),
        ),
        pendingShifts,
      },
      systemAuditLogs: recentAuditLogs,
    };
  }
}
