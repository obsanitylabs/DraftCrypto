// ═══════════════════════════════════════════════════════
// Fantasy Crypto — Layout Components
// ═══════════════════════════════════════════════════════

'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { Logo, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { shortenAddress } from '@/lib/utils';
import { WalletModal, AccountPopover } from '@/components/wallet/wallet-modal';

// ── Header ──

export function Header() {
  const { user, isConnected, isConnecting } = useAuthStore();
  const pathname = usePathname();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountPopover, setShowAccountPopover] = useState(false);

  const handleWalletClick = () => {
    if (isConnected) {
      setShowAccountPopover(!showAccountPopover);
    } else {
      setShowWalletModal(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-fc-card/95 backdrop-blur-md border-b border-fc-border">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <Link href={isConnected ? '/lobby' : '/'}>
            <Logo size="sm" />
          </Link>

          <div className="flex items-center gap-1">
            {isConnected && (
              <>
                <NavLink href="/leaderboard" active={pathname === '/leaderboard'}>Stats</NavLink>
                <NavLink href="/league" active={pathname.startsWith('/league')}>League</NavLink>
                <NavLink href="/unite" active={pathname === '/unite'}>UNITE</NavLink>
                <NavLink href="/profile" active={pathname === '/profile'}>Profile</NavLink>
              </>
            )}
            <button
              onClick={handleWalletClick}
              className={cn(
                'ml-1 px-3 py-1.5 text-3xs font-semibold tracking-wider font-mono transition-all',
                isConnected
                  ? 'bg-fc-green text-fc-bg'
                  : 'bg-transparent border border-fc-border-green text-fc-green hover:bg-fc-green-glow',
              )}
            >
              {isConnecting ? 'CONNECTING...' : isConnected
                ? shortenAddress(user?.walletAddress || '')
                : 'CONNECT'}
            </button>
          </div>
        </div>
      </header>

      <WalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
      <AccountPopover isOpen={showAccountPopover} onClose={() => setShowAccountPopover(false)} />
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'px-2 py-1.5 text-3xs font-mono tracking-wider transition-colors',
        active ? 'bg-fc-green-glow text-fc-green' : 'text-fc-text-muted hover:text-fc-text',
      )}
    >
      {children}
    </Link>
  );
}

// ── Footer ──

export function Footer() {
  return (
    <footer className="border-t border-fc-border px-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <FooterLink href="/how-to-play">How to Play</FooterLink>
          <FooterLink href="/faq">FAQ</FooterLink>
          <FooterLink href="/history">Match History</FooterLink>
          <FooterLink href="/referral">Referrals</FooterLink>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <FooterLink href="/terms">Terms</FooterLink>
          <FooterLink href="/privacy">Privacy</FooterLink>
          <FooterLink href="/risk">Risk Disclosure</FooterLink>
        </div>
        {/* Branding */}
        <div className="flex items-center justify-between text-3xs text-fc-text-dim tracking-wider pt-2 border-t border-fc-border">
          <span>FANTASY CRYPTO v0.1</span>
          <span>ARBITRUM · PEAR PROTOCOL</span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-3xs text-fc-text-dim hover:text-fc-green font-mono tracking-wider transition-colors">
      {children}
    </Link>
  );
}

// ── Page Shell ──

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-fc-bg">
      <Header />
      <main className="max-w-lg mx-auto border-x border-fc-border min-h-[calc(100vh-120px)]">
        {children}
      </main>
      <Footer />
    </div>
  );
}
