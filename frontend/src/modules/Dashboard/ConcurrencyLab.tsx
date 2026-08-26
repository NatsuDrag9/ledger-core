import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LogConsole, LogEntry } from '@/components/LogConsole';
import { ENDPOINTS } from '@/constants/endpoints';

interface ConcurrencyLabProps {
  onRefresh: () => Promise<void>;
}

export const ConcurrencyLab: React.FC<ConcurrencyLabProps> = ({ onRefresh }) => {
  const { currentUser } = useAuth();
  const [lockType, setLockType] = useState<'DB' | 'JVM'>('DB');
  const [disableLocking, setDisableLocking] = useState(false);
  const [threadCount, setThreadCount] = useState(2);
  const [debitAmount, setDebitAmount] = useState(80);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const addLog = (message: string, type: LogEntry['type'] = 'info', threadId?: number) => {
    const newEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
      type,
      message,
      threadId
    };
    setLogs((prev) => [...prev, newEntry]);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const runSimulation = async () => {
    if (!currentUser) return;
    
    setIsSimulating(true);
    handleClearLogs();
    
    addLog(`Starting Simulation Lab: ${lockType === 'DB' ? 'Database-Level Locking' : 'Application-Level Locking'}`, 'info');
    addLog(`Safety Lock state: ${disableLocking ? 'DISABLED (Race Condition Mode)' : 'ENABLED (Serialized Mode)'}`, disableLocking ? 'warning' : 'success');
    addLog(`Firing ${threadCount} parallel debit requests of ₹${debitAmount} concurrently...`, 'info');

    // Prepare HTTP requests
    const requests = Array.from({ length: threadCount }).map(async (_, idx) => {
      const threadId = idx + 1;
      const idempotencyKey = crypto.randomUUID();
      const startTime = performance.now();
      
      addLog(`Initiated DEBIT request (Idempotency: ${idempotencyKey.substring(0, 8)}...)`, 'info', threadId);

      try {
        let url = '';
        if (lockType === 'DB') {
          url = `${ENDPOINTS.CREATE_TRANSACTION(currentUser.id)}?disableLocking=${disableLocking}`;
        } else {
          url = `${ENDPOINTS.CREATE_TRANSACTION_JVM(currentUser.id)}?disableJvmLocking=${disableLocking}`;
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: debitAmount,
            type: 'DEBIT',
            idempotencyKey
          })
        });

        const duration = Math.round(performance.now() - startTime);
        const text = await res.text();

        if (res.ok) {
          const data = JSON.parse(text);
          addLog(`Success! HTTP ${res.status}. Balance After: ₹${data.balanceAfter}. (Time: ${duration}ms)`, 'success', threadId);
          return { success: true, threadId };
        } else {
          let errorDetails = text;
          try {
            const errObj = JSON.parse(text);
            errorDetails = errObj.message || errorDetails;
          } catch {}
          addLog(`Rejected: HTTP ${res.status} Bad Request. Reason: "${errorDetails}". (Time: ${duration}ms)`, 'error', threadId);
          return { success: false, threadId };
        }
      } catch (err: any) {
        const duration = Math.round(performance.now() - startTime);
        addLog(`Network Error: ${err.message || err}. (Time: ${duration}ms)`, 'error', threadId);
        return { success: false, threadId };
      }
    });

    // Fire concurrently
    const results = await Promise.all(requests);
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    addLog(`Simulation Completed. Total Successes: ${successCount}, Failures: ${failureCount}`, 'info');
    
    // Refresh global balance and transaction list
    await onRefresh();
    setIsSimulating(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Settings Panel */}
      <Card className="lg:col-span-2 border border-slate-800 bg-slate-900/10 backdrop-blur-sm flex flex-col gap-6">
        <div>
          <h3 className="text-md font-bold text-slate-200">Simulation Settings</h3>
          <p className="text-xs text-slate-500 mt-0.5">Configure concurrency variables</p>
        </div>

        {/* Lock Type */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-400">Lock Architecture</span>
          <div className="grid grid-cols-1 gap-2 mt-1">
            <button
              onClick={() => setLockType('DB')}
              disabled={isSimulating}
              className={`py-3 px-4 rounded-xl text-left border transition-all duration-200 flex flex-col gap-1 ${
                lockType === 'DB'
                  ? 'bg-indigo-950/20 text-indigo-400 border-indigo-500/40 glow-indigo'
                  : 'bg-slate-900/40 text-slate-400 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <span className="font-bold text-sm">Database-Level Locking</span>
              <span className="text-[10px] text-slate-500 font-normal">
                Utilizes PostgreSQL row-level locks via SELECT ... FOR UPDATE.
              </span>
            </button>
            <button
              onClick={() => setLockType('JVM')}
              disabled={isSimulating}
              className={`py-3 px-4 rounded-xl text-left border transition-all duration-200 flex flex-col gap-1 ${
                lockType === 'JVM'
                  ? 'bg-indigo-950/20 text-indigo-400 border-indigo-500/40 glow-indigo'
                  : 'bg-slate-900/40 text-slate-400 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <span className="font-bold text-sm">Application-Level (JVM Mutex)</span>
              <span className="text-[10px] text-slate-500 font-normal">
                Uses in-memory monitor locks synchronized per User UUID.
              </span>
            </button>
          </div>
        </div>

        {/* Safety Toggle */}
        <div className="bg-slate-950/60 border border-slate-900/80 rounded-2xl p-4 flex items-start gap-3">
          <input
            type="checkbox"
            id="safety-toggle"
            checked={disableLocking}
            onChange={(e) => setDisableLocking(e.target.checked)}
            disabled={isSimulating}
            className="mt-1 rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-indigo-600/20 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="safety-toggle" className="cursor-pointer select-none">
            <span className="text-xs font-bold text-slate-200 block">Disable safety locking mechanism</span>
            <span className="text-[10px] text-slate-500 block mt-0.5 leading-relaxed">
              Forces concurrent threads to execute balance checks simultaneously. Simulates Time-of-Check to Time-of-Use (TOCTOU) race condition with a 100ms artificial delay.
            </span>
          </label>
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Parallel Threads</label>
            <select
              value={threadCount}
              onChange={(e) => setThreadCount(Number(e.target.value))}
              disabled={isSimulating}
              className="glass-input px-3 py-2 rounded-xl text-sm text-slate-200 font-semibold focus:ring-indigo-500/20 w-full"
            >
              {[2, 3, 4, 5, 8, 10].map((n) => (
                <option key={n} value={n} className="bg-slate-950">
                  {n} threads
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Amount Per Thread</label>
            <input
              type="number"
              value={debitAmount}
              onChange={(e) => setDebitAmount(Number(e.target.value))}
              disabled={isSimulating}
              min="1"
              className="glass-input px-3 py-2 rounded-xl text-sm text-slate-200 font-semibold focus:ring-indigo-500/20 w-full font-mono"
            />
          </div>
        </div>

        <Button
          onClick={runSimulation}
          className="w-full mt-2"
          isLoading={isSimulating}
          variant={disableLocking ? 'danger' : 'primary'}
        >
          {disableLocking ? 'Simulate Race Condition' : 'Run Safe Simulation'}
        </Button>
      </Card>

      {/* Log Console Output */}
      <div className="lg:col-span-3 flex flex-col justify-between h-full min-h-[380px]">
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h3 className="text-md font-bold text-slate-200">Simulation Console Logs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Thread execution telemetry</p>
            </div>
          </div>
          <LogConsole logs={logs} />
        </div>

        {/* Helpful hints */}
        <div className="mt-4 p-4 rounded-xl border border-slate-900 bg-slate-950/40 text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-400 block mb-1">Experiment Guide:</span>
          {disableLocking ? (
            <p>
              In <strong className="text-rose-400">Lock Disabled</strong> mode, both threads check the balance concurrently before either completes. If your balance is ₹100 and 2 parallel threads execute ₹80 debits, both will see ₹100, pass validations, and record two debits, resulting in ₹-60 balance (or double-spending)!
            </p>
          ) : (
            <p>
              In <strong className="text-indigo-400">Lock Enabled</strong> mode, requests are serialized. The first thread locks the user record, runs validations, deducts balance, and commits. The second thread waits, reads the newly deducted balance, fails validation, and aborts with a 400 Bad Request (Insufficient Balance).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
