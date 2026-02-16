'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageShell } from '@/components/layout';
import {
  LeagueHeader,
  LeagueStandings,
  LeagueSchedule,
  CoManagerInvite,
  RageQuitButton,
} from '@/components/league';
import { cn } from '@/lib/utils';
import type { TradeMode, StakingTier } from '@/types';

type Tab = 'standings' | 'schedule' | 'manage';

// Mock league for demo
const MOCK_LEAGUE = {
  id: 'lg-2',
  name: 'Whale Wars S2',
  tradeMode: 'live' as TradeMode,
  tier: 'whale' as StakingTier,
  status: 'active' as const,
  currentWeek: 4,
  totalWeeks: 12,
  maxPlayers: 12,
  memberCount: 12,
  wagerAmountUsdc: 10,
};

export default function LeagueDetailPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const [tab, setTab] = useState<Tab>('standings');

  return (
    <PageShell>
      <LeagueHeader league={MOCK_LEAGUE} />

      {/* Tab bar */}
      <div className="flex border-b border-fc-border">
        {(['standings', 'schedule', 'manage'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-3 text-3xs font-mono tracking-widest text-center transition-colors',
              tab === t
                ? 'text-fc-green border-b-2 border-fc-green'
                : 'text-fc-text-dim hover:text-fc-text',
            )}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 space-y-4">
        {tab === 'standings' && (
          <LeagueStandings leagueId={leagueId} currentUserId="1" />
        )}

        {tab === 'schedule' && (
          <LeagueSchedule leagueId={leagueId} userId="1" />
        )}

        {tab === 'manage' && (
          <div className="space-y-4">
            <CoManagerInvite leagueId={leagueId} />

            <div className="border-t border-fc-border pt-4">
              <div className="fc-section-title mb-2">DANGER ZONE</div>
              <RageQuitButton leagueId={leagueId} />
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
