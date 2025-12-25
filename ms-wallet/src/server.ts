import * as grpc from '@grpc/grpc-js';
import { buildApp } from './app.js';
import { prisma } from './infrastructure/database/prisma.js';
import { PrismaTransactionRepository } from './infrastructure/database/PrismaTransactionRepository.js';
import { CreateTransactionUseCase } from './application/usecases/CreateTransactionUseCase.js';
import { GetTransactionsUseCase } from './application/usecases/GetTransactionsUseCase.js';
import { GetBalanceUseCase } from './application/usecases/GetBalanceUseCase.js';
import { DeleteUserTransactionsUseCase } from './application/usecases/DeleteUserTransactionsUseCase.js';
import { createWalletGrpcServer } from './infrastructure/grpc/walletGrpcServer.js';
import { env } from './config/env.js';
import pino from 'pino';

const logger = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true },
        }
      : undefined,
});

async function startHttpServer() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`HTTP server running on port ${env.PORT}`);
    logger.info(`Swagger docs available at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    logger.error(err, 'Error starting HTTP server');
    process.exit(1);
  }

  return app;
}

async function startGrpcServer() {
  const transactionRepository = new PrismaTransactionRepository(prisma);
  const createTransactionUseCase = new CreateTransactionUseCase(transactionRepository);
  const getTransactionsUseCase = new GetTransactionsUseCase(transactionRepository);
  const getBalanceUseCase = new GetBalanceUseCase(transactionRepository);
  const deleteUserTransactionsUseCase = new DeleteUserTransactionsUseCase(transactionRepository);

  const grpcServer = createWalletGrpcServer(
    createTransactionUseCase,
    getTransactionsUseCase,
    getBalanceUseCase,
    deleteUserTransactionsUseCase,
    env.JWT_INTERNAL_SECRET,
    logger
  );

  return new Promise<grpc.Server>((resolve, reject) => {
    grpcServer.bindAsync(
      `0.0.0.0:${env.GRPC_PORT}`,
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          reject(error);
          return;
        }
        logger.info(`gRPC server running on port ${port}`);
        resolve(grpcServer);
      }
    );
  });
}

async function gracefulShutdown(app: Awaited<ReturnType<typeof buildApp>>, grpcServer: grpc.Server) {
  logger.info('Received shutdown signal, closing connections...');

  await app.close();
  logger.info('HTTP server closed');

  grpcServer.tryShutdown((error) => {
    if (error) {
      logger.error(error, 'Error shutting down gRPC server');
    } else {
      logger.info('gRPC server closed');
    }
  });

  await prisma.$disconnect();
  logger.info('Database connection closed');

  process.exit(0);
}

async function main() {
  try {
    const app = await startHttpServer();
    const grpcServer = await startGrpcServer();

    process.on('SIGTERM', () => gracefulShutdown(app, grpcServer));
    process.on('SIGINT', () => gracefulShutdown(app, grpcServer));
  } catch (error) {
    logger.error(error, 'Failed to start servers');
    process.exit(1);
  }
}

main();
