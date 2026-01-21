import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { TransactionController } from '../controllers/TransactionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  createTransactionSchema,
  getTransactionsQuerySchema,
  idempotencyKeyHeaderSchema,
} from '../../infrastructure/http/schemas/transactionSchemas.js';

const transactionResponseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  amount: z.number(),
  type: z.enum(['CREDIT', 'DEBIT']),
  created_at: z.string(),
});

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export async function transactionRoutes(
  fastify: FastifyInstance,
  controller: TransactionController
): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', authMiddleware);

  app.post(
    '/transactions',
    {
      config: {
        rateLimit: {
          max: 20, // 20 transactions
          timeWindow: '1 minute', // per minute
        },
      },
      schema: {
        description: 'Create a new transaction',
        tags: ['Transactions'],
        body: createTransactionSchema,
        headers: idempotencyKeyHeaderSchema,
        response: {
          201: transactionResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          409: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.create.bind(controller)
  );

  app.get(
    '/transactions',
    {
      schema: {
        description: 'Get all transactions for the authenticated user',
        tags: ['Transactions'],
        querystring: getTransactionsQuerySchema,
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              user_id: z.string(),
              amount: z.number(),
              type: z.string(),
              created_at: z.string(),
            })
          ),
          401: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.findAll.bind(controller)
  );

  app.get(
    '/balance',
    {
      schema: {
        description: 'Get the balance for the authenticated user (calculated from CREDIT - DEBIT)',
        tags: ['Transactions'],
        response: {
          200: z.object({
            amount: z.number(),
          }),
          401: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getBalance.bind(controller)
  );
}
