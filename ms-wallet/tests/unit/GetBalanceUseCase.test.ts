import { GetBalanceUseCase } from '../../src/application/usecases/GetBalanceUseCase.js';
import { TransactionRepository } from '../../src/domain/repositories/TransactionRepository.js';

const createMockRepository = (): jest.Mocked<TransactionRepository> => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  getBalance: jest.fn(),
  deleteByUserId: jest.fn(),
});

describe('GetBalanceUseCase', () => {
  let useCase: GetBalanceUseCase;
  let mockRepository: jest.Mocked<TransactionRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new GetBalanceUseCase(mockRepository);
  });

  it('should return balance for a user with transactions', async () => {
    const userId = 'user-123';
    const expectedBalance = { amount: 150.50 };

    mockRepository.getBalance.mockResolvedValue(expectedBalance);

    const result = await useCase.execute(userId);

    expect(result).toEqual(expectedBalance);
    expect(mockRepository.getBalance).toHaveBeenCalledWith(userId);
    expect(mockRepository.getBalance).toHaveBeenCalledTimes(1);
  });

  it('should return zero balance for user with no transactions', async () => {
    const userId = 'user-new';
    const expectedBalance = { amount: 0 };

    mockRepository.getBalance.mockResolvedValue(expectedBalance);

    const result = await useCase.execute(userId);

    expect(result).toEqual(expectedBalance);
    expect(result.amount).toBe(0);
  });

  it('should throw error when userId is empty', async () => {
    await expect(useCase.execute('')).rejects.toThrow('User ID is required');
    expect(mockRepository.getBalance).not.toHaveBeenCalled();
  });
});
