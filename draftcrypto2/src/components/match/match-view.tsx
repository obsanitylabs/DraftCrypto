// ═══════════════════════════════════════════════════════
// DraftCrypto — Match View (Live PnL Tracking)
// ═══════════════════════════════════════════════════════

'use client';

import { useState, useEffect } from 'react';
import {
  Button, SectionTitle, Badge, PnlDisplay, PnlBar,
  PositionBadge, StatusBadge, Modal,
} from '@/components/ui';
import { GAME } from '@/config';
import { cn, formatLiquidationDistance } from '@/lib/utils';
import type { PositionType, PositionStatus } from '@/types';

// Demo positions
interface DemoPosition {
  id: string;
  symbol: string;
  type: PositionType;
  multiplier: string;
  leverage: number;
  pnlPercent: number;
  change: string;
  status: PositionStatus;
  tp?: number;
  sl?: number;
}

const INITIAL_POSITIONS: DemoPosition[] = [
  { id: '1', symbol: 'BTC', type: 'long', multiplier: '3x', leverage: 3, pnlPercent: 0, change: '+0.0%', status: 'open' },
  { id: '2', symbol: 'SOL', type: 'long', multiplier: '3x', leverage: 3, pnlPercent: 0, change: '+0.0%', status: 'open' },
  { id: '3', symbol: 'LINK', type: 'long', multiplier: '2x', leverage: 3, pnlPercent: 0, change: '+0.0%', status: 'open' },
  { id: '4', symbol: 'HYPE', type: 'short', multiplier: '2x', leverage: 9, pnlPercent: 0, change: '+0.0%', status: 'tp_sl_set', tp: 0.08, sl: -0.05 },
  { id: '5', symbol: 'ARB', type: 'short', multiplier: '1x', leverage: 3, pnlPercent: 0, change: '+0.0%', status: 'open' },
  { id: '6', symbol: 'DOGE', type: 'short', multiplier: '1x', leverage: 6, pnlPercent: 0, change: '+0.0%', status: 'open' },
];

interface MatchViewProps {
  matchId: string;
}

export function MatchView({ matchId }: MatchViewProps) {
  const [positions, setPositions] = useState<DemoPosition[]>(INITIAL_POSITIONS);
  const [myPnl, setMyPnl] = useState(0);
  const [oppPnl, setOppPnl] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [tpslModal, setTpslModal] = useState<DemoPosition | null>(null);
  const [closeConfirm, setCloseConfirm] = useState<DemoPosition | null>(null);

  // Simulate live PnL updates
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(e => e + 1);

      setPositions(prev => prev.map(p => {
        if (p.status.startsWith('closed') || p.status === 'liquidated' || p.status === 'benched') return p;
        const drift = (Math.random() - 0.47) * 0.8;
        const newPnl = p.pnlPercent + drift;

        // Check TP/SL
        let newStatus = p.status;
        if (p.tp && newPnl >= p.tp * 100) newStatus = 'closed_tp';
        if (p.sl && newPnl <= p.sl * 100) newStatus = 'closed_sl';

        return {
          ...p,
          pnlPercent: newPnl,
          change: `${newPnl >= 0 ? '+' : ''}${newPnl.toFixed(1)}%`,
          status: newStatus,
        };
      }));

      setMyPnl(p => p + (Math.random() - 0.45) * 0.5);
      setOppPnl(p => p + (Math.random() - 0.5) * 0.5);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor((GAME.DURATION_HOURS['1D'] * 3600 - elapsed * 2) / 3600);
  const mins = Math.floor(((GAME.DURATION_HOURS['1D'] * 3600 - elapsed * 2) % 3600) / 60);
  const secs = (GAME.DURATION_HOURS['1D'] * 3600 - elapsed * 2) % 60;
  const timeStr = `${hours}:${String(mins).padStart(2, '0')}:${String(Math.abs(secs)).padStart(2, '0')}`;

  const handleClose = (pos: DemoPosition) => {
    setPositions(prev => prev.map(p =>
      p.id === pos.id ? { ...p, status: 'closed_user' as PositionStatus } : p
    ));
    setCloseConfirm(null);
  };

  const handleSetTpsl = (posId: string, tp: number | undefined, sl: number | undefined) => {
    setPositions(prev => prev.map(p =>
      p.id === posId ? {
        ...p,
        tp, sl,
        status: (tp && sl ? 'tp_sl_set' : tp ? 'tp_set' : sl ? 'sl_set' : 'open') as PositionStatus,
      } : p
    ));
    setTpslModal(null);
  };

  const activePositions = positions.filter(p => !p.status.startsWith('closed') && p.status !== 'liquidated');
  const closedPositions = positions.filter(p => p.status.startsWith('closed') || p.status === 'liquidated');

  return (
    <div className="px-4 pb-10">
      {/* PnL Header */}
      <div className="flex items-start justify-between py-4 border-b border-fc-border-green mb-3">
        <div className="text-center flex-1">
          <div className="text-3xs tracking-widest-2 text-fc-text-dim">YOU</div>
          <PnlDisplay value={myPnl} size="xl" glow />
        </div>
        <div className="text-center px-3">
          <div className="text-3xs tracking-widest-2 text-fc-text-dim">TIME LEFT</div>
          <div className="text-base font-bold text-fc-text">{timeStr}</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-3xs tracking-widest-2 text-fc-text-dim">OPPONENT</div>
          <PnlDisplay value={oppPnl} size="xl" glow />
        </div>
      </div>

      {/* PnL Comparison Bar */}
      <div className="mb-4">
        <PnlBar myPnl={myPnl} oppPnl={oppPnl} />
      </div>

      {/* Active Positions */}
      <SectionTitle right={`${activePositions.length} active`}>Your Positions</SectionTitle>
      <div className="flex flex-col gap-1 mb-4">
        {activePositions.map(pos => (
          <PositionCard
            key={pos.id}
            position={pos}
            onClose={() => setCloseConfirm(pos)}
            onSetTpsl={() => setTpslModal(pos)}
          />
        ))}
      </div>

      {/* Closed Positions */}
      {closedPositions.length > 0 && (
        <>
          <SectionTitle>Closed Positions</SectionTitle>
          <div className="flex flex-col gap-1 mb-4">
            {closedPositions.map(pos => (
              <PositionCard key={pos.id} position={pos} closed />
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-1 mt-4">
        <Button variant="danger" size="sm" className="flex-1">
          Close All
        </Button>
        <Button variant="ghost" size="sm" className="flex-1">
          Swap from Bench
        </Button>
      </div>

      {/* TP/SL Modal */}
      <TpslModal
        position={tpslModal}
        onClose={() => setTpslModal(null)}
        onConfirm={handleSetTpsl}
      />

      {/* Close Confirm Modal */}
      <Modal open={!!closeConfirm} onClose={() => setCloseConfirm(null)} title="Close Position">
        {closeConfirm && (
          <div>
            <div className="text-2xs text-fc-text-muted mb-4">
              Close {closeConfirm.symbol} {closeConfirm.type.toUpperCase()} position?
              Current PnL: <span className={closeConfirm.pnlPercent >= 0 ? 'text-fc-green' : 'text-fc-red'}>
                {closeConfirm.pnlPercent >= 0 ? '+' : ''}{closeConfirm.pnlPercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="md" className="flex-1" onClick={() => setCloseConfirm(null)}>
                CANCEL
              </Button>
              <Button variant="danger" size="md" className="flex-1" onClick={() => handleClose(closeConfirm)}>
                CLOSE POSITION
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Position Card ──

function PositionCard({ position, closed, onClose, onSetTpsl }: {
  position: DemoPosition;
  closed?: boolean;
  onClose?: () => void;
  onSetTpsl?: () => void;
}) {
  const isPositive = position.pnlPercent >= 0;
  const hasTpsl = position.tp !== undefined || position.sl !== undefined;

  return (
    <div className={cn(
      'border p-3 transition-all',
      closed ? 'bg-fc-card border-fc-border opacity-60' :
      position.type === 'long' ? 'border-fc-border-green bg-fc-card' :
      'border-fc-red/20 bg-fc-card',
    )}>
      {/* Top row: badge + symbol + PnL */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <PositionBadge type={position.type} />
          <span className="text-xs font-bold">{position.symbol}</span>
          <span className="text-3xs text-fc-text-dim">{position.multiplier}</span>
          {position.leverage > 3 && (
            <Badge variant="gold">{position.leverage}x</Badge>
          )}
          <StatusBadge status={position.status} />
        </div>
        <div className="text-right">
          <PnlDisplay value={position.pnlPercent} size="sm" />
        </div>
      </div>

      {/* TP/SL indicators */}
      {hasTpsl && !closed && (
        <div className="flex gap-3 mb-2">
          {position.tp !== undefined && (
            <div className="text-3xs">
              <span className="text-fc-text-dim">TP: </span>
              <span className="text-fc-green">+{(position.tp * 100).toFixed(0)}%</span>
            </div>
          )}
          {position.sl !== undefined && (
            <div className="text-3xs">
              <span className="text-fc-text-dim">SL: </span>
              <span className="text-fc-red">{(position.sl * 100).toFixed(0)}%</span>
            </div>
          )}
          {position.leverage > 3 && (
            <div className="text-3xs">
              <span className="text-fc-text-dim">Liq: </span>
              <span className="text-fc-gold">{formatLiquidationDistance(position.leverage)}</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!closed && (
        <div className="flex gap-1.5">
          <button
            onClick={onSetTpsl}
            className="text-3xs text-fc-gold border border-fc-gold/20 px-2 py-0.5 hover:bg-fc-gold-glow transition-colors"
          >
            {hasTpsl ? 'EDIT TP/SL' : 'SET TP/SL'}
          </button>
          <button
            onClick={onClose}
            className="text-3xs text-fc-red border border-fc-red/20 px-2 py-0.5 hover:bg-fc-red-glow transition-colors"
          >
            CLOSE
          </button>
        </div>
      )}
    </div>
  );
}

// ── TP/SL Modal ──

function TpslModal({ position, onClose, onConfirm }: {
  position: DemoPosition | null;
  onClose: () => void;
  onConfirm: (posId: string, tp: number | undefined, sl: number | undefined) => void;
}) {
  const [tp, setTp] = useState<string>('');
  const [sl, setSl] = useState<string>('');

  useEffect(() => {
    if (position) {
      setTp(position.tp ? (position.tp * 100).toString() : '');
      setSl(position.sl ? (position.sl * 100).toString() : '');

      // Set suggested defaults if none set
      if (!position.tp && !position.sl) {
        const suggested = GAME.SUGGESTED_TPSL[position.leverage as keyof typeof GAME.SUGGESTED_TPSL];
        if (suggested) {
          setTp((suggested.tp * 100).toString());
          setSl((suggested.sl * 100).toString());
        }
      }
    }
  }, [position]);

  if (!position) return null;

  const handleConfirm = () => {
    const tpVal = tp ? parseFloat(tp) / 100 : undefined;
    const slVal = sl ? parseFloat(sl) / 100 : undefined;
    onConfirm(position.id, tpVal, slVal);
  };

  return (
    <Modal open={!!position} onClose={onClose} title={`TP/SL — ${position.symbol}`}>
      {/* Warning for high leverage */}
      {position.leverage > 3 && (
        <div className="p-2 border border-fc-gold/20 bg-fc-gold-glow mb-4">
          <div className="text-3xs text-fc-gold font-semibold">⚠ HIGH LEVERAGE POSITION</div>
          <div className="text-3xs text-fc-text-muted mt-1">
            {position.symbol} is at {position.leverage}x leverage.
            Liquidation at {formatLiquidationDistance(position.leverage)} adverse move.
            Setting a stop loss is strongly recommended.
          </div>
        </div>
      )}

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-3xs text-fc-green tracking-wider block mb-1">TAKE PROFIT (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              placeholder="e.g. 10"
              className="fc-input flex-1"
            />
            <span className="text-3xs text-fc-text-dim">%</span>
          </div>
          <div className="text-3xs text-fc-text-dim mt-1">
            Close when PnL reaches +{tp || '?'}%
          </div>
        </div>

        <div>
          <label className="text-3xs text-fc-red tracking-wider block mb-1">STOP LOSS (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              placeholder="e.g. -5"
              className="fc-input flex-1"
            />
            <span className="text-3xs text-fc-text-dim">%</span>
          </div>
          <div className="text-3xs text-fc-text-dim mt-1">
            Close when PnL drops to {sl || '?'}%
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
          CANCEL
        </Button>
        <Button variant="primary" size="md" className="flex-1" onClick={handleConfirm}>
          SET TP/SL
        </Button>
      </div>
    </Modal>
  );
}
