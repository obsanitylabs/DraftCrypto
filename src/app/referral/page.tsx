'use client';

import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout';
import { Button, Badge } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { cn, shortenAddress } from '@/lib/utils';

// ── Mock Data ──

const MOCK_REFERRALS = [
  { address: '0xaaaa...1111', date: '2026-02-04', status: 'active' as const, uniteEarned: 100 },
  { address: '0xbbbb...2222', date: '2026-02-02', status: 'active' as const, uniteEarned: 100 },
  { address: '0xcccc...3333', date: '2026-01-28', status: 'pending' as const, uniteEarned: 0 },
];

export default function ReferralPage() {
  const { user, isConnected } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared'>('idle');

  // Generate referral code from wallet address
  const referralCode = user?.walletAddress
    ? user.walletAddress.slice(2, 10).toUpperCase()
    : 'CONNECT';
  const referralLink = `https://draftcrypto.com/?ref=${referralCode}`;

  const totalReferred = MOCK_REFERRALS.length;
  const totalUniteEarned = MOCK_REFERRALS.reduce((s, r) => s + r.uniteEarned, 0);
  const activeReferrals = MOCK_REFERRALS.filter(r => r.status === 'active').length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = `Draft altcoin portfolios and compete head-to-head on DraftCrypto! 🎯\n\nJoin with my referral link and we both earn 100 UNITE (auto-staked):\n${referralLink}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        setShareStatus('shared');
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      setShareStatus('shared');
    }
    setTimeout(() => setShareStatus('idle'), 2000);
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`Just started playing DraftCrypto — it's like fantasy football for crypto markets 🎯\n\nDraft portfolios, compete H2H, win USDC.\n\nJoin with my link and we both earn 100 UNITE:\n${referralLink}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  return (
    <PageShell>
      <div className="px-4 py-8 pb-16 space-y-6 max-w-5xl mx-auto">
        <h1 className="text-xl font-mono tracking-widest font-bold">REFERRALS</h1>

        {/* How it works */}
        <div className="fc-card fc-accent-top p-5 space-y-4">
          <div className="fc-section-title">HOW IT WORKS</div>
          <div className="space-y-3">
            <ReferralStep num={1} text="Share your unique referral link with friends" />
            <ReferralStep num={2} text="They connect their wallet using your link" />
            <ReferralStep num={3} text="You both receive 100 UNITE, auto-staked" />
          </div>
          <p className="text-xs text-fc-text-dim tracking-wider mt-3">
            Auto-staked UNITE counts toward your tier immediately. 100 UNITE gets you closer to Fun tier (1,000 required).
          </p>
        </div>

        {/* Referral Link */}
        <div className="fc-card p-5 space-y-4">
          <div className="fc-section-title">YOUR REFERRAL LINK</div>

          {isConnected ? (
            <>
              <div className="flex gap-2">
                <div className="flex-1 bg-fc-bg border border-fc-border px-4 py-3 text-sm font-mono text-fc-text tracking-wider truncate rounded-md">
                  {referralLink}
                </div>
                <button
                  onClick={handleCopy}
                  className={cn(
                    'px-5 py-3 text-xs font-mono tracking-widest font-semibold transition-all shrink-0 rounded-md',
                    copied ? 'bg-fc-green text-fc-bg' : 'bg-fc-card-alt text-fc-text hover:bg-fc-green hover:text-fc-bg',
                  )}
                >
                  {copied ? '✓ COPIED' : 'COPY'}
                </button>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 bg-fc-bg border border-fc-border px-4 py-3 text-center rounded-md">
                  <span className="text-xs text-fc-text-dim tracking-widest block">YOUR CODE</span>
                  <span className="text-lg font-mono font-bold tracking-widest text-fc-green">{referralCode}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 py-3 text-xs font-mono tracking-widest bg-fc-card-alt text-fc-text hover:bg-fc-green hover:text-fc-bg transition-colors rounded-md"
                >
                  {shareStatus === 'shared' ? '✓ SHARED' : '📤 SHARE'}
                </button>
                <button
                  onClick={handleShareTwitter}
                  className="flex-1 py-3 text-xs font-mono tracking-widest bg-fc-card-alt text-fc-text hover:bg-[#1DA1F2] hover:text-white transition-colors rounded-md"
                >
                  𝕏 POST
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-fc-text-dim tracking-wider text-center py-6">
              Connect your wallet to get your referral link
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="REFERRED" value={String(totalReferred)} />
          <StatBox label="ACTIVE" value={String(activeReferrals)} />
          <StatBox label="UNITE EARNED" value={String(totalUniteEarned)} accent />
        </div>

        {/* Referral List */}
        <div className="space-y-2">
          <div className="fc-section-title">YOUR REFERRALS</div>
          {MOCK_REFERRALS.length > 0 ? (
            MOCK_REFERRALS.map((ref, i) => (
              <div key={i} className="fc-card p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-mono tracking-wider text-fc-text">{ref.address}</div>
                  <div className="text-xs text-fc-text-dim tracking-wider mt-1">{ref.date}</div>
                </div>
                <div className="text-right">
                  {ref.status === 'active' ? (
                    <span className="text-sm font-mono tracking-wider text-fc-green">+{ref.uniteEarned} UNITE</span>
                  ) : (
                    <span className="text-sm font-mono tracking-wider text-yellow-400">PENDING</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-sm text-fc-text-dim tracking-wider">
              No referrals yet. Share your link to start earning!
            </div>
          )}
        </div>

        {/* Rewards Breakdown */}
        <div className="fc-card p-5 space-y-3">
          <div className="fc-section-title">REWARD DETAILS</div>
          <Row label="You earn per referral" value="100 UNITE (auto-staked)" />
          <Row label="Friend earns" value="100 UNITE (auto-staked)" />
          <Row label="Activation" value="Friend connects wallet via your link" />
          <Row label="Auto-stake" value="Counts toward tier immediately" />
          <Row label="Unstake cooldown" value="7 days (standard)" />
          <Row label="Max referrals" value="Unlimited" />
          <div className="border-t border-fc-border pt-3 mt-3">
            <p className="text-xs text-fc-text-dim tracking-wider">
              Referral abuse (self-referral, bots, duplicate wallets) will result in forfeiture of rewards.
              See <a href="/terms" className="text-fc-green hover:underline">Terms of Service §9</a>.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function ReferralStep({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 flex items-center justify-center bg-fc-green/10 text-fc-green text-xs font-mono font-bold shrink-0 rounded-md">
        {num}
      </span>
      <span className="text-sm text-fc-text-muted tracking-wider">{text}</span>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="fc-card p-4 text-center">
      <div className="text-xs text-fc-text-dim tracking-widest">{label}</div>
      <div className={cn('text-lg font-mono font-bold', accent ? 'text-fc-green' : 'text-fc-text')}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-fc-text-dim tracking-wider">{label}</span>
      <span className="text-sm text-fc-text font-mono tracking-wider">{value}</span>
    </div>
  );
}
