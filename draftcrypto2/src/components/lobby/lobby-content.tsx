'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, SectionTitle, Card, Badge, MatchTypeBadge,
  TradeModeBadge, TierBadge,
} from '@/components/ui';
import { useMatchStore } from '@/stores';
import { STAKING_TIERS, GAME } from '@/config';
import { cn } from '@/lib/utils';
import type { MatchType, MatchDuration, TradeMode, StakingTier } from '@/types';

const MOCK_OPEN = [
  { id: '1', matchType: 'fast' as const, duration: '1D' as const, wager: '0.50', tier: 'fun' as const, creator: '0xdead...b33f', tradeMode: 'live' as const },
  { id: '2', matchType: 'full' as const, duration: '1W' as const, wager: '2.00', tier: 'serious' as const, creator: 'phantom.sol', tradeMode: 'live' as const },
  { id: '3', matchType: 'fast' as const, duration: '1W' as const, wager: '0.10', tier: 'fun' as const, creator: '0xa1b2...c3d4', tradeMode: 'paper' as const },
  { id: '4', matchType: 'full' as const, duration: '1D' as const, wager: '5.00', tier: 'whale' as const, creator: 'vitalik.eth', tradeMode: 'live' as const },
  { id: '5', matchType: 'fast' as const, duration: '1D' as const, wager: '0.05', tier: 'fun' as const, creator: '0xbeef...cafe', tradeMode: 'paper' as const },
];

export function LobbyContent() {
  const router = useRouter();
  const [tab, setTab] = useState<'h2h' | 'league'>('h2h');
  const [matchType, setMatchType] = useState<MatchType>('full');
  const [duration, setDuration] = useState<MatchDuration>('1D');
  const [tradeMode, setTradeMode] = useState<TradeMode>('paper');
  const [tier, setTier] = useState<StakingTier>('fun');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const { matchCountdown, setMatchCountdown, opponent, setOpponent } = useMatchStore();

  useEffect(() => {
    if (matchCountdown !== null && matchCountdown > 0) {
      const t = setTimeout(() => setMatchCountdown(matchCountdown - 1), 1000);
      return () => clearTimeout(t);
    }
    if (matchCountdown === 0) {
      router.push('/h2h/demo/draft');
    }
  }, [matchCountdown]);

  const handleCreate = () => {
    setCreating(true);
    setTimeout(() => {
      setCreating(false);
      setJoining(true);
      setTimeout(() => {
        setJoining(false);
        setOpponent({ walletAddress: '0xbeef1234cafe5678' });
        setMatchCountdown(5);
      }, 2500);
    }, 1000);
  };

  if (matchCountdown !== null) {
    return (
      <div className="px-4 text-center pt-20 pb-10">
        <div className="fc-section-title mb-4">
          {matchCountdown > 0 ? 'MATCH FOUND — DRAFT STARTS IN' : 'LOADING DRAFT ROOM...'}
        </div>
        <div className="text-7xl font-bold text-fc-green fc-glow-green leading-none animate-count-down">
          {matchCountdown}
        </div>
        <div className="text-sm text-fc-text-muted mt-5">
          vs <span className="text-fc-text font-semibold">0xbeef...cafe</span>
        </div>
        <div className="flex gap-2 justify-center mt-4">
          <Badge variant={matchType === 'fast' ? 'gold' : 'green'}>
            {matchType === 'fast' ? 'FAST' : 'FULL'} DRAFT
          </Badge>
          <Badge variant="muted">{duration}</Badge>
          <TradeModeBadge mode={tradeMode} />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-10 max-w-3xl mx-auto">
      {/* Tab Toggle */}
      <div className="flex gap-2 my-4">
        {(['h2h', 'league'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-3 text-xs font-bold tracking-widest font-mono uppercase border transition-all rounded-md',
              tab === t ? 'bg-fc-green-glow border-fc-border-green text-fc-green' : 'bg-transparent border-fc-border text-fc-text-muted',
            )}>{t === 'h2h' ? 'Head-to-Head' : 'League'}</button>
        ))}
      </div>

      {tab === 'h2h' ? (
        <>
          {/* Match Type */}
          <div className="mb-4">
            <SectionTitle>Match Type</SectionTitle>
            <div className="flex gap-2">
              <OptionCard selected={matchType === 'fast'} accent="gold" onClick={() => setMatchType('fast')}>
                <div className="text-sm font-bold mb-1">Fast Match</div>
                <div className="text-xs text-fc-text-muted leading-relaxed mb-2">Draft 1 token pair. Quick games.</div>
                <Badge variant="gold">1 PICK EACH</Badge>
              </OptionCard>
              <OptionCard selected={matchType === 'full'} accent="green" onClick={() => setMatchType('full')}>
                <div className="text-sm font-bold mb-1">Full Draft</div>
                <div className="text-xs text-fc-text-muted leading-relaxed mb-2">Snake draft 8 tokens. Full portfolio.</div>
                <Badge variant="green">8 PICKS EACH</Badge>
              </OptionCard>
            </div>
          </div>

          {/* Duration */}
          <div className="mb-4">
            <SectionTitle>Match Duration</SectionTitle>
            <div className="flex gap-2">
              {(['1D', '3D', '1W'] as MatchDuration[]).map((d) => (
                <button key={d} onClick={() => setDuration(d)}
                  className={cn(
                    'flex-1 py-3 text-center font-mono border transition-all rounded-md',
                    duration === d ? 'bg-fc-green-glow border-fc-border-green' : 'bg-transparent border-fc-border',
                  )}>
                  <div className={cn('text-base font-bold', duration === d ? 'text-fc-green' : 'text-fc-text')}>{d}</div>
                  <div className="text-xs text-fc-text-muted">{d === '1D' ? '24 hours' : d === '3D' ? '3 days' : '7 days'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Trade Mode */}
          <div className="mb-4">
            <SectionTitle>Trade Mode</SectionTitle>
            <div className="flex gap-2">
              <OptionCard selected={tradeMode === 'paper'} accent="gold" onClick={() => setTradeMode('paper')}>
                <div className="text-lg mb-1">📄</div>
                <div className="text-sm font-bold">Paper</div>
                <div className="text-xs text-fc-text-muted mt-1">Simulated. No Hyperliquid needed.</div>
              </OptionCard>
              <OptionCard selected={tradeMode === 'live'} accent="green" onClick={() => setTradeMode('live')}>
                <div className="text-lg mb-1">⚡</div>
                <div className="text-sm font-bold">Live</div>
                <div className="text-xs text-fc-text-muted mt-1">Real trades via Pear Protocol.</div>
              </OptionCard>
            </div>
          </div>

          {/* Tier */}
          <div className="mb-5">
            <SectionTitle>Wager Tier</SectionTitle>
            <div className="flex gap-2">
              {(['fun', 'serious', 'whale'] as StakingTier[]).map((t) => {
                const cfg = STAKING_TIERS[t];
                return (
                  <button key={t} onClick={() => setTier(t)}
                    className={cn(
                      'flex-1 py-3 text-center font-mono border transition-all rounded-md',
                      tier === t ? 'bg-fc-green-glow border-fc-border-green' : 'bg-transparent border-fc-border',
                    )}>
                    <div className={cn('text-sm font-bold', tier === t ? 'text-fc-green' : 'text-fc-text')}>{cfg.label}</div>
                    <div className="text-sm text-fc-green font-semibold">{cfg.wagerUsdc} USDC</div>
                    <div className="text-xs text-fc-text-dim mt-1">{(cfg.uniteRequired / 1000).toFixed(0)}k UNITE</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capital Info */}
          {tradeMode === 'live' && (
            <div className="mb-5 p-4 bg-fc-green-glow border border-fc-border-green rounded-md">
              <div className="text-xs text-fc-green font-semibold mb-1">LIVE TRADING CAPITAL REQUIRED</div>
              <div className="text-sm text-fc-text-muted">
                Min ${matchType === 'fast' ? GAME.MIN_CAPITAL_FAST : GAME.MIN_CAPITAL_FULL} USDC on Hyperliquid
                ({matchType === 'fast' ? '1' : '8'} positions × ${GAME.MIN_POSITION_SIZE_USD})
              </div>
            </div>
          )}

          {/* Create */}
          <Button variant="primary" size="lg" className="w-full tracking-widest" loading={creating || joining} onClick={handleCreate}>
            {creating ? 'CREATING...' : joining ? 'FINDING OPPONENT...' : `CREATE ${matchType.toUpperCase()} / ${duration} MATCH`}
          </Button>

          {/* Open Matches */}
          <div className="mt-8">
            <SectionTitle right={`${MOCK_OPEN.length} waiting`}>Join Open Match</SectionTitle>
            <div className="flex flex-col gap-2">
              {MOCK_OPEN.map((m) => (
                <Card key={m.id} hover className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <MatchTypeBadge type={m.matchType} duration={m.duration} />
                    <div>
                      <div className="text-sm text-fc-text">{m.creator}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-fc-text-muted">{m.wager} USDC</span>
                        <TradeModeBadge mode={m.tradeMode} />
                        <TierBadge tier={m.tier} />
                      </div>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm">JOIN</Button>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <SectionTitle>Open Leagues</SectionTitle>
          <Card className="p-4 mb-2">
            <div className="text-sm font-bold">Degen League #42</div>
            <div className="text-xs text-fc-text-muted mt-1">8/12 players · serious · 12 weeks</div>
            <Button variant="secondary" size="sm" className="mt-3">JOIN LEAGUE</Button>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-bold">Fun League #107</div>
            <div className="text-xs text-fc-text-muted mt-1">3/12 players · fun · 12 weeks</div>
            <Button variant="secondary" size="sm" className="mt-3">JOIN LEAGUE</Button>
          </Card>
        </div>
      )}
    </div>
  );
}

function OptionCard({ selected, accent, onClick, children }: {
  selected: boolean; accent: 'green' | 'gold'; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className={cn(
      'flex-1 p-4 text-left font-mono border transition-all rounded-md',
      selected
        ? accent === 'gold' ? 'bg-fc-gold-glow border-fc-gold/25' : 'bg-fc-green-glow border-fc-border-green'
        : 'bg-transparent border-fc-border hover:border-fc-border-light',
    )}>{children}</button>
  );
}
