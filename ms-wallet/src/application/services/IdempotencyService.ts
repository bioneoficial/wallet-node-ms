import crypto from 'crypto';
import { IdempotencyRepository } from '../../domain/repositories/IdempotencyRepository.js';

export interface IdempotencyHandlerResult<T> {
  statusCode: number;
  responseBody: T;
}

export interface IdempotencyResult<T> {
  statusCode: number;
  responseBody: T;
  replayed: boolean;
}

export class IdempotencyService {
  constructor(private readonly repository: IdempotencyRepository) {}

  async execute<T>(params: {
    key: string;
    scope: string;
    requestHash: string;
    handler: () => Promise<IdempotencyHandlerResult<T>>;
  }): Promise<IdempotencyResult<T>> {
    const { key, scope, requestHash, handler } = params;

    if (!key) {
      throw new Error('Idempotency key is required');
    }

    const existing = await this.repository.findByKey(scope, key);

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new Error('Idempotency key conflict');
      }

      if (existing.statusCode !== null) {
        return {
          statusCode: existing.statusCode,
          responseBody: existing.responseBody as T,
          replayed: true,
        };
      }

      throw new Error('Idempotency key in progress');
    }

    const record = await this.repository.create({ key, scope, requestHash });

    try {
      const result = await handler();
      const responseBody = result.responseBody ?? null;

      await this.repository.updateResponse(record.id, result.statusCode, responseBody);

      return {
        statusCode: result.statusCode,
        responseBody: result.responseBody,
        replayed: false,
      };
    } catch (error) {
      await this.repository.delete(record.id);
      throw error;
    }
  }

  createRequestHash(payload: unknown): string {
    const normalized = this.stableStringify(payload);
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.stableStringify(entry)).join(',')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, entry]) => `"${key}":${this.stableStringify(entry)}`)
      .join(',');

    return `{${entries}}`;
  }
}
