import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateTransactionUseCase } from '../../application/usecases/CreateTransactionUseCase.js';
import { GetTransactionsUseCase } from '../../application/usecases/GetTransactionsUseCase.js';
import { GetBalanceUseCase } from '../../application/usecases/GetBalanceUseCase.js';
import { TransactionType } from '../../domain/entities/Transaction.js';
import { IdempotencyService } from '../../application/services/IdempotencyService.js';
import {
  CreateTransactionBody,
  GetTransactionsQuery,
  IdempotencyKeyHeader,
} from '../../infrastructure/http/schemas/transactionSchemas.js';

export class TransactionController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly getTransactionsUseCase: GetTransactionsUseCase,
    private readonly getBalanceUseCase: GetBalanceUseCase,
    private readonly idempotencyService: IdempotencyService
  ) {}

  async create(
    request: FastifyRequest<{ Body: CreateTransactionBody; Headers: IdempotencyKeyHeader }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user?.sub;

    // Guaranteed by authMiddleware
    if (!userId) throw new Error('User context missing');

    const idempotencyKey = request.headers['idempotency-key'];
    const requestHash = this.idempotencyService.createRequestHash({
      userId,
      amount: request.body.amount,
      type: request.body.type,
    });

    const result = await this.idempotencyService.execute({
      key: idempotencyKey,
      scope: `transactions:create:${userId}`,
      requestHash,
      handler: async () => {
        const transaction = await this.createTransactionUseCase.execute({
          userId,
          amount: request.body.amount,
          type: request.body.type as TransactionType,
        });

        return {
          statusCode: 201,
          responseBody: {
            id: transaction.id,
            user_id: transaction.userId,
            amount: transaction.amount,
            type: transaction.type,
            created_at: transaction.createdAt.toISOString(),
          },
        };
      },
    });

    reply.status(result.statusCode).send(result.responseBody);
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
