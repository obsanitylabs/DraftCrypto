// ═══════════════════════════════════════════════════════
// DraftCrypto — Landing Page
// ═══════════════════════════════════════════════════════

import { PageShell } from '@/components/layout';
import { LandingHero } from '@/components/landing/hero';
import { LandingOpenMatches } from '@/components/landing/open-matches';
import { LandingLeaderboard } from '@/components/landing/leaderboard';
import { LandingHowItWorks } from '@/components/landing/how-it-works';
import { WaitlistPopup } from '@/components/landing/waitlist-popup';

export default function Home() {
  return (
    <PageShell>
      {/* Preview Banner */}
      <div className="bg-fc-green/10 border-b border-fc-green/20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-3">
          <span className="text-sm font-mono tracking-wider text-fc-green font-semibold">🚧 PREVIEW</span>
          <span className="text-sm text-fc-text-muted">Paper trading only. Live USDC wagers &amp; on-chain settlement coming soon.</span>
        </div>
      </div>

      <div className="px-4 lg:px-8 pb-10 max-w-6xl mx-auto">
        <LandingHero />
        <LandingHowItWorks />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <LandingOpenMatches />
          <LandingLeaderboard />
        </div>
      </div>
      <WaitlistPopup delayMs={8000} scrollTrigger={50} />
    </PageShell>
  );
}
