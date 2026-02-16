'use client';

import { useState } from 'react';
import { Logo, Button } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { WalletModal } from '@/components/wallet/wallet-modal';

export function LandingHero() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="pt-12 pb-8 text-center border-b border-fc-border mb-6">
      <div className="flex justify-center mb-5">
        <Logo size="lg" />
      </div>

      <h1 className="text-2xl lg:text-4xl font-bold tracking-tight mb-2">
        Draft. Trade. Compete.
      </h1>

      <p className="text-2xs lg:text-sm text-fc-text-muted max-w-[380px] lg:max-w-xl mx-auto mb-7 leading-relaxed">
        Draft crypto portfolios in live snake drafts. Compete head-to-head
        or in 12-player leagues. Win real USDC wagers. Powered by Pear
        Protocol on Hyperliquid.
      </p>

      <Button
        variant="primary"
        size="lg"
        onClick={() => setShowModal(true)}
        className="tracking-widest"
      >
        CONNECT WALLET
      </Button>

      {/* Featured Tournament */}
      <div className="mt-8 fc-card fc-accent-top p-4 text-left max-w-lg mx-auto">
        <div className="fc-section-title mb-1">FEATURED</div>
        <div className="text-sm font-bold text-fc-green">
          🏆 Weekly Tournament — 10 USDC Entry
        </div>
        <div className="text-3xs text-fc-text-muted mt-1">
          32 players. Full draft. Winner takes all. Starts Friday 8PM UTC.
        </div>
      </div>

      <WalletModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
