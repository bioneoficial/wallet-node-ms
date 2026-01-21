import { AuthenticateUserUseCase, TokenGenerator } from '../../src/application/usecases/AuthenticateUserUseCase.js';
import { UserRepository } from '../../src/domain/repositories/UserRepository.js';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

import bcrypt from 'bcryptjs';

const createMockRepository = (): jest.Mocked<UserRepository> => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const createMockTokenGenerator = (): jest.Mocked<TokenGenerator> => ({
  sign: jest.fn(),
});

describe('AuthenticateUserUseCase', () => {
  let useCase: AuthenticateUserUseCase;
  let mockRepository: jest.Mocked<UserRepository>;
  let mockTokenGenerator: jest.Mocked<TokenGenerator>;

  const mockUser = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockTokenGenerator = createMockTokenGenerator();
    useCase = new AuthenticateUserUseCase(mockRepository, mockTokenGenerator);
  });

  it('should authenticate user successfully', async () => {
    mockRepository.findByEmail.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockTokenGenerator.sign.mockReturnValue('jwt_token');

    const result = await useCase.execute('john@example.com', 'password123');

    expect(result).toEqual({
      user: {
        id: mockUser.id,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        email: mockUser.email,
      },
      accessToken: 'jwt_token',
    });
    expect(mockRepository.findByEmail).toHaveBeenCalledWith('john@example.com');
    expect(mockTokenGenerator.sign).toHaveBeenCalledWith({
      sub: mockUser.id,
      email: mockUser.email,
    });
  });

  it('should return null when user not found', async () => {
    mockRepository.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute('notfound@example.com', 'password123');

    expect(result).toBeNull();
    expect(mockTokenGenerator.sign).not.toHaveBeenCalled();
  });

  it('should return null when password is invalid', async () => {
    mockRepository.findByEmail.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const result = await useCase.execute('john@example.com', 'wrong_password');

    expect(result).toBeNull();
    expect(mockTokenGenerator.sign).not.toHaveBeenCalled();
  });
});
