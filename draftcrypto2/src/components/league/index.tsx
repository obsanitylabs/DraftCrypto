// ═══════════════════════════════════════════════════════
// DraftCrypto — League Components
// ═══════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { shortenAddress } from '@/lib/utils';
import { Button } from '@/components/ui';
import { STAKING_TIERS } from '@/config';
import type { TradeMode, StakingTier } from '@/types';

// ── Types ──

interface LeagueMember {
  userId: string;
  walletAddress: string;
  ensName?: string;
  coManagerAddress?: string;
  wins: number;
  losses: number;
  totalPnl: number;
  rank: number;
  hasRageQuit: boolean;
}

interface LeagueMatch {
  week: number;
  matchId?: string;
  player1: { walletAddress: string; ensName?: string };
  player2: { walletAddress: string; ensName?: string };
  player1Pnl?: number;
  player2Pnl?: number;
  winnerId?: string;
  status: 'upcoming' | 'active' | 'settled';
}

interface League {
  id: string;
  name: string;
  tradeMode: TradeMode;
  tier: StakingTier;
  status: 'filling' | 'active' | 'complete';
  currentWeek: number;
  totalWeeks: number;
  maxPlayers: number;
  memberCount: number;
  wagerAmountUsdc?: number;
}

// ═══════════════════════════════════════════════════════
// League Lobby — Browse & Create Leagues
// ═══════════════════════════════════════════════════════

const MOCK_LEAGUES: League[] = [
  { id: 'lg-1', name: 'Degen Dynasty', tradeMode: 'paper', tier: 'fun', status: 'filling', currentWeek: 0, totalWeeks: 12, maxPlayers: 12, memberCount: 8, wagerAmountUsdc: 0.50 },
  { id: 'lg-2', name: 'Whale Wars S2', tradeMode: 'live', tier: 'whale', status: 'active', currentWeek: 4, totalWeeks: 12, maxPlayers: 12, memberCount: 12, wagerAmountUsdc: 10 },
  { id: 'lg-3', name: 'Paper Hands Club', tradeMode: 'paper', tier: 'serious', status: 'active', currentWeek: 7, totalWeeks: 12, maxPlayers: 12, memberCount: 10, wagerAmountUsdc: 2 },
  { id: 'lg-4', name: 'Alpha Hunters', tradeMode: 'live', tier: 'serious', status: 'filling', currentWeek: 0, totalWeeks: 12, maxPlayers: 12, memberCount: 3, wagerAmountUsdc: 2 },
];

export function LeagueLobby() {
  const [filter, setFilter] = useState<'all' | 'filling' | 'active'>('all');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = MOCK_LEAGUES.filter(l =>
    filter === 'all' ? true : l.status === filter
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-mono tracking-widest">LEAGUES</h1>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(!showCreate)}>
          + CREATE
        </Button>
      </div>

      {/* Create League Form */}
      {showCreate && <CreateLeagueForm onClose={() => setShowCreate(false)} />}

      {/* Filters */}
      <div className="flex gap-1">
        {(['all', 'filling', 'active'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 text-3xs font-mono tracking-widest transition-colors',
              filter === f
                ? 'bg-fc-green text-fc-bg'
                : 'bg-fc-card-alt text-fc-text-muted hover:text-fc-text',
            )}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* League Cards */}
      <div className="space-y-2">
        {filtered.map(league => (
          <LeagueCard key={league.id} league={league} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-3xs text-fc-text-dim tracking-wider">
            NO LEAGUES FOUND
          </div>
        )}
      </div>
    </div>
  );
}

function LeagueCard({ league }: { league: League }) {
  const tierConfig = STAKING_TIERS[league.tier];
  const spotsLeft = league.maxPlayers - league.memberCount;

  return (
    <Link
      href={`/league/${league.id}`}
      className="block fc-card p-4 hover:border-fc-border-green transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-xs font-mono tracking-wider">{league.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-3xs font-mono tracking-widest px-1.5 py-0.5"
              style={{ backgroundColor: tierConfig.color + '22', color: tierConfig.color }}
            >
              {league.tier.toUpperCase()}
            </span>
            <span className="text-3xs text-fc-text-dim tracking-wider">
              {league.tradeMode === 'live' ? '🟢 LIVE' : '📄 PAPER'}
            </span>
          </div>
        </div>
        <StatusBadge status={league.status} />
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        <Stat label="PLAYERS" value={`${league.memberCount}/${league.maxPlayers}`} />
        <Stat label="WEEK" value={league.status === 'filling' ? '—' : `${league.currentWeek}/${league.totalWeeks}`} />
        <Stat label="WAGER" value={league.wagerAmountUsdc ? `$${league.wagerAmountUsdc}` : 'FREE'} />
        <Stat label="SPOTS" value={spotsLeft > 0 ? String(spotsLeft) : 'FULL'} accent={spotsLeft > 0} />
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    filling: 'bg-yellow-500/10 text-yellow-400',
    active: 'bg-fc-green-glow text-fc-green',
    complete: 'bg-fc-card-alt text-fc-text-dim',
  };
  return (
    <span className={cn('text-3xs px-2 py-0.5 font-mono tracking-widest', colors[status])}>
      {status.toUpperCase()}
    </span>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[9px] text-fc-text-dim tracking-widest">{label}</div>
      <div className={cn('text-xs font-mono', accent ? 'text-fc-green' : 'text-fc-text')}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Create League Form
// ═══════════════════════════════════════════════════════

function CreateLeagueForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [tier, setTier] = useState<StakingTier>('fun');
  const [tradeMode, setTradeMode] = useState<TradeMode>('paper');

  const handleCreate = () => {
    // api.leagues.create({ name, tradeMode, tier })
    console.log('Create league:', { name, tradeMode, tier });
    onClose();
  };

  return (
    <div className="fc-card fc-accent-top p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="fc-section-title">NEW LEAGUE</span>
        <button onClick={onClose} className="text-fc-text-dim hover:text-fc-text text-sm">✕</button>
      </div>

      <input
        type="text"
        placeholder="League Name"
        value={name}
        onChange={e => setName(e.target.value)}
        maxLength={30}
        className="w-full bg-fc-bg border border-fc-border px-3 py-2 text-xs font-mono text-fc-text placeholder:text-fc-text-dim focus:border-fc-border-green outline-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] text-fc-text-dim tracking-widest block mb-1">MODE</label>
          <div className="flex gap-1">
            {(['paper', 'live'] as const).map(m => (
              <button
                key={m}
                onClick={() => setTradeMode(m)}
                className={cn(
                  'flex-1 py-1.5 text-3xs font-mono tracking-widest',
                  tradeMode === m ? 'bg-fc-green text-fc-bg' : 'bg-fc-card-alt text-fc-text-muted',
                )}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[9px] text-fc-text-dim tracking-widest block mb-1">TIER</label>
          <div className="flex gap-1">
            {(['fun', 'serious', 'whale'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={cn(
                  'flex-1 py-1.5 text-3xs font-mono tracking-widest',
                  tier === t ? 'bg-fc-green text-fc-bg' : 'bg-fc-card-alt text-fc-text-muted',
                )}
              >
                {t[0].toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-3xs text-fc-text-dim tracking-wider">
        12 players · 12 weeks · Round-robin · ${STAKING_TIERS[tier].wagerUsdc} USDC/week
      </div>

      <Button variant="primary" size="sm" onClick={handleCreate} disabled={!name.trim()}>
        CREATE LEAGUE
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// League Standings Table
// ═══════════════════════════════════════════════════════

const MOCK_MEMBERS: LeagueMember[] = [
  { userId: '1', walletAddress: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', ensName: 'vitalik.eth', wins: 6, losses: 1, totalPnl: 34.5, rank: 1, hasRageQuit: false },
  { userId: '2', walletAddress: '0x1234567890abcdef1234567890abcdef12345678', wins: 5, losses: 2, totalPnl: 18.2, rank: 2, hasRageQuit: false },
  { userId: '3', walletAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', ensName: 'whale.eth', wins: 4, losses: 3, totalPnl: 12.7, rank: 3, hasRageQuit: false },
  { userId: '4', walletAddress: '0x9876543210fedcba9876543210fedcba98765432', wins: 4, losses: 3, totalPnl: 8.1, rank: 4, hasRageQuit: false },
  { userId: '5', walletAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', wins: 3, losses: 4, totalPnl: -2.3, rank: 5, hasRageQuit: false },
  { userId: '6', walletAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', wins: 2, losses: 5, totalPnl: -14.8, rank: 6, hasRageQuit: true },
];

export function LeagueStandings({ leagueId, currentUserId }: { leagueId: string; currentUserId?: string }) {
  return (
    <div className="space-y-1">
      <div className="fc-section-title mb-2">STANDINGS</div>

      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_3rem_3rem_4rem] gap-2 px-3 py-1.5 text-[9px] text-fc-text-dim tracking-widest">
        <span>#</span>
        <span>PLAYER</span>
        <span className="text-right">W-L</span>
        <span className="text-right">PCT</span>
        <span className="text-right">PNL%</span>
      </div>

      {/* Rows */}
      {MOCK_MEMBERS.sort((a, b) => a.rank - b.rank).map(member => {
        const isMe = member.userId === currentUserId;
        const winPct = member.wins + member.losses > 0
          ? ((member.wins / (member.wins + member.losses)) * 100).toFixed(0)
          : '—';

        return (
          <div
            key={member.userId}
            className={cn(
              'grid grid-cols-[2rem_1fr_3rem_3rem_4rem] gap-2 px-3 py-2.5 items-center',
              'border border-transparent',
              isMe && 'bg-fc-green-glow/30 border-fc-border-green',
              member.hasRageQuit && 'opacity-40',
              member.rank <= 3 && !member.hasRageQuit && 'bg-fc-card-alt',
            )}
          >
            <span className={cn(
              'text-xs font-mono font-bold',
              member.rank === 1 && 'text-yellow-400',
              member.rank === 2 && 'text-gray-300',
              member.rank === 3 && 'text-amber-600',
            )}>
              {member.rank}
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-3xs font-mono tracking-wider truncate">
                  {member.ensName || shortenAddress(member.walletAddress)}
                </span>
                {isMe && (
                  <span className="text-[8px] px-1 py-0.5 bg-fc-green text-fc-bg font-mono tracking-widest">YOU</span>
                )}
                {member.hasRageQuit && (
                  <span className="text-[8px] px-1 py-0.5 bg-red-500/20 text-red-400 font-mono tracking-widest">QUIT</span>
                )}
              </div>
              {member.coManagerAddress && (
                <div className="text-[9px] text-fc-text-dim mt-0.5">
                  + {shortenAddress(member.coManagerAddress)}
                </div>
              )}
            </div>

            <span className="text-3xs font-mono text-right tracking-wider">
              {member.wins}-{member.losses}
            </span>
            <span className="text-3xs font-mono text-right tracking-wider text-fc-text-muted">
              {winPct}%
            </span>
            <span className={cn(
              'text-3xs font-mono text-right tracking-wider',
              member.totalPnl >= 0 ? 'text-fc-green' : 'text-red-400',
            )}>
              {member.totalPnl >= 0 ? '+' : ''}{member.totalPnl.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// League Schedule
// ═══════════════════════════════════════════════════════

const MOCK_SCHEDULE: LeagueMatch[] = [
  { week: 1, status: 'settled', player1: { walletAddress: '0xAb58...eC9B', ensName: 'vitalik.eth' }, player2: { walletAddress: '0x1234...5678' }, player1Pnl: 12.3, player2Pnl: -4.1, winnerId: '1' },
  { week: 2, status: 'settled', player1: { walletAddress: '0xAb58...eC9B', ensName: 'vitalik.eth' }, player2: { walletAddress: '0xdead...beef', ensName: 'whale.eth' }, player1Pnl: 8.7, player2Pnl: 3.2, winnerId: '1' },
  { week: 3, status: 'active', matchId: 'm-123', player1: { walletAddress: '0xAb58...eC9B', ensName: 'vitalik.eth' }, player2: { walletAddress: '0x9876...5432' }, player1Pnl: 2.1, player2Pnl: -0.8 },
  { week: 4, status: 'upcoming', player1: { walletAddress: '0xAb58...eC9B', ensName: 'vitalik.eth' }, player2: { walletAddress: '0xaaaa...aaaa' } },
  { week: 5, status: 'upcoming', player1: { walletAddress: '0xAb58...eC9B', ensName: 'vitalik.eth' }, player2: { walletAddress: '0xbbbb...bbbb' } },
];

export function LeagueSchedule({ leagueId, userId }: { leagueId: string; userId?: string }) {
  const [viewAll, setViewAll] = useState(false);
  const schedule = viewAll ? MOCK_SCHEDULE : MOCK_SCHEDULE.filter(m =>
    m.player1.ensName === 'vitalik.eth' || m.player2.ensName === 'vitalik.eth'
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="fc-section-title">SCHEDULE</span>
        <button
          onClick={() => setViewAll(!viewAll)}
          className="text-3xs text-fc-text-dim hover:text-fc-green font-mono tracking-widest"
        >
          {viewAll ? 'MY MATCHES' : 'ALL MATCHES'}
        </button>
      </div>

      {schedule.map((match, i) => (
        <ScheduleRow key={i} match={match} />
      ))}
    </div>
  );
}

function ScheduleRow({ match }: { match: LeagueMatch }) {
  const statusColors: Record<string, string> = {
    upcoming: 'text-fc-text-dim',
    active: 'text-fc-green',
    settled: 'text-fc-text-muted',
  };

  return (
    <div className={cn(
      'fc-card p-3',
      match.status === 'active' && 'border-fc-border-green',
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] text-fc-text-dim tracking-widest font-mono">WEEK {match.week}</span>
        <span className={cn('text-[9px] tracking-widest font-mono', statusColors[match.status])}>
          {match.status === 'active' ? '● LIVE' : match.status.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Player 1 */}
        <div className="flex-1 text-right">
          <div className="text-3xs font-mono tracking-wider truncate">
            {match.player1.ensName || match.player1.walletAddress}
          </div>
          {match.player1Pnl !== undefined && (
            <div className={cn(
              'text-xs font-mono font-bold mt-0.5',
              match.player1Pnl >= 0 ? 'text-fc-green' : 'text-red-400',
            )}>
              {match.player1Pnl >= 0 ? '+' : ''}{match.player1Pnl.toFixed(1)}%
            </div>
          )}
        </div>

        {/* VS */}
        <div className="text-[9px] text-fc-text-dim font-mono tracking-widest px-2">VS</div>

        {/* Player 2 */}
        <div className="flex-1 text-left">
          <div className="text-3xs font-mono tracking-wider truncate">
            {match.player2.ensName || match.player2.walletAddress}
          </div>
          {match.player2Pnl !== undefined && (
            <div className={cn(
              'text-xs font-mono font-bold mt-0.5',
              match.player2Pnl >= 0 ? 'text-fc-green' : 'text-red-400',
            )}>
              {match.player2Pnl >= 0 ? '+' : ''}{match.player2Pnl.toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      {match.status === 'active' && match.matchId && (
        <Link
          href={`/h2h/${match.matchId}`}
          className="block mt-2 text-center text-3xs font-mono tracking-widest text-fc-green hover:underline"
        >
          WATCH LIVE →
        </Link>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Co-Manager Invite
// ═══════════════════════════════════════════════════════

export function CoManagerInvite({ leagueId }: { leagueId: string }) {
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleInvite = async () => {
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) return;
    setStatus('sending');
    try {
      // await api.leagues.inviteCoManager(leagueId, address);
      setStatus('sent');
      setAddress('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="fc-card p-4 space-y-3">
      <div className="fc-section-title">CO-MANAGER</div>
      <p className="text-3xs text-fc-text-dim tracking-wider leading-relaxed">
        Invite a co-manager to help manage your lineup. They can set positions and use boosts,
        but cannot rage quit or withdraw wagers.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="0x... wallet address"
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="flex-1 bg-fc-bg border border-fc-border px-3 py-2 text-3xs font-mono text-fc-text placeholder:text-fc-text-dim focus:border-fc-border-green outline-none"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleInvite}
          disabled={status === 'sending' || !address.match(/^0x[a-fA-F0-9]{40}$/)}
        >
          {status === 'sending' ? '...' : status === 'sent' ? '✓' : 'INVITE'}
        </Button>
      </div>

      {status === 'sent' && (
        <p className="text-3xs text-fc-green tracking-wider">Invite sent successfully.</p>
      )}
      {status === 'error' && (
        <p className="text-3xs text-red-400 tracking-wider">Failed to send invite.</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Rage Quit
// ═══════════════════════════════════════════════════════

export function RageQuitButton({ leagueId }: { leagueId: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleRageQuit = async () => {
    setProcessing(true);
    try {
      // await api.leagues.rageQuit(leagueId);
      console.log('Rage quit:', leagueId);
    } finally {
      setProcessing(false);
      setShowConfirm(false);
    }
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="text-3xs text-red-400/60 hover:text-red-400 font-mono tracking-widest transition-colors"
      >
        RAGE QUIT
      </button>
    );
  }

  return (
    <div className="fc-card border-red-500/30 p-4 space-y-3">
      <div className="text-3xs text-red-400 font-mono tracking-widest font-bold">⚠ RAGE QUIT</div>
      <p className="text-3xs text-fc-text-dim tracking-wider leading-relaxed">
        You will forfeit all remaining matches this season. Your wager will be distributed
        to opponents. Your record will show as losses. This cannot be undone.
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>
          CANCEL
        </Button>
        <button
          onClick={handleRageQuit}
          disabled={processing}
          className="flex-1 py-2 text-3xs font-mono tracking-widest bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          {processing ? 'PROCESSING...' : 'CONFIRM RAGE QUIT'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// League Header (for detail page)
// ═══════════════════════════════════════════════════════

export function LeagueHeader({ league }: { league: League }) {
  const tierConfig = STAKING_TIERS[league.tier];
  const progress = league.totalWeeks > 0 ? (league.currentWeek / league.totalWeeks) * 100 : 0;

  return (
    <div className="p-4 border-b border-fc-border">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className="text-sm font-mono tracking-widest font-bold">{league.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-3xs font-mono tracking-widest px-1.5 py-0.5"
              style={{ backgroundColor: tierConfig.color + '22', color: tierConfig.color }}
            >
              {league.tier.toUpperCase()}
            </span>
            <span className="text-3xs text-fc-text-dim tracking-wider">
              {league.tradeMode === 'live' ? '🟢 LIVE' : '📄 PAPER'}
            </span>
            <StatusBadge status={league.status} />
          </div>
        </div>
      </div>

      {/* Season Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-[9px] text-fc-text-dim tracking-widest">
          <span>WEEK {league.currentWeek} OF {league.totalWeeks}</span>
          <span>{league.memberCount}/{league.maxPlayers} PLAYERS</span>
        </div>
        <div className="h-1 bg-fc-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-fc-green transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
