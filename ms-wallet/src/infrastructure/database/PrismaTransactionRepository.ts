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

  async createWithBalance(input: CreateTransactionInput): Promise<Transaction> {
    return await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: input.userId,
          amount: input.amount,
          type: input.type as PrismaTransactionType,
        },
      });

      const delta = input.type === 'CREDIT' ? input.amount : -input.amount;

      await tx.balance.upsert({
        where: { userId: input.userId },
        update: {
          amount: { increment: delta },
        },
        create: {
          userId: input.userId,
          amount: delta,
        },
      });

      return this.mapToEntity(transaction);
    });
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
    const balance = await this.prisma.balance.findUnique({
      where: { userId },
    });

    return {
      amount: balance ? Number(balance.amount) : 0,
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
      amount: any;
      type: PrismaTransactionType;
      createdAt: Date;
      updatedAt: Date;
    }
  ): Transaction {
    return {
      id: prismaTransaction.id,
      userId: prismaTransaction.userId,
      amount: Number(prismaTransaction.amount),
      type: prismaTransaction.type as TransactionType,
      createdAt: prismaTransaction.createdAt,
      updatedAt: prismaTransaction.updatedAt,
    };
  }
}
