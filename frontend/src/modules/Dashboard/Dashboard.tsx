import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLedger } from '@/context/LedgerContext';
import { UserProfile } from './UserProfile';
import { ConcurrencyLab } from './ConcurrencyLab';
import { IdempotencyLab } from './IdempotencyLab';
import { TransactionHistory } from './TransactionHistory';
import { NewTxModal } from './NewTxModal';
import { Button } from '@/components/Button';
import { ENDPOINTS } from '@/constants/endpoints';
import { LabType } from '@/types';
import { Plus, FlaskConical } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { setBalance, setTransactions, setIsLoading, setError } = useLedger();
  const [activeTab, setActiveTab] = useState<LabType>('CONCURRENCY');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const refreshData = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const [profileRes, txRes] = await Promise.all([
        fetch(ENDPOINTS.GET_USER(currentUser.id)),
        fetch(`${ENDPOINTS.GET_TRANSACTIONS(currentUser.id)}?size=50`)
      ]);

      if (!profileRes.ok) {
        throw new Error(`Profile sync failed: ${profileRes.statusText}`);
      }
      if (!txRes.ok) {
        throw new Error(`Transaction sync failed: ${txRes.statusText}`);
      }

      const profileData = await profileRes.json();
      const txData = await txRes.json();

      setBalance(profileData.balance);
      setTransactions(txData.content || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to refresh ledger data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser?.id]);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070913] via-[#0b0f19] to-[#04050a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Navigation / Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black tracking-tighter text-xl glow-indigo">
              L
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Ledger Core</h1>
              <p className="text-xs text-slate-500 font-mono">LABORATORY SANDBOX</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsTxModalOpen(true)}
              className="font-semibold text-xs tracking-wide py-2 px-4 bg-indigo-600/80 hover:bg-indigo-600 transition-all gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Transaction
            </Button>
          </div>
        </header>

        {/* User profile section */}
        <UserProfile onRefresh={refreshData} />

        {/* Lab Navigation Tabs */}
        <div className="flex border-b border-slate-900 pb-px">
          <button
            onClick={() => setActiveTab('CONCURRENCY')}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'CONCURRENCY'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-indigo-950/10'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            Concurrency Laboratory
          </button>
          <button
            onClick={() => setActiveTab('IDEMPOTENCY')}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'IDEMPOTENCY'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-indigo-950/10'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            Idempotency Laboratory
          </button>
        </div>

        {/* Lab Playground Area */}
        <main className="py-2">
          {activeTab === 'CONCURRENCY' ? (
            <ConcurrencyLab onRefresh={refreshData} />
          ) : (
            <IdempotencyLab onRefresh={refreshData} />
          )}
        </main>

        {/* Transaction History Audit Logs */}
        <section className="pt-4">
          <TransactionHistory />
        </section>

        {/* Footer */}
        <footer className="text-center text-[10px] font-mono text-slate-600 pt-8 pb-4">
          LEDGER CONCURRENCY LAB • SECURED WITH TRANSACTION TEMPLATES & ROW LOCKING
        </footer>
      </div>

      {/* Manual Tx Dialog */}
      <NewTxModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onRefresh={refreshData}
      />
    </div>
  );
};
