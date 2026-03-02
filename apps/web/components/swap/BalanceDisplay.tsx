'use client';

import { Wallet } from 'lucide-react';
import { useSelBalance } from '@/hooks/useSelBalance';

interface BalanceDisplayProps {
  walletAddress: string;
  className?: string;
}

export function BalanceDisplay({ walletAddress, className = '' }: BalanceDisplayProps) {
  const { balance, isLoading, error } = useSelBalance({
    address: walletAddress,
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading && balance === null) {
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

  if (error || balance === null) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 ${className}`}
      >
        <Wallet className="h-4 w-4 text-muted" />
        <span className="text-sm font-medium text-muted">-- SEL</span>
      </div>
    );
  }

  const formattedBalance = balance.toLocaleString('en-US', {
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
