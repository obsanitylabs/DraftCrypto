// ═══════════════════════════════════════════════════════
// Fantasy Crypto — Leaderboard
// ═══════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import {
  SectionTitle, Card, Badge, TierBadge, PnlDisplay,
} from '@/components/ui';
import { cn, formatUnite } from '@/lib/utils';
import type { StakingTier, TradeMode } from '@/types';

type TimeFilter = 'weekly' | 'monthly' | 'alltime';
type ModeFilter = 'all' | 'live' | 'paper';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  ensName?: string;
  tier: StakingTier;
  totalPnl: number;
  won: number;
  played: number;
  winRate: number;
  uniteEarned: number;
  isYou?: boolean;
}

const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, wallet: '0xaaaa...1111', ensName: 'cryptoking.eth', tier: 'whale', totalPnl: 342.5, won: 58, played: 64, winRate: 90.6, uniteEarned: 12500 },
  { rank: 2, wallet: '0xbbbb...2222', tier: 'whale', totalPnl: 285.1, won: 45, played: 52, winRate: 86.5, uniteEarned: 10200 },
  { rank: 3, wallet: '0xcccc...3333', ensName: 'degenqueen.eth', tier: 'serious', totalPnl: 248.7, won: 52, played: 68, winRate: 76.5, uniteEarned: 9800 },
  { rank: 4, wallet: '0xdddd...4444', tier: 'whale', totalPnl: 221.3, won: 41, played: 50, winRate: 82.0, uniteEarned: 8500 },
  { rank: 5, wallet: '0xeeee...5555', ensName: 'solmaxi.sol', tier: 'serious', totalPnl: 198.4, won: 38, played: 48, winRate: 79.2, uniteEarned: 7200 },
  { rank: 6, wallet: '0xffff...6666', tier: 'serious', totalPnl: 176.2, won: 34, played: 45, winRate: 75.6, uniteEarned: 6800 },
  { rank: 7, wallet: '0x1111...7777', tier: 'fun', totalPnl: 158.9, won: 42, played: 62, winRate: 67.7, uniteEarned: 5400 },
  { rank: 8, wallet: '0x2222...8888', tier: 'serious', totalPnl: 145.3, won: 30, played: 40, winRate: 75.0, uniteEarned: 5100 },
  { rank: 9, wallet: '0x3333...9999', ensName: 'whalewatch.eth', tier: 'whale', totalPnl: 142.8, won: 35, played: 48, winRate: 72.9, uniteEarned: 4800 },
  { rank: 10, wallet: '0x4444...aaaa', tier: 'fun', totalPnl: 128.5, won: 28, played: 42, winRate: 66.7, uniteEarned: 4200 },
  // ... you
  { rank: 47, wallet: '0x1234...5678', tier: 'serious', totalPnl: 42.3, won: 28, played: 42, winRate: 66.7, uniteEarned: 1820, isYou: true },
];

const REWARD_TIERS = [
  { range: '1st', unite: '2,500', color: 'text-fc-gold' },
  { range: '2nd-3rd', unite: '1,500', color: 'text-fc-green' },
  { range: '4th-10th', unite: '500', color: 'text-fc-text' },
  { range: '11th-50th', unite: '100', color: 'text-fc-text-muted' },
];

export function LeaderboardContent() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');

  const top3 = DEMO_LEADERBOARD.filter(e => e.rank <= 3);
  const rest = DEMO_LEADERBOARD.filter(e => e.rank > 3 && !e.isYou);
  const you = DEMO_LEADERBOARD.find(e => e.isYou);

  return (
    <div className="px-4 pb-10">
      {/* Header */}
      <div className="py-4 border-b border-fc-border-green mb-4">
        <div className="text-sm font-bold">Leaderboard</div>
        <div className="text-3xs text-fc-text-dim mt-0.5">
          Top traders ranked by total PnL %
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="flex gap-0.5 flex-1">
          {(['weekly', 'monthly', 'alltime'] as TimeFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={cn(
                'flex-1 py-1.5 text-3xs font-mono border transition-all text-center',
                timeFilter === f
                  ? 'border-fc-border-green bg-fc-green-glow text-fc-green'
                  : 'border-fc-border text-fc-text-dim hover:text-fc-text-muted',
              )}
            >
              {f === 'alltime' ? 'ALL' : f === 'weekly' ? 'WEEK' : 'MONTH'}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5">
          {(['all', 'live', 'paper'] as ModeFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setModeFilter(f)}
              className={cn(
                'px-2 py-1.5 text-3xs font-mono border transition-all',
                modeFilter === f
                  ? f === 'live'
                    ? 'border-fc-border-green bg-fc-green-glow text-fc-green'
                    : f === 'paper'
                      ? 'border-fc-gold/25 bg-fc-gold-glow text-fc-gold'
                      : 'border-fc-border-green bg-fc-green-glow text-fc-green'
                  : 'border-fc-border text-fc-text-dim',
              )}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="flex gap-1.5 mb-4">
        {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry) => {
          const isFirst = entry.rank === 1;
          const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉';

          return (
            <div
              key={entry.rank}
              className={cn(
                'flex-1 border p-3 text-center transition-all',
                isFirst
                  ? 'border-fc-gold/30 bg-fc-gold-glow -mt-2'
                  : 'border-fc-border bg-fc-card mt-1',
              )}
            >
              <div className="text-lg mb-1">{medal}</div>
              <div className={cn(
                'text-2xs font-bold truncate',
                isFirst && 'text-fc-gold',
              )}>
                {entry.ensName || entry.wallet}
              </div>
              <PnlDisplay value={entry.totalPnl} size="sm" />
              <div className="text-3xs text-fc-text-dim mt-1">
                {entry.won}W-{entry.played - entry.won}L
              </div>
              <TierBadge tier={entry.tier} />
            </div>
          );
        })}
      </div>

      {/* Rewards Info */}
      <Card className="p-3 mb-4">
        <div className="text-3xs text-fc-text-dim tracking-widest-2 mb-2">WEEKLY UNITE REWARDS</div>
        <div className="grid grid-cols-4 gap-1">
          {REWARD_TIERS.map((r) => (
            <div key={r.range} className="text-center">
              <div className={cn('text-2xs font-bold', r.color)}>{r.unite}</div>
              <div className="text-3xs text-fc-text-dim">{r.range}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Full Rankings */}
      <SectionTitle right={`${DEMO_LEADERBOARD.length} players`}>Rankings</SectionTitle>
      <Card className="overflow-hidden mb-3">
        {/* Header row */}
        <div className="grid grid-cols-[32px_1fr_64px_48px_52px] px-3 py-1.5 border-b border-fc-border">
          <span className="text-3xs text-fc-text-dim">#</span>
          <span className="text-3xs text-fc-text-dim">PLAYER</span>
          <span className="text-3xs text-fc-text-dim text-right">PNL %</span>
          <span className="text-3xs text-fc-text-dim text-right">W/L</span>
          <span className="text-3xs text-fc-text-dim text-right">WIN%</span>
        </div>

        {rest.map((entry, i) => (
          <LeaderboardRow key={entry.rank} entry={entry} isLast={i === rest.length - 1} />
        ))}
      </Card>

      {/* Your Position (sticky/highlighted) */}
      {you && (
        <div>
          <SectionTitle>Your Position</SectionTitle>
          <Card className="overflow-hidden border-fc-border-green bg-fc-green-glow">
            <div className="grid grid-cols-[32px_1fr_64px_48px_52px] px-3 py-2.5 items-center">
              <span className="text-2xs font-bold text-fc-green">#{you.rank}</span>
              <div>
                <div className="text-2xs font-bold text-fc-green">You</div>
                <div className="text-3xs text-fc-text-dim">{you.wallet}</div>
              </div>
              <div className="text-right">
                <PnlDisplay value={you.totalPnl} size="sm" />
              </div>
              <span className="text-3xs text-right text-fc-text">
                {you.won}-{you.played - you.won}
              </span>
              <span className="text-3xs text-right text-fc-text">
                {you.winRate.toFixed(0)}%
              </span>
            </div>
            <div className="px-3 pb-2 flex items-center justify-between">
              <span className="text-3xs text-fc-text-dim">
                {formatUnite(you.uniteEarned)} UNITE earned this period
              </span>
              <TierBadge tier={you.tier} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Leaderboard Row ──

function LeaderboardRow({ entry, isLast }: { entry: LeaderboardEntry; isLast: boolean }) {
  return (
    <div className={cn(
      'grid grid-cols-[32px_1fr_64px_48px_52px] px-3 py-2 items-center',
      !isLast && 'border-b border-fc-border',
    )}>
      <span className={cn(
        'text-2xs font-bold',
        entry.rank <= 3 ? 'text-fc-gold' : entry.rank <= 10 ? 'text-fc-green' : 'text-fc-text-muted',
      )}>
        {entry.rank}
      </span>
      <div className="min-w-0">
        <div className="text-2xs font-semibold truncate">
          {entry.ensName || entry.wallet}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <TierBadge tier={entry.tier} />
        </div>
      </div>
      <div className="text-right">
        <PnlDisplay value={entry.totalPnl} size="sm" />
      </div>
      <span className="text-3xs text-right text-fc-text-muted">
        {entry.won}-{entry.played - entry.won}
      </span>
      <span className="text-3xs text-right text-fc-text-muted">
        {entry.winRate.toFixed(0)}%
      </span>
    </div>
  );
}
