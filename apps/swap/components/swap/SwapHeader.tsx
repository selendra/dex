'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ConnectButton } from './ConnectButton';
import { BalanceDisplay } from './BalanceDisplay';
import { WalletBalanceDisplay } from './WalletBalanceDisplay';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import { cn } from '@/lib/cn';

export function SwapHeader() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const wallet = useWallet();

  const navLinks = [
    { href: '/', label: 'Swap' },
    { href: '/pool', label: 'Pool' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Orange" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-bold text-foreground">Orange Swap</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-default text-foreground'
                    : 'text-muted hover:bg-default hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Balance + Theme + Connect */}
        <div className="flex items-center gap-2">
          {wallet.isConnected && wallet.address ? (
            <WalletBalanceDisplay className="hidden md:flex" />
          ) : (
            isAuthenticated && user?.walletAddress && (
              <BalanceDisplay walletAddress={user.walletAddress} className="hidden md:flex" />
            )
          )}
          <ThemeToggle variant="icon" />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
