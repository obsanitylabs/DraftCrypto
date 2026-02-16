// ═══════════════════════════════════════════════════════
// Fantasy Crypto — Socket.io React Hooks
// ═══════════════════════════════════════════════════════

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket, isSocketConnected } from '@/lib/socket';
import { useAuthStore, useMatchStore, useDraftStore, usePositionStore } from '@/stores';
import { GAME } from '@/config';
import type { MatchType } from '@/types';

// ═══════════════════════════════════════════════════════
// useSocket — connect/disconnect lifecycle
// ═══════════════════════════════════════════════════════

export function useSocket() {
  const { isConnected: isAuthed } = useAuthStore();
  const [isSocketReady, setSocketReady] = useState(false);

  useEffect(() => {
    if (isAuthed) {
      const s = connectSocket();
      const onConnect = () => setSocketReady(true);
      const onDisconnect = () => setSocketReady(false);
      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
      if (s.connected) setSocketReady(true);
      return () => {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
      };
    } else {
      disconnectSocket();
      setSocketReady(false);
    }
  }, [isAuthed]);

  return { isSocketReady };
}

// ═══════════════════════════════════════════════════════
// useQueue — matchmaking queue
// ═══════════════════════════════════════════════════════

interface UseQueueOptions {
  onMatchFound?: (data: {
    matchId: string;
    opponent: { walletAddress: string; ensName?: string };
    draftOrder: number;
  }) => void;
}

export function useQueue({ onMatchFound }: UseQueueOptions = {}) {
  const { user } = useAuthStore();
  const { setJoiningQueue, setOpponent } = useMatchStore();
  const [queuePosition, setQueuePosition] = useState<number | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleQueueJoined = (data: { position: number }) => {
      setQueuePosition(data.position);
    };

    const handleMatchFound = (data: any) => {
      setJoiningQueue(false);
      setQueuePosition(null);
      setOpponent(data.opponent);
      onMatchFound?.(data);
    };

    socket.on('queue_joined', handleQueueJoined);
    socket.on('match_found', handleMatchFound);

    return () => {
      socket.off('queue_joined', handleQueueJoined);
      socket.off('match_found', handleMatchFound);
    };
  }, [onMatchFound, setJoiningQueue, setOpponent]);

  const joinQueue = useCallback((params: {
    tradeMode: string;
    tier: string;
    matchType: string;
    duration: string;
  }) => {
    if (!user) return;
    const socket = getSocket();
    setJoiningQueue(true);
    socket.emit('join_queue', {
      userId: user.id,
      walletAddress: user.walletAddress,
      ...params,
    });
  }, [user, setJoiningQueue]);

  const leaveQueue = useCallback((params: {
    tradeMode: string;
    tier: string;
    matchType: string;
  }) => {
    const socket = getSocket();
    socket.emit('leave_queue', params);
    setJoiningQueue(false);
    setQueuePosition(null);
  }, [setJoiningQueue]);

  return { joinQueue, leaveQueue, queuePosition };
}

// ═══════════════════════════════════════════════════════
// useDraftSocket — draft room events
// ═══════════════════════════════════════════════════════

interface UseDraftSocketOptions {
  matchId: string;
  userId: string;
  matchType: MatchType;
  onDraftComplete?: () => void;
}

export function useDraftSocket({ matchId, userId, matchType, onDraftComplete }: UseDraftSocketOptions) {
  const {
    addMyPick, addOpponentPick, setTimeLeft,
    advancePick, setPhase, draft,
  } = useDraftStore();
  const { setMatchCountdown } = useMatchStore();
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // ── Countdown before draft ──
    socket.on('draft_countdown', (data) => {
      setMatchCountdown(data.secondsRemaining);
    });

    // ── Draft starts ──
    socket.on('draft_start', (data) => {
      setMatchCountdown(null);
      setPhase('active');
    });

    // ── Turn notification ──
    socket.on('draft_turn', (data) => {
      setCurrentTurn(data.currentPlayer);
      setIsMyTurn(data.currentPlayer === userId);
      setTimeLeft(data.secondsLeft);

      // Start countdown timer
      if (timerRef.current) clearInterval(timerRef.current);
      let timeLeft = data.secondsLeft;
      timerRef.current = setInterval(() => {
        timeLeft--;
        setTimeLeft(Math.max(0, timeLeft));
        if (timeLeft <= 0 && timerRef.current) {
          clearInterval(timerRef.current);
        }
      }, 1000);
    });

    // ── Pick made ──
    socket.on('draft_pick_made', (data) => {
      const roundWeights: Record<number, number> = {
        1: 0.25, 2: 0.25, 3: 0.15, 4: 0.15, 5: 0.10, 6: 0.10,
      };
      const round = Math.floor(data.pickOrder / 2) + 1;

      const pick = {
        id: data.pickId,
        matchId,
        userId: data.userId,
        tokenSymbol: data.token,
        pickRound: round,
        pickOrder: data.pickOrder,
        weight: data.weight,
        positionType: 'long' as const,
        boostMultiplier: 1,
        entryPrice: undefined,
        currentPnlPercent: 0,
        status: 'open' as const,
      };

      if (data.userId === userId) {
        addMyPick(pick);
      } else {
        addOpponentPick(pick);
      }
      advancePick();
    });

    // ── Draft complete ──
    socket.on('draft_complete', () => {
      setPhase('complete');
      if (timerRef.current) clearInterval(timerRef.current);
      onDraftComplete?.();
    });

    // ── Auto-pick warning ──
    socket.on('auto_pick_warning', (data) => {
      if (data.userId === userId) {
        console.warn('[Draft] Auto-pick warning — time expired');
      }
    });

    return () => {
      socket.off('draft_countdown');
      socket.off('draft_start');
      socket.off('draft_turn');
      socket.off('draft_pick_made');
      socket.off('draft_complete');
      socket.off('auto_pick_warning');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [matchId, userId, matchType, onDraftComplete, addMyPick, addOpponentPick,
      advancePick, setPhase, setTimeLeft, setMatchCountdown]);

  const makePick = useCallback((tokenSymbol: string) => {
    if (!isMyTurn) return;
    const socket = getSocket();
    socket.emit('draft_pick', { matchId, userId, tokenSymbol });
  }, [matchId, userId, isMyTurn]);

  return { makePick, isMyTurn, currentTurn };
}

// ═══════════════════════════════════════════════════════
// useMatchSocket — live match PnL + actions
// ═══════════════════════════════════════════════════════

interface UseMatchSocketOptions {
  matchId: string;
  userId: string;
  onSettled?: (data: { winnerId: string; payout: number; uniteEarned: number }) => void;
}

export function useMatchSocket({ matchId, userId, onSettled }: UseMatchSocketOptions) {
  const { setPnl, updatePosition, setPositions } = usePositionStore();
  const [prices, setPrices] = useState<Record<string, { price: number; change1h: number; change24h: number }>>({});

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Join match room
    socket.emit('join_match', { matchId });

    // ── PnL updates ──
    socket.on('pnl_update', (data) => {
      if (data.matchId !== matchId) return;

      const myPlayer = data.players.find(p => p.userId === userId);
      const oppPlayer = data.players.find(p => p.userId !== userId);

      if (myPlayer && oppPlayer) {
        setPnl(myPlayer.totalPnl, oppPlayer.totalPnl);
      }

      // Update individual positions
      if (myPlayer) {
        for (const pos of myPlayer.positions) {
          updatePosition(pos.pickId, { currentPnlPercent: pos.pnlPercent });
        }
      }
    });

    // ── Price updates ──
    socket.on('price_update', (data) => {
      const priceMap: Record<string, any> = {};
      for (const t of data.tokens) {
        priceMap[t.symbol] = { price: t.price, change1h: t.change1h, change24h: t.change24h };
      }
      setPrices(prev => ({ ...prev, ...priceMap }));
    });

    // ── Position closed ──
    socket.on('position_closed', (data) => {
      updatePosition(data.pickId, {
        status: 'closed_user',
        currentPnlPercent: data.realizedPnl,
      });
    });

    // ── Match settled ──
    socket.on('match_settled', (data) => {
      if (data.matchId === matchId) {
        onSettled?.(data);
      }
    });

    return () => {
      socket.off('pnl_update');
      socket.off('price_update');
      socket.off('position_closed');
      socket.off('match_settled');
    };
  }, [matchId, userId, setPnl, updatePosition, onSettled]);

  const closePosition = useCallback((pickId: string) => {
    const socket = getSocket();
    socket.emit('close_position', { matchId, pickId, userId });
  }, [matchId, userId]);

  const useBoost = useCallback((pickId: string) => {
    const socket = getSocket();
    socket.emit('use_boost', { matchId, pickId, userId });
  }, [matchId, userId]);

  return { closePosition, useBoost, prices };
}
