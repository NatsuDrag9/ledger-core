export type LabType = 'CONCURRENCY' | 'IDEMPOTENCY';
export type TransactionType = 'CREDIT' | 'DEBIT';

export interface UserSession {
  id: string;
  username: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  idempotencyKey: string;
  replayed: boolean;
  createdAt: string;
}
