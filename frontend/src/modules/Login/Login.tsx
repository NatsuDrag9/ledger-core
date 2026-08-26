import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ENDPOINTS } from '@/constants/endpoints';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [userIdInput, setUserIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

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

          <Button type="submit" className="w-full" isLoading={isValidating}>
            Enter Lab Sandbox
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-900 text-xs text-slate-500 space-y-2">
          <p className="font-semibold text-slate-400">Instructions to get started:</p>
          <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
            <li>Ensure the Spring Boot backend application is running.</li>
            <li>Check the backend startup logs in the console to find the pre-seeded profiles:
              <ul className="list-circle pl-4 mt-1 text-slate-600">
                <li><span className="font-medium text-slate-400">Alpha Profile</span> (₹5,000.00)</li>
                <li><span className="font-medium text-slate-400">Beta Profile</span> (₹10,000.00)</li>
                <li><span className="font-medium text-slate-400">Gamma Profile</span> (₹2,500.00)</li>
              </ul>
            </li>
            <li>Copy the UUID of any seeded user and paste it into the field above.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};
