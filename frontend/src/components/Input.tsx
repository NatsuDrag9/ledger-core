import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label = "",
  error = "",
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-400">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`glass-input px-4 py-2.5 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:ring-indigo-500/20 w-full transition-all duration-150 ${
          error ? 'border-rose-500/50 focus:border-rose-500/60 focus:ring-rose-500/20' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-rose-400 font-medium mt-0.5">{error}</span>}
    </div>
  );
};
