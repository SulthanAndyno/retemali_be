import {
  buildPaginationMeta,
  parsePagination,
} from "../../utils/pagination";
import { VolunteerRepository } from "./volunteer.repository";
import {
  ApplyVolunteerInput,
  ClockInInput,
  ClockOutInput,
  ReviewApplicationInput,
  VolunteerQueryInput,
} from "./volunteer.validation";

export class VolunteerService {
  private readonly volunteerRepository: VolunteerRepository;

  constructor(volunteerRepository: VolunteerRepository) {
    this.volunteerRepository = volunteerRepository;
  }

  async applyVolunteer(
    userId: string,
    data: ApplyVolunteerInput,
    file?: Express.Multer.File,
  ) {
    const cvPath = file ? `uploads/volunteers/${file.filename}` : undefined;
    return this.volunteerRepository.createApplication(userId, data, cvPath);
  }

  async getAllApplications(query: VolunteerQueryInput) {
    const { skip, take, page, limit } = parsePagination(query);
    const { data, total } = await this.volunteerRepository.findAllApplications({
      skip,
      take,
      status: query.status,
    });

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async reviewApplication(
    id: string,
    adminId: string,
    data: ReviewApplicationInput,
  ) {
    return this.volunteerRepository.reviewApplication(id, adminId, data);
  }

  async clockIn(userId: string, data: ClockInInput) {
    return this.volunteerRepository.clockIn(userId, data);
  }

  async clockOut(userId: string, data: ClockOutInput) {
    return this.volunteerRepository.clockOut(userId, data);
  }

  async getAllShifts(query: VolunteerQueryInput) {
    const { skip, take, page, limit } = parsePagination(query);
    const { data, total } = await this.volunteerRepository.findAllShifts({
      skip,
      take,
      status: query.status,
    });

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async approveShift(id: string, adminId: string) {
    return this.volunteerRepository.approveShift(id, adminId);
  }

  async approveAllShifts(adminId: string) {
    return this.volunteerRepository.approveAllPendingShifts(adminId);
  }
}
