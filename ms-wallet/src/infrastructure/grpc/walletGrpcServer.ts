import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { CreateTransactionUseCase } from '../../application/usecases/CreateTransactionUseCase.js';
import { GetTransactionsUseCase } from '../../application/usecases/GetTransactionsUseCase.js';
import { GetBalanceUseCase } from '../../application/usecases/GetBalanceUseCase.js';
import { DeleteUserTransactionsUseCase } from '../../application/usecases/DeleteUserTransactionsUseCase.js';
import { TransactionType } from '../../domain/entities/Transaction.js';
import { Logger } from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GrpcRequest {
  user_id?: string;
  internal_token?: string;
  type?: string;
  amount?: number;
}

interface GrpcCallback<T> {
  (error: grpc.ServiceError | null, response?: T): void;
}

export function createWalletGrpcServer(
  createTransactionUseCase: CreateTransactionUseCase,
  getTransactionsUseCase: GetTransactionsUseCase,
  getBalanceUseCase: GetBalanceUseCase,
  deleteUserTransactionsUseCase: DeleteUserTransactionsUseCase,
  internalSecret: string,
  logger: Logger
): grpc.Server {
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
      WalletService: grpc.ServiceClientConstructor;
    };
  };

  const validateInternalToken = (token: string): boolean => {
    return token === internalSecret;
  };

  const server = new grpc.Server();

  const serviceImplementation = {
    GetBalance: async (
      call: grpc.ServerUnaryCall<GrpcRequest, unknown>,
      callback: GrpcCallback<{ amount: number }>
    ) => {
      try {
        const { user_id, internal_token } = call.request;

        if (!internal_token || !validateInternalToken(internal_token)) {
          callback({
            code: grpc.status.UNAUTHENTICATED,
            message: 'Invalid internal token',
          } as grpc.ServiceError);
          return;
        }

        if (!user_id) {
          callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'User ID is required',
          } as grpc.ServiceError);
          return;
        }

        const result = await getBalanceUseCase.execute(user_id);
        callback(null, { amount: result.amount });
      } catch (error) {
        logger.error(error, 'gRPC GetBalance error');
        callback({
          code: grpc.status.INTERNAL,
          message: 'Internal server error',
        } as grpc.ServiceError);
      }
    },

    GetTransactions: async (
      call: grpc.ServerUnaryCall<GrpcRequest, unknown>,
      callback: GrpcCallback<{ transactions: unknown[] }>
    ) => {
      try {
        const { user_id, type, internal_token } = call.request;

        if (!internal_token || !validateInternalToken(internal_token)) {
          callback({
            code: grpc.status.UNAUTHENTICATED,
            message: 'Invalid internal token',
          } as grpc.ServiceError);
          return;
        }

        const transactions = await getTransactionsUseCase.execute({
          userId: user_id,
          type: type as TransactionType | undefined,
        });

        const response = transactions.map((t) => ({
          id: t.id,
          user_id: t.userId,
          amount: t.amount,
          type: t.type,
          created_at: t.createdAt.toISOString(),
        }));

        callback(null, { transactions: response });
      } catch (error) {
        logger.error(error, 'gRPC GetTransactions error');
        callback({
          code: grpc.status.INTERNAL,
          message: 'Internal server error',
        } as grpc.ServiceError);
      }
    },

    CreateTransaction: async (
      call: grpc.ServerUnaryCall<GrpcRequest, unknown>,
      callback: GrpcCallback<{ transaction: unknown }>
    ) => {
      try {
        const { user_id, amount, type, internal_token } = call.request;

        if (!internal_token || !validateInternalToken(internal_token)) {
          callback({
            code: grpc.status.UNAUTHENTICATED,
            message: 'Invalid internal token',
          } as grpc.ServiceError);
          return;
        }

        if (!user_id || !amount || !type) {
          callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'User ID, amount, and type are required',
          } as grpc.ServiceError);
          return;
        }

        const transaction = await createTransactionUseCase.execute({
          userId: user_id,
          amount: Number(amount),
          type: type as TransactionType,
        });

        callback(null, {
          transaction: {
            id: transaction.id,
            user_id: transaction.userId,
            amount: transaction.amount,
            type: transaction.type,
            created_at: transaction.createdAt.toISOString(),
          },
        });
      } catch (error) {
        logger.error(error, 'gRPC CreateTransaction error');
        callback({
          code: grpc.status.INTERNAL,
          message: 'Internal server error',
        } as grpc.ServiceError);
      }
    },

    DeleteUserTransactions: async (
      call: grpc.ServerUnaryCall<GrpcRequest, unknown>,
      callback: GrpcCallback<{ success: boolean; deleted_count: number }>
    ) => {
      try {
        const { user_id, internal_token } = call.request;

        if (!internal_token || !validateInternalToken(internal_token)) {
          callback({
            code: grpc.status.UNAUTHENTICATED,
            message: 'Invalid internal token',
          } as grpc.ServiceError);
          return;
        }

        if (!user_id) {
          callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'User ID is required',
          } as grpc.ServiceError);
          return;
        }

        const result = await deleteUserTransactionsUseCase.execute(user_id);
        callback(null, { success: result.success, deleted_count: result.deletedCount });
      } catch (error) {
        logger.error(error, 'gRPC DeleteUserTransactions error');
        callback({
          code: grpc.status.INTERNAL,
          message: 'Internal server error',
        } as grpc.ServiceError);
      }
    },
  };

  server.addService(
    protoDescriptor.wallet.WalletService.service,
    serviceImplementation
  );

  return server;
}
