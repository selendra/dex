'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import { getSDK } from '@/lib/sdk';

// ============== Types ==============

interface WalletState {
  /** Connected MetaMask address */
  address: string | null;
  /** Native SEL balance */
  balance: string | null;
  /** Whether MetaMask is installed */
  isMetaMaskInstalled: boolean;
  /** Whether currently connecting */
  isConnecting: boolean;
  /** Whether wallet is connected */
  isConnected: boolean;
  /** Current chain ID from MetaMask */
  chainId: number | null;
  /** Whether on the correct Selendra chain */
  isCorrectChain: boolean;
  /** Connection error message */
  error: string | null;
}

interface WalletContextType extends WalletState {
  /** Connect to MetaMask */
  connect: () => Promise<void>;
  /** Disconnect (clear local state) */
  disconnect: () => void;
  /** Switch to Selendra network */
  switchToSelendra: () => Promise<void>;
  /** Refresh balance */
  refreshBalance: () => Promise<void>;
}

// ============== Context ==============

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_KEY = 'metamask_connected';

// ============== Provider ==============

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const balanceTimer = useRef<ReturnType<typeof setInterval>>(null);

  const isMetaMaskInstalled =
    typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;

  const sdk = typeof window !== 'undefined' ? getSDK() : null;
  const expectedChainId = sdk?.getChainId() ?? 1961;
  const isCorrectChain = chainId === expectedChainId;
  const isConnected = !!address;

  // ---- Fetch balance ----
  const fetchBalance = useCallback(
    async (addr?: string) => {
      const target = addr || address;
      if (!target || !sdk) return;
      try {
        const bal = await sdk.getBalance(target);
        setBalance(bal);
      } catch {
        // silently ignore balance errors
      }
    },
    [address, sdk]
  );

  // ---- Connect ----
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request accounts
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask');
      }

      const addr = accounts[0];
      setAddress(addr);

      // Get chain ID
      const hexChainId = (await window.ethereum.request({
        method: 'eth_chainId',
      })) as string;
      setChainId(parseInt(hexChainId, 16));

      // Remember connection
      localStorage.setItem(WALLET_KEY, 'true');

      // Fetch balance
      await fetchBalance(addr);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to connect to MetaMask';
      // User rejected
      if (message.includes('User rejected') || message.includes('4001')) {
        setError('Connection rejected by user');
      } else {
        setError(message);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [fetchBalance]);

  // ---- Disconnect ----
  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
    setChainId(null);
    setError(null);
    localStorage.removeItem(WALLET_KEY);
  }, []);

  // ---- Switch to Selendra ----
  const switchToSelendra = useCallback(async () => {
    if (!window.ethereum || !sdk) return;

    const chainConfig = sdk.getChainConfig();

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainConfig.chainId }],
      });
    } catch (switchError: unknown) {
      // Chain not added yet, add it
      if (
        switchError &&
        typeof switchError === 'object' &&
        'code' in switchError &&
        (switchError as { code: number }).code === 4902
      ) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chainConfig],
        });
      } else {
        throw switchError;
      }
    }
  }, [sdk]);

  // ---- Auto-reconnect on mount ----
  useEffect(() => {
    if (!isMetaMaskInstalled) return;

    const wasConnected = localStorage.getItem(WALLET_KEY) === 'true';
    if (!wasConnected) return;

    // Silently reconnect
    (async () => {
      try {
        const accounts = (await window.ethereum!.request({
          method: 'eth_accounts',
        })) as string[];

        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);

          const hexChainId = (await window.ethereum!.request({
            method: 'eth_chainId',
          })) as string;
          setChainId(parseInt(hexChainId, 16));
        } else {
          // Not connected anymore
          localStorage.removeItem(WALLET_KEY);
        }
      } catch {
        localStorage.removeItem(WALLET_KEY);
      }
    })();
  }, [isMetaMaskInstalled]);

  // ---- Listen for account/chain changes ----
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
        setError(null);
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const hexChainId = args[0] as string;
      setChainId(parseInt(hexChainId, 16));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect]);

  // ---- Auto-refresh balance ----
  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }

    fetchBalance();

    balanceTimer.current = setInterval(() => fetchBalance(), 30000);
    return () => {
      if (balanceTimer.current) clearInterval(balanceTimer.current);
    };
  }, [address, fetchBalance]);

  const value: WalletContextType = {
    address,
    balance,
    isMetaMaskInstalled,
    isConnecting,
    isConnected,
    chainId,
    isCorrectChain,
    error,
    connect,
    disconnect,
    switchToSelendra,
    refreshBalance: fetchBalance,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

// ============== Hook ==============

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
