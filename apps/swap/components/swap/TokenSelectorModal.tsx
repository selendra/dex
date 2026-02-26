'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { TokenInfo } from '@/lib/dexApi';
import { Search } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface TokenSelectorModalProps {
  open: boolean;
  onClose: () => void;
  tokens: TokenInfo[];
  balances: Record<string, string>;
  onSelect: (token: TokenInfo) => void;
  disabledAddress?: string;
}

export function TokenSelectorModal({
  open,
  onClose,
  tokens,
  balances,
  onSelect,
  disabledAddress,
}: TokenSelectorModalProps) {
  const [search, setSearch] = useState('');

  const filtered = tokens.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.symbol.toLowerCase().includes(q) ||
      t.address.toLowerCase().includes(q)
    );
  });

  const handleSelect = (token: TokenInfo) => {
    onSelect(token);
    onClose();
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setSearch(''); } }}>
      <DialogContent className="max-h-[85vh] max-w-sm">
        <DialogHeader>
          <DialogTitle>Select a token</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search by name or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Separator />

        <div className="max-h-80 space-y-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No tokens found</p>
          ) : (
            filtered.map((token) => {
              const isDisabled = token.address === disabledAddress;
              return (
                <button
                  key={token.address}
                  type="button"
                  onClick={() => handleSelect(token)}
                  disabled={isDisabled}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-default disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {token.logoUrl ? (
                    <Image
                      src={
                        token.logoUrl.startsWith('http')
                          ? token.logoUrl
                          : `${API_BASE_URL}${token.logoUrl}`
                      }
                      alt={token.symbol}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {token.symbol.slice(0, 2)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{token.symbol}</p>
                    <p className="truncate text-xs text-muted">{token.name}</p>
                  </div>

                  {balances[token.address] && (
                    <span className="text-sm text-muted">
                      {parseFloat(balances[token.address]).toFixed(4)}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
