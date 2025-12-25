import { UserRepository } from '../../domain/repositories/UserRepository.js';

export interface WalletGrpcClient {
  deleteUserTransactions(userId: string): Promise<{ success: boolean; deletedCount: number }>;
}

export class DeleteUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletClient: WalletGrpcClient
  ) {}

  async execute(id: string): Promise<boolean> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      return false;
    }

    await this.walletClient.deleteUserTransactions(id);

    return this.userRepository.delete(id);
  }
}
