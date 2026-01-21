import { IdempotencyService } from '../../src/application/services/IdempotencyService.js';
import {
  IdempotencyRepository,
  IdempotencyRecord,
} from '../../src/domain/repositories/IdempotencyRepository.js';

type RecordKey = string;

class InMemoryIdempotencyRepository implements IdempotencyRepository {
  private records = new Map<RecordKey, IdempotencyRecord>();
  private counter = 0;

  async findByKey(scope: string, key: string): Promise<IdempotencyRecord | null> {
    return this.records.get(this.key(scope, key)) ?? null;
  }

  async create(input: { key: string; scope: string; requestHash: string }): Promise<IdempotencyRecord> {
    const recordKey = this.key(input.scope, input.key);
    if (this.records.has(recordKey)) {
      throw new Error('Idempotency key in progress');
    }

    const record: IdempotencyRecord = {
      id: `record-${++this.counter}`,
      key: input.key,
      scope: input.scope,
      requestHash: input.requestHash,
      statusCode: null,
      responseBody: null,
    };

    this.records.set(recordKey, record);
    return record;
  }

  async updateResponse(id: string, statusCode: number, responseBody: unknown | null): Promise<void> {
    const record = Array.from(this.records.values()).find((entry) => entry.id === id);
    if (!record) return;

    this.records.set(this.key(record.scope, record.key), {
      ...record,
      statusCode,
      responseBody,
    });
  }

  async delete(id: string): Promise<void> {
    for (const [recordKey, record] of this.records.entries()) {
      if (record.id === id) {
        this.records.delete(recordKey);
        return;
      }
    }
  }

  private key(scope: string, key: string): string {
    return `${scope}:${key}`;
  }
}

describe('IdempotencyService', () => {
  it('returns stored response for repeated requests', async () => {
    const repository = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repository);

    const handler = jest.fn(async () => ({
      statusCode: 201,
      responseBody: { id: 'user-1' },
    }));

    const result = await service.execute({
      key: 'key-1',
      scope: 'users:create:test@example.com',
      requestHash: 'hash-1',
      handler,
    });

    const replay = await service.execute({
      key: 'key-1',
      scope: 'users:create:test@example.com',
      requestHash: 'hash-1',
      handler,
    });

    expect(result.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.statusCode).toBe(201);
    expect(replay.responseBody).toEqual({ id: 'user-1' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('throws when idempotency key is missing', async () => {
    const repository = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repository);

    await expect(
      service.execute({
        key: '',
        scope: 'users:create:test@example.com',
        requestHash: 'hash-1',
        handler: async () => ({ statusCode: 201, responseBody: {} }),
      })
    ).rejects.toThrow('Idempotency key is required');
  });

  it('throws conflict when payload changes', async () => {
    const repository = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repository);

    await service.execute({
      key: 'key-1',
      scope: 'users:create:test@example.com',
      requestHash: 'hash-1',
      handler: async () => ({ statusCode: 201, responseBody: { id: 'user-1' } }),
    });

    await expect(
      service.execute({
        key: 'key-1',
        scope: 'users:create:test@example.com',
        requestHash: 'hash-2',
        handler: async () => ({ statusCode: 201, responseBody: { id: 'user-2' } }),
      })
    ).rejects.toThrow('Idempotency key conflict');
  });

  it('throws in-progress when record exists without response', async () => {
    const repository = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repository);

    await repository.create({
      key: 'key-1',
      scope: 'users:create:test@example.com',
      requestHash: 'hash-1',
    });

    await expect(
      service.execute({
        key: 'key-1',
        scope: 'users:create:test@example.com',
        requestHash: 'hash-1',
        handler: async () => ({ statusCode: 201, responseBody: { id: 'user-1' } }),
      })
    ).rejects.toThrow('Idempotency key in progress');
  });

  it('deletes record if handler throws', async () => {
    const repository = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repository);

    await expect(
      service.execute({
        key: 'key-1',
        scope: 'users:create:test@example.com',
        requestHash: 'hash-1',
        handler: async () => {
          throw new Error('boom');
        },
      })
    ).rejects.toThrow('boom');

    const existing = await repository.findByKey('users:create:test@example.com', 'key-1');
    expect(existing).toBeNull();
  });
});
