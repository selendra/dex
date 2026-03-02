'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { type TokenInfo } from '@/lib/dexApi';
import { getSDK, type PoolInfo } from '@/lib/sdk';
import { AlertTriangle } from 'lucide-react';

interface RemoveLiquidityModalProps {
  open: boolean;
  onClose: () => void;
  pool: PoolInfo;
  token0: TokenInfo;
  token1: TokenInfo;
  onTxStart: () => void;
  onTxSuccess: (hash: string) => void;
  onTxError: (error: string) => void;
}

export function RemoveLiquidityModal({
  open,
  onClose,
  pool,
  token0,
  token1,
  onTxStart,
  onTxSuccess,
  onTxError,
}: RemoveLiquidityModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const currentLiquidity = parseFloat(pool.liquidity);

  const handleSetPercentage = (pct: number) => {
    const value = (currentLiquidity * pct) / 100;
    setAmount(value.toString());
  };

  const handleRemoveLiquidity = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setLoading(true);
    onClose();
    onTxStart();

    try {
      const sdk = getSDK();

      const result = await sdk.removeLiquidity(
        token0.address,
        token1.address,
        amount,
        pool.poolKey.fee
      );

      onTxSuccess(result.hash);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove liquidity';
      if (message.includes('user rejected') || message.includes('ACTION_REJECTED')) {
        onTxError('Transaction rejected by user');
      } else {
        onTxError(message);
      }
    } finally {
      setLoading(false);
      setAmount('');
    }
  };

  const amountNum = parseFloat(amount) || 0;
  const canSubmit = amountNum > 0 && amountNum <= currentLiquidity && !loading;
  const feePercent = (pool.poolKey.fee / 10000).toFixed(2);
  const percentage = currentLiquidity > 0 ? ((amountNum / currentLiquidity) * 100).toFixed(1) : '0';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove Liquidity</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pool info */}
          <div className="rounded-xl bg-default p-3">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-default bg-accent text-xs font-bold text-accent-foreground">
                  {token0.symbol.slice(0, 2)}
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-default bg-surface text-xs font-bold text-foreground">
                  {token1.symbol.slice(0, 2)}
                </div>
              </div>
              <span className="font-semibold text-foreground">
                {token0.symbol} / {token1.symbol}
              </span>
              <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-muted">
                {feePercent}%
              </span>
            </div>
          </div>

          {/* Current liquidity */}
          <div className="rounded-xl bg-default p-4 text-center">
            <p className="text-sm text-muted">Your Pool Liquidity</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {currentLiquidity.toFixed(4)}
            </p>
          </div>

          <Separator />

          {/* Amount input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">
              Amount to Remove
            </label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  setAmount(val);
                }
              }}
            />

            {/* Percentage buttons */}
            <div className="mt-2 flex gap-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleSetPercentage(pct)}
                  className="flex-1 rounded-lg bg-default px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-default-hover"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {amountNum > 0 && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Removing</span>
                <span className="text-foreground">
                  {percentage}% of liquidity
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Remaining</span>
                <span className="text-foreground">
                  {(currentLiquidity - amountNum).toFixed(4)}
                </span>
              </div>
            </div>
          )}

          {/* Validation */}
          {amountNum > currentLiquidity && (
            <div className="flex items-start gap-2 rounded-lg bg-danger/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-xs text-danger">
                Amount exceeds available liquidity.
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-xs text-warning">
              Removing liquidity will return your tokens and any earned fees.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleRemoveLiquidity}
            disabled={!canSubmit}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
                Removing...
              </div>
            ) : (
              'Remove Liquidity'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
