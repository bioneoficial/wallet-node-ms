import { z } from 'zod';

export const createUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateUserSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email('Invalid email format').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export const authSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const idempotencyKeyHeaderSchema = z
  .object({
    'idempotency-key': z.string().min(1, 'Idempotency key is required'),
  })
  .passthrough();

export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type AuthBody = z.infer<typeof authSchema>;
export type IdempotencyKeyHeader = z.infer<typeof idempotencyKeyHeaderSchema>;
