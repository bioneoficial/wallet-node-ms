import { TransactionRepository } from '../../domain/repositories/TransactionRepository.js';

export interface DeleteUserTransactionsResult {
  success: boolean;
  deletedCount: number;
}

export class DeleteUserTransactionsUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(userId: string): Promise<DeleteUserTransactionsResult> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const deletedCount = await this.transactionRepository.deleteByUserId(userId);

    return {
      success: true,
      deletedCount,
    };
  }
}
