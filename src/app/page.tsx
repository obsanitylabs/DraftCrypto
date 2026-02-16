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
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-center gap-3">
          <span className="text-sm font-mono tracking-wider text-fc-green font-semibold">🚧 PREVIEW</span>
          <span className="text-sm text-fc-text-muted">Paper trading only. Live USDC wagers &amp; on-chain settlement coming soon.</span>
        </div>
      </div>

      <div className="px-4 pb-10">
        <LandingHero />
        <LandingHowItWorks />
        <LandingOpenMatches />
        <LandingLeaderboard />
      </div>
      <WaitlistPopup delayMs={8000} scrollTrigger={50} />
    </PageShell>
  );
}
