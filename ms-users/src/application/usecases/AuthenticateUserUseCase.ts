import bcrypt from 'bcryptjs';
import { UserRepository } from '../../domain/repositories/UserRepository.js';
import { UserResponse } from '../../domain/entities/User.js';

export interface AuthResult {
  user: UserResponse;
  accessToken: string;
}

export interface TokenGenerator {
  sign(payload: { sub: string; email: string }): string;
}

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenGenerator: TokenGenerator
  ) {}

  async execute(email: string, password: string): Promise<AuthResult | null> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const accessToken = this.tokenGenerator.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      accessToken,
    };
  }
}
