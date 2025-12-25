import { GetUsersUseCase } from '../../src/application/usecases/GetUsersUseCase';
import { UserRepository } from '../../src/domain/repositories/UserRepository';

const createMockRepository = (): jest.Mocked<UserRepository> => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('GetUsersUseCase', () => {
  let useCase: GetUsersUseCase;
  let mockRepository: jest.Mocked<UserRepository>;

  const mockUsers = [
    {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'user-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new GetUsersUseCase(mockRepository);
  });

  it('should return all users', async () => {
    mockRepository.findAll.mockResolvedValue(mockUsers);

    const result = await useCase.execute();

    expect(result).toEqual(mockUsers);
    expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no users exist', async () => {
    mockRepository.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});
