import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ENDPOINTS } from '@/constants/endpoints';
import { TransactionType } from '@/types';

interface RequestResult {
  id: string;
  name: string;
  status: number | null;
  replayed: boolean | null;
  error: string | null;
  duration: number | null;
}

interface IdempotencyLabProps {
  onRefresh: () => Promise<void>;
}

export const IdempotencyLab: React.FC<IdempotencyLabProps> = ({ onRefresh }) => {
  const { currentUser } = useAuth();
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const [amount, setAmount] = useState(500);
  const [type, setType] = useState<TransactionType>('CREDIT');
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<RequestResult[]>([
    { id: '1', name: 'Request A', status: null, replayed: null, error: null, duration: null },
    { id: '2', name: 'Request B', status: null, replayed: null, error: null, duration: null },
    { id: '3', name: 'Request C', status: null, replayed: null, error: null, duration: null }
  ]);

  const handleGenerateKey = () => {
    setIdempotencyKey(crypto.randomUUID());
    resetResults();
  };

  const resetResults = () => {
    setResults([
      { id: '1', name: 'Request A', status: null, replayed: null, error: null, duration: null },
      { id: '2', name: 'Request B', status: null, replayed: null, error: null, duration: null },
      { id: '3', name: 'Request C', status: null, replayed: null, error: null, duration: null }
    ]);
  };

  const handleSendBurst = async () => {
    if (!currentUser) return;
    setIsSending(true);
    resetResults();

    const payload = {
      amount,
      type,
      idempotencyKey: idempotencyKey.trim()
    };

    // Fire 3 identical requests concurrently
    const promises = ['Request A', 'Request B', 'Request C'].map(async (name, idx) => {
      const startTime = performance.now();
      try {
        const res = await fetch(ENDPOINTS.CREATE_TRANSACTION(currentUser.id), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const duration = Math.round(performance.now() - startTime);
        const text = await res.text();
        
        if (res.ok) {
          const data = JSON.parse(text);
          return {
            id: String(idx + 1),
            name,
            status: res.status,
            replayed: data.replayed ?? false,
            error: null,
            duration
          };
        } else {
          let errText = text;
          try {
            const errObj = JSON.parse(text);
            errText = errObj.message || errText;
          } catch {}
          return {
            id: String(idx + 1),
            name,
            status: res.status,
            replayed: null,
            error: errText || 'Server Error',
            duration
          };
        }
      } catch (err: any) {
        const duration = Math.round(performance.now() - startTime);
        return {
          id: String(idx + 1),
          name,
          status: 0,
          replayed: null,
          error: err.message || 'Network Failure',
          duration
        };
      }
    });

    const outcomes = await Promise.all(promises);
    setResults(outcomes);
    
    // Refresh global balance and lists
    await onRefresh();
    setIsSending(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Settings Column */}
      <Card className="lg:col-span-2 border border-slate-800 bg-slate-900/10 backdrop-blur-sm flex flex-col gap-5">
        <div>
          <h3 className="text-md font-bold text-slate-200">Idempotency Controls</h3>
          <p className="text-xs text-slate-500 mt-0.5">Configure transaction attributes</p>
        </div>

        {/* Idempotency Key */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-400">Idempotency Key</label>
          <div className="flex gap-2">
            <Input
              id="idempotency-key-input"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              disabled={isSending}
              placeholder="Unique UUID..."
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleGenerateKey}
              disabled={isSending}
              className="px-4"
              title="Generate New UUID Key"
            >
              Rotate
            </Button>
          </div>
        </div>

        {/* Transaction settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Transaction Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              disabled={isSending}
              className="glass-input px-3 py-2 rounded-xl text-sm text-slate-200 font-semibold focus:ring-indigo-500/20 w-full"
            >
              <option value="CREDIT" className="bg-slate-950">CREDIT (Deposit)</option>
              <option value="DEBIT" className="bg-slate-950">DEBIT (Withdrawal)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={isSending}
              className="glass-input px-3 py-2 rounded-xl text-sm text-slate-200 font-semibold focus:ring-indigo-500/20 w-full font-mono"
            />
          </div>
        </div>

        <Button
          onClick={handleSendBurst}
          className="w-full mt-2"
          isLoading={isSending}
        >
          Send Concurrent Burst (3x)
        </Button>
      </Card>

      {/* Results Column */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <div>
          <h3 className="text-md font-bold text-slate-200">Replay Results</h3>
          <p className="text-xs text-slate-500 mt-0.5">Response telemetry for the concurrent batch</p>
        </div>

        {/* Result grid cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.map((res) => {
            const isIdle = res.status === null;
            const isSuccess = res.status !== null && res.status >= 200 && res.status < 300 && !res.error;
            const isReplay = res.replayed === true;
            
            return (
              <div
                key={res.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between min-h-[140px] transition-all duration-300 ${
                  isIdle
                    ? 'border-slate-800 bg-slate-950/20'
                    : !isSuccess
                    ? 'border-rose-900/60 bg-rose-950/10 glow-crimson'
                    : isReplay
                    ? 'border-amber-900/60 bg-amber-950/10 glow-indigo'
                    : 'border-emerald-900/60 bg-emerald-950/10 glow-emerald'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">{res.name}</span>
                    {res.duration !== null && (
                      <span className="text-[10px] font-mono text-slate-500">{res.duration}ms</span>
                    )}
                  </div>

                  <div className="mt-3">
                    {isIdle ? (
                      <span className="text-xs text-slate-600 italic">Waiting...</span>
                    ) : res.error ? (
                      <div className="text-rose-400 font-semibold text-sm">
                        HTTP {res.status}
                        <span className="text-[10px] block font-normal text-rose-500/80 mt-1 leading-relaxed break-all">
                          {res.error}
                        </span>
                      </div>
                    ) : (
                      <div className="text-slate-100 font-bold text-sm">
                        HTTP {res.status}
                        <div className="mt-2.5">
                          {isReplay ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/50 text-amber-400 border border-amber-900/40 select-none">
                              REPLAY (HTTP 200)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 select-none">
                              CREATED (HTTP 201)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!isIdle && isSuccess && (
                  <div className="text-[10px] font-mono text-slate-500 mt-2 border-t border-slate-900/60 pt-2">
                    {isReplay ? 'Cached Response Served' : 'New Transaction Written'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Experiment guide */}
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40 text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-400 block mb-1">Idempotency Guide:</span>
          <p>
            When you fire multiple concurrent requests sharing the same <code>idempotencyKey</code>, PostgreSQL transaction constraints ensure exactly <strong>one</strong> thread creates the transaction (returning <code>HTTP 201 Created</code>, <code>replayed=false</code>). The remaining threads are caught by the transaction validation checker, reading the already-written state and safely returning the identical response (returning <code>HTTP 200 OK</code>, <code>replayed=true</code>) without duplicating operations.
          </p>
        </div>
      </div>
    </div>
  );
};
