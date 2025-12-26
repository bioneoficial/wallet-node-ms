import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { TransactionController } from '../controllers/TransactionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { createTransactionSchema, getTransactionsQuerySchema } from '../../infrastructure/http/schemas/transactionSchemas.js';

export async function transactionRoutes(
  fastify: FastifyInstance,
  controller: TransactionController
): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', authMiddleware);

  app.post(
    '/transactions',
    {
      schema: {
        description: 'Create a new transaction',
        tags: ['Transactions'],
        body: createTransactionSchema,
        response: {
          201: z.object({
            id: z.string(),
            user_id: z.string(),
            amount: z.number().int(),
            type: z.enum(['CREDIT', 'DEBIT']),
            created_at: z.string(),
          }),
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
              amount: z.number().int(),
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
            amount: z.number().int(),
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
