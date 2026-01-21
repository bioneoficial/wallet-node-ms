import { DeleteUserUseCase, WalletGrpcClient } from '../../src/application/usecases/DeleteUserUseCase.js';
import { UserRepository } from '../../src/domain/repositories/UserRepository.js';

const createMockRepository = (): jest.Mocked<UserRepository> => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const createMockWalletClient = (): jest.Mocked<WalletGrpcClient> => ({
  deleteUserTransactions: jest.fn(),
});

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockRepository: jest.Mocked<UserRepository>;
  let mockWalletClient: jest.Mocked<WalletGrpcClient>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockWalletClient = createMockWalletClient();
    useCase = new DeleteUserUseCase(mockRepository, mockWalletClient);
  });

  it('should delete user and their transactions', async () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRepository.findById.mockResolvedValue(mockUser);
    mockWalletClient.deleteUserTransactions.mockResolvedValue({ success: true, deletedCount: 5 });
    mockRepository.delete.mockResolvedValue(true);

    const result = await useCase.execute(userId);

    expect(result).toBe(true);
    expect(mockRepository.findById).toHaveBeenCalledWith(userId);
    expect(mockWalletClient.deleteUserTransactions).toHaveBeenCalledWith(userId);
    expect(mockRepository.delete).toHaveBeenCalledWith(userId);
  });

  it('should return false when user not found', async () => {
    const userId = 'non-existent';
    mockRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute(userId);

    expect(result).toBe(false);
    expect(mockWalletClient.deleteUserTransactions).not.toHaveBeenCalled();
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });

  it('should return false when userId is empty', async () => {
    mockRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute('');

    expect(result).toBe(false);
  });
});
