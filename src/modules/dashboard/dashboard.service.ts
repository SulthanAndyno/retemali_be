import { DashboardRepository } from "./dashboard.repository";

export class DashboardService {
  private readonly dashboardRepository: DashboardRepository;

  constructor(dashboardRepository: DashboardRepository) {
    this.dashboardRepository = dashboardRepository;
  }

  async getPublicStats() {
    return this.dashboardRepository.getPublicStats();
  }

  async getMemberDashboard(userId: string) {
    return this.dashboardRepository.getMemberDashboard(userId);
  }

  async getVolunteerDashboard(userId: string) {
    return this.dashboardRepository.getVolunteerDashboard(userId);
  }

  async getAdminDashboard() {
    return this.dashboardRepository.getAdminDashboard();
  }
}
