import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateUserUseCase } from '../../application/usecases/CreateUserUseCase.js';
import { GetUsersUseCase } from '../../application/usecases/GetUsersUseCase.js';
import { GetUserByIdUseCase } from '../../application/usecases/GetUserByIdUseCase.js';
import { UpdateUserUseCase } from '../../application/usecases/UpdateUserUseCase.js';
import { DeleteUserUseCase } from '../../application/usecases/DeleteUserUseCase.js';
import {
  CreateUserBody,
  UpdateUserBody,
} from '../../infrastructure/http/schemas/userSchemas.js';

export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase
  ) {}

  async create(
    request: FastifyRequest<{ Body: CreateUserBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const user = await this.createUserUseCase.execute({
      firstName: request.body.first_name,
      lastName: request.body.last_name,
      email: request.body.email,
      password: request.body.password,
    });

    reply.status(201).send({
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
    });
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
    request: FastifyRequest<{ Body: UpdateUserBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user?.sub;

    if (!userId) {
       reply.status(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
       return;
    }

    const user = await this.updateUserUseCase.execute(userId, {
      firstName: request.body.first_name,
      lastName: request.body.last_name,
      email: request.body.email,
      password: request.body.password,
    });

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

  async delete(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user?.sub;

    if (!userId) {
       reply.status(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
       return;
    }

    const deleted = await this.deleteUserUseCase.execute(userId);

    if (!deleted) {
      reply.status(404).send({ error: 'Not Found', message: 'User not found' });
      return;
    }

    reply.status(204).send();
  }
}
