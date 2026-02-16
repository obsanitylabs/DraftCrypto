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

const DISMISSED_KEY = 'dc_waitlist_dismissed';
const SUBMITTED_KEY = 'dc_waitlist_submitted';

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
      // In production: POST to backend API
      // await fetch('/api/waitlist', { method: 'POST', body: JSON.stringify({ email }) });
      await new Promise(r => setTimeout(r, 800)); // Simulate API call

      setStatus('success');
      localStorage.setItem(SUBMITTED_KEY, email);

      setTimeout(() => setIsOpen(false), 2500);
    } catch {
      setErrorMsg('Something went wrong. Try again.');
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Popup */}
      <div className="relative w-full max-w-md bg-fc-card border border-fc-border rounded-t-xl sm:rounded-xl mx-auto animate-slide-up shadow-card-lg">
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-5 text-fc-text-dim hover:text-fc-text text-xl"
        >
          ✕
        </button>

        <div className="p-8 text-center">
          {status === 'success' ? (
            <>
              <div className="text-4xl mb-4">✓</div>
              <h2 className="text-base font-mono tracking-widest text-fc-green font-bold">
                YOU&apos;RE IN
              </h2>
              <p className="text-sm text-fc-text-dim tracking-wider mt-3">
                We&apos;ll notify you when DraftCrypto launches on mainnet.
              </p>
            </>
          ) : (
            <>
              <div className="text-3xl mb-4">🎯</div>
              <h2 className="text-lg font-mono tracking-widest text-fc-text font-bold">
                JOIN THE WAITLIST
              </h2>
              <p className="text-sm text-fc-text-muted tracking-wider mt-3 mb-6 leading-relaxed">
                Be first to draft when DraftCrypto launches on Arbitrum.
                <br />Early access + bonus UNITE rewards for waitlist members.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  ref={inputRef}
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
                  className={cn(
                    'w-full bg-fc-bg border px-5 py-4 text-sm font-mono text-fc-text rounded-lg',
                    'placeholder:text-fc-text-dim focus:border-fc-border-green outline-none',
                    status === 'error' ? 'border-red-500/50' : 'border-fc-border',
                  )}
                />
                {status === 'error' && errorMsg && (
                  <p className="text-xs text-red-400 tracking-wider">{errorMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className={cn(
                    'w-full py-4 text-sm font-mono tracking-widest font-semibold transition-all rounded-lg',
                    status === 'submitting'
                      ? 'bg-fc-green/50 text-fc-bg cursor-wait'
                      : 'bg-fc-green text-fc-bg hover:brightness-110 shadow-green-glow',
                  )}
                >
                  {status === 'submitting' ? 'JOINING...' : 'GET EARLY ACCESS'}
                </button>
              </form>

              <p className="text-xs text-fc-text-dim tracking-wider mt-4">
                No spam. Unsubscribe anytime.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
