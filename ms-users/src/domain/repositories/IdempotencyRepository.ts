export interface IdempotencyRecord {
  id: string;
  key: string;
  scope: string;
  requestHash: string;
  statusCode: number | null;
  responseBody: unknown | null;
}

export interface IdempotencyRepository {
  findByKey(scope: string, key: string): Promise<IdempotencyRecord | null>;
  create(input: { key: string; scope: string; requestHash: string }): Promise<IdempotencyRecord>;
  updateResponse(id: string, statusCode: number, responseBody: unknown | null): Promise<void>;
  delete(id: string): Promise<void>;
}
