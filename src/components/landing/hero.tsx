'use client';

import { useState } from 'react';
import { Logo, Button } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { WalletModal } from '@/components/wallet/wallet-modal';

export function LandingHero() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="pt-16 pb-12 text-center border-b border-fc-border mb-10">
      {/* Decorative glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-fc-green/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-tight">
          Draft. Trade.{' '}
          <span className="fc-gradient-text">Compete.</span>
        </h1>

        <p className="text-base sm:text-lg text-fc-text-muted max-w-[560px] mx-auto mb-10 leading-relaxed">
          Draft altcoin portfolios in live snake drafts. Trade alts vs alts.
          Compete head-to-head. Win real USDC.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowModal(true)}
            className="tracking-widest text-base min-w-[220px]"
          >
            CONNECT WALLET
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              const el = document.getElementById('how-it-works');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="tracking-widest min-w-[220px]"
          >
            HOW IT WORKS
          </Button>
        </div>

        {/* Featured Tournament */}
        <div className="max-w-xl mx-auto fc-card fc-accent-top p-5 text-left">
          <div className="fc-section-title mb-2">FEATURED</div>
          <div className="text-lg font-bold text-fc-green">
            🏆 Weekly Tournament — 10 USDC Entry
          </div>
          <div className="text-sm text-fc-text-muted mt-1">
            32 players. Full draft. Winner takes all. Starts Friday 8PM UTC.
          </div>
        </div>
      </div>

      <WalletModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
