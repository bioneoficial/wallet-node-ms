import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticateUserUseCase } from '../../application/usecases/AuthenticateUserUseCase.js';
import { authSchema, AuthBody } from '../../infrastructure/http/schemas/userSchemas.js';
import { ZodError } from 'zod';

export class AuthController {
  constructor(private readonly authenticateUserUseCase: AuthenticateUserUseCase) {}

  async authenticate(
    request: FastifyRequest<{ Body: AuthBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const validated = authSchema.parse(request.body);

      const result = await this.authenticateUserUseCase.execute(
        validated.email,
        validated.password
      );

      if (!result) {
        reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials' });
        return;
      }

      reply.send({
        user: {
          id: result.user.id,
          first_name: result.user.firstName,
          last_name: result.user.lastName,
          email: result.user.email,
        },
        access_token: result.accessToken,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        reply.status(400).send({ error: 'Validation Error', details: error.errors });
        return;
      }
      throw error;
    }
  }
}
