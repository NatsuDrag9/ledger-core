import React, { createContext, useContext, useState } from 'react';
import { UserSession } from '@/types';

interface AuthContextType {
  currentUser: UserSession | null;
  setCurrentUser: (user: UserSession | null) => void;
  login: (user: UserSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = sessionStorage.getItem('ledger_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (user: UserSession) => {
    setCurrentUser(user);
    sessionStorage.setItem('ledger_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('ledger_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
