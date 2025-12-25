import { Transaction, CreateTransactionInput } from '../../domain/entities/Transaction.js';
import { TransactionRepository } from '../../domain/repositories/TransactionRepository.js';

export class CreateTransactionUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(input: CreateTransactionInput): Promise<Transaction> {
    if (input.amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    return this.transactionRepository.create(input);
  }
}
