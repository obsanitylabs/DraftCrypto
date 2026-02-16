// ═══════════════════════════════════════════════════════
// Fantasy Crypto — Landing Page
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
