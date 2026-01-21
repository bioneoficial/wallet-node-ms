import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod';
import { z } from 'zod';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { prisma } from './infrastructure/database/prisma.js';
import { PrismaTransactionRepository } from './infrastructure/database/PrismaTransactionRepository.js';
import { PrismaIdempotencyRepository } from './infrastructure/database/PrismaIdempotencyRepository.js';
import { CreateTransactionUseCase } from './application/usecases/CreateTransactionUseCase.js';
import { GetTransactionsUseCase } from './application/usecases/GetTransactionsUseCase.js';
import { GetBalanceUseCase } from './application/usecases/GetBalanceUseCase.js';
import { IdempotencyService } from './application/services/IdempotencyService.js';
import { TransactionController } from './presentation/controllers/TransactionController.js';
import { transactionRoutes } from './presentation/routes/transactionRoutes.js';
import { env } from './config/env.js';
import { globalErrorHandler } from './infrastructure/http/errorHandler.js';

export async function buildApp() {
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
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  app.setErrorHandler(globalErrorHandler);

  const transactionRepository = new PrismaTransactionRepository(prisma);
  const idempotencyRepository = new PrismaIdempotencyRepository(prisma);
  const idempotencyService = new IdempotencyService(idempotencyRepository);
  const createTransactionUseCase = new CreateTransactionUseCase(transactionRepository);
  const getTransactionsUseCase = new GetTransactionsUseCase(transactionRepository);
  const getBalanceUseCase = new GetBalanceUseCase(transactionRepository);

  const transactionController = new TransactionController(
    createTransactionUseCase,
    getTransactionsUseCase,
    getBalanceUseCase,
    idempotencyService
  );

  await app.register(async (instance) => {
    await transactionRoutes(instance, transactionController);
  });

  app.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: z.object({
          status: z.string(),
          timestamp: z.string(),
        }),
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
