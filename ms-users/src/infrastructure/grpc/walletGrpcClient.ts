import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { WalletGrpcClient } from '../../application/usecases/DeleteUserUseCase.js';
import { createInternalJwt } from './internalJwt.js';
import { createClientCredentials } from './tlsCredentials.js';
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  DEFAULT_GRPC_RESILIENCE_CONFIG,
  GrpcResilienceConfig,
  createDeadline,
  isRetryableGrpcError,
  withCircuitBreaker,
  withRetry,
} from './grpcResilience.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WalletServiceClient extends grpc.Client {
  GetBalance: (
    request: { user_id: string },
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response: { amount: number }) => void
  ) => void;
  GetTransactions: (
    request: { user_id: string; type?: string },
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response: { transactions: unknown[] }) => void
  ) => void;
  CreateTransaction: (
    request: { user_id: string; amount: number; type: string },
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response: { transaction: unknown }) => void
  ) => void;
  DeleteUserTransactions: (
    request: { user_id: string },
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: (
      error: grpc.ServiceError | null,
      response: { success: boolean; deleted_count: number }
    ) => void
  ) => void;
}

export function createWalletGrpcClient(
  walletGrpcUrl: string,
  internalSecret: string,
  resilienceConfig: Partial<GrpcResilienceConfig> = {}
): WalletGrpcClient {
  const config = { ...DEFAULT_GRPC_RESILIENCE_CONFIG, ...resilienceConfig };
  const breaker = new CircuitBreaker({
    failureThreshold: config.circuitBreakerThreshold,
    resetTimeoutMs: config.circuitBreakerResetMs,
  });
  const PROTO_PATH = path.resolve(__dirname, '../../../../proto/wallet.proto');

  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as {
    wallet: {
      WalletService: new (
        address: string,
        credentials: grpc.ChannelCredentials
      ) => WalletServiceClient;
    };
  };

  const credentials = createClientCredentials();
  
  const client = new protoDescriptor.wallet.WalletService(
    walletGrpcUrl,
    credentials
  );

  const createAuthMetadata = (userId: string): grpc.Metadata => {
    const metadata = new grpc.Metadata();
    const token = createInternalJwt(userId, internalSecret);
    metadata.set('authorization', `Bearer ${token}`);
    return metadata;
  };

  const callWithResilience = <T>(operation: () => Promise<T>): Promise<T> => {
    return withRetry(
      () => withCircuitBreaker(breaker, operation),
      {
        retries: config.retryAttempts,
        baseDelayMs: config.retryBaseDelayMs,
        maxDelayMs: config.retryMaxDelayMs,
        shouldRetry: (error) =>
          !(error instanceof CircuitBreakerOpenError) && isRetryableGrpcError(error),
      }
    );
  };

  const deleteUserTransactions = (userId: string): Promise<{ success: boolean; deletedCount: number }> => {
    return new Promise((resolve, reject) => {
      const metadata = createAuthMetadata(userId);
      const deadline = createDeadline(config.timeoutMs);

      client.DeleteUserTransactions(
        { user_id: userId },
        metadata,
        { deadline },
        (error, response) => {
          if (error) {
            reject(error);
            return;
          }
          resolve({
            success: response.success,
            deletedCount: response.deleted_count,
          });
        }
      );
    });
  };

  return {
    deleteUserTransactions: (userId: string): Promise<{ success: boolean; deletedCount: number }> => {
      return callWithResilience(() => deleteUserTransactions(userId));
    },
  };
}
