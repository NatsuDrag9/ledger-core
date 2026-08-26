import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`glass-card rounded-2xl p-6 shadow-xl ${className}`}>
      {children}
    </div>
  );
};
