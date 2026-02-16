'use client';

import { SectionTitle, Card } from '@/components/ui';
import { cn } from '@/lib/utils';

const MOCK_LEADERBOARD = [
  { rank: 1, name: '0xdead...beef', pnl: '+$12,450' },
  { rank: 2, name: 'phantom.sol', pnl: '+$8,320' },
  { rank: 3, name: 'vitalik.eth', pnl: '+$6,100' },
];

export function LandingLeaderboard() {
  return (
    <div>
      <SectionTitle>Leaderboard</SectionTitle>
      <Card className="overflow-hidden">
        {MOCK_LEADERBOARD.map((p, i) => (
          <div
            key={p.rank}
            className={cn(
              'flex items-center justify-between px-3 py-2.5',
              i < MOCK_LEADERBOARD.length - 1 && 'border-b border-fc-border',
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'text-xs font-bold w-4',
                  p.rank === 1 ? 'text-fc-gold' : 'text-fc-text-muted',
                )}
              >
                {p.rank}
              </span>
              <span className="text-2xs">{p.name}</span>
            </div>
            <span className="text-2xs text-fc-green font-bold">{p.pnl}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
