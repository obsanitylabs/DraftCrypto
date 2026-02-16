'use client';

import { useState, useMemo } from 'react';
import { SectionTitle, Input } from '@/components/ui';
import { cn, formatNumber } from '@/lib/utils';
import type { Token } from '@/types';

type SortField = 'symbol' | 'price' | 'change24h' | 'fundingRate' | 'volume24h';
type SortDir = 'asc' | 'desc';

interface DraftTokenListProps {
  tokens: Token[];
  watchlist: Set<string>;
  onPick: (token: Token) => void;
  onToggleWatchlist: (symbol: string) => void;
  isMyTurn: boolean;
}

export function DraftTokenList({
  tokens,
  watchlist,
  onPick,
  onToggleWatchlist,
  isMyTurn,
}: DraftTokenListProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('volume24h');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let list = [...tokens];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
      );
    }

    // Watchlist filter
    if (showWatchlistOnly) {
      list = list.filter(t => watchlist.has(t.symbol));
    }

    // Sort
    list.sort((a, b) => {
      let va: number | string = a[sortField] ?? 0;
      let vb: number | string = b[sortField] ?? 0;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [tokens, search, sortField, sortDir, showWatchlistOnly, watchlist]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.001) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(7)}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <SectionTitle right="Pear Protocol / Hyperliquid">Available Tokens</SectionTitle>
      </div>

      {/* Search + Filter bar */}
      <div className="flex gap-1.5 mb-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tokens..."
          className="flex-1"
        />
        <button
          onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
          className={cn(
            'px-3 text-sm border font-mono transition-all',
            showWatchlistOnly
              ? 'border-fc-gold/30 text-fc-gold bg-fc-gold-glow'
              : 'border-fc-border text-fc-text-dim hover:text-fc-gold',
          )}
        >
          ★
        </button>
      </div>

      {/* Token Table */}
      <div className="border border-fc-border bg-fc-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[28px_56px_1fr_58px_52px] px-2 py-1.5 border-b border-fc-border">
          <span className="text-3xs text-fc-text-dim">★</span>
          <SortHeader field="symbol" current={sortField} dir={sortDir} onClick={handleSort}>TOKEN</SortHeader>
          <SortHeader field="price" current={sortField} dir={sortDir} onClick={handleSort}>PRICE</SortHeader>
          <SortHeader field="change24h" current={sortField} dir={sortDir} onClick={handleSort}>24H</SortHeader>
          <SortHeader field="fundingRate" current={sortField} dir={sortDir} onClick={handleSort}>FUND</SortHeader>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-3xs text-fc-text-dim">
            No tokens found
          </div>
        ) : (
          filtered.map((token, i) => (
            <TokenRow
              key={token.symbol}
              token={token}
              isWatchlisted={watchlist.has(token.symbol)}
              isMyTurn={isMyTurn}
              isLast={i === filtered.length - 1}
              onPick={() => isMyTurn && onPick(token)}
              onToggleWatchlist={() => onToggleWatchlist(token.symbol)}
              formatPrice={formatPrice}
            />
          ))
        )}
      </div>

      <div className="text-center text-3xs text-fc-text-dim mt-2">
        {filtered.length} of {tokens.length} tokens · Prices from Pear Protocol
      </div>
    </div>
  );
}

// ── Sort Header ──

function SortHeader({ field, current, dir, onClick, children }: {
  field: SortField;
  current: SortField;
  dir: SortDir;
  onClick: (field: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = current === field;
  return (
    <button
      onClick={() => onClick(field)}
      className={cn(
        'text-left text-3xs tracking-wider font-mono',
        isActive ? 'text-fc-green' : 'text-fc-text-dim hover:text-fc-text-muted',
      )}
    >
      {children}
      {isActive && (
        <span className="ml-0.5">{dir === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );
}

// ── Token Row ──

function TokenRow({ token, isWatchlisted, isMyTurn, isLast, onPick, onToggleWatchlist, formatPrice }: {
  token: Token;
  isWatchlisted: boolean;
  isMyTurn: boolean;
  isLast: boolean;
  onPick: () => void;
  onToggleWatchlist: () => void;
  formatPrice: (price: number) => string;
}) {
  const isPositive = token.change24h >= 0;

  return (
    <div
      className={cn(
        'grid grid-cols-[28px_56px_1fr_58px_52px] px-2 py-2 items-center transition-colors',
        !isLast && 'border-b border-fc-border',
        isMyTurn
          ? 'cursor-pointer hover:bg-fc-hover active:bg-fc-elevated'
          : 'opacity-40 cursor-default',
      )}
      onClick={onPick}
    >
      {/* Watchlist star */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }}
        className={cn(
          'text-sm transition-colors',
          isWatchlisted ? 'text-fc-gold' : 'text-fc-text-dim hover:text-fc-gold/50',
        )}
      >
        ★
      </button>

      {/* Symbol */}
      <div>
        <span className="text-2xs font-bold">{token.symbol}</span>
      </div>

      {/* Price */}
      <span className="text-3xs text-fc-text">{formatPrice(token.price)}</span>

      {/* 24h Change */}
      <span className={cn(
        'text-3xs font-semibold',
        isPositive ? 'text-fc-green' : 'text-fc-red',
      )}>
        {isPositive ? '+' : ''}{token.change24h.toFixed(1)}%
      </span>

      {/* Funding Rate */}
      <span className={cn(
        'text-3xs',
        token.fundingRate > 0 ? 'text-fc-green/60' : token.fundingRate < 0 ? 'text-fc-red/60' : 'text-fc-text-dim',
      )}>
        {token.fundingRate > 0 ? '+' : ''}{token.fundingRate.toFixed(2)}%
      </span>
    </div>
  );
}
