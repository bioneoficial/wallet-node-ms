import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { WalletGrpcClient } from '../../application/usecases/DeleteUserUseCase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WalletServiceClient extends grpc.Client {
  GetBalance: (
    request: { user_id: string; internal_token: string },
    callback: (error: grpc.ServiceError | null, response: { amount: number }) => void
  ) => void;
  GetTransactions: (
    request: { user_id: string; type?: string; internal_token: string },
    callback: (error: grpc.ServiceError | null, response: { transactions: unknown[] }) => void
  ) => void;
  CreateTransaction: (
    request: { user_id: string; amount: number; type: string; internal_token: string },
    callback: (error: grpc.ServiceError | null, response: { transaction: unknown }) => void
  ) => void;
  DeleteUserTransactions: (
    request: { user_id: string; internal_token: string },
    callback: (
      error: grpc.ServiceError | null,
      response: { success: boolean; deleted_count: number }
    ) => void
  ) => void;
}

export function createWalletGrpcClient(
  walletGrpcUrl: string,
  internalSecret: string
): WalletGrpcClient {
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

  const client = new protoDescriptor.wallet.WalletService(
    walletGrpcUrl,
    grpc.credentials.createInsecure()
  );

  return {
    deleteUserTransactions: (userId: string): Promise<{ success: boolean; deletedCount: number }> => {
      return new Promise((resolve, reject) => {
        client.DeleteUserTransactions(
          { user_id: userId, internal_token: internalSecret },
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
    },
  };
}
