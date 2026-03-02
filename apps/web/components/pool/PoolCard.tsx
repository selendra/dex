'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { InitializePoolModal } from './InitializePoolModal';
import { AddLiquidityModal } from './AddLiquidityModal';
import { RemoveLiquidityModal } from './RemoveLiquidityModal';
import { TransactionStatus } from '@/components/swap/TransactionStatus';
import { getAllTokens, type TokenInfo } from '@/lib/dexApi';
import { getSDK, type PoolInfo } from '@/lib/sdk';
import { Droplets, Plus, Minus, Layers, RefreshCw } from 'lucide-react';

type TxState = 'pending' | 'success' | 'error';

interface PoolWithTokens {
  pool: PoolInfo;
  token0: TokenInfo;
  token1: TokenInfo;
}

export function PoolCard() {
  const wallet = useWallet();

  // Data state
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [pools, setPools] = useState<PoolWithTokens[]>([]);
  const [loadingPools, setLoadingPools] = useState(false);

  // Modal state
  const [showInitialize, setShowInitialize] = useState(false);
  const [showAddLiquidity, setShowAddLiquidity] = useState(false);
  const [showRemoveLiquidity, setShowRemoveLiquidity] = useState(false);
  const [selectedPool, setSelectedPool] = useState<PoolWithTokens | null>(null);

  // Transaction status
  const [txState, setTxState] = useState<TxState>('pending');
  const [txHash, setTxHash] = useState('');
  const [txError, setTxError] = useState('');
  const [showTxStatus, setShowTxStatus] = useState(false);

  // Fetch tokens
  useEffect(() => {
    getAllTokens().then(setTokens).catch(console.error);
  }, []);

  // Fetch pools for all token pairs
  const fetchPools = useCallback(async () => {
    if (tokens.length < 2) return;

    setLoadingPools(true);
    const sdk = getSDK();
    const foundPools: PoolWithTokens[] = [];

    // Check all unique pairs
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        try {
          const pool = await sdk.getPoolInfo(tokens[i].address, tokens[j].address);
          if (pool.exists) {
            // Determine which token is currency0/currency1
            const [sorted0] = sdk.sortTokens(tokens[i].address, tokens[j].address);
            const token0 =
              sorted0.toLowerCase() === tokens[i].address.toLowerCase()
                ? tokens[i]
                : tokens[j];
            const token1 =
              sorted0.toLowerCase() === tokens[i].address.toLowerCase()
                ? tokens[j]
                : tokens[i];
            foundPools.push({ pool, token0, token1 });
          }
        } catch {
          // pool doesn't exist, skip
        }
      }
    }

    setPools(foundPools);
    setLoadingPools(false);
  }, [tokens]);

  useEffect(() => {
    if (tokens.length >= 2) {
      fetchPools();
    }
  }, [tokens, fetchPools]);

  // Transaction handlers
  const handleTxSuccess = (hash: string) => {
    setTxHash(hash);
    setTxState('success');
    fetchPools(); // Refresh pool data
  };

  const handleTxError = (error: string) => {
    setTxError(error);
    setTxState('error');
  };

  const handleTxStart = () => {
    setShowTxStatus(true);
    setTxState('pending');
    setTxHash('');
    setTxError('');
  };

  const handleAddLiquidity = (poolWithTokens: PoolWithTokens) => {
    setSelectedPool(poolWithTokens);
    setShowAddLiquidity(true);
  };

  const handleRemoveLiquidity = (poolWithTokens: PoolWithTokens) => {
    setSelectedPool(poolWithTokens);
    setShowRemoveLiquidity(true);
  };

  return (
    <>
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">Pools</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={fetchPools}
              disabled={loadingPools}
            >
              <RefreshCw className={`h-4 w-4 ${loadingPools ? 'animate-spin' : ''}`} />
            </Button>
            {wallet.isConnected && (
              <Button size="sm" onClick={() => setShowInitialize(true)}>
                <Plus className="h-4 w-4" />
                New Pool
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Not connected */}
          {!wallet.isConnected && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Droplets className="h-12 w-12 text-muted" />
              <div>
                <p className="font-medium text-foreground">Connect MetaMask</p>
                <p className="mt-1 text-sm text-muted">
                  Connect your wallet to view and manage liquidity pools.
                </p>
              </div>
              <Button onClick={() => wallet.connect()}>Connect MetaMask</Button>
            </div>
          )}

          {/* Wrong chain */}
          {wallet.isConnected && !wallet.isCorrectChain && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Layers className="h-12 w-12 text-warning" />
              <div>
                <p className="font-medium text-foreground">Wrong Network</p>
                <p className="mt-1 text-sm text-muted">
                  Please switch to Selendra to manage pools.
                </p>
              </div>
              <Button onClick={() => wallet.switchToSelendra()}>Switch to Selendra</Button>
            </div>
          )}

          {/* Loading */}
          {wallet.isConnected && wallet.isCorrectChain && loadingPools && (
            <div className="flex flex-col items-center gap-2 py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted" />
              <p className="text-sm text-muted">Loading pools...</p>
            </div>
          )}

          {/* No pools found */}
          {wallet.isConnected && wallet.isCorrectChain && !loadingPools && pools.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Droplets className="h-12 w-12 text-muted" />
              <div>
                <p className="font-medium text-foreground">No Pools Found</p>
                <p className="mt-1 text-sm text-muted">
                  Create a new pool to get started.
                </p>
              </div>
            </div>
          )}

          {/* Pool list */}
          {wallet.isConnected && wallet.isCorrectChain && !loadingPools && pools.length > 0 && (
            <div className="space-y-3">
              {pools.map((p) => (
                <PoolItem
                  key={p.pool.poolId}
                  poolWithTokens={p}
                  onAddLiquidity={() => handleAddLiquidity(p)}
                  onRemoveLiquidity={() => handleRemoveLiquidity(p)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Initialize Pool Modal */}
      <InitializePoolModal
        open={showInitialize}
        onClose={() => setShowInitialize(false)}
        tokens={tokens}
        onTxStart={handleTxStart}
        onTxSuccess={handleTxSuccess}
        onTxError={handleTxError}
      />

      {/* Add Liquidity Modal */}
      {selectedPool && (
        <AddLiquidityModal
          open={showAddLiquidity}
          onClose={() => {
            setShowAddLiquidity(false);
            setSelectedPool(null);
          }}
          pool={selectedPool.pool}
          token0={selectedPool.token0}
          token1={selectedPool.token1}
          walletAddress={wallet.address!}
          onTxStart={handleTxStart}
          onTxSuccess={handleTxSuccess}
          onTxError={handleTxError}
        />
      )}

      {/* Remove Liquidity Modal */}
      {selectedPool && (
        <RemoveLiquidityModal
          open={showRemoveLiquidity}
          onClose={() => {
            setShowRemoveLiquidity(false);
            setSelectedPool(null);
          }}
          pool={selectedPool.pool}
          token0={selectedPool.token0}
          token1={selectedPool.token1}
          onTxStart={handleTxStart}
          onTxSuccess={handleTxSuccess}
          onTxError={handleTxError}
        />
      )}

      {/* Transaction status */}
      <TransactionStatus
        open={showTxStatus}
        onClose={() => setShowTxStatus(false)}
        state={txState}
        txHash={txHash}
        errorMessage={txError}
      />
    </>
  );
}

// ============== Pool Item ==============

function PoolItem({
  poolWithTokens,
  onAddLiquidity,
  onRemoveLiquidity,
}: {
  poolWithTokens: PoolWithTokens;
  onAddLiquidity: () => void;
  onRemoveLiquidity: () => void;
}) {
  const { pool, token0, token1 } = poolWithTokens;
  const feePercent = (pool.poolKey.fee / 10000).toFixed(2);
  const liquidityNum = parseFloat(pool.liquidity);

  return (
    <div className="rounded-xl border border-border bg-default p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-default bg-accent text-xs font-bold text-accent-foreground">
              {token0.symbol.slice(0, 2)}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-default bg-surface text-xs font-bold text-foreground">
              {token1.symbol.slice(0, 2)}
            </div>
          </div>
          <div>
            <span className="font-semibold text-foreground">
              {token0.symbol} / {token1.symbol}
            </span>
            <span className="ml-2 rounded-md bg-surface px-1.5 py-0.5 text-xs text-muted">
              {feePercent}%
            </span>
          </div>
        </div>
      </div>

      <Separator className="my-3" />

      {/* Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">Price</span>
          <span className="text-foreground">
            1 {token0.symbol} = {pool.price.toFixed(6)} {token1.symbol}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Liquidity</span>
          <span className="text-foreground">
            {liquidityNum > 0 ? parseFloat(pool.liquidity).toFixed(4) : '0'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Tick</span>
          <span className="text-foreground">{pool.tick}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1" onClick={onAddLiquidity}>
          <Plus className="h-3 w-3" />
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={onRemoveLiquidity}
          disabled={liquidityNum <= 0}
        >
          <Minus className="h-3 w-3" />
          Remove
        </Button>
      </div>
    </div>
  );
}
