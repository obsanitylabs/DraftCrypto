// ═══════════════════════════════════════════════════════
// Fantasy Crypto — Socket.io Client
// ═══════════════════════════════════════════════════════

import { io, Socket } from 'socket.io-client';
import { API } from '@/config';

// ── Typed Events (server → client) ──

export interface ServerEvents {
  // Queue
  queue_joined: (data: { position: number }) => void;
  // Matchmaking
  match_found: (data: {
    matchId: string;
    matchType: string;
    opponent: { walletAddress: string; ensName?: string };
    draftOrder: number;
    draftStartTime: string;
  }) => void;
  // Draft
  draft_countdown: (data: { secondsRemaining: number }) => void;
  draft_start: (data: {
    matchType: string;
    totalPicks: number;
    firstPicker: string;
    timePerPick: number;
  }) => void;
  draft_turn: (data: {
    currentPlayer: string;
    secondsLeft: number;
    pickNumber: number;
    round: number;
  }) => void;
  draft_pick_made: (data: {
    userId: string;
    token: string;
    weight: number;
    pickOrder: number;
    pickId: string;
  }) => void;
  draft_complete: (data: Record<string, never>) => void;
  auto_pick_warning: (data: { userId: string }) => void;
  // Match
  pnl_update: (data: {
    matchId: string;
    players: Array<{
      userId: string;
      totalPnl: number;
      positions: Array<{ pickId: string; symbol: string; pnlPercent: number }>;
    }>;
  }) => void;
  position_closed: (data: {
    pickId: string;
    userId: string;
    realizedPnl: number;
  }) => void;
  match_settled: (data: {
    matchId: string;
    winnerId: string;
    payout: number;
    uniteEarned: number;
  }) => void;
  price_update: (data: {
    tokens: Array<{ symbol: string; price: number; change1h: number; change24h: number }>;
  }) => void;
  // Error
  error: (data: { message: string; code?: string }) => void;
}

// ── Typed Events (client → server) ──

export interface ClientEvents {
  join_queue: (data: {
    userId: string;
    walletAddress: string;
    tradeMode: string;
    tier: string;
    matchType: string;
    duration: string;
  }) => void;
  leave_queue: (data: {
    tradeMode: string;
    tier: string;
    matchType: string;
  }) => void;
  draft_pick: (data: {
    matchId: string;
    userId: string;
    tokenSymbol: string;
  }) => void;
  join_match: (data: { matchId: string }) => void;
  close_position: (data: {
    matchId: string;
    pickId: string;
    userId: string;
  }) => void;
  use_boost: (data: {
    matchId: string;
    pickId: string;
    userId: string;
  }) => void;
}

// ── Singleton Socket Manager ──

type TypedSocket = Socket<ServerEvents, ClientEvents>;

let socket: TypedSocket | null = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(API.WS_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    }) as TypedSocket;

    socket.on('connect', () => {
      connectionAttempts = 0;
      console.log('[WS] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      connectionAttempts++;
      console.warn(`[WS] Connection error (${connectionAttempts}):`, err.message);
    });
  }
  return socket;
}

export function connectSocket(): TypedSocket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
