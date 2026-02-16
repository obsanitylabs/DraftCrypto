// ═══════════════════════════════════════════════════════
// DraftCrypto — Lineup Manager
// ═══════════════════════════════════════════════════════

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDraftStore, useLineupStore, useUniteStore } from '@/stores';
import {
  Button, SectionTitle, Badge, Modal, PositionBadge,
} from '@/components/ui';
import { GAME, STAKING_TIERS } from '@/config';
import { cn, formatLiquidationDistance } from '@/lib/utils';
import type { PositionType, DraftPick, StakingTier } from '@/types';

interface LineupManagerProps {
  matchId: string;
  matchType?: 'fast' | 'full';
}

export function LineupManager({ matchId, matchType = 'full' }: LineupManagerProps) {
  const router = useRouter();
  const { myPicks } = useDraftStore();
  const { assignments, boosts, cycleAssignment, setBoost, initAssignments } = useLineupStore();
  const { tier } = useUniteStore();
  const [boostModalPick, setBoostModalPick] = useState<DraftPick | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Initialize assignments from draft picks
  useEffect(() => {
    if (myPicks.length > 0 && Object.keys(assignments).length === 0) {
      initAssignments(myPicks, matchType);
    }
  }, [myPicks]);

  // Demo tier
  const currentTier: StakingTier = tier || 'whale';
  const tierConfig = STAKING_TIERS[currentTier];

  const positionGroups: PositionType[] = matchType === 'fast'
    ? ['long', 'short']
    : ['long', 'short', 'bench'];

  const posColor = (pos: PositionType) =>
    pos === 'long' ? 'text-fc-green' : pos === 'short' ? 'text-fc-red' : 'text-fc-text-muted';

  const posBorderColor = (pos: PositionType) =>
    pos === 'long' ? 'border-fc-border-green' : pos === 'short' ? 'border-fc-red/30' : 'border-fc-border';

  const posBgColor = (pos: PositionType) =>
    pos === 'long' ? 'bg-fc-green-glow' : pos === 'short' ? 'bg-fc-red-glow' : 'bg-transparent';

  const getPicksForPosition = (pos: PositionType) =>
    myPicks.filter(p => assignments[p.tokenSymbol] === pos);

  const activeCount = getPicksForPosition('long').length + getPicksForPosition('short').length;
  const benchCount = getPicksForPosition('bench').length;
  const isValid = matchType === 'fast'
    ? true
    : activeCount <= GAME.FULL_ACTIVE_POSITIONS;

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      router.push(`/h2h/${matchId}`);
    }, 1500);
  };

  const handleBoostConfirm = (multiplier: number) => {
    if (boostModalPick) {
      setBoost(boostModalPick.tokenSymbol, multiplier);
      setBoostModalPick(null);
    }
  };

  return (
    <div className="px-4 pb-10">
      {/* Header */}
      <div className="py-4 border-b border-fc-border-green mb-4">
        <div className="text-3xs tracking-widest-2 text-fc-text-muted">
          {matchType === 'fast' ? 'FAST MATCH — SET DIRECTION' : 'SET YOUR LINEUP'}
        </div>
        <div className="text-sm font-bold mt-0.5">
          {matchType === 'fast' ? 'Long or Short?' : 'Assign Long / Short / Bench'}
        </div>
        <div className="text-3xs text-fc-text-dim mt-1">
          {matchType === 'fast'
            ? 'Tap to toggle Long ↔ Short'
            : `Tap tokens to cycle positions. ${GAME.FULL_ACTIVE_POSITIONS} active + ${GAME.FULL_BENCH_POSITIONS} bench.`}
        </div>
      </div>

      {/* Position Groups */}
      {positionGroups.map(pos => {
        const picks = getPicksForPosition(pos);
        const maxForPos = matchType === 'fast'
          ? 1
          : pos === 'bench' ? GAME.FULL_BENCH_POSITIONS : GAME.FULL_ACTIVE_POSITIONS;

        return (
          <div key={pos} className="mb-4">
            <div className={cn('text-3xs font-bold tracking-widest-2 uppercase mb-1.5', posColor(pos))}>
              {pos} {pos !== 'bench' ? `(${picks.length})` : `(${picks.length}/${GAME.FULL_BENCH_POSITIONS})`}
            </div>

            {picks.length > 0 ? picks.map(pick => {
              const boost = boosts[pick.tokenSymbol] || 1;
              const effectiveLeverage = GAME.BASE_LEVERAGE * boost;
              const multiplierLabel = GAME.ROUND_MULTIPLIER_LABELS[pick.pickRound] || '1x';

              return (
                <div
                  key={pick.id}
                  className={cn(
                    'flex items-center justify-between p-3 mb-1 cursor-pointer border transition-all',
                    posBorderColor(pos),
                    posBgColor(pos),
                  )}
                  onClick={() => cycleAssignment(pick.tokenSymbol, matchType === 'fast')}
                >
                  <div className="flex items-center gap-2">
                    <PositionBadge type={pos} />
                    <span className="text-xs font-bold">{pick.tokenSymbol}</span>
                    <span className="text-3xs text-fc-text-dim">{multiplierLabel}</span>
                    {boost > 1 && (
                      <Badge variant="gold">{boost}x BOOST</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {pos === 'bench' && tierConfig.boostCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBoostModalPick(pick);
                        }}
                        className="text-3xs text-fc-gold border border-fc-gold/20 px-2 py-0.5 hover:bg-fc-gold-glow transition-colors"
                      >
                        ⚡ BOOST
                      </button>
                    )}
                    <span className="text-3xs text-fc-text-dim">
                      {effectiveLeverage}x lev
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="py-3 border border-dashed border-fc-border text-center text-3xs text-fc-text-dim">
                No tokens assigned
              </div>
            )}
          </div>
        );
      })}

      {/* Leverage Summary */}
      {matchType === 'full' && (
        <div className="mb-4 p-3 border border-fc-border bg-fc-card">
          <div className="text-3xs text-fc-text-dim mb-2">LEVERAGE SUMMARY</div>
          <div className="flex flex-wrap gap-2">
            {myPicks.map(p => {
              const boost = boosts[p.tokenSymbol] || 1;
              const lev = GAME.BASE_LEVERAGE * boost;
              const pos = assignments[p.tokenSymbol] || 'bench';
              return (
                <div key={p.id} className="text-3xs">
                  <span className={cn('font-bold', posColor(pos))}>{p.tokenSymbol}</span>
                  <span className="text-fc-text-dim ml-1">{lev}x</span>
                  {lev > 3 && (
                    <span className="text-fc-gold ml-1">
                      (liq {formatLiquidationDistance(lev)})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit */}
      <Button
        variant="primary"
        size="lg"
        className="w-full tracking-widest"
        loading={submitting}
        onClick={handleSubmit}
        disabled={!isValid}
      >
        {matchType === 'fast'
          ? 'CONFIRM & START MATCH'
          : 'FINALIZE ROSTER & SUBMIT TRADES'}
      </Button>

      {!isValid && (
        <div className="text-center text-3xs text-fc-red mt-2">
          Max {GAME.FULL_ACTIVE_POSITIONS} active positions. Move some to bench.
        </div>
      )}

      {/* Boost Modal */}
      <BoostModal
        open={!!boostModalPick}
        onClose={() => setBoostModalPick(null)}
        onConfirm={handleBoostConfirm}
        pick={boostModalPick}
        tier={currentTier}
        maxMultiplier={tierConfig.boostMax}
      />
    </div>
  );
}

// ── Boost Modal ──

function BoostModal({ open, onClose, onConfirm, pick, tier, maxMultiplier }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (multiplier: number) => void;
  pick: DraftPick | null;
  tier: StakingTier;
  maxMultiplier: number;
}) {
  const [selected, setSelected] = useState(1);

  if (!pick) return null;

  const options = [1];
  if (maxMultiplier >= 2) options.push(2);
  if (maxMultiplier >= 3) options.push(3);

  return (
    <Modal open={open} onClose={onClose} title={`Boost ${pick.tokenSymbol}`}>
      <div className="text-3xs text-fc-text-muted mb-4">
        Apply leverage boost when this token enters the active lineup.
        Boost is {tier} tier max: {maxMultiplier}x.
      </div>

      <div className="flex gap-2 mb-4">
        {options.map(m => {
          const totalLev = GAME.BASE_LEVERAGE * m;
          return (
            <button
              key={m}
              onClick={() => setSelected(m)}
              className={cn(
                'flex-1 py-3 text-center border font-mono transition-all',
                selected === m
                  ? m > 1
                    ? 'border-fc-gold/40 bg-fc-gold-glow'
                    : 'border-fc-border-green bg-fc-green-glow'
                  : 'border-fc-border hover:border-fc-border-light',
              )}
            >
              <div className={cn(
                'text-lg font-bold',
                m > 1 ? 'text-fc-gold' : 'text-fc-green',
              )}>
                {m === 1 ? 'No Boost' : `${m}x`}
              </div>
              <div className="text-3xs text-fc-text-muted mt-1">{totalLev}x leverage</div>
              <div className={cn(
                'text-3xs mt-0.5',
                totalLev > 3 ? 'text-fc-gold' : 'text-fc-text-dim',
              )}>
                Liq: {formatLiquidationDistance(totalLev)}
              </div>
            </button>
          );
        })}
      </div>

      {selected > 1 && (
        <div className="p-2 border border-fc-gold/20 bg-fc-gold-glow mb-4">
          <div className="text-3xs text-fc-gold font-semibold">⚠ BOOST WARNING</div>
          <div className="text-3xs text-fc-text-muted mt-1">
            At {GAME.BASE_LEVERAGE * selected}x leverage, liquidation occurs at
            ~{formatLiquidationDistance(GAME.BASE_LEVERAGE * selected)} adverse move.
            Setting a stop loss is strongly recommended.
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
          CANCEL
        </Button>
        <Button
          variant={selected > 1 ? 'primary' : 'secondary'}
          size="md"
          className="flex-1"
          onClick={() => onConfirm(selected)}
        >
          {selected > 1 ? `APPLY ${selected}x BOOST` : 'NO BOOST'}
        </Button>
      </div>
    </Modal>
  );
}
