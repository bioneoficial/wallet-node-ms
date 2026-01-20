import { z } from 'zod';

export const createTransactionSchema = z.object({
  amount: z.number().positive('Amount must be a positive number'),
  type: z.enum(['CREDIT', 'DEBIT']),
});

export const getTransactionsQuerySchema = z.object({
  type: z.enum(['CREDIT', 'DEBIT']).optional(),
});

export const balanceQuerySchema = z.object({
  user_id: z.string().uuid('Invalid user ID format').optional(),
});

export type CreateTransactionBody = z.infer<typeof createTransactionSchema>;
export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>;
export type BalanceQuery = z.infer<typeof balanceQuerySchema>;
