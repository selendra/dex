'use client';

import { Wallet } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

interface WalletBalanceDisplayProps {
  className?: string;
}

export function WalletBalanceDisplay({ className = '' }: WalletBalanceDisplayProps) {
  const { balance, isConnected } = useWallet();

  if (!isConnected) return null;

  if (balance === null) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 ${className}`}
      >
        <Wallet className="h-4 w-4 text-muted" />
        <div className="flex items-center gap-1">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <span className="text-sm font-medium text-muted">SEL</span>
        </div>
      </div>
    );
  }

  const formattedBalance = parseFloat(balance).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 ${className}`}
    >
      <Wallet className="h-4 w-4 text-accent" />
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold text-foreground">{formattedBalance}</span>
        <span className="text-sm font-medium text-muted">SEL</span>
      </div>
    </div>
  );
}
