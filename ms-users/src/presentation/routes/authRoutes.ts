import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AuthController } from '../controllers/AuthController.js';
import { authSchema } from '../../infrastructure/http/schemas/userSchemas.js';

const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
  }),
  access_token: z.string(),
});

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export async function authRoutes(
  fastify: FastifyInstance,
  controller: AuthController
): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/auth',
    {
      schema: {
        description: 'Authenticate user and get access token',
        tags: ['Auth'],
        body: authSchema,
        response: {
          200: authResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    controller.authenticate.bind(controller)
  );
}
