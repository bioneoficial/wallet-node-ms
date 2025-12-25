import bcrypt from 'bcrypt';
import { User, UpdateUserInput } from '../../domain/entities/User.js';
import { UserRepository } from '../../domain/repositories/UserRepository.js';

export class UpdateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string, input: UpdateUserInput): Promise<User | null> {
    const existingUser = await this.userRepository.findById(id);

    if (!existingUser) {
      return null;
    }

    if (input.email && input.email !== existingUser.email) {
      const userWithEmail = await this.userRepository.findByEmail(input.email);
      if (userWithEmail) {
        throw new Error('Email already in use');
      }
    }

    const updateData: UpdateUserInput = { ...input };

    if (input.password) {
      updateData.password = await bcrypt.hash(input.password, 10);
    }

    return this.userRepository.update(id, updateData);
  }
}
