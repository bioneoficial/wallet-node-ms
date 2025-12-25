import { TransactionRepository, BalanceResult } from '../../domain/repositories/TransactionRepository.js';

export class GetBalanceUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(userId: string): Promise<BalanceResult> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return this.transactionRepository.getBalance(userId);
  }
}
