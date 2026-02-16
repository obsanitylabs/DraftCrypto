'use client';

import { useState } from 'react';
import { PageShell } from '@/components/layout';
import { Button, Badge, PnlDisplay } from '@/components/ui';
import { cn, shortenAddress } from '@/lib/utils';
import { ShareMatchModal } from '@/components/match/share-card';
import Link from 'next/link';
import type { PositionType } from '@/types';

// ── Mock Data ──

interface HistoryMatch {
  id: string;
  matchType: 'fast' | 'full';
  tradeMode: 'live' | 'paper';
  tier: string;
  duration: string;
  status: 'settled' | 'cancelled';
  result: 'win' | 'loss' | 'draw' | null;
  myPnl: number;
  oppPnl: number;
  opponent: { address: string; ensName?: string };
  wager?: number;
  payout?: number;
  uniteEarned: number;
  settledAt: string;
  myPicks: PickResult[];
  oppPicks: PickResult[];
}

interface PickResult {
  symbol: string;
  positionType: PositionType;
  weight: number;
  boost: number;
  pnlPercent: number;
  entryPrice: number;
  exitPrice: number;
}

const MOCK_HISTORY: HistoryMatch[] = [
  {
    id: 'm-001', matchType: 'full', tradeMode: 'paper', tier: 'fun', duration: '1D',
    status: 'settled', result: 'win', myPnl: 8.42, oppPnl: -3.17,
    opponent: { address: '0xdead...beef', ensName: 'whale.eth' },
    uniteEarned: 100, settledAt: '2026-02-05T18:00:00Z',
    myPicks: [
      { symbol: 'SOL', positionType: 'long', weight: 0.25, boost: 1, pnlPercent: 12.3, entryPrice: 184.50, exitPrice: 207.20 },
      { symbol: 'ETH', positionType: 'long', weight: 0.25, boost: 1, pnlPercent: 4.1, entryPrice: 3200, exitPrice: 3331.20 },
      { symbol: 'DOGE', positionType: 'short', weight: 0.15, boost: 1, pnlPercent: 8.7, entryPrice: 0.182, exitPrice: 0.166 },
      { symbol: 'AVAX', positionType: 'short', weight: 0.15, boost: 1, pnlPercent: -2.4, entryPrice: 38.50, exitPrice: 39.42 },
      { symbol: 'LINK', positionType: 'long', weight: 0.10, boost: 1, pnlPercent: 15.2, entryPrice: 18.20, exitPrice: 20.97 },
      { symbol: 'MATIC', positionType: 'short', weight: 0.10, boost: 1, pnlPercent: -1.8, entryPrice: 0.92, exitPrice: 0.937 },
    ],
    oppPicks: [
      { symbol: 'BTC', positionType: 'long', weight: 0.25, boost: 1, pnlPercent: -2.1, entryPrice: 94200, exitPrice: 92222 },
      { symbol: 'ARB', positionType: 'long', weight: 0.25, boost: 1, pnlPercent: -6.3, entryPrice: 1.24, exitPrice: 1.162 },
      { symbol: 'OP', positionType: 'short', weight: 0.15, boost: 1, pnlPercent: 3.5, entryPrice: 2.80, exitPrice: 2.702 },
      { symbol: 'NEAR', positionType: 'long', weight: 0.15, boost: 1, pnlPercent: -4.8, entryPrice: 5.60, exitPrice: 5.331 },
      { symbol: 'FTM', positionType: 'long', weight: 0.10, boost: 1, pnlPercent: 1.2, entryPrice: 0.74, exitPrice: 0.749 },
      { symbol: 'INJ', positionType: 'short', weight: 0.10, boost: 1, pnlPercent: -1.9, entryPrice: 22.50, exitPrice: 22.93 },
    ],
  },
  {
    id: 'm-002', matchType: 'fast', tradeMode: 'paper', tier: 'fun', duration: '1D',
    status: 'settled', result: 'loss', myPnl: -5.12, oppPnl: 7.88,
    opponent: { address: '0x1234...5678' },
    uniteEarned: 10, settledAt: '2026-02-04T12:00:00Z',
    myPicks: [
      { symbol: 'BTC', positionType: 'long', weight: 1.0, boost: 1, pnlPercent: -5.12, entryPrice: 95000, exitPrice: 90134 },
    ],
    oppPicks: [
      { symbol: 'ETH', positionType: 'short', weight: 1.0, boost: 1, pnlPercent: 7.88, entryPrice: 3400, exitPrice: 3132 },
    ],
  },
  {
    id: 'm-003', matchType: 'full', tradeMode: 'live', tier: 'serious', duration: '3D',
    status: 'settled', result: 'win', myPnl: 14.67, oppPnl: -8.23,
    opponent: { address: '0xabcd...ef01', ensName: 'degen.eth' },
    wager: 2.00, payout: 3.80, uniteEarned: 100, settledAt: '2026-02-01T08:00:00Z',
    myPicks: [
      { symbol: 'ETH', positionType: 'long', weight: 0.25, boost: 2, pnlPercent: 18.5, entryPrice: 3150, exitPrice: 3733 },
      { symbol: 'SOL', positionType: 'long', weight: 0.25, boost: 1, pnlPercent: 9.3, entryPrice: 178, exitPrice: 194.55 },
      { symbol: 'DOGE', positionType: 'short', weight: 0.15, boost: 1, pnlPercent: 12.1, entryPrice: 0.19, exitPrice: 0.167 },
      { symbol: 'BNB', positionType: 'short', weight: 0.15, boost: 1, pnlPercent: -4.2, entryPrice: 580, exitPrice: 604.36 },
      { symbol: 'APT', positionType: 'long', weight: 0.10, boost: 1, pnlPercent: 6.8, entryPrice: 9.40, exitPrice: 10.04 },
      { symbol: 'SUI', positionType: 'long', weight: 0.10, boost: 1, pnlPercent: 3.2, entryPrice: 1.85, exitPrice: 1.909 },
    ],
    oppPicks: [
      { symbol: 'BTC', positionType: 'long', weight: 0.25, boost: 1, pnlPercent: -3.7, entryPrice: 96000, exitPrice: 92448 },
      { symbol: 'AVAX', positionType: 'short', weight: 0.25, boost: 1, pnlPercent: -8.1, entryPrice: 36, exitPrice: 38.92 },
      { symbol: 'LINK', positionType: 'long', weight: 0.15, boost: 1, pnlPercent: 5.4, entryPrice: 17.80, exitPrice: 18.76 },
      { symbol: 'ARB', positionType: 'short', weight: 0.15, boost: 1, pnlPercent: -12.3, entryPrice: 1.15, exitPrice: 1.291 },
      { symbol: 'OP', positionType: 'long', weight: 0.10, boost: 1, pnlPercent: -7.9, entryPrice: 2.60, exitPrice: 2.395 },
      { symbol: 'FTM', positionType: 'long', weight: 0.10, boost: 1, pnlPercent: -1.2, entryPrice: 0.68, exitPrice: 0.672 },
    ],
  },
];

export default function HistoryPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [shareMatch, setShareMatch] = useState<HistoryMatch | null>(null);

  const filtered = MOCK_HISTORY.filter(m =>
    filter === 'all' ? true : m.result === filter
  );

  const stats = {
    total: MOCK_HISTORY.length,
    wins: MOCK_HISTORY.filter(m => m.result === 'win').length,
    losses: MOCK_HISTORY.filter(m => m.result === 'loss').length,
    totalPnl: MOCK_HISTORY.reduce((s, m) => s + m.myPnl, 0),
    totalUnite: MOCK_HISTORY.reduce((s, m) => s + m.uniteEarned, 0),
  };

  return (
    <PageShell>
      <div className="px-4 py-8 pb-16 space-y-5 max-w-5xl mx-auto">
        <h1 className="text-xl font-mono tracking-widest font-bold">MATCH HISTORY</h1>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="MATCHES" value={String(stats.total)} />
          <StatCard label="RECORD" value={`${stats.wins}-${stats.losses}`} />
          <StatCard label="TOTAL PNL" value={`${stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(1)}%`} accent={stats.totalPnl >= 0} />
          <StatCard label="UNITE" value={String(stats.totalUnite)} />
        </div>

        {/* Filters */}
        <div className="flex gap-1">
          {(['all', 'win', 'loss'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn(
              'px-4 py-2 text-xs font-mono tracking-widest',
              filter === f ? 'bg-fc-green text-fc-bg' : 'bg-fc-card-alt text-fc-text-muted hover:text-fc-text',
            )}>{f.toUpperCase()}</button>
          ))}
        </div>

        {/* Match List */}
        <div className="space-y-2">
          {filtered.map(match => (
            <div key={match.id}>
              <MatchCard
                match={match}
                isExpanded={expanded === match.id}
                onToggle={() => setExpanded(expanded === match.id ? null : match.id)}
                onShare={() => setShareMatch(match)}
              />
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-fc-text-dim tracking-wider">NO MATCHES FOUND</div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareMatch && shareMatch.result && (
        <ShareMatchModal
          isOpen={!!shareMatch}
          onClose={() => setShareMatch(null)}
          data={{
            matchId: shareMatch.id,
            matchType: shareMatch.matchType,
            tradeMode: shareMatch.tradeMode,
            tier: shareMatch.tier,
            duration: shareMatch.duration,
            result: shareMatch.result,
            myAddress: '0x0000000000000000000000000000000000000000',
            opponentAddress: shareMatch.opponent.address,
            opponentEns: shareMatch.opponent.ensName,
            myPnl: shareMatch.myPnl,
            opponentPnl: shareMatch.oppPnl,
            wagerUsdc: shareMatch.wager,
            uniteEarned: shareMatch.uniteEarned,
            positions: shareMatch.myPicks.map(p => ({
              symbol: p.symbol,
              positionType: p.positionType,
              pnlPercent: p.pnlPercent,
              weight: p.weight,
              boosted: p.boost > 1,
            })),
            date: new Date(shareMatch.settledAt).toLocaleDateString(),
          }}
        />
      )}
    </PageShell>
  );
}

// ── Match Card ──

function MatchCard({ match, isExpanded, onToggle, onShare }: { match: HistoryMatch; isExpanded: boolean; onToggle: () => void; onShare: () => void }) {
  const resultColors = { win: 'text-fc-green', loss: 'text-red-400', draw: 'text-yellow-400' };
  const resultBg = { win: 'bg-fc-green/5 border-fc-green/20', loss: 'bg-red-500/5 border-red-500/20', draw: 'bg-yellow-500/5 border-yellow-500/20' };
  const date = new Date(match.settledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className={cn('border transition-colors rounded-lg', match.result ? resultBg[match.result] : 'fc-card')}>
      {/* Header */}
      <button onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className={cn('text-sm font-mono font-bold tracking-widest', match.result ? resultColors[match.result] : '')}>
              {match.result?.toUpperCase() || 'CANCELLED'}
            </span>
            <span className="text-xs text-fc-text-dim tracking-widest">
              {match.matchType === 'fast' ? 'FAST' : 'FULL'} · {match.tradeMode.toUpperCase()} · {match.duration}
            </span>
          </div>
          <span className="text-xs text-fc-text-dim tracking-wider">{date}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* My PnL */}
          <div className="flex-1 text-right">
            <div className="text-xs text-fc-text-dim tracking-widest">YOU</div>
            <div className={cn('text-lg font-mono font-bold', match.myPnl >= 0 ? 'text-fc-green' : 'text-red-400')}>
              {match.myPnl >= 0 ? '+' : ''}{match.myPnl.toFixed(2)}%
            </div>
          </div>
          <span className="text-xs text-fc-text-dim font-mono">VS</span>
          {/* Opponent PnL */}
          <div className="flex-1 text-left">
            <div className="text-xs text-fc-text-dim tracking-widest truncate">
              {match.opponent.ensName || shortenAddress(match.opponent.address)}
            </div>
            <div className={cn('text-lg font-mono font-bold', match.oppPnl >= 0 ? 'text-fc-green' : 'text-red-400')}>
              {match.oppPnl >= 0 ? '+' : ''}{match.oppPnl.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Rewards row */}
        <div className="flex items-center gap-3 mt-3 text-xs text-fc-text-dim tracking-wider">
          {match.payout && <span className="text-fc-green">+${match.payout.toFixed(2)} USDC</span>}
          <span>+{match.uniteEarned} UNITE</span>
          <span className="ml-auto">{isExpanded ? '▲' : '▼'} Details</span>
        </div>
      </button>

      {/* Expanded Box Score */}
      {isExpanded && (
        <div className="border-t border-inherit p-4 space-y-4">
          <BoxScore title="YOUR PICKS" picks={match.myPicks} />
          <BoxScore title="OPPONENT PICKS" picks={match.oppPicks} />

          {/* Share button */}
          <div className="flex justify-center pt-2">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onShare(); }}>
              📤 SHARE RESULT
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Box Score ──

function BoxScore({ title, picks }: { title: string; picks: PickResult[] }) {
  return (
    <div>
      <div className="text-xs text-fc-text-dim tracking-widest mb-2">{title}</div>
      <div className="space-y-1">
        {picks.map((p, i) => (
          <div key={i} className="grid grid-cols-[3.5rem_2.5rem_3rem_1fr_4rem] gap-2 items-center py-1.5">
            <span className="text-sm font-mono tracking-wider text-fc-text">{p.symbol}</span>
            <span className={cn('text-xs font-mono tracking-widest',
              p.positionType === 'long' ? 'text-fc-green' : p.positionType === 'short' ? 'text-red-400' : 'text-fc-text-dim'
            )}>
              {p.positionType === 'long' ? 'L' : p.positionType === 'short' ? 'S' : 'B'}
              {p.boost > 1 && ` ${p.boost}x`}
            </span>
            <span className="text-xs text-fc-text-dim font-mono">{(p.weight * 100).toFixed(0)}%</span>
            {/* Price range bar */}
            <div className="h-1.5 bg-fc-bg rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', p.pnlPercent >= 0 ? 'bg-fc-green' : 'bg-red-400')}
                style={{ width: `${Math.min(Math.abs(p.pnlPercent) * 3, 100)}%` }}
              />
            </div>
            <span className={cn('text-sm font-mono text-right tracking-wider',
              p.pnlPercent >= 0 ? 'text-fc-green' : 'text-red-400'
            )}>
              {p.pnlPercent >= 0 ? '+' : ''}{p.pnlPercent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="fc-card p-3 text-center">
      <div className="text-xs text-fc-text-dim tracking-widest">{label}</div>
      <div className={cn('text-sm font-mono font-bold', accent ? 'text-fc-green' : 'text-fc-text')}>{value}</div>
    </div>
  );
}
