// ═══════════════════════════════════════════════════════
// Fantasy Crypto — Admin Dashboard Components
// ═══════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn, shortenAddress } from '@/lib/utils';
import { Button } from '@/components/ui';
import { API } from '@/config';

// ═══════════════════════════════════════════════════════
// API Helper (admin endpoints)
// ═══════════════════════════════════════════════════════

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('fc_token') : null;
  const res = await fetch(`${API.BASE_URL}/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Admin API Error ${res.status}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════
// Overview Dashboard
// ═══════════════════════════════════════════════════════

interface OverviewData {
  users: { total: number; today: number; thisWeek: number };
  matches: { total: number; today: number; active: number; settled: number; cancelled: number; live: number; paper: number; tierBreakdown: Record<string, number> };
  volume: { totalWagerVolumeUsdc: number; feesCollectedUsdc: number };
  unite: { totalDistributed: number; totalSpent: number; netCirculating: number };
}

const MOCK_OVERVIEW: OverviewData = {
  users: { total: 2847, today: 43, thisWeek: 312 },
  matches: { total: 8921, today: 156, active: 34, settled: 8642, cancelled: 245, live: 2104, paper: 6817, tierBreakdown: { fun: 5200, serious: 2800, whale: 921 } },
  volume: { totalWagerVolumeUsdc: 84230, feesCollectedUsdc: 4211.50 },
  unite: { totalDistributed: 2450000, totalSpent: 890000, netCirculating: 1560000 },
};

export function AdminOverview() {
  const [data, setData] = useState<OverviewData>(MOCK_OVERVIEW);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const d = await adminFetch<OverviewData>('/analytics/overview');
      setData(d);
    } catch {
      // Use mock in dev
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-mono tracking-widest">PLATFORM OVERVIEW</h2>
        <button onClick={refresh} className="text-3xs text-fc-text-dim hover:text-fc-green font-mono tracking-widest">
          {loading ? 'LOADING...' : '↻ REFRESH'}
        </button>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="TOTAL USERS" value={data.users.total.toLocaleString()} sub={`+${data.users.today} today`} color="green" />
        <MetricCard label="TOTAL MATCHES" value={data.matches.total.toLocaleString()} sub={`${data.matches.active} active`} color="green" />
        <MetricCard label="WAGER VOLUME" value={`$${data.volume.totalWagerVolumeUsdc.toLocaleString()}`} sub="USDC (live)" color="gold" />
        <MetricCard label="FEES COLLECTED" value={`$${data.volume.feesCollectedUsdc.toLocaleString()}`} sub="5% platform fee" color="gold" />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="USERS THIS WEEK" value={data.users.thisWeek.toLocaleString()} />
        <MetricCard label="MATCHES TODAY" value={data.matches.today.toLocaleString()} />
        <MetricCard label="SETTLED" value={data.matches.settled.toLocaleString()} sub={`${data.matches.cancelled} cancelled`} />
        <MetricCard label="UNITE CIRCULATING" value={`${(data.unite.netCirculating / 1000).toFixed(0)}K`} sub={`${(data.unite.totalDistributed / 1000).toFixed(0)}K distributed`} />
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="fc-card p-4">
          <div className="fc-section-title mb-3">TRADE MODE</div>
          <BarRow label="Paper" value={data.matches.paper} total={data.matches.total} color="#6b7265" />
          <BarRow label="Live" value={data.matches.live} total={data.matches.total} color="#adf0c7" />
        </div>
        <div className="fc-card p-4">
          <div className="fc-section-title mb-3">TIER BREAKDOWN</div>
          {Object.entries(data.matches.tierBreakdown).map(([tier, count]) => (
            <BarRow key={tier} label={tier.toUpperCase()} value={count} total={data.matches.total}
              color={tier === 'whale' ? '#ffdc4a' : tier === 'serious' ? '#adf0c7' : '#6b7265'} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="fc-card p-3">
      <div className="text-[9px] text-fc-text-dim tracking-widest">{label}</div>
      <div className={cn('text-lg font-mono font-bold mt-1',
        color === 'green' ? 'text-fc-green' : color === 'gold' ? 'text-yellow-400' : 'text-fc-text',
      )}>
        {value}
      </div>
      {sub && <div className="text-[9px] text-fc-text-dim tracking-wider mt-0.5">{sub}</div>}
    </div>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-3xs font-mono tracking-wider mb-1">
        <span>{label}</span>
        <span className="text-fc-text-muted">{value.toLocaleString()} ({pct.toFixed(1)}%)</span>
      </div>
      <div className="h-1.5 bg-fc-bg rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// User Management
// ═══════════════════════════════════════════════════════

interface AdminUser {
  id: string;
  walletAddress: string;
  ensName?: string;
  preferredTradeMode: string;
  createdAt: string;
  _count: { matchPlayers: number; uniteTransactions: number };
}

const MOCK_USERS: AdminUser[] = [
  { id: 'u1', walletAddress: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', ensName: 'vitalik.eth', preferredTradeMode: 'live', createdAt: '2026-01-15T10:00:00Z', _count: { matchPlayers: 45, uniteTransactions: 120 } },
  { id: 'u2', walletAddress: '0x1234567890abcdef1234567890abcdef12345678', preferredTradeMode: 'paper', createdAt: '2026-02-01T08:30:00Z', _count: { matchPlayers: 12, uniteTransactions: 30 } },
  { id: 'u3', walletAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', ensName: 'whale.eth', preferredTradeMode: 'live', createdAt: '2026-01-20T14:00:00Z', _count: { matchPlayers: 78, uniteTransactions: 200 } },
];

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-mono tracking-widest">USERS</h2>
        <input
          type="text"
          placeholder="Search wallet/ENS..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-xs bg-fc-bg border border-fc-border px-3 py-1.5 text-3xs font-mono text-fc-text placeholder:text-fc-text-dim focus:border-fc-border-green outline-none"
        />
      </div>

      {/* User Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-[9px] text-fc-text-dim tracking-widest border-b border-fc-border">
              <th className="text-left py-2 px-3">USER</th>
              <th className="text-left py-2 px-3">MODE</th>
              <th className="text-right py-2 px-3">MATCHES</th>
              <th className="text-right py-2 px-3">TX COUNT</th>
              <th className="text-left py-2 px-3">JOINED</th>
              <th className="text-right py-2 px-3">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.filter(u =>
              !search || u.walletAddress.toLowerCase().includes(search.toLowerCase()) ||
              u.ensName?.toLowerCase().includes(search.toLowerCase())
            ).map(user => (
              <tr key={user.id} className="border-b border-fc-border/50 hover:bg-fc-card-alt transition-colors">
                <td className="py-2.5 px-3">
                  <div className="text-3xs font-mono tracking-wider">
                    {user.ensName || shortenAddress(user.walletAddress)}
                  </div>
                  <div className="text-[9px] text-fc-text-dim font-mono">{shortenAddress(user.walletAddress)}</div>
                </td>
                <td className="py-2.5 px-3">
                  <span className={cn(
                    'text-3xs font-mono tracking-widest px-1.5 py-0.5',
                    user.preferredTradeMode === 'live' ? 'bg-fc-green-glow text-fc-green' : 'bg-fc-card-alt text-fc-text-muted',
                  )}>
                    {user.preferredTradeMode.toUpperCase()}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right text-3xs font-mono">{user._count.matchPlayers}</td>
                <td className="py-2.5 px-3 text-right text-3xs font-mono">{user._count.uniteTransactions}</td>
                <td className="py-2.5 px-3 text-3xs text-fc-text-muted font-mono">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                    className="text-3xs text-fc-green hover:underline font-mono tracking-widest"
                  >
                    MANAGE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User action panel */}
      {selectedUser && (
        <UserActionPanel userId={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// User Action Panel (UNITE adjust, force unstake, ban)
// ═══════════════════════════════════════════════════════

function UserActionPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [activeAction, setActiveAction] = useState<'unite' | 'unstake' | 'ban' | null>(null);

  return (
    <div className="fc-card fc-accent-top p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="fc-section-title">USER ACTIONS — {userId.slice(0, 8)}</span>
        <button onClick={onClose} className="text-fc-text-dim hover:text-fc-text text-sm">✕</button>
      </div>

      <div className="flex gap-2">
        <ActionButton label="UNITE ADJUST" active={activeAction === 'unite'} onClick={() => setActiveAction(activeAction === 'unite' ? null : 'unite')} />
        <ActionButton label="FORCE UNSTAKE" active={activeAction === 'unstake'} onClick={() => setActiveAction(activeAction === 'unstake' ? null : 'unstake')} />
        <ActionButton label="BAN USER" active={activeAction === 'ban'} onClick={() => setActiveAction(activeAction === 'ban' ? null : 'ban')} color="red" />
      </div>

      {activeAction === 'unite' && <UniteAdjustForm userId={userId} />}
      {activeAction === 'unstake' && <ForceUnstakeForm userId={userId} />}
      {activeAction === 'ban' && <BanUserForm userId={userId} />}
    </div>
  );
}

function ActionButton({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-3xs font-mono tracking-widest transition-colors border',
        active
          ? color === 'red' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-fc-green-glow border-fc-border-green text-fc-green'
          : 'border-fc-border text-fc-text-muted hover:text-fc-text',
      )}
    >
      {label}
    </button>
  );
}

function UniteAdjustForm({ userId }: { userId: string }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!amount || !reason) return;
    setStatus('saving');
    try {
      await adminFetch(`/users/${userId}/unite-adjust`, {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(amount), type, reason }),
      });
      setStatus('done');
      setAmount('');
      setReason('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-2 p-3 bg-fc-bg border border-fc-border">
      <div className="text-[9px] text-fc-text-dim tracking-widest">UNITE BALANCE ADJUSTMENT</div>
      <div className="flex gap-2">
        <button onClick={() => setType('credit')} className={cn('px-3 py-1 text-3xs font-mono tracking-widest', type === 'credit' ? 'bg-fc-green text-fc-bg' : 'bg-fc-card-alt text-fc-text-muted')}>CREDIT</button>
        <button onClick={() => setType('debit')} className={cn('px-3 py-1 text-3xs font-mono tracking-widest', type === 'debit' ? 'bg-red-500/80 text-white' : 'bg-fc-card-alt text-fc-text-muted')}>DEBIT</button>
      </div>
      <input type="number" placeholder="Amount (UNITE)" value={amount} onChange={e => setAmount(e.target.value)}
        className="w-full bg-fc-card border border-fc-border px-3 py-2 text-3xs font-mono text-fc-text placeholder:text-fc-text-dim focus:border-fc-border-green outline-none" />
      <input type="text" placeholder="Reason (required)" value={reason} onChange={e => setReason(e.target.value)}
        className="w-full bg-fc-card border border-fc-border px-3 py-2 text-3xs font-mono text-fc-text placeholder:text-fc-text-dim focus:border-fc-border-green outline-none" />
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!amount || !reason || status === 'saving'}>
          {status === 'saving' ? 'SAVING...' : status === 'done' ? '✓ DONE' : 'APPLY'}
        </Button>
        {status === 'error' && <span className="text-3xs text-red-400">Failed</span>}
      </div>
    </div>
  );
}

function ForceUnstakeForm({ userId }: { userId: string }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!amount || !reason) return;
    setStatus('saving');
    try {
      await adminFetch(`/users/${userId}/force-unstake`, {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(amount), reason }),
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-2 p-3 bg-fc-bg border border-red-500/30">
      <div className="text-[9px] text-red-400 tracking-widest">⚠ FORCE UNSTAKE</div>
      <p className="text-[9px] text-fc-text-dim tracking-wider">
        Bypasses 7-day cooldown. Also requires on-chain admin transaction on UNITEStaking contract.
      </p>
      <input type="number" placeholder="Amount (UNITE)" value={amount} onChange={e => setAmount(e.target.value)}
        className="w-full bg-fc-card border border-fc-border px-3 py-2 text-3xs font-mono text-fc-text placeholder:text-fc-text-dim outline-none" />
      <input type="text" placeholder="Reason (required)" value={reason} onChange={e => setReason(e.target.value)}
        className="w-full bg-fc-card border border-fc-border px-3 py-2 text-3xs font-mono text-fc-text placeholder:text-fc-text-dim outline-none" />
      <Button variant="danger" size="sm" onClick={handleSubmit} disabled={!amount || !reason || status === 'saving'}>
        {status === 'saving' ? 'PROCESSING...' : status === 'done' ? '✓ UNSTAKED' : 'FORCE UNSTAKE'}
      </Button>
    </div>
  );
}

function BanUserForm({ userId }: { userId: string }) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('7d');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!reason) return;
    setStatus('saving');
    try {
      await adminFetch(`/users/${userId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ reason, duration: duration === 'permanent' ? undefined : duration }),
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-2 p-3 bg-fc-bg border border-red-500/30">
      <div className="text-[9px] text-red-400 tracking-widest">⚠ BAN USER</div>
      <div className="flex gap-1">
        {['1d', '7d', '30d', 'permanent'].map(d => (
          <button key={d} onClick={() => setDuration(d)}
            className={cn('px-2 py-1 text-3xs font-mono tracking-widest', duration === d ? 'bg-red-500/80 text-white' : 'bg-fc-card-alt text-fc-text-muted')}>
            {d.toUpperCase()}
          </button>
        ))}
      </div>
      <input type="text" placeholder="Ban reason (required)" value={reason} onChange={e => setReason(e.target.value)}
        className="w-full bg-fc-card border border-fc-border px-3 py-2 text-3xs font-mono text-fc-text placeholder:text-fc-text-dim outline-none" />
      <Button variant="danger" size="sm" onClick={handleSubmit} disabled={!reason || status === 'saving'}>
        {status === 'saving' ? 'BANNING...' : status === 'done' ? '✓ BANNED' : 'CONFIRM BAN'}
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Match Inspector + PnL Adjustment
// ═══════════════════════════════════════════════════════

export function AdminMatches() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  const MOCK_MATCHES = [
    { id: 'm-001', matchType: 'full', tradeMode: 'paper', tier: 'fun', status: 'settled', createdAt: '2026-02-06T10:00:00Z', players: [
      { userId: 'u1', walletAddress: '0xAb58...eC9B', ensName: 'vitalik.eth', totalPnl: 12.5, isWinner: true },
      { userId: 'u2', walletAddress: '0x1234...5678', totalPnl: -4.2, isWinner: false },
    ]},
    { id: 'm-002', matchType: 'fast', tradeMode: 'live', tier: 'whale', status: 'active', createdAt: '2026-02-06T11:30:00Z', players: [
      { userId: 'u3', walletAddress: '0xdead...beef', ensName: 'whale.eth', totalPnl: 3.1, isWinner: false },
      { userId: 'u1', walletAddress: '0xAb58...eC9B', ensName: 'vitalik.eth', totalPnl: -1.4, isWinner: false },
    ]},
    { id: 'm-003', matchType: 'full', tradeMode: 'live', tier: 'serious', status: 'settled', createdAt: '2026-02-05T16:00:00Z', players: [
      { userId: 'u2', walletAddress: '0x1234...5678', totalPnl: 8.9, isWinner: true },
      { userId: 'u3', walletAddress: '0xdead...beef', ensName: 'whale.eth', totalPnl: 7.2, isWinner: false },
    ]},
  ];

  const filtered = MOCK_MATCHES.filter(m => statusFilter === 'all' || m.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-mono tracking-widest">MATCHES</h2>
        <div className="flex gap-1">
          {['all', 'active', 'settled', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-2 py-1 text-3xs font-mono tracking-widest',
                statusFilter === s ? 'bg-fc-green text-fc-bg' : 'bg-fc-card-alt text-fc-text-muted')}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {filtered.map(match => (
        <div key={match.id} className="fc-card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-3xs font-mono tracking-wider text-fc-text-muted">{match.id}</span>
              <span className={cn('text-[9px] px-1.5 py-0.5 font-mono tracking-widest',
                match.status === 'active' ? 'bg-fc-green-glow text-fc-green' :
                match.status === 'settled' ? 'bg-fc-card-alt text-fc-text-muted' :
                'bg-red-500/10 text-red-400',
              )}>
                {match.status.toUpperCase()}
              </span>
              <span className="text-[9px] text-fc-text-dim">{match.matchType} · {match.tradeMode} · {match.tier}</span>
            </div>
            <button
              onClick={() => setSelectedMatch(selectedMatch === match.id ? null : match.id)}
              className="text-3xs text-fc-green hover:underline font-mono tracking-widest"
            >
              {selectedMatch === match.id ? 'CLOSE' : 'INSPECT'}
            </button>
          </div>

          {/* Players */}
          <div className="flex gap-4">
            {match.players.map(p => (
              <div key={p.userId} className="flex-1 flex items-center gap-2">
                <span className={cn('text-3xs font-mono', p.isWinner && 'text-fc-green')}>
                  {p.isWinner ? '👑' : '  '} {p.ensName || p.walletAddress}
                </span>
                <span className={cn('text-3xs font-mono ml-auto',
                  p.totalPnl >= 0 ? 'text-fc-green' : 'text-red-400')}>
                  {p.totalPnl >= 0 ? '+' : ''}{p.totalPnl.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>

          {/* Action panel */}
          {selectedMatch === match.id && (
            <MatchActionPanel matchId={match.id} players={match.players} status={match.status} />
          )}
        </div>
      ))}
    </div>
  );
}

function MatchActionPanel({ matchId, players, status }: {
  matchId: string;
  players: Array<{ userId: string; walletAddress: string; ensName?: string; totalPnl: number }>;
  status: string;
}) {
  return (
    <div className="mt-3 pt-3 border-t border-fc-border space-y-3">
      <PnlAdjustmentForm matchId={matchId} players={players} />

      <div className="flex gap-2">
        {status === 'settled' && (
          <ResettleButton matchId={matchId} />
        )}
        {status !== 'cancelled' && status !== 'settled' && (
          <CancelMatchButton matchId={matchId} />
        )}
      </div>
    </div>
  );
}

function PnlAdjustmentForm({ matchId, players }: {
  matchId: string;
  players: Array<{ userId: string; walletAddress: string; ensName?: string }>;
}) {
  const [userId, setUserId] = useState(players[0]?.userId || '');
  const [adjustedPnl, setAdjustedPnl] = useState('');
  const [reason, setReason] = useState<string>('high_slippage');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  const reasons = [
    { value: 'high_slippage', label: 'High Slippage' },
    { value: 'low_liquidity', label: 'Low Liquidity' },
    { value: 'price_feed_error', label: 'Price Feed Error' },
    { value: 'execution_failure', label: 'Execution Failure' },
    { value: 'market_manipulation', label: 'Market Manipulation' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async () => {
    if (!adjustedPnl || !notes) return;
    setStatus('saving');
    try {
      await adminFetch(`/matches/${matchId}/pnl-adjust`, {
        method: 'POST',
        body: JSON.stringify({ userId, adjustedPnl: parseFloat(adjustedPnl), reason, notes }),
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="p-3 bg-fc-bg border border-yellow-500/30 space-y-2">
      <div className="text-[9px] text-yellow-400 tracking-widest">PNL ADJUSTMENT</div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] text-fc-text-dim tracking-widest block mb-1">PLAYER</label>
          <select value={userId} onChange={e => setUserId(e.target.value)}
            className="w-full bg-fc-card border border-fc-border px-2 py-1.5 text-3xs font-mono text-fc-text outline-none">
            {players.map(p => (
              <option key={p.userId} value={p.userId}>
                {p.ensName || p.walletAddress}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] text-fc-text-dim tracking-widest block mb-1">ADJUSTED PNL %</label>
          <input type="number" step="0.01" value={adjustedPnl} onChange={e => setAdjustedPnl(e.target.value)}
            placeholder="e.g. 5.25"
            className="w-full bg-fc-card border border-fc-border px-2 py-1.5 text-3xs font-mono text-fc-text placeholder:text-fc-text-dim outline-none" />
        </div>
      </div>

      <div>
        <label className="text-[9px] text-fc-text-dim tracking-widest block mb-1">REASON</label>
        <div className="flex flex-wrap gap-1">
          {reasons.map(r => (
            <button key={r.value} onClick={() => setReason(r.value)}
              className={cn('px-2 py-1 text-[9px] font-mono tracking-widest',
                reason === r.value ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-fc-card-alt text-fc-text-muted border border-transparent')}>
              {r.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <input type="text" placeholder="Detailed notes (required)" value={notes} onChange={e => setNotes(e.target.value)}
        className="w-full bg-fc-card border border-fc-border px-3 py-2 text-3xs font-mono text-fc-text placeholder:text-fc-text-dim outline-none" />

      <Button variant="secondary" size="sm" onClick={handleSubmit} disabled={!adjustedPnl || !notes || status === 'saving'}>
        {status === 'saving' ? 'ADJUSTING...' : status === 'done' ? '✓ ADJUSTED' : 'APPLY PNL ADJUSTMENT'}
      </Button>
    </div>
  );
}

function ResettleButton({ matchId }: { matchId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  const handleResettle = async () => {
    try {
      const result = await adminFetch(`/matches/${matchId}/resettle`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setConfirming(false);
      alert(JSON.stringify(result, null, 2));
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)}
        className="text-3xs text-yellow-400 hover:underline font-mono tracking-widest">
        RE-SETTLE
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input type="text" placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)}
        className="bg-fc-card border border-fc-border px-2 py-1 text-3xs font-mono text-fc-text outline-none" />
      <Button variant="secondary" size="sm" onClick={handleResettle} disabled={!reason}>CONFIRM</Button>
      <button onClick={() => setConfirming(false)} className="text-3xs text-fc-text-dim">CANCEL</button>
    </div>
  );
}

function CancelMatchButton({ matchId }: { matchId: string }) {
  const [confirming, setConfirming] = useState(false);

  const handleCancel = async () => {
    try {
      await adminFetch(`/matches/${matchId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin cancellation' }),
      });
      setConfirming(false);
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)}
        className="text-3xs text-red-400 hover:underline font-mono tracking-widest">
        CANCEL MATCH
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-3xs text-red-400">Are you sure?</span>
      <Button variant="danger" size="sm" onClick={handleCancel}>YES, CANCEL</Button>
      <button onClick={() => setConfirming(false)} className="text-3xs text-fc-text-dim">NO</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Audit Log
// ═══════════════════════════════════════════════════════

interface AuditEntry {
  action: string;
  admin: string;
  timestamp: string;
  [key: string]: any;
}

const MOCK_AUDIT: AuditEntry[] = [
  { action: 'pnl_adjust_total', admin: '0xAdmin...1234', timestamp: '2026-02-06T12:30:00Z', matchId: 'm-003', userId: 'u2', oldPnl: 5.2, newPnl: 8.9, reason: 'high_slippage', notes: 'User closed BTC long during flash crash, got filled at -8% vs market. Adjusted to fair exit price.' },
  { action: 'unite_adjust', admin: '0xAdmin...1234', timestamp: '2026-02-06T11:15:00Z', userId: 'u1', amount: 500, reason: 'Compensation for missed referral bonus' },
  { action: 'ban_user', admin: '0xAdmin...1234', timestamp: '2026-02-05T09:00:00Z', userId: 'u5', reason: 'Multi-accounting', duration: '30d' },
  { action: 'force_unstake', admin: '0xAdmin...1234', timestamp: '2026-02-04T16:45:00Z', userId: 'u3', amount: 50000, reason: 'Pending investigation into wash trading' },
  { action: 'cancel_match', admin: '0xAdmin...1234', timestamp: '2026-02-04T14:20:00Z', matchId: 'm-099', reason: 'Price feed outage during draft' },
  { action: 'resettle_match', admin: '0xAdmin...1234', timestamp: '2026-02-03T10:00:00Z', matchId: 'm-055', oldWinner: 'u2', newWinner: 'u3', reason: 'PnL correction after slippage adjustment' },
];

const ACTION_COLORS: Record<string, string> = {
  pnl_adjust_total: 'text-yellow-400',
  pnl_adjust_pick: 'text-yellow-400',
  unite_adjust: 'text-fc-green',
  ban_user: 'text-red-400',
  unban_user: 'text-fc-green',
  force_unstake: 'text-red-400',
  cancel_match: 'text-red-400',
  resettle_match: 'text-yellow-400',
};

export function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>(MOCK_AUDIT);
  const [filterAction, setFilterAction] = useState('all');

  const actions = ['all', ...new Set(MOCK_AUDIT.map(l => l.action))];
  const filtered = filterAction === 'all' ? logs : logs.filter(l => l.action === filterAction);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-mono tracking-widest">AUDIT LOG</h2>
        <div className="flex gap-1 flex-wrap">
          {actions.map(a => (
            <button key={a} onClick={() => setFilterAction(a)}
              className={cn('px-2 py-0.5 text-[9px] font-mono tracking-widest',
                filterAction === a ? 'bg-fc-green text-fc-bg' : 'text-fc-text-dim hover:text-fc-text')}>
              {a === 'all' ? 'ALL' : a.replace(/_/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((entry, i) => (
          <div key={i} className="fc-card p-3">
            <div className="flex items-center justify-between mb-1">
              <span className={cn('text-3xs font-mono tracking-widest font-bold', ACTION_COLORS[entry.action] || 'text-fc-text')}>
                {entry.action.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="text-[9px] text-fc-text-dim font-mono">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="text-[9px] text-fc-text-dim font-mono tracking-wider mb-1">
              by {shortenAddress(entry.admin)}
            </div>
            <div className="text-3xs text-fc-text-muted tracking-wider leading-relaxed">
              {formatAuditDetails(entry)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatAuditDetails(entry: AuditEntry): string {
  const parts: string[] = [];
  if (entry.userId) parts.push(`User: ${entry.userId}`);
  if (entry.matchId) parts.push(`Match: ${entry.matchId}`);
  if (entry.amount !== undefined) parts.push(`Amount: ${entry.amount}`);
  if (entry.oldPnl !== undefined) parts.push(`PnL: ${entry.oldPnl}% → ${entry.newPnl}%`);
  if (entry.oldWinner) parts.push(`Winner: ${entry.oldWinner} → ${entry.newWinner}`);
  if (entry.reason) parts.push(`Reason: ${entry.reason}`);
  if (entry.notes) parts.push(`Notes: ${entry.notes}`);
  if (entry.duration) parts.push(`Duration: ${entry.duration}`);
  return parts.join(' · ');
}

// ═══════════════════════════════════════════════════════
// System Health
// ═══════════════════════════════════════════════════════

export function AdminSystemHealth() {
  const [health, setHealth] = useState<any>({
    checks: {
      database: { status: 'healthy', latency: 'ok' },
      redis: { status: 'healthy', latencyMs: 2 },
      memory: { heapUsedMB: 87, heapTotalMB: 145, rssMB: 192 },
      uptime: 84321,
      nodeVersion: 'v20.11.0',
    },
  });
  const [realtime, setRealtime] = useState<any>({
    queues: { 'queue:h2h:paper:fun:fast': 3, 'queue:h2h:paper:serious:full': 1 },
    activeDrafts: 2,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-mono tracking-widest">SYSTEM HEALTH</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <HealthCard label="DATABASE" status={health.checks.database.status} detail={health.checks.database.latency} />
        <HealthCard label="REDIS" status={health.checks.redis.status} detail={`${health.checks.redis.latencyMs}ms`} />
        <HealthCard label="HEAP" status="healthy" detail={`${health.checks.memory.heapUsedMB}/${health.checks.memory.heapTotalMB} MB`} />
        <HealthCard label="UPTIME" status="healthy" detail={formatUptime(health.checks.uptime)} />
      </div>

      <div className="fc-card p-4">
        <div className="fc-section-title mb-3">REALTIME</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[9px] text-fc-text-dim tracking-widest mb-2">MATCHMAKING QUEUES</div>
            {Object.entries(realtime.queues || {}).map(([key, count]) => (
              <div key={key} className="flex justify-between text-3xs font-mono tracking-wider mb-1">
                <span className="text-fc-text-muted">{key.replace('queue:', '')}</span>
                <span className="text-fc-green">{String(count)} waiting</span>
              </div>
            ))}
            {Object.keys(realtime.queues || {}).length === 0 && (
              <span className="text-3xs text-fc-text-dim">No active queues</span>
            )}
          </div>
          <div>
            <div className="text-[9px] text-fc-text-dim tracking-widest mb-2">ACTIVE SESSIONS</div>
            <div className="text-3xs font-mono tracking-wider">
              <span className="text-fc-text-muted">Active drafts: </span>
              <span className="text-fc-green">{realtime.activeDrafts}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthCard({ label, status, detail }: { label: string; status: string; detail: string }) {
  return (
    <div className="fc-card p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={cn('w-2 h-2 rounded-full', status === 'healthy' ? 'bg-fc-green' : 'bg-red-400')} />
        <span className="text-[9px] text-fc-text-dim tracking-widest">{label}</span>
      </div>
      <div className="text-3xs font-mono text-fc-text tracking-wider">{detail}</div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}
