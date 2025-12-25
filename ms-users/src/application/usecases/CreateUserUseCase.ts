import bcrypt from 'bcrypt';
import { User, CreateUserInput } from '../../domain/entities/User.js';
import { UserRepository } from '../../domain/repositories/UserRepository.js';

export class CreateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: CreateUserInput): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    return this.userRepository.create({
      ...input,
      password: hashedPassword,
    });
  }
}
