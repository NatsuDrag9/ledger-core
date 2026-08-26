import React from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LedgerProvider } from '@/context/LedgerContext';
import { Login } from '@/modules/Login/Login';
import { Dashboard } from '@/modules/Dashboard/Dashboard';
import { Toaster } from 'react-hot-toast';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Login />;
  }

  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <LedgerProvider>
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #1e293b',
            },
          }}
        />
      </LedgerProvider>
    </AuthProvider>
  );
}

export default App;
