'use client';

import { useState, useEffect } from 'react';
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

interface AddLiquidityModalProps {
  open: boolean;
  onClose: () => void;
  pool: PoolInfo;
  token0: TokenInfo;
  token1: TokenInfo;
  walletAddress: string;
  onTxStart: () => void;
  onTxSuccess: (hash: string) => void;
  onTxError: (error: string) => void;
}

export function AddLiquidityModal({
  open,
  onClose,
  pool,
  token0,
  token1,
  walletAddress,
  onTxStart,
  onTxSuccess,
  onTxError,
}: AddLiquidityModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance0, setBalance0] = useState<string | null>(null);
  const [balance1, setBalance1] = useState<string | null>(null);

  // Fetch balances
  useEffect(() => {
    if (!open || !walletAddress) return;

    const sdk = getSDK();
    Promise.all([
      sdk.getTokenBalance(token0.address, walletAddress),
      sdk.getTokenBalance(token1.address, walletAddress),
    ]).then(([b0, b1]) => {
      setBalance0(b0);
      setBalance1(b1);
    }).catch(console.error);
  }, [open, walletAddress, token0.address, token1.address]);

  const handleAddLiquidity = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setLoading(true);
    onClose();
    onTxStart();

    try {
      const sdk = getSDK();
      const lmAddress = sdk.getLiquidityManagerAddress();

      // Check and approve token0
      const allowance0 = await sdk.getTokenAllowance(token0.address, walletAddress, lmAddress);
      if (parseFloat(allowance0) < parseFloat(amount)) {
        await sdk.approveForLiquidity(token0.address, amount);
      }

      // Check and approve token1
      const allowance1 = await sdk.getTokenAllowance(token1.address, walletAddress, lmAddress);
      if (parseFloat(allowance1) < parseFloat(amount)) {
        await sdk.approveForLiquidity(token1.address, amount);
      }

      // Add liquidity
      const result = await sdk.addLiquidity(
        token0.address,
        token1.address,
        amount,
        pool.poolKey.fee
      );

      onTxSuccess(result.hash);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add liquidity';
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

  const canSubmit = amount && parseFloat(amount) > 0 && !loading;
  const feePercent = (pool.poolKey.fee / 10000).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Liquidity</DialogTitle>
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

          {/* Balances */}
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">{token0.symbol} Balance</span>
              <span className="text-foreground">
                {balance0 ? parseFloat(balance0).toFixed(4) : '...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">{token1.symbol} Balance</span>
              <span className="text-foreground">
                {balance1 ? parseFloat(balance1).toFixed(4) : '...'}
              </span>
            </div>
          </div>

          <Separator />

          {/* Amount input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">
              Liquidity Amount
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
            <p className="mt-1 text-xs text-muted">
              Liquidity units to add (full range position).
            </p>
          </div>

          {/* Pool stats */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Current Price</span>
              <span className="text-foreground">
                1 {token0.symbol} = {pool.price.toFixed(6)} {token1.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Current Liquidity</span>
              <span className="text-foreground">
                {parseFloat(pool.liquidity).toFixed(4)}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 rounded-lg bg-accent/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-xs text-muted">
              You may need to approve both tokens before adding liquidity. MetaMask will prompt you for each approval.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAddLiquidity}
            disabled={!canSubmit}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                Adding Liquidity...
              </div>
            ) : (
              'Add Liquidity'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
