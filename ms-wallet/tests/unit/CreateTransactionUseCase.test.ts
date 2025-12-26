import { CreateTransactionUseCase } from '../../src/application/usecases/CreateTransactionUseCase';
import { TransactionRepository } from '../../src/domain/repositories/TransactionRepository';
import { TransactionType } from '../../src/domain/entities/Transaction';

const createMockRepository = (): jest.Mocked<TransactionRepository> => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  getBalance: jest.fn(),
  deleteByUserId: jest.fn(),
});

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;
  let mockRepository: jest.Mocked<TransactionRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new CreateTransactionUseCase(mockRepository);
  });

  it('should create a credit transaction successfully', async () => {
    const input = {
      userId: 'user-123',
      type: TransactionType.CREDIT,
      amount: 100.50,
    };

    const expectedTransaction = {
      id: 'tx-1',
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRepository.create.mockResolvedValue(expectedTransaction);

    const result = await useCase.execute(input);

    expect(result).toEqual(expectedTransaction);
    expect(mockRepository.create).toHaveBeenCalledWith(input);
    expect(mockRepository.create).toHaveBeenCalledTimes(1);
  });

  it('should create a debit transaction successfully', async () => {
    const input = {
      userId: 'user-123',
      type: TransactionType.DEBIT,
      amount: 50.00,
    };

    const expectedTransaction = {
      id: 'tx-2',
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRepository.create.mockResolvedValue(expectedTransaction);

    const result = await useCase.execute(input);

    expect(result).toEqual(expectedTransaction);
    expect(mockRepository.create).toHaveBeenCalledWith(input);
  });

  it('should throw error when amount is zero', async () => {
    const input = {
      userId: 'user-123',
      type: TransactionType.CREDIT,
      amount: 0,
    };

    await expect(useCase.execute(input)).rejects.toThrow('Amount must be greater than zero');
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('should throw error when amount is negative', async () => {
    const input = {
      userId: 'user-123',
      type: TransactionType.DEBIT,
      amount: -50,
    };

    await expect(useCase.execute(input)).rejects.toThrow('Amount must be greater than zero');
    expect(mockRepository.create).not.toHaveBeenCalled();
  });
});
