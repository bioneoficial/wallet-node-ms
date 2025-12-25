import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserController } from '../controllers/UserController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { createUserSchema } from '../../infrastructure/http/schemas/userSchemas.js';

const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    first_name: { type: 'string' },
    last_name: { type: 'string' },
    email: { type: 'string' },
  },
};

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

export async function userRoutes(
  fastify: FastifyInstance,
  controller: UserController
): Promise<void> {
  fastify.post(
    '/users',
    {
      schema: {
        description: 'Create a new user',
        tags: ['Users'],
        body: createUserSchema,
        response: {
          201: z.object({
            id: z.string(),
            first_name: z.string(),
            last_name: z.string(),
            email: z.string().email(),
          }),
        },
      },
    },
    controller.create.bind(controller)
  );

  fastify.get(
    '/users',
    {
      onRequest: [authMiddleware],
      schema: {
        description: 'Get all users',
        tags: ['Users'],
        response: {
          200: {
            type: 'array',
            items: userResponseSchema,
          },
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.findAll.bind(controller)
  );

  fastify.get(
    '/users/:id',
    {
      onRequest: [authMiddleware],
      schema: {
        description: 'Get user by ID',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: userResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.findById.bind(controller)
  );

  fastify.patch(
    '/users/:id',
    {
      onRequest: [authMiddleware],
      schema: {
        description: 'Update user by ID',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
        response: {
          200: userResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.update.bind(controller)
  );

  fastify.delete(
    '/users/:id',
    {
      onRequest: [authMiddleware],
      schema: {
        description: 'Delete user by ID',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          204: { type: 'null' },
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.delete.bind(controller)
  );
}
