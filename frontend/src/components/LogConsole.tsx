import React, { useEffect, useRef } from 'react';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  threadId?: number;
}

interface LogConsoleProps {
  logs: LogEntry[];
}

export const LogConsole: React.FC<LogConsoleProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const typeStyles: Record<LogEntry['type'], string> = {
    info: 'text-slate-400',
    success: 'text-emerald-400 font-semibold',
    error: 'text-rose-400 font-semibold',
    warning: 'text-amber-400 font-semibold',
  };

  return (
    <div className="flex flex-col h-[300px] bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden font-mono text-xs shadow-inner">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-900 bg-slate-900/40 select-none">
        <span className="text-[10px] font-bold text-slate-500 tracking-wider">CONSOLE STREAM LOGS</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-700 italic select-none">
            Console stream empty. Run a simulation burst to see log telemetry...
          </div>
        ) : (
          logs.map((log: LogEntry) => (
            <div key={log.id} className="flex gap-3 leading-relaxed hover:bg-slate-900/40 px-1 py-0.5 rounded transition-colors">
              <span className="text-slate-600 select-none">[{log.timestamp}]</span>
              {log.threadId !== undefined && (
                <span className="text-indigo-400/80 select-none font-bold">
                  [T-{String(log.threadId).padStart(2, '0')}]
                </span>
              )}
              <span className={typeStyles[log.type]}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};
