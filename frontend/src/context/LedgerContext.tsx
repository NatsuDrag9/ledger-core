import React, { createContext, useContext, useState } from 'react';
import { Transaction } from '@/types';

interface LedgerContextType {
  balance: number | null;
  setBalance: (balance: number | null) => void;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  clearState: () => void;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearState = () => {
    setBalance(null);
    setTransactions([]);
    setError(null);
    setIsLoading(false);
  };

  return (
    <LedgerContext.Provider
      value={{
        balance,
        setBalance,
        transactions,
        setTransactions,
        isLoading,
        setIsLoading,
        error,
        setError,
        clearState
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (context === undefined) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
};
