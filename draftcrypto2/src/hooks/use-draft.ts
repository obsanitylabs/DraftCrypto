// ═══════════════════════════════════════════════════════
// DraftCrypto — Draft Hook
// ═══════════════════════════════════════════════════════

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useDraftStore, useMatchStore } from '@/stores';
import { GAME } from '@/config';
import type { DraftPick, DraftState, MatchType, Token } from '@/types';

// Snake draft order for full 8-pick draft (16 total picks, 2 players):
// Player A picks: 0, 3, 4, 7, 8, 11, 12, 15
// Player B picks: 1, 2, 5, 6, 9, 10, 13, 14
const SNAKE_ORDER_A = new Set([0, 3, 4, 7, 8, 11, 12, 15]);
// Fast draft: Player A = pick 0, Player B = pick 1
const FAST_ORDER_A = new Set([0]);

interface UseDraftOptions {
  matchId: string;
  matchType: MatchType;
  userId: string;        // 'player_a' for demo
  tokens: Token[];
}

export function useDraft({ matchId, matchType, userId, tokens }: UseDraftOptions) {
  const store = useDraftStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const opponentTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalPicks = matchType === 'fast' ? 2 : 16;
  const picksPerPlayer = matchType === 'fast' ? 1 : 8;
  const myTurnSet = matchType === 'fast' ? FAST_ORDER_A : SNAKE_ORDER_A;

  const isMyTurn = store.draft
    ? myTurnSet.has(store.draft.currentPick)
    : false;

  const currentRound = store.draft
    ? Math.floor(store.draft.currentPick / 2) + 1
    : 1;

  const isDraftComplete = store.draft
    ? store.draft.currentPick >= totalPicks
    : false;

  // ── Weight for current pick ──
  const getWeight = useCallback((pickIndex: number): number => {
    if (matchType === 'fast') return 1.0;
    const round = Math.floor(pickIndex / 2) + 1;
    return GAME.ROUND_WEIGHTS[round] || 0.10;
  }, [matchType]);

  const getMultiplierLabel = useCallback((pickIndex: number): string => {
    if (matchType === 'fast') return '—';
    const round = Math.floor(pickIndex / 2) + 1;
    return GAME.ROUND_MULTIPLIER_LABELS[round] || '1x';
  }, [matchType]);

  // ── Initialize draft ──
  useEffect(() => {
    if (!store.draft) {
      const initialState: DraftState = {
        matchId,
        matchType,
        currentPick: 0,
        totalPicks,
        currentPlayerId: userId,
        timeLeft: GAME.DRAFT_PICK_TIME_SECONDS,
        picks: [],
        availableTokens: tokens,
        phase: 'active',
      };
      store.initDraft(initialState);
      store.setAvailableTokens(tokens);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
    };
  }, []);

  // ── Countdown timer ──
  useEffect(() => {
    if (!store.draft || isDraftComplete || store.draft.phase !== 'active') return;

    if (store.draft.timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        store.setTimeLeft(store.draft!.timeLeft - 1);
      }, 1000);
    } else {
      // Time ran out — auto-pick
      if (isMyTurn) {
        autoPickForMe();
      }
      // Opponent timeout is handled by simulateOpponentPick
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [store.draft?.timeLeft, store.draft?.currentPick, store.draft?.phase]);

  // ── Simulate opponent picks ──
  useEffect(() => {
    if (!store.draft || isDraftComplete || store.draft.phase !== 'active') return;
    if (isMyTurn) return; // not opponent's turn

    opponentTimerRef.current = setTimeout(() => {
      simulateOpponentPick();
    }, 1200 + Math.random() * 1800); // 1.2-3s delay

    return () => {
      if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
    };
  }, [store.draft?.currentPick, isMyTurn]);

  // ── My pick ──
  const makePick = useCallback((token: Token) => {
    if (!store.draft || !isMyTurn || isDraftComplete) return;

    const pickIndex = store.draft.currentPick;
    const pick: DraftPick = {
      id: `pick_${pickIndex}_${token.symbol}`,
      matchId,
      userId,
      tokenSymbol: token.symbol,
      pickRound: Math.floor(pickIndex / 2) + 1,
      pickOrder: pickIndex,
      weight: getWeight(pickIndex),
      positionType: 'long', // assigned in lineup phase
      boostMultiplier: 1,
      currentPnlPercent: 0,
      status: 'benched',
    };

    store.addMyPick(pick);
    advanceDraft();
  }, [store.draft?.currentPick, isMyTurn, isDraftComplete, store.availableTokens]);

  // ── Auto-pick from watchlist or top available ──
  const autoPickForMe = useCallback(() => {
    const watchlistTokens = store.availableTokens.filter(t =>
      store.watchlist.has(t.symbol)
    );
    const token = watchlistTokens[0] || store.availableTokens[0];
    if (token) makePick(token);
  }, [store.availableTokens, store.watchlist, makePick]);

  // ── Simulate opponent ──
  const simulateOpponentPick = useCallback(() => {
    if (!store.draft || isMyTurn || isDraftComplete) return;

    // Opponent picks from top 5 randomly
    const topTokens = store.availableTokens.slice(0, Math.min(5, store.availableTokens.length));
    const token = topTokens[Math.floor(Math.random() * topTokens.length)];
    if (!token) return;

    const pickIndex = store.draft.currentPick;
    const pick: DraftPick = {
      id: `opp_pick_${pickIndex}_${token.symbol}`,
      matchId,
      userId: 'opponent',
      tokenSymbol: token.symbol,
      pickRound: Math.floor(pickIndex / 2) + 1,
      pickOrder: pickIndex,
      weight: getWeight(pickIndex),
      positionType: 'long',
      boostMultiplier: 1,
      currentPnlPercent: 0,
      status: 'benched',
    };

    store.addOpponentPick(pick);
    advanceDraft();
  }, [store.draft?.currentPick, isMyTurn, isDraftComplete, store.availableTokens]);

  // ── Advance to next pick ──
  const advanceDraft = useCallback(() => {
    if (!store.draft) return;
    const nextPick = store.draft.currentPick + 1;

    if (nextPick >= totalPicks) {
      store.setPhase('complete');
    }

    store.advancePick();
    store.setTimeLeft(GAME.DRAFT_PICK_TIME_SECONDS);
  }, [store.draft?.currentPick, totalPicks]);

  return {
    // State
    draft: store.draft,
    myPicks: store.myPicks,
    opponentPicks: store.opponentPicks,
    availableTokens: store.availableTokens,
    watchlist: store.watchlist,
    isMyTurn,
    isDraftComplete,
    currentRound,
    totalPicks,
    picksPerPlayer,

    // Derived
    getWeight,
    getMultiplierLabel,
    currentWeight: store.draft ? getWeight(store.draft.currentPick) : 0,
    currentMultiplier: store.draft ? getMultiplierLabel(store.draft.currentPick) : '—',

    // Actions
    makePick,
    toggleWatchlist: store.toggleWatchlist,
    reset: store.reset,
  };
}
