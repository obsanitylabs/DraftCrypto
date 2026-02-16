// ═══════════════════════════════════════════════════════
// Fantasy Crypto — UNITE Token Page
// ═══════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import {
  Button, SectionTitle, Card, Badge, Modal,
  ProgressBar, TierBadge, Input,
} from '@/components/ui';
import { STAKING_TIERS, CONTRACTS } from '@/config';
import { cn, formatUnite, shortenAddress } from '@/lib/utils';
import type { StakingTier, UniteTransactionType } from '@/types';

// Demo state
const DEMO_BALANCE = 48_250;
const DEMO_STAKED = 10_000;
const DEMO_TIER: StakingTier = 'serious';

interface TxRecord {
  id: string;
  type: UniteTransactionType;
  amount: number;
  matchId?: string;
  date: string;
}

const DEMO_TX: TxRecord[] = [
  { id: '1', type: 'earn_match', amount: 100, matchId: 'match_042', date: '2h ago' },
  { id: '2', type: 'earn_match', amount: 100, matchId: 'match_041', date: '5h ago' },
  { id: '3', type: 'stake', amount: -10000, date: '1d ago' },
  { id: '4', type: 'earn_match', amount: 10, matchId: 'match_040', date: '1d ago' },
  { id: '5', type: 'earn_leaderboard', amount: 500, date: '3d ago' },
  { id: '6', type: 'earn_match', amount: 100, matchId: 'match_038', date: '4d ago' },
  { id: '7', type: 'earn_match', amount: 10, matchId: 'match_037', date: '5d ago' },
  { id: '8', type: 'earn_match', amount: 100, matchId: 'match_035', date: '1w ago' },
];

const TX_LABELS: Record<UniteTransactionType, { label: string; color: string }> = {
  earn_match: { label: 'Match Reward', color: 'text-fc-green' },
  earn_league: { label: 'League Reward', color: 'text-fc-green' },
  earn_leaderboard: { label: 'Leaderboard', color: 'text-fc-gold' },
  spend_boost: { label: 'Boost Used', color: 'text-fc-red' },
  stake: { label: 'Staked', color: 'text-fc-text-muted' },
  unstake: { label: 'Unstaked', color: 'text-fc-text-muted' },
  claim: { label: 'Claimed', color: 'text-fc-green' },
};

export function UniteContent() {
  const [stakeModal, setStakeModal] = useState(false);
  const [unstakeModal, setUnstakeModal] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  const balance = DEMO_BALANCE;
  const staked = DEMO_STAKED;
  const currentTier = DEMO_TIER;
  const tierConfig = STAKING_TIERS[currentTier];

  // Next tier calculation
  const tiers: StakingTier[] = ['none', 'fun', 'serious', 'whale'];
  const currentIdx = tiers.indexOf(currentTier);
  const nextTier = currentIdx < tiers.length - 1 ? tiers[currentIdx + 1] : null;
  const nextTierConfig = nextTier ? STAKING_TIERS[nextTier] : null;
  const progressToNext = nextTierConfig
    ? (staked / nextTierConfig.uniteRequired) * 100
    : 100;
  const uniteToNext = nextTierConfig
    ? nextTierConfig.uniteRequired - staked
    : 0;

  return (
    <div className="px-4 pb-10">
      {/* Header */}
      <div className="py-4 border-b border-fc-border-green mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full border-2 border-fc-green flex items-center justify-center font-display italic text-fc-green font-bold text-sm shadow-green-glow">
            U
          </div>
          <div>
            <div className="text-sm font-bold">UNITE TOKEN</div>
            <div className="text-3xs text-fc-text-dim tracking-wider">
              {shortenAddress(CONTRACTS.UNITE_TOKEN)} · Arbitrum
            </div>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <Card accent className="p-4 mb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-3xs text-fc-text-dim tracking-widest-2 mb-1">AVAILABLE BALANCE</div>
            <div className="text-2xl font-bold text-fc-green fc-glow-green">
              {formatUnite(balance)}
            </div>
            <div className="text-3xs text-fc-text-dim mt-0.5">UNITE</div>
          </div>
          <div className="text-right">
            <div className="text-3xs text-fc-text-dim tracking-widest-2 mb-1">STAKED</div>
            <div className="text-lg font-bold text-fc-text">
              {formatUnite(staked)}
            </div>
            <div className="text-3xs text-fc-text-dim mt-0.5">UNITE</div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="primary" size="sm" className="flex-1" onClick={() => setStakeModal(true)}>
            STAKE
          </Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => setUnstakeModal(true)}>
            UNSTAKE
          </Button>
        </div>
      </Card>

      {/* Current Tier */}
      <Card className="p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-3xs text-fc-text-dim tracking-widest-2">YOUR TIER</div>
          <TierBadge tier={currentTier} />
        </div>

        {/* Tier Benefits */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-fc-green">{tierConfig.wagerUsdc}</div>
            <div className="text-3xs text-fc-text-dim">USDC Wager</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-fc-gold">{tierConfig.boostCount}</div>
            <div className="text-3xs text-fc-text-dim">Boosts/Match</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-fc-text">{tierConfig.boostMax}x</div>
            <div className="text-3xs text-fc-text-dim">Max Boost</div>
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier && nextTierConfig && (
          <div>
            <div className="flex justify-between text-3xs mb-1">
              <span className="text-fc-text-muted">
                Progress to <span className="font-bold" style={{ color: STAKING_TIERS[nextTier].color }}>
                  {nextTierConfig.label}
                </span>
              </span>
              <span className="text-fc-text-dim">
                {formatUnite(uniteToNext)} more needed
              </span>
            </div>
            <ProgressBar
              value={staked}
              max={nextTierConfig.uniteRequired}
              variant={nextTier === 'whale' ? 'gold' : 'green'}
            />
          </div>
        )}

        {!nextTier && (
          <div className="text-center text-3xs text-fc-gold fc-glow-gold font-bold">
            🐋 MAX TIER ACHIEVED
          </div>
        )}
      </Card>

      {/* Tier Comparison */}
      <SectionTitle>All Tiers</SectionTitle>
      <div className="flex gap-1 mb-4">
        {(['fun', 'serious', 'whale'] as StakingTier[]).map((t) => {
          const cfg = STAKING_TIERS[t];
          const isActive = t === currentTier;
          const isBelow = tiers.indexOf(t) <= currentIdx;

          return (
            <div
              key={t}
              className={cn(
                'flex-1 p-3 border text-center transition-all',
                isActive
                  ? 'border-fc-border-green bg-fc-green-glow'
                  : 'border-fc-border bg-fc-card',
              )}
            >
              <div className={cn(
                'text-2xs font-bold mb-1',
                isActive ? 'text-fc-green' : 'text-fc-text-muted',
              )} style={!isActive && t === 'whale' ? { color: cfg.color } : undefined}>
                {cfg.label}
              </div>
              <div className="text-3xs text-fc-text-dim mb-1.5">
                {formatUnite(cfg.uniteRequired)}
              </div>
              <div className="space-y-1">
                <div className="text-3xs">
                  <span className="text-fc-text-dim">Wager: </span>
                  <span className="text-fc-text">{cfg.wagerUsdc} USDC</span>
                </div>
                <div className="text-3xs">
                  <span className="text-fc-text-dim">Boosts: </span>
                  <span className="text-fc-text">{cfg.boostCount}×{cfg.boostMax}x</span>
                </div>
              </div>
              {isActive && (
                <Badge variant="green" className="mt-2">CURRENT</Badge>
              )}
              {isBelow && !isActive && (
                <div className="text-3xs text-fc-green mt-2">✓</div>
              )}
            </div>
          );
        })}
      </div>

      {/* How to Earn */}
      <SectionTitle>How to Earn UNITE</SectionTitle>
      <Card className="p-3 mb-4">
        <div className="space-y-2">
          {[
            { action: 'Win H2H Match', amount: '100 UNITE', icon: '🏆' },
            { action: 'Win League Week', amount: '150 UNITE', icon: '🏅' },
            { action: 'Complete a Match', amount: '10 UNITE', icon: '✅' },
            { action: 'Top 10 Leaderboard', amount: '500 UNITE/week', icon: '📊' },
          ].map((r) => (
            <div key={r.action} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{r.icon}</span>
                <span className="text-2xs text-fc-text">{r.action}</span>
              </div>
              <span className="text-2xs text-fc-green font-bold">{r.amount}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-fc-border">
          <div className="text-3xs text-fc-text-dim">
            Paper mode matches earn 10% of live rewards. Swap ETH/USDC → UNITE on Uniswap (Arbitrum).
          </div>
        </div>
      </Card>

      {/* Transaction History */}
      <SectionTitle right={`${DEMO_TX.length} transactions`}>Recent Activity</SectionTitle>
      <Card className="overflow-hidden">
        {DEMO_TX.map((tx, i) => {
          const meta = TX_LABELS[tx.type];
          const isPositive = tx.amount > 0;
          return (
            <div
              key={tx.id}
              className={cn(
                'flex items-center justify-between px-3 py-2.5',
                i < DEMO_TX.length - 1 && 'border-b border-fc-border',
              )}
            >
              <div>
                <div className={cn('text-2xs font-semibold', meta.color)}>{meta.label}</div>
                <div className="text-3xs text-fc-text-dim">
                  {tx.matchId ? tx.matchId : ''} · {tx.date}
                </div>
              </div>
              <div className={cn(
                'text-2xs font-bold',
                isPositive ? 'text-fc-green' : 'text-fc-text-muted',
              )}>
                {isPositive ? '+' : ''}{formatUnite(tx.amount)}
              </div>
            </div>
          );
        })}
      </Card>

      {/* Stake Modal */}
      <Modal open={stakeModal} onClose={() => setStakeModal(false)} title="Stake UNITE">
        <div className="text-3xs text-fc-text-muted mb-4">
          Lock UNITE tokens to access wager tiers and earn boosts.
          7-day cooldown to unstake.
        </div>
        <div className="mb-3">
          <label className="text-3xs text-fc-text-dim tracking-wider block mb-1">AMOUNT</label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="0"
              className="flex-1"
            />
            <button
              onClick={() => setStakeAmount(balance.toString())}
              className="text-3xs text-fc-green border border-fc-border-green px-2 hover:bg-fc-green-glow"
            >
              MAX
            </button>
          </div>
          <div className="text-3xs text-fc-text-dim mt-1">
            Available: {formatUnite(balance)} UNITE
          </div>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-1 mb-4">
          {[1000, 10000, 50000].map(amt => (
            <button
              key={amt}
              onClick={() => setStakeAmount(amt.toString())}
              className={cn(
                'flex-1 py-1.5 text-3xs font-mono border transition-all',
                stakeAmount === amt.toString()
                  ? 'border-fc-border-green bg-fc-green-glow text-fc-green'
                  : 'border-fc-border text-fc-text-muted hover:border-fc-border-light',
              )}
            >
              {formatUnite(amt)}
            </button>
          ))}
        </div>

        {/* Result preview */}
        {stakeAmount && parseInt(stakeAmount) > 0 && (
          <div className="p-2 bg-fc-green-glow border border-fc-border-green mb-4">
            <div className="text-3xs text-fc-text-dim">After staking:</div>
            <div className="text-2xs font-bold text-fc-green mt-0.5">
              {formatUnite(staked + parseInt(stakeAmount))} UNITE staked
              {(() => {
                const total = staked + parseInt(stakeAmount);
                if (total >= 100_000) return ' → Whale tier 🐋';
                if (total >= 10_000) return ' → Serious tier';
                if (total >= 1_000) return ' → Fun tier';
                return '';
              })()}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" size="md" className="flex-1" onClick={() => setStakeModal(false)}>
            CANCEL
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            disabled={!stakeAmount || parseInt(stakeAmount) <= 0 || parseInt(stakeAmount) > balance}
          >
            STAKE UNITE
          </Button>
        </div>
      </Modal>

      {/* Unstake Modal */}
      <Modal open={unstakeModal} onClose={() => setUnstakeModal(false)} title="Unstake UNITE">
        <div className="p-2 border border-fc-gold/20 bg-fc-gold-glow mb-4">
          <div className="text-3xs text-fc-gold font-semibold">⚠ 7-DAY COOLDOWN</div>
          <div className="text-3xs text-fc-text-muted mt-1">
            After requesting unstake, tokens are locked for 7 days before withdrawal.
            Your tier may drop if staked amount falls below threshold.
          </div>
        </div>

        <div className="mb-3">
          <label className="text-3xs text-fc-text-dim tracking-wider block mb-1">AMOUNT</label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              placeholder="0"
              className="flex-1"
            />
            <button
              onClick={() => setUnstakeAmount(staked.toString())}
              className="text-3xs text-fc-red border border-fc-red/20 px-2 hover:bg-fc-red-glow"
            >
              MAX
            </button>
          </div>
          <div className="text-3xs text-fc-text-dim mt-1">
            Staked: {formatUnite(staked)} UNITE
          </div>
        </div>

        {unstakeAmount && parseInt(unstakeAmount) > 0 && (
          <div className="p-2 bg-fc-red-glow border border-fc-red/20 mb-4">
            <div className="text-3xs text-fc-text-dim">After unstaking:</div>
            <div className="text-2xs font-bold text-fc-red mt-0.5">
              {formatUnite(Math.max(0, staked - parseInt(unstakeAmount)))} UNITE staked
              {(() => {
                const remaining = staked - parseInt(unstakeAmount);
                if (remaining >= 100_000) return ' → Whale tier';
                if (remaining >= 10_000) return ' → Serious tier';
                if (remaining >= 1_000) return ' → Fun tier';
                return ' → No tier ⚠';
              })()}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" size="md" className="flex-1" onClick={() => setUnstakeModal(false)}>
            CANCEL
          </Button>
          <Button
            variant="danger"
            size="md"
            className="flex-1"
            disabled={!unstakeAmount || parseInt(unstakeAmount) <= 0 || parseInt(unstakeAmount) > staked}
          >
            REQUEST UNSTAKE
          </Button>
        </div>
      </Modal>
    </div>
  );
}
