'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import type { TokenInfo } from '@/lib/dexApi';
import { cn } from '@/lib/cn';

interface TokenInputProps {
  label: string;
  token: TokenInfo | null;
  amount: string;
  balance?: string;
  onAmountChange?: (value: string) => void;
  onTokenSelect: () => void;
  readOnly?: boolean;
  loading?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export function TokenInput({
  label,
  token,
  amount,
  balance,
  onAmountChange,
  onTokenSelect,
  readOnly = false,
  loading = false,
}: TokenInputProps) {
  const handleMaxClick = () => {
    if (balance && onAmountChange) {
      onAmountChange(balance);
    }
  };

  return (
    <div className="rounded-2xl bg-default p-4">
      {/* Top row: label + balance */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        {balance !== undefined && (
          <button
            type="button"
            onClick={handleMaxClick}
            className="text-xs text-muted transition-colors hover:text-foreground"
            disabled={readOnly}
          >
            Balance: {parseFloat(balance).toFixed(4)}
            {!readOnly && (
              <span className="ml-1 font-semibold text-accent">MAX</span>
            )}
          </button>
        )}
      </div>

      {/* Main row: input + token selector */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => {
            const val = e.target.value;
            // Allow empty, digits, and one decimal point
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
              onAmountChange?.(val);
            }
          }}
          readOnly={readOnly}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-3xl font-medium text-foreground placeholder:text-muted/50 focus:outline-none',
            loading && 'animate-pulse'
          )}
        />

        <button
          type="button"
          onClick={onTokenSelect}
          className="flex shrink-0 items-center gap-2 rounded-full bg-surface px-3 py-2 transition-colors hover:bg-surface-hover"
        >
          {token ? (
            <>
              {token.logoUrl ? (
                <Image
                  src={
                    token.logoUrl.startsWith('http')
                      ? token.logoUrl
                      : `${API_BASE_URL}${token.logoUrl}`
                  }
                  alt={token.symbol}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {token.symbol.slice(0, 2)}
                </div>
              )}
              <span className="font-semibold text-foreground">{token.symbol}</span>
            </>
          ) : (
            <span className="font-medium text-foreground">Select</span>
          )}
          <ChevronDown className="h-4 w-4 text-muted" />
        </button>
      </div>
    </div>
  );
}
