'use client';

import { cn } from '@/lib/utils';
import { GAME } from '@/config';
import { SectionTitle } from '@/components/ui';
import type { DraftPick, MatchType } from '@/types';

interface DraftMyPicksProps {
  picks: DraftPick[];
  totalSlots: number;
  matchType: MatchType;
}

export function DraftMyPicks({ picks, totalSlots, matchType }: DraftMyPicksProps) {
  return (
    <div className="mb-3">
      <SectionTitle>Your Picks</SectionTitle>
      <div className={cn(
        'flex gap-1 flex-wrap',
        matchType === 'fast' && 'flex-col',
      )}>
        {Array.from({ length: totalSlots }).map((_, i) => {
          const pick = picks[i];
          const isBench = matchType === 'full' && i >= 6;

          return (
            <div
              key={i}
              className={cn(
                'border flex items-center justify-center transition-all',
                matchType === 'fast'
                  ? 'w-full py-3 flex-row gap-2'
                  : 'w-[calc(25%-3px)] py-2 flex-col min-h-[52px]',
                pick
                  ? 'border-fc-border-green bg-fc-green-glow'
                  : 'border-fc-border bg-transparent',
                isBench && !pick && 'border-dashed',
              )}
            >
              {pick ? (
                <>
                  <div className={cn(
                    'font-bold',
                    matchType === 'fast' ? 'text-base' : 'text-xs',
                  )}>
                    {pick.tokenSymbol}
                  </div>
                  <div className="text-3xs text-fc-green">
                    {GAME.ROUND_MULTIPLIER_LABELS[pick.pickRound] || '1x'}
                  </div>
                </>
              ) : (
                <div className="text-3xs text-fc-text-dim">
                  {matchType === 'fast'
                    ? 'Pick your token'
                    : isBench
                      ? `Bench ${i - 5}`
                      : `Slot ${i + 1}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
