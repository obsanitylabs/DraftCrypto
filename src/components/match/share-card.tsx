// ═══════════════════════════════════════════════════════
// DraftCrypto — Share Match Result Card
// ═══════════════════════════════════════════════════════

'use client';

import { useState, useRef, useCallback } from 'react';
import { cn, shortenAddress } from '@/lib/utils';
import type { PositionType } from '@/types';

// ── Types ──

interface SharePosition {
  symbol: string;
  positionType: PositionType;
  pnlPercent: number;
  weight: number;
  boosted: boolean;
}

interface ShareMatchData {
  matchId: string;
  matchType: 'fast' | 'full';
  tradeMode: 'live' | 'paper';
  tier: string;
  duration: string;
  result: 'win' | 'loss' | 'draw';
  myAddress: string;
  myEns?: string;
  opponentAddress: string;
  opponentEns?: string;
  myPnl: number;
  opponentPnl: number;
  wagerUsdc?: number;
  uniteEarned: number;
  positions: SharePosition[];
  date: string;
}

// ── Share Card (visual card for screenshot/OG) ──

export function ShareCard({ data }: { data: ShareMatchData }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const resultText = data.result === 'win' ? 'VICTORY' : data.result === 'loss' ? 'DEFEAT' : 'DRAW';
  const resultColor = data.result === 'win' ? 'text-fc-green' : data.result === 'loss' ? 'text-red-400' : 'text-yellow-400';
  const resultBorder = data.result === 'win' ? 'border-fc-green/30' : data.result === 'loss' ? 'border-red-500/30' : 'border-yellow-500/30';
  const topPositions = [...data.positions]
    .sort((a, b) => Math.abs(b.pnlPercent * b.weight) - Math.abs(a.pnlPercent * a.weight))
    .slice(0, 3);

  return (
    <div
      ref={cardRef}
      className={cn(
        'bg-fc-card border-2 p-5 w-full max-w-sm mx-auto',
        resultBorder,
      )}
      id={`share-card-${data.matchId}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono tracking-widest font-bold text-fc-text">
            DRAFTCRYPTO
          </span>
        </div>
        <span className="text-[9px] font-mono tracking-widest text-fc-text-dim">
          {data.date}
        </span>
      </div>

      {/* Result Banner */}
      <div className="text-center mb-4">
        <div className={cn('text-2xl font-mono tracking-widest font-black', resultColor)}>
          {resultText}
        </div>
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="text-[9px] font-mono tracking-widest text-fc-text-dim px-1.5 py-0.5 bg-fc-card-alt">
            {data.matchType === 'fast' ? 'FAST' : 'FULL'} DRAFT
          </span>
          <span className="text-[9px] font-mono tracking-widest text-fc-text-dim px-1.5 py-0.5 bg-fc-card-alt">
            {data.tier.toUpperCase()}
          </span>
          <span className="text-[9px] font-mono tracking-widest text-fc-text-dim px-1.5 py-0.5 bg-fc-card-alt">
            {data.tradeMode === 'live' ? '🟢 LIVE' : '📄 PAPER'}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center gap-3 mb-4 px-2">
        <div className="flex-1 text-center">
          <div className="text-3xs font-mono tracking-wider text-fc-text-muted mb-1">
            {data.myEns || shortenAddress(data.myAddress)}
          </div>
          <div className={cn(
            'text-xl font-mono font-black',
            data.myPnl >= 0 ? 'text-fc-green' : 'text-red-400',
          )}>
            {data.myPnl >= 0 ? '+' : ''}{data.myPnl.toFixed(2)}%
          </div>
        </div>

        <div className="text-[9px] font-mono tracking-widest text-fc-text-dim">VS</div>

        <div className="flex-1 text-center">
          <div className="text-3xs font-mono tracking-wider text-fc-text-muted mb-1">
            {data.opponentEns || shortenAddress(data.opponentAddress)}
          </div>
          <div className={cn(
            'text-xl font-mono font-black',
            data.opponentPnl >= 0 ? 'text-fc-green' : 'text-red-400',
          )}>
            {data.opponentPnl >= 0 ? '+' : ''}{data.opponentPnl.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Top Positions */}
      <div className="space-y-1.5 mb-4">
        <div className="text-[9px] font-mono tracking-widest text-fc-text-dim">TOP PICKS</div>
        {topPositions.map((pos, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-fc-bg">
            <span className="text-3xs font-mono tracking-wider text-fc-text-muted w-12">
              {pos.symbol}
            </span>
            <span className={cn(
              'text-[9px] font-mono tracking-widest px-1 py-0.5',
              pos.positionType === 'long'
                ? 'bg-fc-green/10 text-fc-green'
                : 'bg-red-500/10 text-red-400',
            )}>
              {pos.positionType === 'long' ? 'LONG' : 'SHORT'}
            </span>
            {pos.boosted && (
              <span className="text-[9px] text-yellow-400">⚡</span>
            )}
            <span className="flex-1" />
            <span className={cn(
              'text-3xs font-mono font-bold',
              pos.pnlPercent >= 0 ? 'text-fc-green' : 'text-red-400',
            )}>
              {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Rewards */}
      <div className="flex items-center justify-between pt-3 border-t border-fc-border">
        {data.wagerUsdc !== undefined && (
          <div>
            <span className="text-[9px] text-fc-text-dim tracking-widest">WAGER</span>
            <span className="text-3xs font-mono text-fc-text ml-2">${data.wagerUsdc}</span>
          </div>
        )}
        <div>
          <span className="text-[9px] text-fc-text-dim tracking-widest">EARNED</span>
          <span className="text-3xs font-mono text-fc-green ml-2">+{data.uniteEarned} UNITE</span>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mt-4 text-center">
        <div className="text-[9px] font-mono tracking-widest text-fc-text-dim">
          draftcrypto.com — Draft. Trade. Compete.
        </div>
      </div>
    </div>
  );
}

// ── Share Actions ──

interface ShareActionsProps {
  data: ShareMatchData;
  referralCode?: string;
}

export function ShareActions({ data, referralCode }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = referralCode
    ? `https://draftcrypto.com/?ref=${referralCode}`
    : 'https://draftcrypto.com';

  const pnlText = data.myPnl >= 0 ? `+${data.myPnl.toFixed(2)}%` : `${data.myPnl.toFixed(2)}%`;
  const resultEmoji = data.result === 'win' ? '🏆' : data.result === 'loss' ? '😤' : '🤝';
  const modeTag = data.tradeMode === 'live' ? '🟢' : '📄';

  const shareText = [
    `${resultEmoji} ${data.result === 'win' ? 'Won' : data.result === 'loss' ? 'Lost' : 'Drew'} a DraftCrypto ${data.matchType === 'fast' ? 'Fast Match' : 'Full Draft'}! ${modeTag}`,
    ``,
    `📊 My PnL: ${pnlText}`,
    `👤 vs ${data.opponentEns || shortenAddress(data.opponentAddress)}: ${data.opponentPnl >= 0 ? '+' : ''}${data.opponentPnl.toFixed(2)}%`,
    ``,
    `🪙 Earned ${data.uniteEarned} UNITE`,
    ``,
    `Draft crypto portfolios and compete head-to-head 👇`,
    shareUrl,
  ].join('\n');

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `DraftCrypto — ${data.result === 'win' ? 'Victory' : 'Match Result'}`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    }
  };

  const handleDownloadCard = async () => {
    const cardEl = document.getElementById(`share-card-${data.matchId}`);
    if (!cardEl) return;

    try {
      // Dynamic import html2canvas only when needed
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardEl, {
        backgroundColor: '#080a08',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `fc-match-${data.matchId.slice(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Fallback: just copy text
      handleCopy();
    }
  };

  return (
    <div className="space-y-2 w-full max-w-sm mx-auto">
      {/* Twitter */}
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center justify-center gap-2 w-full py-3',
          'bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 text-[#1DA1F2]',
          'text-3xs font-mono tracking-widest hover:bg-[#1DA1F2]/20 transition-colors',
        )}
      >
        <span>𝕏</span>
        <span>SHARE ON X</span>
      </a>

      {/* Row: Copy + Download + Native Share */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 py-2.5 text-3xs font-mono tracking-widest border border-fc-border text-fc-text-muted hover:text-fc-text hover:border-fc-border-green transition-colors"
        >
          {copied ? '✓ COPIED' : '📋 COPY'}
        </button>
        <button
          onClick={handleDownloadCard}
          className="flex-1 py-2.5 text-3xs font-mono tracking-widest border border-fc-border text-fc-text-muted hover:text-fc-text hover:border-fc-border-green transition-colors"
        >
          📷 SAVE IMAGE
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleNativeShare}
            className="flex-1 py-2.5 text-3xs font-mono tracking-widest border border-fc-border text-fc-text-muted hover:text-fc-text hover:border-fc-border-green transition-colors"
          >
            📤 SHARE
          </button>
        )}
      </div>
    </div>
  );
}

// ── Full Share Modal ──

interface ShareMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShareMatchData;
  referralCode?: string;
}

export function ShareMatchModal({ isOpen, onClose, data, referralCode }: ShareMatchModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto bg-fc-bg border border-fc-border">
        <div className="sticky top-0 bg-fc-bg border-b border-fc-border flex items-center justify-between px-4 py-3 z-10">
          <span className="text-xs font-mono tracking-widest">SHARE RESULT</span>
          <button onClick={onClose} className="text-fc-text-dim hover:text-fc-text text-lg">✕</button>
        </div>
        <div className="p-4 space-y-4">
          <ShareCard data={data} />
          <ShareActions data={data} referralCode={referralCode} />
        </div>
      </div>
    </div>
  );
}
