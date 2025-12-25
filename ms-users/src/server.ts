import { buildApp } from './app.js';
import { prisma } from './infrastructure/database/prisma.js';
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

async function startServer() {
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

async function gracefulShutdown(app: Awaited<ReturnType<typeof buildApp>>) {
  logger.info('Received shutdown signal, closing connections...');

  await app.close();
  logger.info('HTTP server closed');

  await prisma.$disconnect();
  logger.info('Database connection closed');

  process.exit(0);
}

async function main() {
  try {
    const app = await startServer();

    process.on('SIGTERM', () => gracefulShutdown(app));
    process.on('SIGINT', () => gracefulShutdown(app));
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

main();
