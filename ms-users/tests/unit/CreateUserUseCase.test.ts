import { CreateUserUseCase } from '../../src/application/usecases/CreateUserUseCase.js';
import { UserRepository } from '../../src/domain/repositories/UserRepository.js';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

const createMockRepository = (): jest.Mocked<UserRepository> => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new CreateUserUseCase(mockRepository);
  });

  it('should create a user successfully', async () => {
    const input = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    const expectedUser = {
      id: 'user-1',
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: 'hashed_password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue(expectedUser);

    const result = await useCase.execute(input);

    expect(result).toEqual(expectedUser);
    expect(mockRepository.findByEmail).toHaveBeenCalledWith(input.email);
    expect(mockRepository.create).toHaveBeenCalled();
  });

  it('should throw error when email already exists', async () => {
    const input = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'existing@example.com',
      password: 'password123',
    };

    const existingUser = {
      id: 'user-existing',
      firstName: 'Existing',
      lastName: 'User',
      email: input.email,
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRepository.findByEmail.mockResolvedValue(existingUser);

    await expect(useCase.execute(input)).rejects.toThrow('User with this email already exists');
    expect(mockRepository.create).not.toHaveBeenCalled();
  });
});
