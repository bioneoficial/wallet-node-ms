import { Transaction, TransactionFilter } from '../../domain/entities/Transaction.js';
import { TransactionRepository } from '../../domain/repositories/TransactionRepository.js';

export class GetTransactionsUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(filter?: TransactionFilter): Promise<Transaction[]> {
    return this.transactionRepository.findAll(filter);
  }
}
