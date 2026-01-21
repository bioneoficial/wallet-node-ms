import { z } from 'zod';

export const createTransactionSchema = z.object({
  amount: z.number().positive('Amount must be a positive number'),
  type: z.enum(['CREDIT', 'DEBIT']),
});

export const getTransactionsQuerySchema = z.object({
  type: z.enum(['CREDIT', 'DEBIT']).optional(),
});

export const idempotencyKeyHeaderSchema = z
  .object({
    'idempotency-key': z.string().min(1, 'Idempotency key is required'),
  })
  .passthrough();

export const balanceQuerySchema = z.object({
  user_id: z.string().uuid('Invalid user ID format').optional(),
});

export type CreateTransactionBody = z.infer<typeof createTransactionSchema>;
export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>;
export type BalanceQuery = z.infer<typeof balanceQuerySchema>;
export type IdempotencyKeyHeader = z.infer<typeof idempotencyKeyHeaderSchema>;
