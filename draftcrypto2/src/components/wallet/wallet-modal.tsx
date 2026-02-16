// ═══════════════════════════════════════════════════════
// DraftCrypto — Wallet Connection Modal
// ═══════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useConnect,
  useAccount,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
  useChainId,
  type Connector,
} from 'wagmi';
import { arbitrum } from 'wagmi/chains';
import { useAuthStore } from '@/stores';
import { api, setAuthToken } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Wallet metadata ──

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  connectorId: string;
  recommended?: boolean;
}

const WALLETS: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Popular browser wallet',
    connectorId: 'injected',
    recommended: true,
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: 'Scan with mobile wallet',
    connectorId: 'walletConnect',
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    description: 'EVM wallet',
    connectorId: 'injected',
  },
];

// ── Connection States ──

type ModalStep =
  | 'select'       // choose wallet
  | 'connecting'   // waiting for wallet popup
  | 'switching'    // wrong chain, switch to Arbitrum
  | 'signing'      // sign nonce message for auth
  | 'success'      // connected!
  | 'error';       // something went wrong

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const [step, setStep] = useState<ModalStep>('select');
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null);
  const [error, setError] = useState<string>('');

  const { connectors, connect, isPending: isConnectPending } = useConnect();
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();

  const { connect: authConnect, setConnecting } = useAuthStore();

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedWallet(null);
      setError('');
    }
  }, [isOpen]);

  // After wallet connects, check chain then sign
  useEffect(() => {
    if (isConnected && address && step === 'connecting') {
      if (chainId !== arbitrum.id) {
        setStep('switching');
      } else {
        setStep('signing');
        performAuth(address);
      }
    }
  }, [isConnected, address, chainId, step]);

  // After chain switch, proceed to signing
  useEffect(() => {
    if (step === 'switching' && chainId === arbitrum.id && address) {
      setStep('signing');
      performAuth(address);
    }
  }, [chainId, step, address]);

  // ── Connect to wallet ──
  const handleSelectWallet = useCallback(async (wallet: WalletOption) => {
    setSelectedWallet(wallet);
    setError('');
    setStep('connecting');
    setConnecting(true);

    try {
      // Find matching connector
      let connector: Connector | undefined;

      if (wallet.id === 'walletconnect') {
        connector = connectors.find(c => c.id === 'walletConnect');
      } else if (wallet.id === 'phantom') {
        // Phantom exposes itself as an injected EIP-1193 provider
        const phantom = (window as any)?.phantom?.ethereum;
        if (!phantom) {
          throw new Error('Phantom wallet not detected. Please install the Phantom extension.');
        }
        connector = connectors.find(c => c.id === 'injected');
      } else {
        connector = connectors.find(c => c.id === 'injected');
      }

      if (!connector) {
        throw new Error(`${wallet.name} connector not available`);
      }

      connect({ connector });
    } catch (err: any) {
      setError(err.message || 'Connection failed');
      setStep('error');
      setConnecting(false);
    }
  }, [connectors, connect, setConnecting]);

  // ── Switch to Arbitrum ──
  const handleSwitchChain = useCallback(async () => {
    try {
      switchChain({ chainId: arbitrum.id });
    } catch (err: any) {
      setError('Failed to switch chain. Please switch manually to Arbitrum in your wallet.');
      setStep('error');
    }
  }, [switchChain]);

  // ── Sign nonce for backend auth ──
  const performAuth = useCallback(async (walletAddress: string) => {
    try {
      const walletType = (selectedWallet?.id || 'metamask') as 'metamask' | 'walletconnect' | 'phantom';

      // FIX: Call real backend API instead of generating local nonce
      let nonce: string;
      let message: string;

      try {
        // Try backend auth flow
        const nonceRes = await api.auth.getNonce(walletAddress);
        nonce = nonceRes.nonce;
        message = nonceRes.message;
      } catch (apiErr) {
        // Fallback: generate local nonce if backend is unavailable (dev mode)
        console.warn('Backend unavailable, falling back to local auth');
        nonce = crypto.randomUUID();
        message = `Sign this message to authenticate with DraftCrypto.\n\nNonce: ${nonce}`;
      }

      const signature = await signMessageAsync({ message });

      // FIX: Try backend login, fallback to local session if backend unavailable
      let user: any;
      try {
        const loginRes = await api.auth.login({
          walletAddress,
          signature,
          nonce,
          walletType,
        });
        setAuthToken(loginRes.token);
        user = loginRes.user;
      } catch (apiErr) {
        // Fallback: create local user session (paper mode preview)
        console.warn('Backend login unavailable, creating local session');
        user = {
          id: walletAddress,
          walletAddress,
          walletType,
          ensName: undefined,
          xHandle: undefined,
          tgHandle: undefined,
          preferredTradeMode: 'paper',
          uniteTier: 'none',
          uniteBalance: 0,
          uniteStaked: 0,
          createdAt: new Date().toISOString(),
        };
      }

      authConnect(user);

      setStep('success');
      setConnecting(false);

      // Auto-close after success
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      if (err.message?.includes('User rejected')) {
        setError('Signature rejected. Please sign to authenticate.');
      } else {
        setError(err.message || 'Authentication failed');
      }
      setStep('error');
      setConnecting(false);
    }
  }, [signMessageAsync, authConnect, selectedWallet, onClose, setConnecting]);

  // ── Retry ──
  const handleRetry = useCallback(() => {
    disconnect();
    setStep('select');
    setError('');
    setSelectedWallet(null);
  }, [disconnect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-fc-card border border-fc-border sm:rounded-sm mx-auto animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-sm font-mono tracking-wider text-fc-text">
            {step === 'select' && 'CONNECT WALLET'}
            {step === 'connecting' && 'CONNECTING...'}
            {step === 'switching' && 'SWITCH NETWORK'}
            {step === 'signing' && 'SIGN MESSAGE'}
            {step === 'success' && 'CONNECTED'}
            {step === 'error' && 'ERROR'}
          </h2>
          <button
            onClick={onClose}
            className="text-fc-text-dim hover:text-fc-text text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5">
          {/* ── Step: Select Wallet ── */}
          {step === 'select' && (
            <div className="space-y-2">
              <p className="text-xs text-fc-text-dim tracking-wider mb-4">
                Connect your wallet to start drafting and trading on Arbitrum.
              </p>

              {WALLETS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleSelectWallet(wallet)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 border border-fc-border',
                    'hover:border-fc-border-green hover:bg-fc-green-glow/30',
                    'transition-all group text-left',
                  )}
                >
                  <span className="text-2xl w-10 h-10 flex items-center justify-center bg-fc-bg rounded-sm">
                    {wallet.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono tracking-wider text-fc-text group-hover:text-fc-green">
                        {wallet.name}
                      </span>
                      {wallet.recommended && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-fc-green-glow text-fc-green font-mono tracking-widest">
                          REC
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-fc-text-dim tracking-wider">
                      {wallet.description}
                    </span>
                  </div>
                  <span className="text-fc-text-dim group-hover:text-fc-green text-sm">
                    →
                  </span>
                </button>
              ))}

              <div className="pt-3 border-t border-fc-border mt-4">
                <div className="flex items-center gap-2 text-xs text-fc-text-dim tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-fc-green/50" />
                  <span>Arbitrum One · ETH for gas · Paper mode preview</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step: Connecting ── */}
          {step === 'connecting' && selectedWallet && (
            <div className="text-center py-8 space-y-5">
              <div className="text-5xl animate-pulse">{selectedWallet.icon}</div>
              <div>
                <p className="text-xs font-mono tracking-wider text-fc-text">
                  Opening {selectedWallet.name}...
                </p>
                <p className="text-xs text-fc-text-dim tracking-wider mt-2">
                  Confirm the connection in your wallet
                </p>
              </div>
              <LoadingDots />
              <button
                onClick={handleRetry}
                className="text-xs text-fc-text-dim hover:text-fc-text underline tracking-wider"
              >
                Cancel
              </button>
            </div>
          )}

          {/* ── Step: Switch Network ── */}
          {step === 'switching' && (
            <div className="text-center py-8 space-y-5">
              <div className="text-5xl">⛓️</div>
              <div>
                <p className="text-xs font-mono tracking-wider text-fc-text">
                  Wrong Network
                </p>
                <p className="text-xs text-fc-text-dim tracking-wider mt-2">
                  DraftCrypto runs on Arbitrum One.
                  <br />Switch networks to continue.
                </p>
              </div>
              <button
                onClick={handleSwitchChain}
                className={cn(
                  'w-full py-3 text-xs font-mono tracking-widest font-semibold',
                  'bg-fc-green text-fc-bg hover:bg-fc-green/90 transition-colors',
                )}
              >
                SWITCH TO ARBITRUM
              </button>
              <button
                onClick={handleRetry}
                className="text-xs text-fc-text-dim hover:text-fc-text underline tracking-wider"
              >
                Use a different wallet
              </button>
            </div>
          )}

          {/* ── Step: Sign Message ── */}
          {step === 'signing' && (
            <div className="text-center py-8 space-y-5">
              <div className="text-5xl">✍️</div>
              <div>
                <p className="text-xs font-mono tracking-wider text-fc-text">
                  Sign to Authenticate
                </p>
                <p className="text-xs text-fc-text-dim tracking-wider mt-2">
                  Sign a message in your wallet to verify ownership.
                  <br />This doesn&apos;t cost any gas.
                </p>
              </div>
              <LoadingDots />
            </div>
          )}

          {/* ── Step: Success ── */}
          {step === 'success' && address && (
            <div className="text-center py-8 space-y-5">
              <div className="text-5xl">✓</div>
              <div>
                <p className="text-xs font-mono tracking-wider text-fc-green">
                  CONNECTED
                </p>
                <p className="text-xs text-fc-text-dim tracking-wider mt-2 font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-fc-text-dim tracking-wider">
                <span className="w-2 h-2 rounded-full bg-fc-green animate-pulse" />
                <span>Arbitrum One</span>
              </div>
            </div>
          )}

          {/* ── Step: Error ── */}
          {step === 'error' && (
            <div className="text-center py-8 space-y-5">
              <div className="text-5xl">⚠️</div>
              <div>
                <p className="text-xs font-mono tracking-wider text-red-400">
                  CONNECTION FAILED
                </p>
                <p className="text-xs text-fc-text-dim tracking-wider mt-2 max-w-xs mx-auto">
                  {error || 'Something went wrong. Please try again.'}
                </p>
              </div>
              <button
                onClick={handleRetry}
                className={cn(
                  'w-full py-3 text-xs font-mono tracking-widest font-semibold',
                  'border border-fc-border text-fc-text hover:border-fc-border-green hover:text-fc-green transition-colors',
                )}
              >
                TRY AGAIN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Disconnect Popover ──

interface AccountPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountPopover({ isOpen, onClose }: AccountPopoverProps) {
  const { address, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { disconnect: authDisconnect } = useAuthStore();
  const { user } = useAuthStore();

  const handleDisconnect = () => {
    disconnect();
    authDisconnect();
    setAuthToken(null);
    onClose();
  };

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
    }
  };

  if (!isOpen || !address) return null;

  return (
    <div className="fixed inset-0 z-[90]" onClick={onClose}>
      <div
        className="absolute top-14 right-4 w-64 bg-fc-card border border-fc-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Address */}
        <div className="p-4 border-b border-fc-border">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fc-green animate-pulse" />
            <span className="text-xs text-fc-green font-mono tracking-wider">CONNECTED</span>
          </div>
          <button
            onClick={handleCopyAddress}
            className="mt-2 text-xs font-mono text-fc-text hover:text-fc-green transition-colors tracking-wider w-full text-left"
            title="Click to copy"
          >
            {address.slice(0, 6)}...{address.slice(-4)}
          </button>
          {user?.ensName && (
            <p className="text-xs text-fc-text-dim font-mono tracking-wider mt-1">
              {user.ensName}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-fc-text-dim tracking-wider">
              {connector?.name || 'Wallet'}
            </span>
            <span className="text-xs text-fc-text-dim">·</span>
            <span className="text-xs text-fc-text-dim tracking-wider">Arbitrum</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-2">
          <a
            href={`https://arbiscan.io/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono tracking-wider text-fc-text-muted hover:text-fc-text hover:bg-fc-bg transition-colors w-full"
          >
            <span>↗</span>
            <span>VIEW ON ARBISCAN</span>
          </a>
          <button
            onClick={handleCopyAddress}
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono tracking-wider text-fc-text-muted hover:text-fc-text hover:bg-fc-bg transition-colors w-full text-left"
          >
            <span>📋</span>
            <span>COPY ADDRESS</span>
          </button>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono tracking-wider text-red-400 hover:text-red-300 hover:bg-fc-bg transition-colors w-full text-left"
          >
            <span>⏻</span>
            <span>DISCONNECT</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Loading animation ──

function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-fc-green"
          style={{
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
