import { DeleteUserTransactionsUseCase } from '../../src/application/usecases/DeleteUserTransactionsUseCase';
import { TransactionRepository } from '../../src/domain/repositories/TransactionRepository';

const createMockRepository = (): jest.Mocked<TransactionRepository> => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  getBalance: jest.fn(),
  deleteByUserId: jest.fn(),
});

describe('DeleteUserTransactionsUseCase', () => {
  let useCase: DeleteUserTransactionsUseCase;
  let mockRepository: jest.Mocked<TransactionRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new DeleteUserTransactionsUseCase(mockRepository);
  });

  it('should delete all transactions for a user', async () => {
    const userId = 'user-123';
    mockRepository.deleteByUserId.mockResolvedValue(5);

    const result = await useCase.execute(userId);

    expect(result).toEqual({
      success: true,
      deletedCount: 5,
    });
    expect(mockRepository.deleteByUserId).toHaveBeenCalledWith(userId);
    expect(mockRepository.deleteByUserId).toHaveBeenCalledTimes(1);
  });

  it('should return zero deletedCount when user has no transactions', async () => {
    const userId = 'user-no-transactions';
    mockRepository.deleteByUserId.mockResolvedValue(0);

    const result = await useCase.execute(userId);

    expect(result).toEqual({
      success: true,
      deletedCount: 0,
    });
  });

  it('should throw error when userId is empty', async () => {
    await expect(useCase.execute('')).rejects.toThrow('User ID is required');
    expect(mockRepository.deleteByUserId).not.toHaveBeenCalled();
  });
});
