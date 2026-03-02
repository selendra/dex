'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { SwapQuoteData, TokenInfo } from '@/lib/dexApi';
import { ArrowDown } from 'lucide-react';

interface SwapConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string;
  quote: SwapQuoteData;
  slippage: number;
  loading: boolean;
}

export function SwapConfirmationModal({
  open,
  onClose,
  onConfirm,
  tokenIn,
  tokenOut,
  amountIn,
  quote,
  slippage,
  loading,
}: SwapConfirmationModalProps) {
  const minReceived =
    parseFloat(quote.estimatedAmountOut) * (1 - slippage / 100);
  const priceImpact = parseFloat(quote.priceImpact);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm Swap</DialogTitle>
        </DialogHeader>

        {/* Token pair display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-default p-3">
            <span className="text-2xl font-medium text-foreground">{amountIn}</span>
            <span className="font-semibold text-foreground">{tokenIn.symbol}</span>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-5 w-5 text-muted" />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-default p-3">
            <span className="text-2xl font-medium text-foreground">
              {parseFloat(quote.estimatedAmountOut).toFixed(6)}
            </span>
            <span className="font-semibold text-foreground">{tokenOut.symbol}</span>
          </div>
        </div>

        <Separator />

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Rate</span>
            <span className="text-foreground">
              1 {tokenIn.symbol} = {quote.price.toFixed(6)} {tokenOut.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Price Impact</span>
            <span
              className={
                priceImpact < 1
                  ? 'text-success'
                  : priceImpact < 3
                    ? 'text-warning'
                    : 'text-danger'
              }
            >
              {priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Min. Received</span>
            <span className="text-foreground">
              {minReceived.toFixed(6)} {tokenOut.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Fee</span>
            <span className="text-foreground">{quote.fee}</span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onConfirm} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                Swapping...
              </div>
            ) : (
              'Confirm Swap'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
