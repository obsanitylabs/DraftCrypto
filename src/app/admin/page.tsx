'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { cn } from '@/lib/utils';
import {
  AdminOverview,
  AdminUsers,
  AdminMatches,
  AdminAuditLog,
  AdminSystemHealth,
} from '@/components/admin';
import Link from 'next/link';

type AdminTab = 'overview' | 'users' | 'matches' | 'audit' | 'system';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'users', label: 'USERS' },
  { id: 'matches', label: 'MATCHES' },
  { id: 'audit', label: 'AUDIT LOG' },
  { id: 'system', label: 'SYSTEM' },
];

export default function AdminPage() {
  const { isConnected, user } = useAuthStore();
  const [tab, setTab] = useState<AdminTab>('overview');

  // Admin access check (client-side — real check is on backend)
  // In production, check against ADMIN_WALLETS env var
  const isAdmin = isConnected; // TODO: check wallet against admin list

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-fc-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h1 className="text-sm font-mono tracking-widest text-fc-text">ADMIN ACCESS REQUIRED</h1>
          <p className="text-3xs text-fc-text-dim tracking-wider">Connect an admin wallet to access this dashboard.</p>
          <Link href="/" className="text-3xs text-fc-green hover:underline font-mono tracking-widest">← BACK TO APP</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fc-bg">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-fc-card/95 backdrop-blur-md border-b border-fc-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/lobby" className="text-3xs text-fc-text-dim hover:text-fc-text font-mono tracking-widest">← APP</Link>
            <div className="w-px h-4 bg-fc-border" />
            <span className="text-xs font-mono tracking-widest text-red-400 font-bold">ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fc-green animate-pulse" />
            <span className="text-3xs font-mono text-fc-text-muted tracking-wider">
              {user?.ensName || user?.walletAddress?.slice(0, 6) + '...' + user?.walletAddress?.slice(-4)}
            </span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-fc-border bg-fc-card/50">
        <div className="max-w-5xl mx-auto flex overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-5 py-3 text-3xs font-mono tracking-widest whitespace-nowrap transition-colors',
                tab === t.id
                  ? 'text-fc-green border-b-2 border-fc-green'
                  : 'text-fc-text-dim hover:text-fc-text',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <main className="max-w-5xl mx-auto p-4 pb-12">
        {tab === 'overview' && <AdminOverview />}
        {tab === 'users' && <AdminUsers />}
        {tab === 'matches' && <AdminMatches />}
        {tab === 'audit' && <AdminAuditLog />}
        {tab === 'system' && <AdminSystemHealth />}
      </main>
    </div>
  );
}
