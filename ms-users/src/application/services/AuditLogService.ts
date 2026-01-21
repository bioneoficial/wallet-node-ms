import { AuditLogRepository, AuditLogRecord } from '../../domain/repositories/AuditLogRepository.js';

export class AuditLogService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async log(record: AuditLogRecord): Promise<void> {
    try {
      await this.auditLogRepository.create(record);
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  async logUserCreated(userId: string, metadata?: Record<string, unknown>, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'USER_CREATED',
      resource: 'users',
      metadata,
      ipAddress,
      userAgent,
    });
  }

  async logUserUpdated(userId: string, metadata?: Record<string, unknown>, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'USER_UPDATED',
      resource: 'users',
      metadata,
      ipAddress,
      userAgent,
    });
  }

  async logUserDeleted(userId: string, metadata?: Record<string, unknown>, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'USER_DELETED',
      resource: 'users',
      metadata,
      ipAddress,
      userAgent,
    });
  }
}
