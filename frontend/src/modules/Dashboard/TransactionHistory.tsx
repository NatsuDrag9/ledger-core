import React from 'react';
import { useLedger } from '@/context/LedgerContext';
import { Card } from '@/components/Card';
import { Transaction } from '@/types';
import { History } from 'lucide-react';

export const TransactionHistory: React.FC = () => {
  const { transactions } = useLedger();

  const formatAmount = (tx: Transaction) => {
    const isCredit = tx.type === 'CREDIT';
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(Math.abs(tx.amount));

    return (
      <span className={`font-mono font-semibold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isCredit ? '+' : '-'}{formatted}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const renderNoData = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
        <History className="w-10 h-10 text-slate-700 mb-3" />
        <p className="text-sm font-medium">No transactions found</p>
        <p className="text-xs text-slate-600 mt-1">Execute manually or run a lab simulation.</p>
      </div>
    );
  };

  const renderTable = () => {
    return (
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-xs font-semibold text-slate-500 uppercase border-b border-slate-900/60 pb-2">
            <th className="py-2.5 px-3">Date</th>
            <th className="py-2.5 px-3">Type</th>
            <th className="py-2.5 px-3 text-right">Amount</th>
            <th className="py-2.5 px-3 text-right">Balance After</th>
            <th className="py-2.5 px-3 max-w-[120px] truncate hidden md:table-cell">Idempotency Key</th>
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-slate-900/40">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-slate-900/20 group transition-colors">
              <td className="py-3 px-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                {formatDate(tx.createdAt)}
              </td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold select-none ${
                    tx.type === 'CREDIT' 
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' 
                      : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                  }`}>
                    {tx.type}
                  </span>
                  {tx.replayed && (
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-900/40 select-none animate-pulse"
                      title="This request was replayed and handled by the idempotency system."
                    >
                      REPLAY
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-3 text-right">
                {formatAmount(tx)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-300 font-medium">
                ₹{tx.balanceAfter.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td 
                className="py-3 px-3 text-slate-500 font-mono text-xs max-w-[120px] truncate hidden md:table-cell group-hover:text-slate-400 transition-colors"
                title={tx.idempotencyKey}
              >
                {tx.idempotencyKey}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <Card className="border border-slate-800/80 bg-slate-900/10 backdrop-blur-sm flex flex-col h-[400px]">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div>
          <h3 className="text-md font-bold text-slate-200">Transaction History</h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time ledger audit trails</p>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {transactions.length} total entries
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar mt-4">
        {transactions.length === 0 ? renderNoData() : renderTable()}
      </div>
    </Card>
  );
};
