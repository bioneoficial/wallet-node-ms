import { FastifyInstance } from 'fastify';
import { TransactionController } from '../controllers/TransactionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

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
        body: {
          type: 'object',
          required: ['user_id', 'amount', 'type'],
          properties: {
            user_id: { type: 'string', format: 'uuid' },
            amount: { type: 'integer', minimum: 1 },
            type: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              amount: { type: 'integer' },
              type: { type: 'string' },
              created_at: { type: 'string' },
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
