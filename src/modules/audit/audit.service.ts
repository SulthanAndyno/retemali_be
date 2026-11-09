import {
  buildPaginationMeta,
  parsePagination,
} from "../../utils/pagination";
import { AuditRepository } from "./audit.repository";
import { AuditQueryInput } from "./audit.validation";

export class AuditService {
  private readonly auditRepository: AuditRepository;

  constructor(auditRepository: AuditRepository) {
    this.auditRepository = auditRepository;
  }

  async getAllAuditLogs(query: AuditQueryInput) {
    const { skip, take, page, limit } = parsePagination(query);
    const { data, total } = await this.auditRepository.findAll({
      skip,
      take,
      category: query.category,
    });

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}
