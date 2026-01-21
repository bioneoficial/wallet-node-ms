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
import { PrismaUserRepository } from './infrastructure/database/PrismaUserRepository.js';
import { PrismaIdempotencyRepository } from './infrastructure/database/PrismaIdempotencyRepository.js';
import { PrismaAuditLogRepository } from './infrastructure/database/PrismaAuditLogRepository.js';
import { IdempotencyService } from './application/services/IdempotencyService.js';
import { AuditLogService } from './application/services/AuditLogService.js';
import { createWalletGrpcClient } from './infrastructure/grpc/walletGrpcClient.js';
import { CreateUserUseCase } from './application/usecases/CreateUserUseCase.js';
import { GetUsersUseCase } from './application/usecases/GetUsersUseCase.js';
import { GetUserByIdUseCase } from './application/usecases/GetUserByIdUseCase.js';
import { UpdateUserUseCase } from './application/usecases/UpdateUserUseCase.js';
import { DeleteUserUseCase } from './application/usecases/DeleteUserUseCase.js';
import { AuthenticateUserUseCase } from './application/usecases/AuthenticateUserUseCase.js';
import { UserController } from './presentation/controllers/UserController.js';
import { AuthController } from './presentation/controllers/AuthController.js';
import { userRoutes } from './presentation/routes/userRoutes.js';
import { authRoutes } from './presentation/routes/authRoutes.js';
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

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      },
    },
  });

  // Rate limiting (global)
  await app.register(rateLimit, {
    max: 100, // 100 requests per minute globally
    timeWindow: '1 minute',
    cache: 10000,
    allowList: (req) => {
      // Allow localhost and Docker internal IPs for E2E tests
      return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip.startsWith('192.168.');
    },
  });

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
        title: 'Users Microservice API',
        description: 'API for managing users and authentication',
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

  const userRepository = new PrismaUserRepository(prisma);
  const idempotencyRepository = new PrismaIdempotencyRepository(prisma);
  const idempotencyService = new IdempotencyService(idempotencyRepository);
  
  const auditLogRepository = new PrismaAuditLogRepository(prisma);
  const auditLogService = new AuditLogService(auditLogRepository);
  const walletClient = createWalletGrpcClient(env.WALLET_GRPC_URL, env.JWT_INTERNAL_SECRET);

  const createUserUseCase = new CreateUserUseCase(userRepository);
  const getUsersUseCase = new GetUsersUseCase(userRepository);
  const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
  const updateUserUseCase = new UpdateUserUseCase(userRepository);
  const deleteUserUseCase = new DeleteUserUseCase(userRepository, walletClient);
  const authenticateUserUseCase = new AuthenticateUserUseCase(userRepository, {
    sign: (payload: { sub: string; email: string; role: string }) => app.jwt.sign(payload, { expiresIn: '24h' }),
  });

  const userController = new UserController(
    createUserUseCase,
    getUsersUseCase,
    getUserByIdUseCase,
    updateUserUseCase,
    deleteUserUseCase,
    idempotencyService,
    auditLogService
  );

  const authController = new AuthController(authenticateUserUseCase);

  await app.register(async (instance) => {
    await userRoutes(instance, userController);
    await authRoutes(instance, authController);
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
