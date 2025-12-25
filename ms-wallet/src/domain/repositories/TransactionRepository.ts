import {
  Transaction,
  CreateTransactionInput,
  TransactionFilter,
} from '../entities/Transaction.js';

export interface BalanceResult {
  amount: number;
}

export interface TransactionRepository {
  create(input: CreateTransactionInput): Promise<Transaction>;
  findAll(filter?: TransactionFilter): Promise<Transaction[]>;
  findById(id: string): Promise<Transaction | null>;
  getBalance(userId: string): Promise<BalanceResult>;
  deleteByUserId(userId: string): Promise<number>;
}
