// ═══════════════════════════════════════════════════════
// DraftCrypto — Draft Room
// ═══════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDraft } from '@/hooks/use-draft';
import { DraftHeader } from './draft-header';
import { DraftMyPicks } from './draft-my-picks';
import { DraftTokenList } from './draft-token-list';
import { MOCK_TOKENS } from '@/lib/mock-data';
import { GAME } from '@/config';
import { Badge } from '@/components/ui';
import type { MatchType } from '@/types';

interface DraftRoomProps {
  matchId: string;
  matchType?: MatchType;
}

export function DraftRoom({ matchId, matchType = 'full' }: DraftRoomProps) {
  const router = useRouter();

  const {
    draft,
    myPicks,
    opponentPicks,
    availableTokens,
    watchlist,
    isMyTurn,
    isDraftComplete,
    currentRound,
    picksPerPlayer,
    currentWeight,
    currentMultiplier,
    makePick,
    toggleWatchlist,
  } = useDraft({
    matchId,
    matchType,
    userId: 'player_a',
    tokens: MOCK_TOKENS,
  });

  // Navigate to lineup when draft is complete
  useEffect(() => {
    if (isDraftComplete) {
      const timer = setTimeout(() => {
        router.push(`/h2h/${matchId}/lineup`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isDraftComplete, matchId, router]);

  if (!draft) return null;

  // ── Draft Complete Screen ──
  if (isDraftComplete) {
    return (
      <div className="px-4 pt-20 pb-10 text-center">
        <div className="text-2xl font-bold text-fc-green fc-glow-green mb-2 animate-fade-in">
          DRAFT COMPLETE
        </div>
        <div className="text-2xs text-fc-text-muted animate-fade-in">
          Setting up your lineup...
        </div>
        <div className="flex flex-wrap justify-center gap-1.5 mt-6 animate-slide-up">
          {myPicks.map((p) => (
            <div key={p.id} className="px-3 py-2 border border-fc-border-green bg-fc-green-glow">
              <div className="text-xs font-bold">{p.tokenSymbol}</div>
              <div className="text-3xs text-fc-green">{
                GAME.ROUND_MULTIPLIER_LABELS[p.pickRound] || '1x'
              }</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-10">
      {/* Draft Header: round info + timer */}
      <DraftHeader
        matchType={matchType}
        currentPick={draft.currentPick}
        totalPicks={draft.totalPicks}
        currentRound={currentRound}
        timeLeft={draft.timeLeft}
        isMyTurn={isMyTurn}
      />

      {/* Multiplier Indicator */}
      {matchType === 'fast' ? (
        <div className="text-center py-1.5 mb-3 bg-fc-gold-glow border border-fc-gold/15">
          <span className="text-3xs text-fc-gold font-bold">
            FAST MATCH — Pick one token. You&apos;ll choose Long or Short next.
          </span>
        </div>
      ) : (
        <div className="text-center py-1.5 mb-3 bg-fc-green-glow border border-fc-border-green">
          <span className="text-3xs text-fc-green font-bold">
            This pick: {currentMultiplier} weight ({(currentWeight * 100).toFixed(0)}% allocation)
          </span>
        </div>
      )}

      {/* My Picks Grid */}
      <DraftMyPicks
        picks={myPicks}
        totalSlots={picksPerPlayer}
        matchType={matchType}
      />

      {/* Opponent picks summary */}
      {opponentPicks.length > 0 && (
        <div className="mb-3">
          <div className="fc-section-title mb-1.5">Opponent&apos;s Picks</div>
          <div className="flex flex-wrap gap-1">
            {opponentPicks.map((p) => (
              <div key={p.id} className="px-2 py-1 border border-fc-border bg-fc-card">
                <span className="text-3xs font-bold text-fc-text-muted">{p.tokenSymbol}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token List */}
      <DraftTokenList
        tokens={availableTokens}
        watchlist={watchlist}
        onPick={makePick}
        onToggleWatchlist={toggleWatchlist}
        isMyTurn={isMyTurn}
      />
    </div>
  );
}
