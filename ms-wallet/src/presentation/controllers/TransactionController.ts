import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateTransactionUseCase } from '../../application/usecases/CreateTransactionUseCase.js';
import { GetTransactionsUseCase } from '../../application/usecases/GetTransactionsUseCase.js';
import { GetBalanceUseCase } from '../../application/usecases/GetBalanceUseCase.js';
import { TransactionType } from '../../domain/entities/Transaction.js';
import {
  createTransactionSchema,
  getTransactionsQuerySchema,
  CreateTransactionBody,
  GetTransactionsQuery,
} from '../../infrastructure/http/schemas/transactionSchemas.js';

export class TransactionController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly getTransactionsUseCase: GetTransactionsUseCase,
    private readonly getBalanceUseCase: GetBalanceUseCase
  ) {}

  async create(
    request: FastifyRequest<{ Body: CreateTransactionBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user?.sub;

    // Guaranteed by authMiddleware
    if (!userId) throw new Error('User context missing');

    const transaction = await this.createTransactionUseCase.execute({
      userId,
      amount: request.body.amount,
      type: request.body.type as TransactionType,
    });

    reply.status(201).send({
      id: transaction.id,
      user_id: transaction.userId,
      amount: transaction.amount,
      type: transaction.type,
      created_at: transaction.createdAt.toISOString(),
    });
  }

  async findAll(
    request: FastifyRequest<{ Querystring: GetTransactionsQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    const { type } = request.query;
    const userId = request.user?.sub;

    // Guaranteed by authMiddleware
    if (!userId) throw new Error('User context missing');

    const transactions = await this.getTransactionsUseCase.execute({
      userId,
      type: type as TransactionType | undefined,
    });

    const response = transactions.map((t) => ({
      id: t.id,
      user_id: t.userId,
      amount: t.amount,
      type: t.type,
      created_at: t.createdAt.toISOString(),
    }));

    reply.send(response);
  }

  async getBalance(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user?.sub;

    // Guaranteed by authMiddleware
    if (!userId) throw new Error('User context missing');

    const balance = await this.getBalanceUseCase.execute(userId);

    reply.send({ amount: balance.amount });
  }
}
