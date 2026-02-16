// ═══════════════════════════════════════════════════════
// DraftCrypto — Zustand Stores
// ═══════════════════════════════════════════════════════

import { create } from 'zustand';
import type {
  User, Match, DraftState, DraftPick, Token, Lineup,
  StakingTier, MatchType, MatchMode, TradeMode, MatchDuration,
  PositionType, PositionStatus, StakingInfo,
} from '@/types';
import { GAME, STAKING_TIERS } from '@/config';

// ── Auth Store ──

interface AuthState {
  user: User | null;
  isConnected: boolean;
  isConnecting: boolean;
  stakingInfo: StakingInfo | null;

  connect: (user: User) => void;
  disconnect: () => void;
  setConnecting: (v: boolean) => void;
  setStakingInfo: (info: StakingInfo) => void;
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isConnected: false,
  isConnecting: false,
  stakingInfo: null,

  connect: (user) => set({ user, isConnected: true, isConnecting: false }),
  disconnect: () => set({ user: null, isConnected: false, stakingInfo: null }),
  setConnecting: (v) => set({ isConnecting: v }),
  setStakingInfo: (info) => set({ stakingInfo: info }),
  updateUser: (partial) => set((s) => ({
    user: s.user ? { ...s.user, ...partial } : null,
  })),
}));

// ── Match Store ──

interface MatchState {
  currentMatch: Match | null;
  openMatches: Match[];
  myMatches: Match[];
  isJoiningQueue: boolean;
  matchCountdown: number | null;
  opponent: { walletAddress: string; ensName?: string } | null;

  setCurrentMatch: (match: Match | null) => void;
  setOpenMatches: (matches: Match[]) => void;
  setMyMatches: (matches: Match[]) => void;
  setJoiningQueue: (v: boolean) => void;
  setMatchCountdown: (v: number | null) => void;
  setOpponent: (opp: { walletAddress: string; ensName?: string } | null) => void;
  updateMatchStatus: (matchId: string, status: Match['status']) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  currentMatch: null,
  openMatches: [],
  myMatches: [],
  isJoiningQueue: false,
  matchCountdown: null,
  opponent: null,

  setCurrentMatch: (match) => set({ currentMatch: match }),
  setOpenMatches: (matches) => set({ openMatches: matches }),
  setMyMatches: (matches) => set({ myMatches: matches }),
  setJoiningQueue: (v) => set({ isJoiningQueue: v }),
  setMatchCountdown: (v) => set({ matchCountdown: v }),
  setOpponent: (opp) => set({ opponent: opp }),
  updateMatchStatus: (matchId, status) => set((s) => ({
    currentMatch: s.currentMatch?.id === matchId
      ? { ...s.currentMatch, status }
      : s.currentMatch,
  })),
}));

// ── Draft Store ──

interface DraftStoreState {
  draft: DraftState | null;
  myPicks: DraftPick[];
  opponentPicks: DraftPick[];
  watchlist: Set<string>;
  availableTokens: Token[];

  initDraft: (state: DraftState) => void;
  addMyPick: (pick: DraftPick) => void;
  addOpponentPick: (pick: DraftPick) => void;
  setTimeLeft: (t: number) => void;
  advancePick: () => void;
  setPhase: (phase: DraftState['phase']) => void;
  toggleWatchlist: (symbol: string) => void;
  removeAvailableToken: (symbol: string) => void;
  setAvailableTokens: (tokens: Token[]) => void;
  reset: () => void;
}

export const useDraftStore = create<DraftStoreState>((set) => ({
  draft: null,
  myPicks: [],
  opponentPicks: [],
  watchlist: new Set(['BTC', 'ETH', 'SOL']),
  availableTokens: [],

  initDraft: (state) => set({
    draft: state,
    myPicks: [],
    opponentPicks: [],
    availableTokens: state.availableTokens,
  }),

  addMyPick: (pick) => set((s) => ({
    myPicks: [...s.myPicks, pick],
    availableTokens: s.availableTokens.filter(t => t.symbol !== pick.tokenSymbol),
  })),

  addOpponentPick: (pick) => set((s) => ({
    opponentPicks: [...s.opponentPicks, pick],
    availableTokens: s.availableTokens.filter(t => t.symbol !== pick.tokenSymbol),
  })),

  setTimeLeft: (t) => set((s) => ({
    draft: s.draft ? { ...s.draft, timeLeft: t } : null,
  })),

  advancePick: () => set((s) => ({
    draft: s.draft ? { ...s.draft, currentPick: s.draft.currentPick + 1 } : null,
  })),

  setPhase: (phase) => set((s) => ({
    draft: s.draft ? { ...s.draft, phase } : null,
  })),

  toggleWatchlist: (symbol) => set((s) => {
    const next = new Set(s.watchlist);
    next.has(symbol) ? next.delete(symbol) : next.add(symbol);
    return { watchlist: next };
  }),

  removeAvailableToken: (symbol) => set((s) => ({
    availableTokens: s.availableTokens.filter(t => t.symbol !== symbol),
  })),

  setAvailableTokens: (tokens) => set({ availableTokens: tokens }),

  reset: () => set({
    draft: null,
    myPicks: [],
    opponentPicks: [],
    availableTokens: [],
  }),
}));

// ── Lineup Store ──

interface LineupState {
  assignments: Record<string, PositionType>;
  boosts: Record<string, number>; // symbol → boost multiplier

  setAssignment: (symbol: string, position: PositionType) => void;
  cycleAssignment: (symbol: string, isFast: boolean) => void;
  setBoost: (symbol: string, multiplier: number) => void;
  initAssignments: (picks: DraftPick[], matchType: MatchType) => void;
  reset: () => void;
}

export const useLineupStore = create<LineupState>((set) => ({
  assignments: {},
  boosts: {},

  setAssignment: (symbol, position) => set((s) => ({
    assignments: { ...s.assignments, [symbol]: position },
  })),

  cycleAssignment: (symbol, isFast) => set((s) => {
    const current = s.assignments[symbol] || 'long';
    let next: PositionType;
    if (isFast) {
      next = current === 'long' ? 'short' : 'long';
    } else {
      next = current === 'long' ? 'short' : current === 'short' ? 'bench' : 'long';
    }
    return { assignments: { ...s.assignments, [symbol]: next } };
  }),

  setBoost: (symbol, multiplier) => set((s) => ({
    boosts: { ...s.boosts, [symbol]: multiplier },
  })),

  initAssignments: (picks, matchType) => {
    const assignments: Record<string, PositionType> = {};
    picks.forEach((p, i) => {
      if (matchType === 'fast') {
        assignments[p.tokenSymbol] = 'long';
      } else {
        // Default: first 3 long, next 3 short, last 2 bench
        if (i < 3) assignments[p.tokenSymbol] = 'long';
        else if (i < 6) assignments[p.tokenSymbol] = 'short';
        else assignments[p.tokenSymbol] = 'bench';
      }
    });
    set({ assignments, boosts: {} });
  },

  reset: () => set({ assignments: {}, boosts: {} }),
}));

// ── Position / Match Active Store ──

interface PositionState {
  positions: DraftPick[];
  myTotalPnlPercent: number;
  opponentTotalPnlPercent: number;
  timeRemaining: string;
  matchEndTime: string | null;

  setPositions: (positions: DraftPick[]) => void;
  updatePosition: (pickId: string, update: Partial<DraftPick>) => void;
  setPnl: (my: number, opp: number) => void;
  setMatchEndTime: (time: string) => void;
  setTimeRemaining: (time: string) => void;
  reset: () => void;
}

export const usePositionStore = create<PositionState>((set) => ({
  positions: [],
  myTotalPnlPercent: 0,
  opponentTotalPnlPercent: 0,
  timeRemaining: '0:00:00',
  matchEndTime: null,

  setPositions: (positions) => set({ positions }),
  updatePosition: (pickId, update) => set((s) => ({
    positions: s.positions.map(p => p.id === pickId ? { ...p, ...update } : p),
  })),
  setPnl: (my, opp) => set({ myTotalPnlPercent: my, opponentTotalPnlPercent: opp }),
  setMatchEndTime: (time) => set({ matchEndTime: time }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  reset: () => set({
    positions: [],
    myTotalPnlPercent: 0,
    opponentTotalPnlPercent: 0,
    timeRemaining: '0:00:00',
    matchEndTime: null,
  }),
}));

// ── UNITE Store ──

interface UniteState {
  balance: number;
  staked: number;
  tier: StakingTier;
  boostsUsedThisMatch: number;

  setBalance: (v: number) => void;
  setStaked: (v: number) => void;
  setTier: (v: StakingTier) => void;
  useBoost: () => void;
  resetBoosts: () => void;
}

export const useUniteStore = create<UniteState>((set) => ({
  balance: 0,
  staked: 0,
  tier: 'none',
  boostsUsedThisMatch: 0,

  setBalance: (v) => set({ balance: v }),
  setStaked: (v) => set({ staked: v }),
  setTier: (v) => set({ tier: v }),
  useBoost: () => set((s) => ({ boostsUsedThisMatch: s.boostsUsedThisMatch + 1 })),
  resetBoosts: () => set({ boostsUsedThisMatch: 0 }),
}));
