// ═══════════════════════════════════════════════════════
// DraftCrypto — PWA Service Worker Registration
// ═══════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';

export function usePWA() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Register service worker after page load
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — could show a toast
              console.log('[PWA] New version available');
            }
          });
        });

        console.log('[PWA] Service worker registered');
      } catch (err) {
        console.warn('[PWA] Service worker registration failed:', err);
      }
    });
  }, []);
}

// ── Install prompt hook ──

export function useInstallPrompt() {
  useEffect(() => {
    let deferredPrompt: any = null;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      // Could dispatch to a store to show install banner
      console.log('[PWA] Install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);
}
