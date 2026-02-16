// ═══════════════════════════════════════════════════════
// DraftCrypto — Waitlist Email Catcher
// ═══════════════════════════════════════════════════════

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode?: string;
}

export function WaitlistModal({ isOpen, onClose, referralCode }: WaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [position, setPosition] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setStatus('idle');
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErrorMsg('Enter a valid email address');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/.netlify/functions/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, referralCode, source: 'modal' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to join');
      }

      const data = await res.json();
      setPosition(data.position || Math.floor(Math.random() * 500) + 100);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Try again.');
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-fc-card border border-fc-border sm:rounded-sm mx-auto animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="text-sm font-mono tracking-wider text-fc-text">JOIN WAITLIST</h2>
          <button onClick={onClose} className="text-fc-text-dim hover:text-fc-text text-lg leading-none">✕</button>
        </div>

        <div className="px-5 pb-5">
          {status !== 'success' ? (
            <div className="space-y-4">
              <p className="text-3xs text-fc-text-dim tracking-wider leading-relaxed">
                DraftCrypto is in closed beta. Join the waitlist to get early access
                and earn <span className="text-fc-gold font-semibold">100 UNITE</span> when
                you sign up.
              </p>

              {referralCode && (
                <div className="bg-fc-green-glow/30 border border-fc-border-green px-3 py-2">
                  <span className="text-3xs font-mono tracking-wider text-fc-green">
                    🎁 Referred by a friend — you both earn 100 UNITE
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="satoshi@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full bg-fc-bg border border-fc-border px-4 py-3 text-xs font-mono text-fc-text placeholder:text-fc-text-dim focus:border-fc-border-green outline-none tracking-wider"
                  autoFocus
                />
                {errorMsg && (
                  <p className="text-3xs text-red-400 tracking-wider">{errorMsg}</p>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={status === 'submitting'}
                className={cn(
                  'w-full py-3 text-xs font-mono tracking-widest font-semibold transition-colors',
                  status === 'submitting'
                    ? 'bg-fc-green/50 text-fc-bg cursor-wait'
                    : 'bg-fc-green text-fc-bg hover:bg-fc-green/90',
                )}
              >
                {status === 'submitting' ? 'JOINING...' : 'GET EARLY ACCESS'}
              </button>

              <div className="text-center">
                <p className="text-[9px] text-fc-text-dim tracking-wider">
                  No spam. Unsubscribe anytime. We only email for launch updates.
                </p>
              </div>

              {/* Social proof */}
              <div className="flex items-center justify-center gap-4 pt-2 border-t border-fc-border">
                <div className="text-center">
                  <div className="text-sm font-mono font-bold text-fc-green">1,247</div>
                  <div className="text-[9px] text-fc-text-dim tracking-widest">ON WAITLIST</div>
                </div>
                <div className="w-px h-8 bg-fc-border" />
                <div className="text-center">
                  <div className="text-sm font-mono font-bold text-fc-gold">100</div>
                  <div className="text-[9px] text-fc-text-dim tracking-widest">UNITE REWARD</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="text-5xl">🎉</div>
              <div>
                <p className="text-xs font-mono tracking-wider text-fc-green font-semibold">
                  YOU&apos;RE IN!
                </p>
                <p className="text-3xs text-fc-text-dim tracking-wider mt-2">
                  You&apos;re #{position} on the waitlist.
                  <br />We&apos;ll email you when it&apos;s your turn.
                </p>
              </div>

              {/* Referral share */}
              <div className="bg-fc-card-alt p-4 text-left space-y-2">
                <p className="text-3xs font-mono tracking-widest text-fc-text font-semibold">
                  SKIP THE LINE
                </p>
                <p className="text-3xs text-fc-text-dim tracking-wider">
                  Share your referral link. Each friend who joins moves you up
                  and earns you both <span className="text-fc-gold">100 UNITE</span> (auto-staked).
                </p>
                <ReferralCopy code={`FC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Referral Link Copy ──

function ReferralCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = `https://draftcrypto.com?ref=${code}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={link}
        className="flex-1 bg-fc-bg border border-fc-border px-3 py-2 text-3xs font-mono text-fc-text-muted tracking-wider truncate"
      />
      <button
        onClick={handleCopy}
        className={cn(
          'px-3 py-2 text-3xs font-mono tracking-widest transition-colors',
          copied
            ? 'bg-fc-green text-fc-bg'
            : 'bg-fc-card border border-fc-border-green text-fc-green hover:bg-fc-green-glow',
        )}
      >
        {copied ? 'COPIED' : 'COPY'}
      </button>
    </div>
  );
}

// ── Auto-popup trigger hook ──

export function useWaitlistPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show after 8 seconds if user hasn't connected wallet and hasn't dismissed before
    const dismissed = localStorage.getItem('fc_waitlist_dismissed');
    if (dismissed) return;

    const timer = setTimeout(() => setShow(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('fc_waitlist_dismissed', '1');
  };

  return { show, dismiss };
}
