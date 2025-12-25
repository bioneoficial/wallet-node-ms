export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionInput {
  userId: string;
  amount: number;
  type: TransactionType;
}

export interface TransactionFilter {
  userId?: string;
  type?: TransactionType;
}
