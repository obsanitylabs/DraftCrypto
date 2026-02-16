// ═══════════════════════════════════════════════════════
// DraftCrypto — Toast Notification System
// ═══════════════════════════════════════════════════════

'use client';

import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { create } from 'zustand';

// ── Types ──

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'match' | 'draft' | 'unite';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistent
  action?: { label: string; onClick: () => void };
}

// ── Store ──

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    return id;
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  clearAll: () => set({ toasts: [] }),
}));

// ── Convenience functions ──

export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'success', title, message, duration: 4000 }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'error', title, message, duration: 6000 }),
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'info', title, message, duration: 4000 }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'warning', title, message, duration: 5000 }),
  match: (title: string, message?: string, action?: Toast['action']) =>
    useToastStore.getState().addToast({ type: 'match', title, message, duration: 8000, action }),
  draft: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'draft', title, message, duration: 5000 }),
  unite: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'unite', title, message, duration: 5000 }),
};

// ── Toast Provider (renders toasts) ──

export function ToastProvider() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-16 right-4 left-4 sm:left-auto sm:w-80 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

// ── Individual Toast ──

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
  match: '⚔️',
  draft: '🎯',
  unite: '◆',
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-fc-green/5', border: 'border-fc-green/30', icon: 'text-fc-green' },
  error: { bg: 'bg-red-500/5', border: 'border-red-500/30', icon: 'text-red-400' },
  info: { bg: 'bg-blue-500/5', border: 'border-blue-500/30', icon: 'text-blue-400' },
  warning: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/30', icon: 'text-yellow-400' },
  match: { bg: 'bg-fc-green/5', border: 'border-fc-green/30', icon: 'text-fc-green' },
  draft: { bg: 'bg-purple-500/5', border: 'border-purple-500/30', icon: 'text-purple-400' },
  unite: { bg: 'bg-fc-gold/5', border: 'border-fc-gold/30', icon: 'text-fc-gold' },
};

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [isExiting, setIsExiting] = useState(false);
  const colors = COLORS[t.type];

  useEffect(() => {
    if (!t.duration || t.duration === 0) return;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onDismiss, 200);
    }, t.duration);
    return () => clearTimeout(timer);
  }, [t.duration, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={cn(
        'pointer-events-auto border backdrop-blur-md p-3 shadow-lg transition-all duration-200',
        colors.bg, colors.border,
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0 animate-in slide-in-from-right-4',
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('text-sm mt-0.5', colors.icon)}>{ICONS[t.type]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-3xs font-mono tracking-wider font-semibold text-fc-text">{t.title}</p>
          {t.message && (
            <p className="text-3xs text-fc-text-dim tracking-wider mt-0.5">{t.message}</p>
          )}
          {t.action && (
            <button
              onClick={t.action.onClick}
              className="text-3xs font-mono tracking-widest text-fc-green hover:underline mt-1"
            >
              {t.action.label} →
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-fc-text-dim hover:text-fc-text text-xs leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
