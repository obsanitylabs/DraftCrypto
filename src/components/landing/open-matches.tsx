'use client';

import { SectionTitle, Card, MatchTypeBadge, TradeModeBadge, TierBadge, Button } from '@/components/ui';
import { useAuthStore } from '@/stores';
import type { MatchType, MatchDuration, TradeMode, StakingTier } from '@/types';

// Mock data — will be replaced with API call
const MOCK_OPEN_MATCHES: {
  id: string;
  matchType: MatchType;
  duration: MatchDuration;
  wager: string;
  tier: StakingTier;
  creator: string;
  tradeMode: TradeMode;
}[] = [
  { id: '1', matchType: 'fast', duration: '1D', wager: '0.50', tier: 'fun', creator: '0xdead...b33f', tradeMode: 'live' },
  { id: '2', matchType: 'full', duration: '1W', wager: '2.00', tier: 'serious', creator: 'phantom.sol', tradeMode: 'live' },
  { id: '3', matchType: 'fast', duration: '1W', wager: '0.10', tier: 'fun', creator: '0xa1b2...c3d4', tradeMode: 'paper' },
  { id: '4', matchType: 'full', duration: '1D', wager: '5.00', tier: 'whale', creator: 'vitalik.eth', tradeMode: 'live' },
  { id: '5', matchType: 'fast', duration: '1D', wager: '0.05', tier: 'fun', creator: '0xbeef...cafe', tradeMode: 'paper' },
];

export function LandingOpenMatches() {
  const { setConnecting } = useAuthStore();

  return (
    <div className="mb-12">
      <SectionTitle right={`${MOCK_OPEN_MATCHES.length} waiting`}>
        Open H2H Matches
      </SectionTitle>

      <div className="flex flex-col gap-2">
        {MOCK_OPEN_MATCHES.slice(0, 3).map((match) => (
          <OpenMatchCard
            key={match.id}
            match={match}
            onJoin={() => setConnecting(true)}
          />
        ))}
      </div>

      <div
        className="text-center py-4 text-sm text-fc-text-dim cursor-pointer hover:text-fc-green transition-colors"
        onClick={() => setConnecting(true)}
      >
        Connect wallet to see all matches →
      </div>
    </div>
  );
}

function OpenMatchCard({
  match,
  onJoin,
}: {
  match: typeof MOCK_OPEN_MATCHES[0];
  onJoin: () => void;
}) {
  return (
    <Card hover className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <MatchTypeBadge type={match.matchType} duration={match.duration} />
        <div>
          <div className="text-sm text-fc-text font-medium">{match.creator}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-fc-text-muted">{match.wager} USDC</span>
            <TradeModeBadge mode={match.tradeMode} />
            <TierBadge tier={match.tier} />
          </div>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onJoin}>
        JOIN
      </Button>
    </Card>
  );
}
