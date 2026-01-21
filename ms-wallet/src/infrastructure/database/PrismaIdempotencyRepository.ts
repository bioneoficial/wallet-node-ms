import { PrismaClient, Prisma } from '@prisma/client';
import {
  IdempotencyRepository,
  IdempotencyRecord,
} from '../../domain/repositories/IdempotencyRepository.js';

export class PrismaIdempotencyRepository implements IdempotencyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByKey(scope: string, key: string): Promise<IdempotencyRecord | null> {
    const record = await this.prisma.idempotencyKey.findUnique({
      where: {
        scope_key: {
          scope,
          key,
        },
      },
    });

    return record ? this.mapToRecord(record) : null;
  }

  async create(input: { key: string; scope: string; requestHash: string }): Promise<IdempotencyRecord> {
    try {
      const record = await this.prisma.idempotencyKey.create({
        data: {
          key: input.key,
          scope: input.scope,
          requestHash: input.requestHash,
        },
      });

      return this.mapToRecord(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new Error('Idempotency key in progress');
      }

      throw error;
    }
  }

  async updateResponse(id: string, statusCode: number, responseBody: unknown | null): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { id },
      data: {
        statusCode,
        responseBody,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.idempotencyKey.delete({
      where: { id },
    });
  }

  private mapToRecord(record: {
    id: string;
    key: string;
    scope: string;
    requestHash: string;
    statusCode: number | null;
    responseBody: unknown | null;
  }): IdempotencyRecord {
    return {
      id: record.id,
      key: record.key,
      scope: record.scope,
      requestHash: record.requestHash,
      statusCode: record.statusCode,
      responseBody: record.responseBody,
    };
  }
}
