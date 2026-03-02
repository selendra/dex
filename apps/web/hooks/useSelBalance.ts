import { useEffect, useState, useCallback } from 'react';
import { getSDK } from '@/lib/sdk';

interface UseSelBalanceOptions {
  address?: string;
  refreshInterval?: number; // in milliseconds, default 30000 (30 seconds)
  enabled?: boolean;
}

interface UseSelBalanceReturn {
  balance: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage SEL native token balance
 * @param options Configuration options
 * @returns Balance state and refetch function
 */
export function useSelBalance({
  address,
  refreshInterval = 30000,
  enabled = true,
}: UseSelBalanceOptions): UseSelBalanceReturn {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address || !enabled) {
      setBalance(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sdk = getSDK();
      const balanceStr = await sdk.getNativeBalance(address);
      setBalance(parseFloat(balanceStr));
    } catch (err) {
      console.error('Failed to fetch SEL balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load balance');
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, enabled]);

  useEffect(() => {
    if (!enabled || !address) {
      setBalance(null);
      setIsLoading(false);
      return;
    }

    fetchBalance();

    // Set up auto-refresh if interval is provided
    if (refreshInterval > 0) {
      const interval = setInterval(fetchBalance, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchBalance, refreshInterval, enabled, address]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
