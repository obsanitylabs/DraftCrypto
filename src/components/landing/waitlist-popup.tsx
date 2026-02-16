// ═══════════════════════════════════════════════════════
// DraftCrypto — Waitlist Email Popup
// ═══════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface WaitlistPopupProps {
  /** Delay before showing (ms). 0 = show immediately */
  delayMs?: number;
  /** Show on scroll percentage (0-100). null = disabled */
  scrollTrigger?: number | null;
}

const DISMISSED_KEY = 'fc_waitlist_dismissed';
const SUBMITTED_KEY = 'fc_waitlist_submitted';

export function WaitlistPopup({ delayMs = 8000, scrollTrigger = 50 }: WaitlistPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const triggered = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Don't show if already dismissed or submitted
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISSED_KEY) || localStorage.getItem(SUBMITTED_KEY)) return;

    // Time-based trigger
    const timer = setTimeout(() => {
      if (!triggered.current) {
        triggered.current = true;
        setIsOpen(true);
      }
    }, delayMs);

    // Scroll-based trigger
    const handleScroll = () => {
      if (triggered.current || scrollTrigger === null) return;
      const scrollPct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrollPct >= scrollTrigger) {
        triggered.current = true;
        setIsOpen(true);
      }
    };

    if (scrollTrigger !== null) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [delayMs, scrollTrigger]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Enter a valid email');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/.netlify/functions/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'popup' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to join');
      }

      setStatus('success');
      localStorage.setItem(SUBMITTED_KEY, email);

      setTimeout(() => setIsOpen(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Try again.');
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Popup */}
      <div className="relative w-full max-w-md bg-fc-card border border-fc-border sm:rounded-sm mx-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-4 text-fc-text-dim hover:text-fc-text text-lg"
        >
          ✕
        </button>

        <div className="p-6 text-center">
          {status === 'success' ? (
            <>
              <div className="text-4xl mb-3">✓</div>
              <h2 className="text-sm font-mono tracking-widest text-fc-green font-bold">
                YOU&apos;RE IN
              </h2>
              <p className="text-3xs text-fc-text-dim tracking-wider mt-2">
                We&apos;ll notify you when DraftCrypto launches on mainnet.
              </p>
            </>
          ) : (
            <>
              <div className="text-3xl mb-3">🎯</div>
              <h2 className="text-sm font-mono tracking-widest text-fc-text font-bold">
                JOIN THE WAITLIST
              </h2>
              <p className="text-3xs text-fc-text-muted tracking-wider mt-2 mb-5 leading-relaxed">
                Be first to draft when DraftCrypto launches on Arbitrum.
                <br />Early access + bonus UNITE rewards for waitlist members.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  ref={inputRef}
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
                  className={cn(
                    'w-full bg-fc-bg border px-4 py-3 text-xs font-mono text-fc-text',
                    'placeholder:text-fc-text-dim focus:border-fc-border-green outline-none',
                    status === 'error' ? 'border-red-500/50' : 'border-fc-border',
                  )}
                />
                {status === 'error' && errorMsg && (
                  <p className="text-3xs text-red-400 tracking-wider">{errorMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className={cn(
                    'w-full py-3 text-xs font-mono tracking-widest font-semibold transition-all',
                    status === 'submitting'
                      ? 'bg-fc-green/50 text-fc-bg cursor-wait'
                      : 'bg-fc-green text-fc-bg hover:bg-fc-green/90',
                  )}
                >
                  {status === 'submitting' ? 'JOINING...' : 'GET EARLY ACCESS'}
                </button>
              </form>

              <p className="text-[9px] text-fc-text-dim tracking-wider mt-3">
                No spam. Unsubscribe anytime.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
