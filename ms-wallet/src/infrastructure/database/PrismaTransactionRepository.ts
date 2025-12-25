import { PrismaClient, TransactionType as PrismaTransactionType } from '@prisma/client';
import {
  Transaction,
  CreateTransactionInput,
  TransactionFilter,
  TransactionType,
} from '../../domain/entities/Transaction.js';
import {
  TransactionRepository,
  BalanceResult,
} from '../../domain/repositories/TransactionRepository.js';

export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const transaction = await this.prisma.transaction.create({
      data: {
        userId: input.userId,
        amount: input.amount,
        type: input.type as PrismaTransactionType,
      },
    });

    return this.mapToEntity(transaction);
  }

  async findAll(filter?: TransactionFilter): Promise<Transaction[]> {
    const where: Record<string, unknown> = {};

    if (filter?.userId) {
      where.userId = filter.userId;
    }

    if (filter?.type) {
      where.type = filter.type;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map(this.mapToEntity);
  }

  async findById(id: string): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    return transaction ? this.mapToEntity(transaction) : null;
  }

  async getBalance(userId: string): Promise<BalanceResult> {
    const result = await this.prisma.$queryRaw<{ amount: bigint }[]>`
      SELECT 
        COALESCE(
          SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END),
          0
        ) as amount
      FROM transactions
      WHERE user_id = ${userId}
    `;

    return {
      amount: Number(result[0]?.amount ?? 0),
    };
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.prisma.transaction.deleteMany({
      where: { userId },
    });

    return result.count;
  }

  private mapToEntity(
    prismaTransaction: {
      id: string;
      userId: string;
      amount: number;
      type: PrismaTransactionType;
      createdAt: Date;
      updatedAt: Date;
    }
  ): Transaction {
    return {
      id: prismaTransaction.id,
      userId: prismaTransaction.userId,
      amount: prismaTransaction.amount,
      type: prismaTransaction.type as TransactionType,
      createdAt: prismaTransaction.createdAt,
      updatedAt: prismaTransaction.updatedAt,
    };
  }
}
