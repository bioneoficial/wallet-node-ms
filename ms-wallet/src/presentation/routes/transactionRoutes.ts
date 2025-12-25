import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TransactionController } from '../controllers/TransactionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { createTransactionSchema, getTransactionsQuerySchema } from '../../infrastructure/http/schemas/transactionSchemas.js';

export async function transactionRoutes(
  fastify: FastifyInstance,
  controller: TransactionController
): Promise<void> {
  fastify.addHook('onRequest', authMiddleware);

  fastify.post(
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

  fastify.get(
    '/transactions',
    {
      schema: {
        description: 'Get all transactions for the authenticated user',
        tags: ['Transactions'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                user_id: { type: 'string' },
                amount: { type: 'integer' },
                type: { type: 'string' },
                created_at: { type: 'string' },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.findAll.bind(controller)
  );

  fastify.get(
    '/balance',
    {
      schema: {
        description: 'Get the balance for the authenticated user (calculated from CREDIT - DEBIT)',
        tags: ['Transactions'],
        response: {
          200: {
            type: 'object',
            properties: {
              amount: { type: 'integer' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getBalance.bind(controller)
  );
}
