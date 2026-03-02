'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TokenInput } from './TokenInput';
import { TokenSelectorModal } from './TokenSelectorModal';
import { SwapDirectionButton } from './SwapDirectionButton';
import { QuoteDetails } from './QuoteDetails';
import { SlippageSettings } from './SlippageSettings';
import { SwapConfirmationModal } from './SwapConfirmationModal';
import { TransactionStatus } from './TransactionStatus';
import {
  getAllTokens,
  getTokenBalance,
  getSwapQuote,
  executeUserSwap,
  type TokenInfo,
  type SwapQuoteData,
} from '@/lib/dexApi';
import { getSDK } from '@/lib/sdk';

type SelectorTarget = 'in' | 'out' | null;
type TxState = 'pending' | 'success' | 'error';

export function SwapCard() {
  const { user, token: authToken, isAuthenticated, login } = useAuth();
  const wallet = useWallet();

  // Determine active wallet address (MetaMask takes priority)
  const activeAddress = wallet.isConnected ? wallet.address : user?.walletAddress;
  const hasWallet = wallet.isConnected || isAuthenticated;

  // Token state
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(null);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(null);
  const [amountIn, setAmountIn] = useState('');
  const [balances, setBalances] = useState<Record<string, string>>({});

  // Quote state
  const [quote, setQuote] = useState<SwapQuoteData | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [slippage, setSlippage] = useState(0.5);

  // Modal state
  const [selectorTarget, setSelectorTarget] = useState<SelectorTarget>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);

  // Transaction status state
  const [txState, setTxState] = useState<TxState>('pending');
  const [txHash, setTxHash] = useState<string>('');
  const [txError, setTxError] = useState<string>('');
  const [showTxStatus, setShowTxStatus] = useState(false);

  // Debounce ref
  const quoteTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Fetch tokens on mount
  useEffect(() => {
    getAllTokens()
      .then(setTokens)
      .catch(console.error);
  }, []);

  // Fetch balances when wallet is available
  useEffect(() => {
    if (!activeAddress || tokens.length === 0) return;

    const fetchBalances = async () => {
      const result: Record<string, string> = {};

      if (wallet.isConnected && wallet.address) {
        // Use SDK for MetaMask wallet balances
        const sdk = getSDK();
        await Promise.all(
          tokens.map(async (t) => {
            try {
              result[t.address] = await sdk.getTokenBalance(t.address, wallet.address!);
            } catch {
              // ignore individual balance errors
            }
          })
        );
      } else if (isAuthenticated && user?.walletAddress) {
        // Use API for OAuth wallet balances
        await Promise.all(
          tokens.map(async (t) => {
            try {
              result[t.address] = await getTokenBalance(t.address, user.walletAddress!);
            } catch {
              // ignore individual balance errors
            }
          })
        );
      }

      setBalances(result);
    };

    fetchBalances();
  }, [activeAddress, wallet.isConnected, wallet.address, isAuthenticated, user?.walletAddress, tokens]);

  // Debounced quote fetching
  const fetchQuote = useCallback(async () => {
    if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0) {
      setQuote(null);
      return;
    }

    setQuoteLoading(true);
    try {
      const q = await getSwapQuote(tokenIn.address, tokenOut.address, amountIn);
      setQuote(q);
    } catch {
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [tokenIn, tokenOut, amountIn]);

  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(fetchQuote, 300);
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [fetchQuote]);

  // Swap direction
  const handleSwapDirection = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(quote ? quote.estimatedAmountOut : '');
    setQuote(null);
  };

  // Token selection
  const handleTokenSelect = (token: TokenInfo) => {
    if (selectorTarget === 'in') {
      if (tokenOut?.address === token.address) setTokenOut(tokenIn);
      setTokenIn(token);
    } else {
      if (tokenIn?.address === token.address) setTokenIn(tokenOut);
      setTokenOut(token);
    }
    setQuote(null);
  };

  // Refresh balances helper
  const refreshBalances = async () => {
    if (!tokenIn || !tokenOut) return;

    const newBalances: Record<string, string> = { ...balances };

    for (const t of [tokenIn, tokenOut]) {
      try {
        if (wallet.isConnected && wallet.address) {
          const sdk = getSDK();
          newBalances[t.address] = await sdk.getTokenBalance(t.address, wallet.address);
        } else if (user?.walletAddress) {
          newBalances[t.address] = await getTokenBalance(t.address, user.walletAddress);
        }
      } catch {
        // ignore
      }
    }

    setBalances(newBalances);

    // Also refresh MetaMask native balance
    if (wallet.isConnected) {
      wallet.refreshBalance();
    }
  };

  // Execute swap via MetaMask (SDK)
  const handleMetaMaskSwap = async () => {
    if (!tokenIn || !tokenOut || !quote || !wallet.address) return;

    setShowConfirmation(false);
    setShowTxStatus(true);
    setTxState('pending');
    setSwapLoading(true);

    try {
      // Check if on correct chain
      if (!wallet.isCorrectChain) {
        await wallet.switchToSelendra();
      }

      const sdk = getSDK();

      // Step 1: Approve token for swap router
      const allowance = await sdk.getTokenAllowance(
        tokenIn.address,
        wallet.address,
        sdk.getSwapRouterAddress()
      );

      if (parseFloat(allowance) < parseFloat(amountIn)) {
        // Need approval - use a large amount for convenience
        await sdk.approveForSwap(tokenIn.address, amountIn);
      }

      // Step 2: Execute swap via MetaMask
      const result = await sdk.executeSwap(
        tokenIn.address,
        tokenOut.address,
        amountIn
      );

      setTxHash(result.hash);
      setTxState('success');
      setAmountIn('');
      setQuote(null);

      // Refresh balances
      await refreshBalances();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Swap failed';
      if (message.includes('user rejected') || message.includes('ACTION_REJECTED')) {
        setTxError('Transaction rejected by user');
      } else {
        setTxError(message);
      }
      setTxState('error');
    } finally {
      setSwapLoading(false);
    }
  };

  // Execute swap via backend API (OAuth)
  const handleOAuthSwap = async () => {
    if (!tokenIn || !tokenOut || !quote || !authToken) return;

    setShowConfirmation(false);
    setShowTxStatus(true);
    setTxState('pending');
    setSwapLoading(true);

    try {
      const minAmountOut = (
        parseFloat(quote.estimatedAmountOut) * (1 - slippage / 100)
      ).toString();

      const result = await executeUserSwap(
        tokenIn.address,
        tokenOut.address,
        amountIn,
        minAmountOut,
        authToken
      );

      setTxHash(result.txHash);
      setTxState('success');
      setAmountIn('');
      setQuote(null);

      // Refresh balances
      await refreshBalances();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Swap failed');
      setTxState('error');
    } finally {
      setSwapLoading(false);
    }
  };

  // Route to correct swap handler
  const handleSwap = async () => {
    if (wallet.isConnected) {
      await handleMetaMaskSwap();
    } else {
      await handleOAuthSwap();
    }
  };

  // Determine button state
  const getSwapButton = () => {
    if (!hasWallet) {
      return { label: 'Connect Wallet', onClick: () => wallet.connect(), disabled: false };
    }
    if (wallet.isConnected && !wallet.isCorrectChain) {
      return {
        label: 'Switch to Selendra',
        onClick: () => wallet.switchToSelendra(),
        disabled: false,
      };
    }
    if (!tokenIn || !tokenOut) {
      return { label: 'Select a token', onClick: () => {}, disabled: true };
    }
    if (!amountIn || parseFloat(amountIn) <= 0) {
      return { label: 'Enter an amount', onClick: () => {}, disabled: true };
    }
    if (balances[tokenIn.address] && parseFloat(amountIn) > parseFloat(balances[tokenIn.address])) {
      return { label: `Insufficient ${tokenIn.symbol} balance`, onClick: () => {}, disabled: true };
    }
    if (quoteLoading) {
      return { label: 'Fetching quote...', onClick: () => {}, disabled: true };
    }
    if (!quote) {
      return { label: 'Unable to get quote', onClick: () => {}, disabled: true };
    }
    return { label: 'Swap', onClick: () => setShowConfirmation(true), disabled: false };
  };

  const swapBtn = getSwapButton();

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">Swap</CardTitle>
          <SlippageSettings slippage={slippage} onSlippageChange={setSlippage} />
        </CardHeader>

        <CardContent className="space-y-1">
          {/* From */}
          <TokenInput
            label="You pay"
            token={tokenIn}
            amount={amountIn}
            balance={tokenIn ? balances[tokenIn.address] : undefined}
            onAmountChange={setAmountIn}
            onTokenSelect={() => setSelectorTarget('in')}
          />

          {/* Swap direction */}
          <SwapDirectionButton onClick={handleSwapDirection} />

          {/* To */}
          <TokenInput
            label="You receive"
            token={tokenOut}
            amount={quote ? parseFloat(quote.estimatedAmountOut).toFixed(6) : ''}
            balance={tokenOut ? balances[tokenOut.address] : undefined}
            onTokenSelect={() => setSelectorTarget('out')}
            readOnly
            loading={quoteLoading}
          />

          {/* Quote details */}
          {quote && tokenIn && tokenOut && (
            <QuoteDetails
              quote={quote}
              tokenIn={tokenIn}
              tokenOut={tokenOut}
              slippage={slippage}
            />
          )}

          {/* Swap button */}
          <Button
            onClick={swapBtn.onClick}
            disabled={swapBtn.disabled}
            className="w-full"
            size="lg"
          >
            {swapBtn.label}
          </Button>
        </CardContent>
      </Card>

      {/* Token selector modal */}
      <TokenSelectorModal
        open={selectorTarget !== null}
        onClose={() => setSelectorTarget(null)}
        tokens={tokens}
        balances={balances}
        onSelect={handleTokenSelect}
        disabledAddress={
          selectorTarget === 'in' ? tokenOut?.address : tokenIn?.address
        }
      />

      {/* Confirmation modal */}
      {showConfirmation && tokenIn && tokenOut && quote && (
        <SwapConfirmationModal
          open={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleSwap}
          tokenIn={tokenIn}
          tokenOut={tokenOut}
          amountIn={amountIn}
          quote={quote}
          slippage={slippage}
          loading={swapLoading}
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
