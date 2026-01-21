import { GetTransactionsUseCase } from '../../src/application/usecases/GetTransactionsUseCase.js';
import { TransactionRepository } from '../../src/domain/repositories/TransactionRepository.js';
import { TransactionType } from '../../src/domain/entities/Transaction.js';

const createMockRepository = (): jest.Mocked<TransactionRepository> => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  getBalance: jest.fn(),
  deleteByUserId: jest.fn(),
});

describe('GetTransactionsUseCase', () => {
  let useCase: GetTransactionsUseCase;
  let mockRepository: jest.Mocked<TransactionRepository>;

  const mockTransactions = [
    {
      id: 'tx-1',
      userId: 'user-123',
      type: TransactionType.CREDIT,
      amount: 100.00,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'tx-2',
      userId: 'user-123',
      type: TransactionType.DEBIT,
      amount: 50.00,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new GetTransactionsUseCase(mockRepository);
  });

  it('should return all transactions without filter', async () => {
    mockRepository.findAll.mockResolvedValue(mockTransactions);

    const result = await useCase.execute();

    expect(result).toEqual(mockTransactions);
    expect(mockRepository.findAll).toHaveBeenCalledWith(undefined);
  });

  it('should return transactions filtered by userId', async () => {
    const filter = { userId: 'user-123' };
    mockRepository.findAll.mockResolvedValue(mockTransactions);

    const result = await useCase.execute(filter);

    expect(result).toEqual(mockTransactions);
    expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
  });

  it('should return transactions filtered by type', async () => {
    const filter = { type: TransactionType.CREDIT };
    const creditTransactions = mockTransactions.filter(t => t.type === TransactionType.CREDIT);
    mockRepository.findAll.mockResolvedValue(creditTransactions);

    const result = await useCase.execute(filter);

    expect(result).toEqual(creditTransactions);
    expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
  });

  it('should return empty array when no transactions found', async () => {
    mockRepository.findAll.mockResolvedValue([]);

    const result = await useCase.execute({ userId: 'non-existent' });

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});
