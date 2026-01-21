import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateUserUseCase } from '../../application/usecases/CreateUserUseCase.js';
import { GetUsersUseCase } from '../../application/usecases/GetUsersUseCase.js';
import { GetUserByIdUseCase } from '../../application/usecases/GetUserByIdUseCase.js';
import { UpdateUserUseCase } from '../../application/usecases/UpdateUserUseCase.js';
import { DeleteUserUseCase } from '../../application/usecases/DeleteUserUseCase.js';
import { IdempotencyService } from '../../application/services/IdempotencyService.js';
import {
  CreateUserBody,
  UpdateUserBody,
  IdempotencyKeyHeader,
} from '../../infrastructure/http/schemas/userSchemas.js';

type UserResponse = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type ErrorResponse = {
  error: string;
  message: string;
};

type UpdateUserResponse = UserResponse | ErrorResponse;
type DeleteUserResponse = null | ErrorResponse;

export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly idempotencyService: IdempotencyService
  ) {}

  async create(
    request: FastifyRequest<{ Body: CreateUserBody; Headers: IdempotencyKeyHeader }>,
    reply: FastifyReply
  ): Promise<void> {
    const idempotencyKey = request.headers['idempotency-key'];
    const requestHash = this.idempotencyService.createRequestHash({
      first_name: request.body.first_name,
      last_name: request.body.last_name,
      email: request.body.email,
      password: request.body.password,
    });

    const result = await this.idempotencyService.execute<UserResponse>({
      key: idempotencyKey,
      scope: `users:create:${request.body.email}`,
      requestHash,
      handler: async () => {
        const user = await this.createUserUseCase.execute({
          firstName: request.body.first_name,
          lastName: request.body.last_name,
          email: request.body.email,
          password: request.body.password,
        });

        return {
          statusCode: 201,
          responseBody: {
            id: user.id,
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
          },
        };
      },
    });

    reply.status(result.statusCode).send(result.responseBody);
  }

  async findAll(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const users = await this.getUsersUseCase.execute();

    const response = users.map((u) => ({
      id: u.id,
      first_name: u.firstName,
      last_name: u.lastName,
      email: u.email,
    }));

    reply.send(response);
  }

  async me(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user?.sub;

    if (!userId) {
       reply.status(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
       return;
    }

    const user = await this.getUserByIdUseCase.execute(userId);

    if (!user) {
      reply.status(404).send({ error: 'Not Found', message: 'User not found' });
      return;
    }

    reply.send({
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
    });
  }

  async update(
    request: FastifyRequest<{ Body: UpdateUserBody; Headers: IdempotencyKeyHeader }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user?.sub;

    if (!userId) {
       reply.status(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
       return;
    }

    const idempotencyKey = request.headers['idempotency-key'];
    const requestHash = this.idempotencyService.createRequestHash({
      userId,
      ...request.body,
    });

    const result = await this.idempotencyService.execute<UpdateUserResponse>({
      key: idempotencyKey,
      scope: `users:update:${userId}`,
      requestHash,
      handler: async () => {
        const user = await this.updateUserUseCase.execute(userId, {
          firstName: request.body.first_name,
          lastName: request.body.last_name,
          email: request.body.email,
          password: request.body.password,
        });

        if (!user) {
          return {
            statusCode: 404,
            responseBody: { error: 'Not Found', message: 'User not found' },
          };
        }

        return {
          statusCode: 200,
          responseBody: {
            id: user.id,
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
          },
        };
      },
    });

    reply.status(result.statusCode).send(result.responseBody);
  }

  async delete(
    request: FastifyRequest<{ Headers: IdempotencyKeyHeader }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user?.sub;

    if (!userId) {
       reply.status(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
       return;
    }

    const idempotencyKey = request.headers['idempotency-key'];
    const requestHash = this.idempotencyService.createRequestHash({ userId });

    const result = await this.idempotencyService.execute<DeleteUserResponse>({
      key: idempotencyKey,
      scope: `users:delete:${userId}`,
      requestHash,
      handler: async () => {
        const deleted = await this.deleteUserUseCase.execute(userId);

        if (!deleted) {
          return {
            statusCode: 404,
            responseBody: { error: 'Not Found', message: 'User not found' },
          };
        }

        return {
          statusCode: 204,
          responseBody: null,
        };
      },
    });

    if (result.statusCode === 204) {
      reply.status(204).send();
      return;
    }

    reply.status(result.statusCode).send(result.responseBody);
  }
}
