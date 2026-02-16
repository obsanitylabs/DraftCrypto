// ═══════════════════════════════════════════════════════
// Fantasy Crypto — Profile Page
// ═══════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import {
  Button, SectionTitle, Card, Badge, TierBadge,
  TradeModeBadge, PnlDisplay, ProgressBar, Input, Modal,
} from '@/components/ui';
import { STAKING_TIERS } from '@/config';
import { cn, shortenAddress, formatUnite } from '@/lib/utils';
import type { StakingTier, MatchType, TradeMode } from '@/types';

// Demo data
const DEMO_PROFILE = {
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  ensName: null,
  xHandle: '',
  tgHandle: '',
  tier: 'serious' as StakingTier,
  uniteBalance: 48_250,
  uniteStaked: 10_000,
  preferredTradeMode: 'live' as TradeMode,
};

const DEMO_STATS = {
  matchesPlayed: 42,
  matchesWon: 28,
  winRate: 66.7,
  totalPnlPercent: 142.3,
  bestPnlPercent: 48.2,
  worstPnlPercent: -22.1,
  currentStreak: 3,
  longestStreak: 7,
  leaguesPlayed: 2,
  leagueWins: 1,
  rank: 47,
};

interface MatchRecord {
  id: string;
  opponent: string;
  matchType: MatchType;
  tradeMode: TradeMode;
  duration: string;
  myPnl: number;
  oppPnl: number;
  won: boolean;
  wager: string;
  date: string;
  topPick: string;
}

const DEMO_MATCHES: MatchRecord[] = [
  { id: '042', opponent: '0xdead...beef', matchType: 'full', tradeMode: 'live', duration: '1W', myPnl: 12.4, oppPnl: 8.1, won: true, wager: '2.00', date: '2h ago', topPick: 'SOL +18.2%' },
  { id: '041', opponent: 'phantom.sol', matchType: 'fast', tradeMode: 'paper', duration: '1D', myPnl: 5.1, oppPnl: -3.2, won: true, wager: '0.50', date: '1d ago', topPick: 'HYPE +5.1%' },
  { id: '040', opponent: '0xa1b2...c3d4', matchType: 'full', tradeMode: 'live', duration: '3D', myPnl: -8.3, oppPnl: 2.1, won: false, wager: '2.00', date: '3d ago', topPick: 'BTC -2.4%' },
  { id: '039', opponent: 'vitalik.eth', matchType: 'fast', tradeMode: 'live', duration: '1D', myPnl: 22.6, oppPnl: 15.3, won: true, wager: '10.00', date: '5d ago', topPick: 'PEPE +22.6%' },
  { id: '038', opponent: '0xbeef...cafe', matchType: 'full', tradeMode: 'paper', duration: '1W', myPnl: -14.2, oppPnl: -5.1, won: false, wager: '0.50', date: '1w ago', topPick: 'ETH -8.1%' },
  { id: '037', opponent: '0xcafe...d00d', matchType: 'full', tradeMode: 'live', duration: '1W', myPnl: 31.5, oppPnl: 12.8, won: true, wager: '2.00', date: '2w ago', topPick: 'SOL +42.1%' },
];

export function ProfileContent() {
  const [settingsModal, setSettingsModal] = useState(false);
  const [xHandle, setXHandle] = useState(DEMO_PROFILE.xHandle);
  const [tgHandle, setTgHandle] = useState(DEMO_PROFILE.tgHandle);
  const [tab, setTab] = useState<'h2h' | 'leagues'>('h2h');

  return (
    <div className="px-4 pb-10">
      {/* Profile Header */}
      <div className="py-4 border-b border-fc-border-green mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-bold">
              {DEMO_PROFILE.ensName || shortenAddress(DEMO_PROFILE.walletAddress)}
            </div>
            <div className="text-3xs text-fc-text-dim mt-0.5">
              {shortenAddress(DEMO_PROFILE.walletAddress, 6)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <TierBadge tier={DEMO_PROFILE.tier} />
              <Badge variant="muted">{formatUnite(DEMO_PROFILE.uniteStaked)} staked</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSettingsModal(true)}>
            EDIT
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <SectionTitle>Career Stats</SectionTitle>
      <div className="grid grid-cols-3 gap-1 mb-4">
        <StatCard label="Win Rate" value={`${DEMO_STATS.winRate}%`} color="text-fc-green" />
        <StatCard label="Matches" value={`${DEMO_STATS.matchesWon}/${DEMO_STATS.matchesPlayed}`} color="text-fc-text" />
        <StatCard label="Rank" value={`#${DEMO_STATS.rank}`} color="text-fc-gold" />
        <StatCard label="Total PnL" value={`+${DEMO_STATS.totalPnlPercent}%`} color="text-fc-green" />
        <StatCard label="Best Match" value={`+${DEMO_STATS.bestPnlPercent}%`} color="text-fc-green" />
        <StatCard label="Worst Match" value={`${DEMO_STATS.worstPnlPercent}%`} color="text-fc-red" />
        <StatCard label="Streak" value={`${DEMO_STATS.currentStreak}W`} color="text-fc-green" />
        <StatCard label="Best Streak" value={`${DEMO_STATS.longestStreak}W`} color="text-fc-gold" />
        <StatCard label="Leagues" value={`${DEMO_STATS.leagueWins}/${DEMO_STATS.leaguesPlayed}`} color="text-fc-text" />
      </div>

      {/* Win Rate Progress */}
      <Card className="p-3 mb-4">
        <div className="flex justify-between text-3xs mb-1.5">
          <span className="text-fc-green font-bold">{DEMO_STATS.matchesWon}W</span>
          <span className="text-fc-text-dim">{DEMO_STATS.winRate}% win rate</span>
          <span className="text-fc-red font-bold">{DEMO_STATS.matchesPlayed - DEMO_STATS.matchesWon}L</span>
        </div>
        <ProgressBar value={DEMO_STATS.winRate} max={100} variant="green" />
      </Card>

      {/* Match History */}
      <div className="flex items-center justify-between mb-2">
        <SectionTitle>Match History</SectionTitle>
        <div className="flex gap-1">
          {(['h2h', 'leagues'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'text-3xs px-2 py-0.5 font-mono border transition-all',
                tab === t ? 'border-fc-border-green text-fc-green bg-fc-green-glow' : 'border-fc-border text-fc-text-dim',
              )}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {tab === 'h2h' ? (
        <div className="flex flex-col gap-1">
          {DEMO_MATCHES.map((m) => (
            <MatchHistoryCard key={m.id} match={m} />
          ))}
        </div>
      ) : (
        <Card className="p-4 text-center">
          <div className="text-3xs text-fc-text-dim">
            League history coming soon
          </div>
        </Card>
      )}

      {/* Settings Modal */}
      <Modal open={settingsModal} onClose={() => setSettingsModal(false)} title="Edit Profile">
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-3xs text-fc-text-dim tracking-wider block mb-1">X (TWITTER) HANDLE</label>
            <Input
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value)}
              placeholder="@handle"
            />
          </div>
          <div>
            <label className="text-3xs text-fc-text-dim tracking-wider block mb-1">TELEGRAM HANDLE</label>
            <Input
              value={tgHandle}
              onChange={(e) => setTgHandle(e.target.value)}
              placeholder="@handle"
            />
          </div>
          <div>
            <label className="text-3xs text-fc-text-dim tracking-wider block mb-1">DEFAULT TRADE MODE</label>
            <div className="flex gap-2">
              {(['paper', 'live'] as TradeMode[]).map(mode => (
                <button
                  key={mode}
                  className={cn(
                    'flex-1 py-2 text-2xs font-mono border transition-all',
                    DEMO_PROFILE.preferredTradeMode === mode
                      ? mode === 'live'
                        ? 'border-fc-border-green bg-fc-green-glow text-fc-green'
                        : 'border-fc-gold/25 bg-fc-gold-glow text-fc-gold'
                      : 'border-fc-border text-fc-text-muted',
                  )}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="md" className="flex-1" onClick={() => setSettingsModal(false)}>
            CANCEL
          </Button>
          <Button variant="primary" size="md" className="flex-1">
            SAVE
          </Button>
        </div>

        <div className="mt-4 pt-3 border-t border-fc-border">
          <Button variant="danger" size="sm" className="w-full">
            DISCONNECT WALLET
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ── Stat Card ──

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-fc-border bg-fc-card p-2 text-center">
      <div className={cn('text-sm font-bold', color)}>{value}</div>
      <div className="text-3xs text-fc-text-dim">{label}</div>
    </div>
  );
}

// ── Match History Card ──

function MatchHistoryCard({ match }: { match: MatchRecord }) {
  return (
    <Card hover className="p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-5 h-5 flex items-center justify-center text-3xs font-bold border',
            match.won
              ? 'border-fc-border-green bg-fc-green-glow text-fc-green'
              : 'border-fc-red/20 bg-fc-red-glow text-fc-red',
          )}>
            {match.won ? 'W' : 'L'}
          </div>
          <div>
            <div className="text-2xs font-bold">vs {match.opponent}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge variant={match.matchType === 'fast' ? 'gold' : 'green'}>
                {match.matchType === 'fast' ? 'FAST' : 'FULL'}
              </Badge>
              <Badge variant="muted">{match.duration}</Badge>
              <TradeModeBadge mode={match.tradeMode} />
            </div>
          </div>
        </div>
        <div className="text-right">
          <PnlDisplay value={match.myPnl} size="sm" />
          <div className="text-3xs text-fc-text-dim mt-0.5">
            vs {match.oppPnl >= 0 ? '+' : ''}{match.oppPnl.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-3xs">
        <span className="text-fc-text-dim">{match.date} · {match.wager} USDC</span>
        <span className="text-fc-text-muted">Top: {match.topPick}</span>
      </div>
    </Card>
  );
}
