import * as grpc from '@grpc/grpc-js';

export class CircuitBreakerOpenError extends Error {
  constructor(message = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export interface RetryConfig {
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry?: (error: unknown) => boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
}

export interface GrpcResilienceConfig {
  timeoutMs: number;
  retryAttempts: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
}

export const DEFAULT_GRPC_RESILIENCE_CONFIG: GrpcResilienceConfig = {
  timeoutMs: 2000,
  retryAttempts: 2,
  retryBaseDelayMs: 200,
  retryMaxDelayMs: 2000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 10000,
};

const NON_RETRYABLE_STATUS_CODES = new Set([
  grpc.status.INVALID_ARGUMENT,
  grpc.status.PERMISSION_DENIED,
  grpc.status.UNAUTHENTICATED,
  grpc.status.NOT_FOUND,
  grpc.status.ALREADY_EXISTS,
  grpc.status.FAILED_PRECONDITION,
  grpc.status.OUT_OF_RANGE,
  grpc.status.UNIMPLEMENTED,
]);

export function isRetryableGrpcError(error: unknown): boolean {
  const code = (error as grpc.ServiceError | undefined)?.code;

  if (typeof code !== 'number') {
    return true;
  }

  return !NON_RETRYABLE_STATUS_CODES.has(code);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(operation: () => Promise<T>, config: RetryConfig): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  const shouldRetry = config.shouldRetry ?? (() => true);

  for (; attempt <= config.retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= config.retries || !shouldRetry(error)) {
        break;
      }

      const delayMs = Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** attempt);

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError ?? new Error('Retry attempts exhausted');
}

export class CircuitBreaker {
  private failureCount = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private nextAttemptAt = 0;

  constructor(
    private readonly config: CircuitBreakerConfig,
    private readonly now: () => number = () => Date.now()
  ) {}

  canRequest(): boolean {
    if (this.state === 'open') {
      if (this.now() < this.nextAttemptAt) {
        return false;
      }

      this.state = 'half-open';
    }

    return true;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
    this.nextAttemptAt = 0;
  }

  recordFailure(): void {
    this.failureCount += 1;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      this.nextAttemptAt = this.now() + this.config.resetTimeoutMs;
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
}

export async function withCircuitBreaker<T>(
  breaker: CircuitBreaker,
  operation: () => Promise<T>
): Promise<T> {
  if (!breaker.canRequest()) {
    throw new CircuitBreakerOpenError();
  }

  try {
    const result = await operation();
    breaker.recordSuccess();
    return result;
  } catch (error) {
    breaker.recordFailure();
    throw error;
  }
}

export function createDeadline(timeoutMs: number): Date {
  return new Date(Date.now() + timeoutMs);
}
