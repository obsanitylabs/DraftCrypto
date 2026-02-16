// ═══════════════════════════════════════════════════════
// Fantasy Crypto — Core UI Components
// ═══════════════════════════════════════════════════════

'use client';

import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { PositionType, StakingTier, PositionStatus } from '@/types';

// ── Button ──

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'fc-btn-primary',
  secondary: 'fc-btn-secondary',
  ghost: 'fc-btn-ghost',
  danger: 'fc-btn-danger',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-3xs',
  md: 'px-4 py-2.5 text-2xs',
  lg: 'px-6 py-3.5 text-xs',
};

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonStyles[variant], buttonSizes[size], disabled && 'opacity-40 cursor-not-allowed', loading && 'cursor-wait', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'LOADING...' : children}
    </button>
  );
}

// ── Badge ──

type BadgeVariant = 'green' | 'gold' | 'red' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'muted', children, className }: BadgeProps) {
  return (
    <span className={cn(`fc-badge-${variant}`, className)}>
      {children}
    </span>
  );
}

// ── Position Badge ──

export function PositionBadge({ type }: { type: PositionType }) {
  const styles: Record<PositionType, string> = {
    long: 'fc-badge-green',
    short: 'fc-badge-red',
    bench: 'fc-badge-muted',
  };
  return <Badge className={styles[type]}>{type.toUpperCase()}</Badge>;
}

// ── Status Badge ──

export function StatusBadge({ status }: { status: PositionStatus }) {
  const config: Partial<Record<PositionStatus, { label: string; variant: BadgeVariant }>> = {
    open: { label: 'OPEN', variant: 'green' },
    tp_set: { label: 'TP SET', variant: 'green' },
    sl_set: { label: 'SL SET', variant: 'gold' },
    tp_sl_set: { label: 'TP/SL', variant: 'green' },
    closed_tp: { label: 'TP HIT', variant: 'green' },
    closed_sl: { label: 'SL HIT', variant: 'red' },
    closed_user: { label: 'CLOSED', variant: 'muted' },
    liquidated: { label: 'LIQUIDATED', variant: 'red' },
    benched: { label: 'BENCH', variant: 'muted' },
  };
  const c = config[status] || { label: status.toUpperCase(), variant: 'muted' as BadgeVariant };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

// ── Tier Badge ──

export function TierBadge({ tier }: { tier: StakingTier }) {
  const styles: Record<StakingTier, BadgeVariant> = {
    none: 'muted',
    fun: 'muted',
    serious: 'green',
    whale: 'gold',
  };
  return <Badge variant={styles[tier]}>{tier.toUpperCase()}</Badge>;
}

// ── Trade Mode Badge ──

export function TradeModeBadge({ mode }: { mode: 'live' | 'paper' }) {
  return (
    <Badge variant={mode === 'live' ? 'green' : 'gold'}>
      {mode === 'live' ? 'LIVE' : 'PAPER'}
    </Badge>
  );
}

// ── Match Type + Duration Badge ──

export function MatchTypeBadge({ type, duration }: { type: 'fast' | 'full'; duration: string }) {
  return (
    <div className={cn(
      'flex flex-col items-center px-2 py-1 min-w-[52px] border',
      type === 'fast'
        ? 'bg-fc-gold-glow border-fc-gold/20'
        : 'bg-fc-green-glow border-fc-border-green'
    )}>
      <span className={cn(
        'text-3xs font-bold tracking-wider',
        type === 'fast' ? 'text-fc-gold' : 'text-fc-green'
      )}>
        {type === 'fast' ? 'FAST' : 'FULL'}
      </span>
      <span className="text-xs font-bold text-fc-text">{duration}</span>
    </div>
  );
}

// ── Card ──

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  accent?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, accent, onClick }: CardProps) {
  return (
    <div
      className={cn(
        hover ? 'fc-card-hover' : 'fc-card',
        accent && 'fc-accent-top',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── Section Title ──

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="fc-section-title">{children}</span>
      {right && <span className="text-3xs text-fc-text-dim">{right}</span>}
    </div>
  );
}

// ── PnL Display ──

export function PnlDisplay({ value, size = 'md', showSign = true, glow = false }: {
  value: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
  glow?: boolean;
}) {
  const isPositive = value >= 0;
  const formatted = `${showSign ? (isPositive ? '+' : '') : ''}${value.toFixed(2)}%`;

  const sizeStyles = {
    sm: 'text-2xs',
    md: 'text-sm',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <span className={cn(
      'font-bold font-mono',
      sizeStyles[size],
      isPositive ? 'text-fc-green' : 'text-fc-red',
      glow && (isPositive ? 'fc-glow-green' : 'fc-glow-red'),
    )}>
      {formatted}
    </span>
  );
}

// ── PnL Dollar Display ──

export function PnlDollarDisplay({ value, size = 'md', glow = false }: {
  value: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
}) {
  const isPositive = value >= 0;
  const formatted = `${isPositive ? '+' : ''}$${Math.abs(value).toFixed(2)}`;

  const sizeStyles = {
    sm: 'text-2xs',
    md: 'text-sm',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <span className={cn(
      'font-bold font-mono',
      sizeStyles[size],
      isPositive ? 'text-fc-green' : 'text-fc-red',
      glow && (isPositive ? 'fc-glow-green' : 'fc-glow-red'),
    )}>
      {formatted}
    </span>
  );
}

// ── Input ──

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('fc-input', className)} {...props} />;
}

// ── Timer Display ──

export function Timer({ seconds, warn = 10 }: { seconds: number; warn?: number }) {
  const isWarning = seconds <= warn;
  return (
    <div className="text-right">
      <div className={cn(
        'text-3xl font-bold font-mono leading-none animate-count-down',
        isWarning ? 'text-fc-red fc-glow-red' : 'text-fc-green fc-glow-green',
      )}>
        {seconds}
      </div>
      <div className="text-3xs text-fc-text-dim tracking-widest-2">SECONDS</div>
    </div>
  );
}

// ── Progress Bar ──

export function ProgressBar({ value, max = 100, variant = 'green' }: {
  value: number;
  max?: number;
  variant?: 'green' | 'gold' | 'red';
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colors = {
    green: 'from-fc-green to-fc-green-bright',
    gold: 'from-fc-gold to-fc-gold-dim',
    red: 'from-fc-red to-fc-red-dim',
  };

  return (
    <div className="h-1 bg-fc-border rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', colors[variant])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── PnL Comparison Bar ──

export function PnlBar({ myPnl, oppPnl }: { myPnl: number; oppPnl: number }) {
  const total = Math.abs(myPnl) + Math.abs(oppPnl);
  const myPct = total === 0 ? 50 : Math.max(5, Math.min(95, 50 + ((myPnl - oppPnl) / (total || 1)) * 40));

  return (
    <div className="h-1 bg-fc-border rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-fc-green to-fc-green-bright transition-all duration-500"
        style={{ width: `${myPct}%` }}
      />
    </div>
  );
}

// ── Modal ──

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-fc-card border border-fc-border-green p-5 mx-4 max-w-md w-full animate-slide-up">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">{title}</h3>
            <button onClick={onClose} className="text-fc-text-dim hover:text-fc-text text-lg leading-none">×</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ── Empty State ──

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-6 text-center border border-dashed border-fc-border">
      <span className="text-3xs text-fc-text-dim">{message}</span>
    </div>
  );
}

// ── Logo ──

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { icon: 'w-7 h-7 text-sm', title: 'text-xs', sub: 'text-3xs' },
    md: { icon: 'w-8 h-8 text-base', title: 'text-sm', sub: 'text-3xs' },
    lg: { icon: 'w-12 h-12 text-xl', title: 'text-base', sub: 'text-3xs' },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <div className={cn(
        s.icon,
        'rounded-full border-2 border-fc-green flex items-center justify-center',
        'font-display italic text-fc-green font-bold shadow-green-glow',
      )}>
        F
      </div>
      <div>
        <div className={cn(s.title, 'font-bold tracking-widest text-fc-text')}>FANTASY CRYPTO</div>
        <div className={cn(s.sub, 'tracking-widest-3 text-fc-text-dim -mt-0.5')}>CHANGE YOUR REALITY</div>
      </div>
    </div>
  );
}
