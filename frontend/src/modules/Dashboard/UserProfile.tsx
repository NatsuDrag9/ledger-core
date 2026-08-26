import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLedger } from '@/context/LedgerContext';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { RefreshCw, LogOut, Check, Clipboard } from 'lucide-react';

interface UserProfileProps {
  onRefresh: () => Promise<void>;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onRefresh }) => {
  const { currentUser, logout } = useAuth();
  const { balance, isLoading } = useLedger();
  const [copied, setCopied] = useState(false);

  if (!currentUser) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(currentUser.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBalance = (val: number | null) => {
    if (val === null) return '₹--.--';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val);
  };

  return (
    <Card className="border border-slate-800/80 bg-slate-900/20 backdrop-blur-md relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-indigo-400 font-bold text-lg select-none">
            {currentUser.username.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">{currentUser.username}</h2>
              <span className="text-[10px] bg-slate-800 text-indigo-400 px-2 py-0.5 rounded-full border border-slate-700 font-medium select-none">
                Sandbox Profile
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-mono text-slate-500 truncate max-w-[200px] md:max-w-xs">
                {currentUser.id}
              </span>
              <button
                onClick={handleCopyId}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                title="Copy User ID"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Clipboard className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-8 border-t border-slate-800 md:border-none pt-4 md:pt-0">
          <div className="text-left md:text-right">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Balance</p>
            <p className="text-3xl font-extrabold text-slate-100 mt-1 font-mono tracking-tight">
              {formatBalance(balance)}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh Balance"
              className="p-2.5 rounded-xl"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" onClick={logout} className="text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 gap-1.5">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
