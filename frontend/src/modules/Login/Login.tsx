import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ENDPOINTS } from '@/constants/endpoints';
import { Shield, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface SeededUser {
  id: string;
  username: string;
  balance: number;
}

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [userIdInput, setUserIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [seededUsers, setSeededUsers] = useState<SeededUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const res = await fetch(ENDPOINTS.LIST_USERS);
        if (res.ok) {
          const data = await res.json();
          setSeededUsers(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedId = userIdInput.trim();
    if (!trimmedId) {
      setError('User UUID is required');
      toast.error('User UUID is required');
      return;
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedId)) {
      setError('Please enter a valid UUID format');
      toast.error('Invalid UUID format');
      return;
    }

    setIsValidating(true);
    try {
      // Validate that the user exists on the backend
      const res = await fetch(ENDPOINTS.GET_USER(trimmedId));
      if (!res.ok) {
        if (res.status === 404 || res.status === 400) {
          throw new Error('User UUID not found in database. Make sure the backend is seeded.');
        }
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      const userData = await res.json();
      
      // Save session
      login({
        id: userData.id,
        username: userData.username
      });
      toast.success(`Welcome, ${userData.username}!`);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || 'Failed to authenticate user UUID';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsValidating(false);
    }
  };

  const renderQuickSelect = () => {
    if (isLoadingUsers) {
      return (
        <div className="flex items-center justify-center p-4 border border-indigo-950/40 bg-indigo-950/10 rounded-xl">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 ml-2.5">Loading profiles...</span>
        </div>
      );
    }

    if (seededUsers.length === 0) {
      return null;
    }

    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Quick-Select Test Profiles:</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {seededUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                setUserIdInput(user.id);
                setError(null);
              }}
              className="flex items-center justify-between p-3 rounded-xl border border-indigo-950/60 bg-indigo-950/15 hover:bg-indigo-950/30 hover:border-indigo-500/40 transition-all text-left group"
            >
              <div>
                <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                  {user.username}
                </div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5 select-all">{user.id}</div>
              </div>
              <div className="text-xs font-mono font-bold text-slate-400">
                ₹{user.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#0c1020] via-[#090b11] to-[#04060b]">
      <Card className="w-full max-w-md border border-indigo-950/40 glow-indigo">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Ledger Concurrency Lab</h1>
          <p className="text-slate-400 text-sm mt-1">Transaction simulation and safety sandbox</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            id="user-uuid"
            label="User UUID"
            placeholder="e.g. 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            error={error || undefined}
            disabled={isValidating}
            autoFocus
          />

          {renderQuickSelect()}

          <Button type="submit" className="w-full" isLoading={isValidating}>
            Enter Lab Sandbox
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-900 text-xs text-slate-500 space-y-2">
          <p className="font-semibold text-slate-400">Instructions to get started:</p>
          <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
            <li>Ensure the Spring Boot backend application is running and databases are seeded.</li>
            <li>Click on any of the quick-select test profiles above to automatically populate the UUID.</li>
            <li>Alternatively, manually paste any valid user UUID and click "Enter Lab Sandbox".</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};
