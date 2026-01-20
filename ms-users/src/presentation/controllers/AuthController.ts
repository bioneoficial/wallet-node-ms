import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticateUserUseCase } from '../../application/usecases/AuthenticateUserUseCase.js';
import { AuthBody } from '../../infrastructure/http/schemas/userSchemas.js';

export class AuthController {
  constructor(private readonly authenticateUserUseCase: AuthenticateUserUseCase) {}

  async authenticate(
    request: FastifyRequest<{ Body: AuthBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const { email, password } = request.body;

    const result = await this.authenticateUserUseCase.execute(
      email,
      password
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
  }
}
