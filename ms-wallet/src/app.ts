import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { prisma } from './infrastructure/database/prisma.js';
import { PrismaTransactionRepository } from './infrastructure/database/PrismaTransactionRepository.js';
import { CreateTransactionUseCase } from './application/usecases/CreateTransactionUseCase.js';
import { GetTransactionsUseCase } from './application/usecases/GetTransactionsUseCase.js';
import { GetBalanceUseCase } from './application/usecases/GetBalanceUseCase.js';
import { TransactionController } from './presentation/controllers/TransactionController.js';
import { transactionRoutes } from './presentation/routes/transactionRoutes.js';
import { env } from './config/env.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
              },
            }
          : undefined,
    },
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(helmet);

  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
  });

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Wallet Microservice API',
        description: 'API for managing wallet transactions',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Local server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  const transactionRepository = new PrismaTransactionRepository(prisma);
  const createTransactionUseCase = new CreateTransactionUseCase(transactionRepository);
  const getTransactionsUseCase = new GetTransactionsUseCase(transactionRepository);
  const getBalanceUseCase = new GetBalanceUseCase(transactionRepository);

  const transactionController = new TransactionController(
    createTransactionUseCase,
    getTransactionsUseCase,
    getBalanceUseCase
  );

  await app.register(async (instance) => {
    await transactionRoutes(instance, transactionController);
  });

  app.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}
