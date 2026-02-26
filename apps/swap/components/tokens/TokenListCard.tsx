'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  getAllTokens,
  type TokenInfo,
  type PoolData,
  type TokenWithPools,
  buildTokensWithPools,
} from '@/lib/dexApi';
import { getSDK } from '@/lib/sdk';
import { RefreshCw, Search, Coins, ArrowRightLeft } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export function TokenListCard() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokensWithPools, setTokensWithPools] = useState<TokenWithPools[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const allTokens = await getAllTokens();
      setTokens(allTokens);

      if (allTokens.length < 2) {
        setTokensWithPools([]);
        setLoading(false);
        return;
      }

      // Discover pools for all token pairs via SDK
      const sdk = getSDK();
      const pools: PoolData[] = [];

      for (let i = 0; i < allTokens.length; i++) {
        for (let j = i + 1; j < allTokens.length; j++) {
          try {
            const pool = await sdk.getPoolInfo(
              allTokens[i].address,
              allTokens[j].address
            );
            if (pool.exists) {
              pools.push(pool);
            }
          } catch {
            // pool doesn't exist, skip
          }
        }
      }

      setTokensWithPools(buildTokensWithPools(allTokens, pools));
    } catch (err) {
      console.error('Failed to fetch token list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = tokensWithPools.filter((tw) => {
    const q = search.toLowerCase();
    return (
      tw.token.name.toLowerCase().includes(q) ||
      tw.token.symbol.toLowerCase().includes(q) ||
      tw.token.address.toLowerCase().includes(q)
    );
  });

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Tokens with Pools</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search by name, symbol, or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Separator />

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-2 py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted" />
            <p className="text-sm text-muted">Discovering pools…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Coins className="h-12 w-12 text-muted" />
            <div>
              <p className="font-medium text-foreground">No tokens found</p>
              <p className="mt-1 text-sm text-muted">
                {search
                  ? 'Try a different search term.'
                  : 'No tokens have an initialised pool yet.'}
              </p>
            </div>
          </div>
        )}

        {/* Token list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((tw) => (
              <TokenRow key={tw.token.address} data={tw} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============== Token Row ==============

function TokenRow({ data }: { data: TokenWithPools }) {
  const { token, pools } = data;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-default p-4">
      {/* Token header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 text-left"
      >
        {token.logoUrl ? (
          <Image
            src={
              token.logoUrl.startsWith('http')
                ? token.logoUrl
                : `${API_BASE_URL}${token.logoUrl}`
            }
            alt={token.symbol}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
            {token.symbol.slice(0, 2)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{token.symbol}</p>
          <p className="truncate text-xs text-muted">{token.name}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md bg-surface px-2 py-1 text-xs font-medium text-muted">
            {pools.length} pool{pools.length !== 1 ? 's' : ''}
          </span>
          <svg
            className={`h-4 w-4 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded pool list */}
      {expanded && (
        <>
          <Separator className="my-3" />
          <div className="space-y-2">
            {pools.map((p, idx) => (
              <div
                key={`${p.pool.poolId}-${idx}`}
                className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-muted" />
                  <span className="font-medium text-foreground">
                    {token.symbol} / {p.pairedToken.symbol}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>Fee: {p.fee}</span>
                  <span>
                    Liq:{' '}
                    {parseFloat(p.pool.liquidity) > 0
                      ? parseFloat(p.pool.liquidity).toFixed(4)
                      : '0'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
