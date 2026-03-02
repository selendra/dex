'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionStatus } from '@/components/swap/TransactionStatus';
import { useWallet } from '@/context/WalletContext';
import { getAllTokens, type TokenInfo } from '@/lib/dexApi';
import { getSDK } from '@/lib/sdk';
import {
  RefreshCw,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Coins,
  DollarSign,
  ArrowDownToLine,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface TokenFees {
  token: TokenInfo;
  feesAccrued: string;
  feesFormatted: string;
}

type TxState = 'pending' | 'success' | 'error';

export function FeesCard() {
  const wallet = useWallet();

  // Data state
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokenFees, setTokenFees] = useState<TokenFees[]>([]);
  const [loading, setLoading] = useState(true);
  const [controller, setController] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Modal state
  const [showCollect, setShowCollect] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenFees | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectRecipient, setCollectRecipient] = useState('');

  // Transaction status
  const [txState, setTxState] = useState<TxState>('pending');
  const [txHash, setTxHash] = useState('');
  const [txError, setTxError] = useState('');
  const [showTxStatus, setShowTxStatus] = useState(false);

  const isController = wallet.address && controller?.toLowerCase() === wallet.address.toLowerCase();
  const isOwner = wallet.address && owner?.toLowerCase() === wallet.address.toLowerCase();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const allTokens = await getAllTokens();
      setTokens(allTokens);

      const sdk = getSDK();
      const configured = sdk.protocolFees.isConfigured();
      setIsConfigured(configured);

      if (!configured) {
        setLoading(false);
        return;
      }

      // Fetch controller and owner
      const [controllerAddr, ownerAddr] = await Promise.all([
        sdk.protocolFees.getController(),
        sdk.protocolFees.getOwner(),
      ]);
      setController(controllerAddr);
      setOwner(ownerAddr);

      // Fetch fees for each token
      const feesData: TokenFees[] = [];
      for (const token of allTokens) {
        try {
          const fees = await sdk.protocolFees.getFeesAccrued(token.address);
          feesData.push({
            token,
            feesAccrued: fees.feesAccrued,
            feesFormatted: fees.feesFormatted,
          });
        } catch {
          feesData.push({
            token,
            feesAccrued: '0',
            feesFormatted: '0',
          });
        }
      }

      setTokenFees(feesData);
    } catch (err) {
      console.error('Failed to fetch fees data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter tokens with fees
  const tokensWithFees = tokenFees.filter((tf) => parseFloat(tf.feesAccrued) > 0);

  const handleOpenCollect = (tokenFee: TokenFees) => {
    setSelectedToken(tokenFee);
    setCollectAmount(tokenFee.feesFormatted);
    setCollectRecipient(wallet.address || '');
    setShowCollect(true);
  };

  const handleCollect = async () => {
    if (!selectedToken || !collectRecipient || !collectAmount) return;

    setShowCollect(false);
    setTxState('pending');
    setTxHash('');
    setTxError('');
    setShowTxStatus(true);

    try {
      const sdk = getSDK();
      const result = await sdk.protocolFees.collectProtocolFees(
        collectRecipient,
        selectedToken.token.address,
        collectAmount
      );

      setTxHash(result.hash);
      setTxState('success');
      fetchData(); // Refresh fees
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setTxError(errorMessage);
      setTxState('error');
    }
  };

  return (
    <>
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent" />
            <CardTitle className="text-xl">Protocol Fees</CardTitle>
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
          {/* Controller Info */}
          {isConfigured && controller && (
            <div className="space-y-2 rounded-lg bg-default p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Fee Controller</span>
                <span className="font-mono text-xs text-foreground">
                  {controller.slice(0, 6)}...{controller.slice(-4)}
                </span>
              </div>
              {wallet.isConnected && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Your Role</span>
                  {isController ? (
                    <Badge className="bg-green-500/20 text-green-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Controller
                    </Badge>
                  ) : isOwner ? (
                    <Badge className="bg-blue-500/20 text-blue-400">
                      <Wallet className="mr-1 h-3 w-3" />
                      Owner
                    </Badge>
                  ) : (
                    <Badge variant="outline">Viewer</Badge>
                  )}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-2 py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted" />
              <p className="text-sm text-muted">Fetching fee data…</p>
            </div>
          )}

          {/* Not configured */}
          {!loading && !isConfigured && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
              <div>
                <p className="font-medium text-foreground">PoolManager Not Configured</p>
                <p className="mt-1 text-sm text-muted">
                  Set NEXT_PUBLIC_POOL_MANAGER_ADDRESS in your environment.
                </p>
              </div>
            </div>
          )}

          {/* Not connected */}
          {!loading && isConfigured && !wallet.isConnected && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <Wallet className="h-12 w-12 text-muted" />
              <div>
                <p className="font-medium text-foreground">Connect Wallet</p>
                <p className="mt-1 text-sm text-muted">
                  Connect your wallet to view and collect protocol fees.
                </p>
              </div>
            </div>
          )}

          {/* No fees accrued */}
          {!loading && isConfigured && wallet.isConnected && tokensWithFees.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <Coins className="h-12 w-12 text-muted" />
              <div>
                <p className="font-medium text-foreground">No Fees Accrued</p>
                <p className="mt-1 text-sm text-muted">
                  No protocol fees have been collected yet.
                </p>
              </div>
            </div>
          )}

          {/* Fees list */}
          {!loading && isConfigured && wallet.isConnected && tokensWithFees.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted">Accrued Fees</p>
              {tokensWithFees.map((tf) => (
                <FeeRow
                  key={tf.token.address}
                  data={tf}
                  canCollect={!!isController}
                  onCollect={() => handleOpenCollect(tf)}
                />
              ))}
            </div>
          )}

          {/* All tokens (even without fees) */}
          {!loading && isConfigured && wallet.isConnected && tokenFees.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm text-muted">All Registered Tokens</p>
                <div className="flex flex-wrap gap-2">
                  {tokenFees.map((tf) => (
                    <Badge
                      key={tf.token.address}
                      variant={parseFloat(tf.feesAccrued) > 0 ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {tf.token.symbol}: {parseFloat(tf.feesFormatted).toFixed(4)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Collect Modal */}
      <Dialog open={showCollect} onOpenChange={setShowCollect}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Protocol Fees</DialogTitle>
          </DialogHeader>

          {selectedToken && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-default p-3">
                <TokenAvatar token={selectedToken.token} />
                <div>
                  <p className="font-medium text-foreground">{selectedToken.token.symbol}</p>
                  <p className="text-sm text-muted">{selectedToken.token.name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Amount</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    placeholder="0.0"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCollectAmount(selectedToken.feesFormatted)}
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-muted">
                  Available: {parseFloat(selectedToken.feesFormatted).toFixed(6)}{' '}
                  {selectedToken.token.symbol}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Recipient</label>
                <Input
                  value={collectRecipient}
                  onChange={(e) => setCollectRecipient(e.target.value)}
                  placeholder="0x..."
                />
              </div>

              <Button
                className="w-full"
                onClick={handleCollect}
                disabled={!collectAmount || !collectRecipient}
              >
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Collect Fees
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

// ============== Fee Row ==============

function FeeRow({
  data,
  canCollect,
  onCollect,
}: {
  data: TokenFees;
  canCollect: boolean;
  onCollect: () => void;
}) {
  const { token, feesFormatted } = data;
  const formattedFees = parseFloat(feesFormatted).toFixed(6);

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <TokenAvatar token={token} />
        <div>
          <p className="font-medium text-foreground">{token.symbol}</p>
          <p className="text-xs text-muted">{token.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-mono text-sm font-medium text-foreground">{formattedFees}</p>
          <p className="text-xs text-muted">accrued</p>
        </div>

        {canCollect && (
          <Button variant="outline" size="sm" onClick={onCollect}>
            <ArrowDownToLine className="mr-1 h-3 w-3" />
            Collect
          </Button>
        )}
      </div>
    </div>
  );
}

// ============== Token Avatar ==============

function TokenAvatar({ token }: { token: TokenInfo }) {
  return token.logoUrl ? (
    <Image
      src={token.logoUrl.startsWith('http') ? token.logoUrl : `${API_BASE_URL}${token.logoUrl}`}
      alt={token.symbol}
      width={32}
      height={32}
      className="rounded-full"
    />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
      {token.symbol.slice(0, 2)}
    </div>
  );
}
