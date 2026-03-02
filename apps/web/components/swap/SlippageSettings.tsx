'use client';

import { useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface SlippageSettingsProps {
  slippage: number;
  onSlippageChange: (value: number) => void;
}

const PRESETS = [0.1, 0.5, 1.0];

export function SlippageSettings({ slippage, onSlippageChange }: SlippageSettingsProps) {
  const [customValue, setCustomValue] = useState('');
  const isCustom = !PRESETS.includes(slippage);

  const handleCustomInput = (val: string) => {
    setCustomValue(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && num <= 50) {
      onSlippageChange(num);
    }
  };

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={8}
          className="z-50 w-72 rounded-xl border border-border bg-overlay p-4 shadow-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <p className="mb-3 text-sm font-medium text-foreground">Slippage Tolerance</p>

          <div className="flex gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onSlippageChange(preset);
                  setCustomValue('');
                }}
                className={cn(
                  'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  slippage === preset && !isCustom
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-default text-foreground hover:bg-default-hover'
                )}
              >
                {preset}%
              </button>
            ))}

            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                placeholder="Custom"
                value={isCustom ? slippage.toString() : customValue}
                onChange={(e) => handleCustomInput(e.target.value)}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/20',
                  isCustom
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-default'
                )}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                %
              </span>
            </div>
          </div>

          {slippage > 5 && (
            <p className="mt-2 text-xs text-warning">
              High slippage may result in an unfavorable trade.
            </p>
          )}
          {slippage < 0.05 && (
            <p className="mt-2 text-xs text-warning">
              Very low slippage may cause the transaction to fail.
            </p>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
