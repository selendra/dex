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
import { savePoolToDatabase } from '@/lib/dexApi';
import { getSDK } from '@/lib/sdk';
import { ChevronDown, AlertTriangle } from 'lucide-react';

const FEE_TIERS = [
  { value: 100, label: '0.01%', description: 'Best for stablecoins' },
  { value: 500, label: '0.05%', description: 'Best for stable pairs' },
  { value: 3000, label: '0.3%', description: 'Best for most pairs' },
  { value: 10000, label: '1%', description: 'Best for exotic pairs' },
];

interface InitializePoolModalProps {
  open: boolean;
  onClose: () => void;
  tokens: TokenInfo[];
  onTxStart: () => void;
  onTxSuccess: (hash: string) => void;
  onTxError: (error: string) => void;
}

export function InitializePoolModal({
  open,
  onClose,
  tokens,
  onTxStart,
  onTxSuccess,
  onTxError,
}: InitializePoolModalProps) {
  const [token0, setToken0] = useState<TokenInfo | null>(null);
  const [token1, setToken1] = useState<TokenInfo | null>(null);
  const [fee, setFee] = useState(3000);
  const [priceRatio, setPriceRatio] = useState('1');
  const [loading, setLoading] = useState(false);
  const [selectingToken, setSelectingToken] = useState<'0' | '1' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTokenSelect = (token: TokenInfo) => {
    if (selectingToken === '0') {
      if (token1?.address === token.address) setToken1(null);
      setToken0(token);
    } else {
      if (token0?.address === token.address) setToken0(null);
      setToken1(token);
    }
    setSelectingToken(null);
    setSearchQuery('');
  };

  const filteredTokens = tokens.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.symbol.toLowerCase().includes(q) ||
      t.address.toLowerCase().includes(q)
    );
  });

  const handleInitialize = async () => {
    if (!token0 || !token1) return;

    const ratio = parseFloat(priceRatio);
    if (isNaN(ratio) || ratio <= 0) return;

    setLoading(true);
    onClose();
    onTxStart();

    try {
      const sdk = getSDK();
      const result = await sdk.initializePool(
        token0.address,
        token1.address,
        ratio,
        fee
      );

      // Save pool contract pair to database
      try {
        await savePoolToDatabase({
          poolId: result.poolId,
          token0: result.poolKey.currency0,
          token1: result.poolKey.currency1,
          fee: result.poolKey.fee,
          tickSpacing: result.poolKey.tickSpacing,
          displayName: `${token0.symbol} / ${token1.symbol}`,
        });
      } catch (saveErr) {
        console.error('Failed to save pool to database:', saveErr);
        // Don't fail the tx - on-chain init succeeded
      }

      onTxSuccess(result.hash);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize pool';
      if (message.includes('user rejected') || message.includes('ACTION_REJECTED')) {
        onTxError('Transaction rejected by user');
      } else {
        onTxError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const canInitialize = token0 && token1 && parseFloat(priceRatio) > 0;

  // Token selector sub-view
  if (selectingToken !== null) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setSelectingToken(null); setSearchQuery(''); } }}>
        <DialogContent className="max-h-[85vh] max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Token {selectingToken === '0' ? 'A' : 'B'}</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Search by name or address"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Separator />

          <div className="max-h-60 space-y-1 overflow-y-auto">
            {filteredTokens.map((token) => {
              const isDisabled =
                (selectingToken === '0' && token.address === token1?.address) ||
                (selectingToken === '1' && token.address === token0?.address);
              return (
                <button
                  key={token.address}
                  type="button"
                  onClick={() => handleTokenSelect(token)}
                  disabled={isDisabled}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-default disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {token.symbol.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{token.symbol}</p>
                    <p className="truncate text-xs text-muted">{token.name}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Initialize New Pool</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Token Pair Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">Token Pair</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectingToken('0')}
                className="flex flex-1 items-center justify-between rounded-xl bg-default px-4 py-3 transition-colors hover:bg-default-hover"
              >
                {token0 ? (
                  <span className="font-semibold text-foreground">{token0.symbol}</span>
                ) : (
                  <span className="text-muted">Select Token A</span>
                )}
                <ChevronDown className="h-4 w-4 text-muted" />
              </button>
              <button
                type="button"
                onClick={() => setSelectingToken('1')}
                className="flex flex-1 items-center justify-between rounded-xl bg-default px-4 py-3 transition-colors hover:bg-default-hover"
              >
                {token1 ? (
                  <span className="font-semibold text-foreground">{token1.symbol}</span>
                ) : (
                  <span className="text-muted">Select Token B</span>
                )}
                <ChevronDown className="h-4 w-4 text-muted" />
              </button>
            </div>
          </div>

          {/* Fee Tier */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">Fee Tier</label>
            <div className="grid grid-cols-2 gap-2">
              {FEE_TIERS.map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => setFee(tier.value)}
                  className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                    fee === tier.value
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-default hover:bg-default-hover'
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{tier.label}</p>
                  <p className="text-xs text-muted">{tier.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Initial Price */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">
              Initial Price Ratio
              {token0 && token1 && (
                <span className="ml-1 text-xs">
                  ({token0.symbol} per {token1.symbol})
                </span>
              )}
            </label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="1.0"
              value={priceRatio}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  setPriceRatio(val);
                }
              }}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-xs text-warning">
              Creating a new pool is irreversible. Make sure the token pair and initial price are correct.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleInitialize}
            disabled={!canInitialize || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                Initializing...
              </div>
            ) : (
              'Initialize Pool'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
