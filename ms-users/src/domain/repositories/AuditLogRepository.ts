export interface AuditLogRecord {
  userId: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogRepository {
  create(record: AuditLogRecord): Promise<void>;
}
