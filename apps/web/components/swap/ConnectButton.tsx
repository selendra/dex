'use client';

import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, ChevronDown, Wallet, AlertTriangle } from 'lucide-react';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectButton() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const wallet = useWallet();

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </Button>
    );
  }

  // MetaMask connected state
  if (wallet.isConnected && wallet.address) {
    const displayAddr = truncateAddress(wallet.address);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {!wallet.isCorrectChain && (
              <AlertTriangle className="h-4 w-4 text-warning" />
            )}
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.3622 2L13.0259 8.19L14.5568 4.58L21.3622 2Z" fill="#E2761B"/>
                <path d="M2.6489 2L10.9189 8.25L9.4543 4.58L2.6489 2Z" fill="#E4761B"/>
                <path d="M18.3622 16.02L16.2259 19.27L20.9259 20.56L22.2759 16.1L18.3622 16.02Z" fill="#E4761B"/>
                <path d="M1.7378 16.1L3.0759 20.56L7.7759 19.27L5.6489 16.02L1.7378 16.1Z" fill="#E4761B"/>
              </svg>
            </div>
            <span className="hidden sm:inline">{displayAddr}</span>
            <ChevronDown className="h-3 w-3 text-muted" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-xs text-muted">MetaMask Wallet</p>
            <p className="truncate text-sm font-medium">{displayAddr}</p>
          </div>
          {wallet.balance && (
            <div className="px-2 py-1">
              <p className="text-xs text-muted">Balance</p>
              <p className="text-sm font-medium">
                {parseFloat(wallet.balance).toFixed(4)} SEL
              </p>
            </div>
          )}
          <DropdownMenuSeparator />
          {!wallet.isCorrectChain && (
            <DropdownMenuItem
              onClick={() => wallet.switchToSelendra()}
              className="text-warning focus:text-warning"
            >
              <AlertTriangle className="h-4 w-4" />
              Switch to Selendra
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={wallet.disconnect}
            className="text-danger focus:text-danger"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // OAuth connected state
  if (isAuthenticated && user) {
    const displayName = user.walletAddress
      ? truncateAddress(user.walletAddress)
      : user.username || user.name || 'Account';

    const initials = (user.name || user.username || 'U').slice(0, 2).toUpperCase();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Avatar className="h-6 w-6">
              {user.profile && <AvatarImage src={user.profile} alt={displayName} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{displayName}</span>
            <ChevronDown className="h-3 w-3 text-muted" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {user.walletAddress && (
            <>
              <div className="px-2 py-1.5">
                <p className="text-xs text-muted">Wallet</p>
                <p className="truncate text-sm font-medium">{truncateAddress(user.walletAddress)}</p>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={logout} className="text-danger focus:text-danger">
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Not connected - show connect options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" disabled={wallet.isConnecting}>
          {wallet.isConnecting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          Connect
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => wallet.connect()} disabled={!wallet.isMetaMaskInstalled}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
            <path d="M21.3622 2L13.0259 8.19L14.5568 4.58L21.3622 2Z" fill="#E2761B"/>
            <path d="M2.6489 2L10.9189 8.25L9.4543 4.58L2.6489 2Z" fill="#E4761B"/>
            <path d="M18.3622 16.02L16.2259 19.27L20.9259 20.56L22.2759 16.1L18.3622 16.02Z" fill="#E4761B"/>
            <path d="M1.7378 16.1L3.0759 20.56L7.7759 19.27L5.6489 16.02L1.7378 16.1Z" fill="#E4761B"/>
          </svg>
          {wallet.isMetaMaskInstalled ? 'MetaMask' : 'Install MetaMask'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={login}>
          <Wallet className="h-4 w-4" />
          Orange Account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
