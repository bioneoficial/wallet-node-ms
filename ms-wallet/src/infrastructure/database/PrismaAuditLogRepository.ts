import { PrismaClient } from '@prisma/client';
import { AuditLogRecord, AuditLogRepository } from '../../domain/repositories/AuditLogRepository.js';

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: AuditLogRecord): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: record.userId,
        action: record.action,
        resource: record.resource,
        metadata: record.metadata ?? null,
        ipAddress: record.ipAddress ?? null,
        userAgent: record.userAgent ?? null,
      },
    });
  }
}
