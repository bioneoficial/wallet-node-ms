import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { UserController } from '../controllers/UserController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  createUserSchema,
  updateUserSchema,
} from '../../infrastructure/http/schemas/userSchemas.js';

const userResponseSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
});

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export async function userRoutes(
  fastify: FastifyInstance,
  controller: UserController
): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/users',
    {
      schema: {
        description: 'Create a new user',
        tags: ['Users'],
        body: createUserSchema,
        response: {
          201: userResponseSchema,
        },
      },
    },
    controller.create.bind(controller) as any
  );

  app.get(
    '/users',
    {
      onRequest: [authMiddleware],
      schema: {
        description: 'Get all users',
        tags: ['Users'],
        response: {
          200: z.array(userResponseSchema),
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.findAll.bind(controller) as any
  );

  app.get(
    '/users/me',
    {
      onRequest: [authMiddleware],
      schema: {
        description: 'Get authenticated user profile',
        tags: ['Users'],
        response: {
          200: userResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.me.bind(controller) as any
  );

  app.patch(
    '/users/me',
    {
      onRequest: [authMiddleware],
      schema: {
        description: 'Update authenticated user profile',
        tags: ['Users'],
        body: updateUserSchema,
        response: {
          200: userResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.update.bind(controller) as any
  );

  app.delete(
    '/users/me',
    {
      onRequest: [authMiddleware],
      schema: {
        description: 'Delete authenticated user profile',
        tags: ['Users'],
        response: {
          204: z.null(),
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.delete.bind(controller) as any
  );
}
