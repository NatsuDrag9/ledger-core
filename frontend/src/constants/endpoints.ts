const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1/ledger';

export const ENDPOINTS = {
  LIST_USERS: `${BASE_URL}/users`,
  GET_USER: (userId: string) => `${BASE_URL}/users/${userId}`,
  GET_TRANSACTIONS: (userId: string) => `${BASE_URL}/users/${userId}/transactions`,
  CREATE_TRANSACTION: (userId: string) => `${BASE_URL}/users/${userId}/transactions`,
  CREATE_TRANSACTION_JVM: (userId: string) => `${BASE_URL}/users/${userId}/transactions/jvm-lock`,
};
