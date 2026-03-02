'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getAllTokens, type TokenInfo } from '@/lib/dexApi';
import { getSDK } from '@/lib/sdk';
import {
  RefreshCw,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface PriceData {
  token0: TokenInfo;
  token1: TokenInfo;
  price: string;
  timestamp: string;
  isStale: boolean;
  twap?: string;
  poolPrice?: {
    price: string;
    sqrtPriceX96: string;
  };
  error?: string;
}

export function OracleCard() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [oracleConfigured, setOracleConfigured] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const allTokens = await getAllTokens();
      setTokens(allTokens);

      if (allTokens.length < 2) {
        setPriceData([]);
        setLoading(false);
        return;
      }

      const sdk = getSDK();

      // Check if oracle is configured
      const isConfigured = sdk.oracle.isConfigured();
      setOracleConfigured(isConfigured);

      if (!isConfigured) {
        setLoading(false);
        return;
      }

      // Fetch prices for all token pairs
      const prices: PriceData[] = [];

      for (let i = 0; i < allTokens.length; i++) {
        for (let j = i + 1; j < allTokens.length; j++) {
          try {
            const [priceInfo, twap, poolPrice] = await Promise.all([
              sdk.oracle.getPrice(allTokens[i].address, allTokens[j].address),
              sdk.oracle.getTWAP(allTokens[i].address, allTokens[j].address).catch(() => null),
              sdk.oracle.getPoolPrice(allTokens[i].address, allTokens[j].address).catch(() => null),
            ]);

            // Determine which token is sorted first
            const [sorted0] = sdk.sortTokens(allTokens[i].address, allTokens[j].address);
            const token0 =
              sorted0.toLowerCase() === allTokens[i].address.toLowerCase()
                ? allTokens[i]
                : allTokens[j];
            const token1 =
              sorted0.toLowerCase() === allTokens[i].address.toLowerCase()
                ? allTokens[j]
                : allTokens[i];

            prices.push({
              token0,
              token1,
              price: priceInfo.price,
              timestamp: priceInfo.timestamp,
              isStale: priceInfo.isStale,
              twap: twap || undefined,
              poolPrice: poolPrice || undefined,
            });
          } catch (err) {
            // Price not available for this pair
            const [sorted0] = sdk.sortTokens(allTokens[i].address, allTokens[j].address);
            const token0 =
              sorted0.toLowerCase() === allTokens[i].address.toLowerCase()
                ? allTokens[i]
                : allTokens[j];
            const token1 =
              sorted0.toLowerCase() === allTokens[i].address.toLowerCase()
                ? allTokens[j]
                : allTokens[i];

            prices.push({
              token0,
              token1,
              price: '0',
              timestamp: '0',
              isStale: true,
              error: err instanceof Error ? err.message : 'Price not available',
            });
          }
        }
      }

      setPriceData(prices);
    } catch (err) {
      console.error('Failed to fetch oracle data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter out pairs with no valid price
  const validPrices = priceData.filter((p) => !p.error && parseFloat(p.price) > 0);
  const unavailablePairs = priceData.filter((p) => p.error || parseFloat(p.price) === 0);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          <CardTitle className="text-xl">Price Oracle</CardTitle>
        </div>
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
        {/* Oracle Status */}
        <div className="flex items-center justify-between rounded-lg bg-default p-3">
          <span className="text-sm text-muted">Oracle Status</span>
          {oracleConfigured ? (
            <Badge variant="default" className="bg-green-500/20 text-green-400">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Not Configured
            </Badge>
          )}
        </div>

        <Separator />

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-2 py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted" />
            <p className="text-sm text-muted">Fetching price data…</p>
          </div>
        )}

        {/* Not configured */}
        {!loading && !oracleConfigured && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
            <div>
              <p className="font-medium text-foreground">Oracle Not Configured</p>
              <p className="mt-1 text-sm text-muted">
                Set NEXT_PUBLIC_PRICE_ORACLE_ADDRESS in your environment to enable price feeds.
              </p>
            </div>
          </div>
        )}

        {/* No prices available */}
        {!loading && oracleConfigured && validPrices.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted" />
            <div>
              <p className="font-medium text-foreground">No Price Data</p>
              <p className="mt-1 text-sm text-muted">
                No price feeds are available for registered token pairs.
              </p>
            </div>
          </div>
        )}

        {/* Price list */}
        {!loading && oracleConfigured && validPrices.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted">
              {validPrices.length} Price Feed{validPrices.length !== 1 ? 's' : ''}
            </p>
            {validPrices.map((data) => (
              <PriceRow key={`${data.token0.address}-${data.token1.address}`} data={data} />
            ))}
          </div>
        )}

        {/* Unavailable pairs */}
        {!loading && oracleConfigured && unavailablePairs.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm text-muted">
                {unavailablePairs.length} pair{unavailablePairs.length !== 1 ? 's' : ''} without
                price data
              </p>
              <div className="flex flex-wrap gap-2">
                {unavailablePairs.map((p) => (
                  <Badge
                    key={`${p.token0.address}-${p.token1.address}`}
                    variant="outline"
                    className="text-xs"
                  >
                    {p.token0.symbol}/{p.token1.symbol}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============== Price Row ==============

function PriceRow({ data }: { data: PriceData }) {
  const [expanded, setExpanded] = useState(false);
  const { token0, token1, price, timestamp, isStale, twap, poolPrice } = data;

  const formattedPrice = parseFloat(price).toFixed(6);
  const formattedTwap = twap ? parseFloat(twap).toFixed(6) : null;
  const lastUpdate = new Date(parseInt(timestamp) * 1000);
  const timeAgo = getTimeAgo(lastUpdate);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <TokenAvatar token={token0} />
            <TokenAvatar token={token1} />
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground">
              {token0.symbol}/{token1.symbol}
            </p>
            <p className="text-xs text-muted">
              1 {token0.symbol} = {formattedPrice} {token1.symbol}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStale ? (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Stale
            </Badge>
          ) : (
            <Badge variant="default" className="bg-green-500/20 text-green-400 text-xs">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Fresh
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {/* Current Price */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted">
              <TrendingUp className="h-4 w-4" />
              Current Price
            </span>
            <span className="font-mono text-sm text-foreground">{formattedPrice}</span>
          </div>

          {/* TWAP */}
          {formattedTwap && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted">
                <Activity className="h-4 w-4" />
                TWAP (5 min)
              </span>
              <span className="font-mono text-sm text-foreground">{formattedTwap}</span>
            </div>
          )}

          {/* Pool Price */}
          {poolPrice && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted">
                <TrendingUp className="h-4 w-4" />
                Pool Price
              </span>
              <span className="font-mono text-sm text-foreground">
                {parseFloat(poolPrice.price).toFixed(6)}
              </span>
            </div>
          )}

          {/* Last Update */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted">
              <Clock className="h-4 w-4" />
              Last Update
            </span>
            <span className="text-sm text-foreground">{timeAgo}</span>
          </div>

          {/* sqrtPriceX96 (for advanced users) */}
          {poolPrice?.sqrtPriceX96 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">sqrtPriceX96</span>
              <span className="max-w-[200px] truncate font-mono text-xs text-muted">
                {poolPrice.sqrtPriceX96}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============== Token Avatar ==============

function TokenAvatar({ token }: { token: TokenInfo }) {
  return token.logoUrl ? (
    <Image
      src={token.logoUrl.startsWith('http') ? token.logoUrl : `${API_BASE_URL}${token.logoUrl}`}
      alt={token.symbol}
      width={28}
      height={28}
      className="rounded-full border-2 border-surface"
    />
  ) : (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-accent text-xs font-bold text-accent-foreground">
      {token.symbol.slice(0, 2)}
    </div>
  );
}

// ============== Utils ==============

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return `${diffSec}s ago`;
}
