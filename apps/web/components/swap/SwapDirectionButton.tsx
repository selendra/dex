'use client';

import { ArrowDown } from 'lucide-react';

interface SwapDirectionButtonProps {
  onClick: () => void;
}

export function SwapDirectionButton({ onClick }: SwapDirectionButtonProps) {
  return (
    <div className="relative z-10 -my-2 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        className="flex h-10 w-10 items-center justify-center rounded-xl border-4 border-background bg-default text-muted transition-all hover:rotate-180 hover:bg-default-hover hover:text-foreground"
        aria-label="Swap direction"
      >
        <ArrowDown className="h-5 w-5" />
      </button>
    </div>
  );
}
