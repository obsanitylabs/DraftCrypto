'use client';

import { Timer } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { MatchType } from '@/types';

interface DraftHeaderProps {
  matchType: MatchType;
  currentPick: number;
  totalPicks: number;
  currentRound: number;
  timeLeft: number;
  isMyTurn: boolean;
}

export function DraftHeader({
  matchType,
  currentPick,
  totalPicks,
  currentRound,
  timeLeft,
  isMyTurn,
}: DraftHeaderProps) {
  const totalRounds = matchType === 'fast' ? 1 : 8;

  return (
    <div className="flex items-center justify-between py-3 border-b border-fc-border-green mb-3">
      <div>
        <div className={cn(
          'text-3xs tracking-widest-2 font-semibold',
          isMyTurn ? 'text-fc-green' : 'text-fc-gold',
        )}>
          {isMyTurn ? 'YOUR PICK' : 'OPPONENT PICKING...'}
        </div>
        <div className="text-2xs font-bold text-fc-text mt-0.5">
          {matchType === 'fast'
            ? `Pick ${currentPick + 1}/${totalPicks}`
            : `Round ${currentRound}/${totalRounds} · Pick ${currentPick + 1}/${totalPicks}`}
        </div>
      </div>
      <Timer seconds={timeLeft} warn={10} />
    </div>
  );
}
