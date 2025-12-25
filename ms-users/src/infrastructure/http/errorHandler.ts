import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { pino } from 'pino';

const logger = pino();

export function globalErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  if (error instanceof ZodError) {
    logger.error(
      {
        err: error,
        url: request.url,
        method: request.method,
        requestId: request.id,
      },
      'Validation error'
    );

    reply.status(400).send({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (error.message === 'User with this email already exists') {
    reply.status(409).send({
      error: 'Conflict',
      message: error.message,
    });
    return;
  }

  if (error.message === 'Email already in use') {
    reply.status(409).send({
      error: 'Conflict',
      message: error.message,
    });
    return;
  }

  if (error.message === 'User not found') {
    reply.status(404).send({
      error: 'Not Found',
      message: error.message,
    });
    return;
  }

  if (error.statusCode === 401) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: error.message || 'Authentication required',
    });
    return;
  }

  logger.error(
    {
      err: error,
      url: request.url,
      method: request.method,
      requestId: request.id,
    },
    'Unhandled error'
  );

  reply.status(error.statusCode || 500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
  });
}
