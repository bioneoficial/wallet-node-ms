import * as grpc from '@grpc/grpc-js';
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  createDeadline,
  isRetryableGrpcError,
  withCircuitBreaker,
  withRetry,
} from '../../src/infrastructure/grpc/grpcResilience.js';

describe('grpcResilience', () => {
  it('should mark non-retryable gRPC errors as non-retryable', () => {
    const error = { code: grpc.status.INVALID_ARGUMENT } as grpc.ServiceError;

    expect(isRetryableGrpcError(error)).toBe(false);
  });

  it('should mark transient gRPC errors as retryable', () => {
    const error = { code: grpc.status.UNAVAILABLE } as grpc.ServiceError;

    expect(isRetryableGrpcError(error)).toBe(true);
  });

  it('should retry operations until they succeed', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('ok');

    const result = await withRetry(operation, {
      retries: 2,
      baseDelayMs: 0,
      maxDelayMs: 0,
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should open circuit breaker after failures and recover after timeout', async () => {
    let now = 0;
    const breaker = new CircuitBreaker(
      {
        failureThreshold: 2,
        resetTimeoutMs: 1000,
      },
      () => now
    );

    await expect(withCircuitBreaker(breaker, () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(withCircuitBreaker(breaker, () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(withCircuitBreaker(breaker, () => Promise.resolve('ok'))).rejects.toBeInstanceOf(
      CircuitBreakerOpenError
    );

    now = 1500;

    await expect(withCircuitBreaker(breaker, () => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(breaker.getState()).toBe('closed');
  });

  it('should create deadline based on timeout', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const deadline = createDeadline(2000);

    expect(deadline.getTime()).toBe(3000);

    nowSpy.mockRestore();
  });
});
