'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SwapQuoteData, TokenInfo } from '@/lib/dexApi';
import { cn } from '@/lib/cn';

interface QuoteDetailsProps {
  quote: SwapQuoteData;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  slippage: number;
}

export function QuoteDetails({ quote, tokenIn, tokenOut, slippage }: QuoteDetailsProps) {
  const [expanded, setExpanded] = useState(false);

  const rate = quote.price;
  const priceImpact = parseFloat(quote.priceImpact);
  const minReceived =
    parseFloat(quote.estimatedAmountOut) * (1 - slippage / 100);

  const impactColor =
    priceImpact < 1
      ? 'text-success'
      : priceImpact < 3
        ? 'text-warning'
        : 'text-danger';

  return (
    <div className="rounded-xl border border-border px-4 py-3">
      {/* Toggle row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-sm"
      >
        <span className="text-muted">
          1 {tokenIn.symbol} = {rate.toFixed(6)} {tokenOut.symbol}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Price Impact</span>
            <span className={impactColor}>{priceImpact.toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Min. Received</span>
            <span className="text-foreground">
              {minReceived.toFixed(6)} {tokenOut.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Slippage Tolerance</span>
            <span className="text-foreground">{slippage}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Fee</span>
            <span className="text-foreground">{quote.fee}</span>
          </div>
        </div>
      )}
    </div>
  );
}
