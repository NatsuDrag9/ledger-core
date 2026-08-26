import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ENDPOINTS } from '@/constants/endpoints';
import { TransactionType } from '@/types';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface NewTxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export const NewTxModal: React.FC<NewTxModalProps> = ({ isOpen, onClose, onRefresh }) => {
  const { currentUser } = useAuth();
  const [type, setType] = useState<TransactionType>('DEBIT');
  const [amount, setAmount] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [customKey, setCustomKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const generateNewKey = () => {
    setIdempotencyKey(crypto.randomUUID());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        amount: parsedAmount,
        type,
        idempotencyKey: customKey ? idempotencyKey.trim() : crypto.randomUUID(),
      };

      const res = await fetch(ENDPOINTS.CREATE_TRANSACTION(currentUser.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      if (!res.ok) {
        let errMsg = `Failed to create transaction (${res.status})`;
        try {
          const errData = JSON.parse(text);
          errMsg = errData.message || errMsg;
        } catch {
          if (text) errMsg = text;
        }
        throw new Error(errMsg);
      }

      const responseData = JSON.parse(text);
      const isReplay = responseData.replayed === true;

      // Toast Success
      if (isReplay) {
        toast.success('Transaction Replayed Successfully (Idempotent)!');
      } else {
        toast.success('Transaction Recorded Successfully!');
      }

      await onRefresh();
      onClose();
      // Reset form
      setAmount('');
      setType('DEBIT');
      setCustomKey(false);
      setIdempotencyKey(crypto.randomUUID());
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || 'An error occurred during submission.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-200">
        <Card className="border border-indigo-950/60 bg-slate-950/90 shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-lg font-bold text-slate-100 mb-6">Record New Transaction</h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Transaction Type Select using HTML select */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tx-type-select" className="text-sm font-medium text-slate-400">
                Transaction Type
              </label>
              <select
                id="tx-type-select"
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                disabled={isSubmitting}
                className="glass-input px-3 py-2 mt-1 rounded-xl text-sm text-slate-200 font-semibold focus:ring-indigo-500/20 w-full"
              >
                <option value="DEBIT" className="bg-slate-950 text-slate-200">DEBIT (Withdrawal)</option>
                <option value="CREDIT" className="bg-slate-950 text-slate-200">CREDIT (Deposit)</option>
              </select>
            </div>

            {/* Amount */}
            <Input
              id="tx-amount"
              label="Transaction Amount (₹)"
              placeholder="e.g. 500.00"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
            />

            {/* Idempotency Key Option */}
            <div className="space-y-3 pt-2 border-t border-slate-900/80">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={customKey}
                  onChange={(e) => setCustomKey(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-600/20"
                />
                Use Reusable Idempotency Key (Deduplication Test)
              </label>
              <p className="text-[10px] text-slate-500 leading-normal">
                Checking this locks the transaction ID. If you submit this form twice with the same key, the backend detects the duplicate and prevents charging/depositing money a second time (double-spending protection).
              </p>

              {customKey && (
                <div className="flex gap-2 items-end">
                  <Input
                    id="tx-idempotency"
                    placeholder="Enter unique key..."
                    value={idempotencyKey}
                    onChange={(e) => setIdempotencyKey(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={generateNewKey}
                    className="py-[11px]"
                    title="Generate New UUID"
                  >
                    Rotate Key
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <div className="text-xs text-rose-500 font-medium bg-rose-950/20 border border-rose-900/40 rounded-xl p-3">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-900/80">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Submit Transaction
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
