// ═══════════════════════════════════════════════════════
// DraftCrypto — Core Types
// ═══════════════════════════════════════════════════════

// ── Auth & Users ──

export type WalletType = 'metamask' | 'walletconnect' | 'phantom' | 'rabby';

export interface User {
  id: string;
  walletAddress: string;
  walletType: WalletType;
  ensName?: string;
  xHandle?: string;
  tgHandle?: string;
  tradingStreamUrl?: string;
  preferredTradeMode: TradeMode;
  uniteTier: StakingTier;
  uniteBalance: number;
  uniteStaked: number;
  createdAt: string;
}

// ── Staking ──

export type StakingTier = 'none' | 'fun' | 'serious' | 'whale';

export interface StakingInfo {
  tier: StakingTier;
  stakedAmount: number;
  unstakeRequest?: {
    amount: number;
    requestedAt: string;
    availableAt: string;
  };
  boostsAvailable: BoostAllocation;
}

export interface BoostAllocation {
  count: number;       // how many boosts per matchup
  maxMultiplier: number; // 2x or 3x
}

export const TIER_CONFIG: Record<StakingTier, {
  uniteRequired: number;
  wagerAmount: number;
  boosts: BoostAllocation;
}> = {
  none: { uniteRequired: 0, wagerAmount: 0, boosts: { count: 0, maxMultiplier: 1 } },
  fun: { uniteRequired: 1_000, wagerAmount: 0.50, boosts: { count: 1, maxMultiplier: 2 } },
  serious: { uniteRequired: 10_000, wagerAmount: 2.00, boosts: { count: 2, maxMultiplier: 2 } },
  whale: { uniteRequired: 100_000, wagerAmount: 10.00, boosts: { count: 2, maxMultiplier: 3 } },
};

// ── Matches ──

export type MatchType = 'fast' | 'full';
export type MatchMode = 'h2h' | 'league';
export type TradeMode = 'live' | 'paper';
export type MatchDuration = '1D' | '3D' | '1W';

export type MatchStatus =
  | 'open'        // created, waiting for opponent
  | 'matched'     // opponent joined, waiting for draft
  | 'drafting'    // snake draft in progress
  | 'lineup'      // draft done, setting lineups
  | 'active'      // positions open, PnL tracking
  | 'settling'    // match ended, closing positions
  | 'settled'     // winner determined, payouts done
  | 'cancelled';  // refunded

export interface Match {
  id: string;
  matchType: MatchType;
  mode: MatchMode;
  tradeMode: TradeMode;
  tier: StakingTier;
  duration: MatchDuration;
  status: MatchStatus;
  wagerAmountUsdc: number;
  vaultMatchId?: string;
  creatorId: string;
  opponentId?: string;
  winnerId?: string;
  draftStartTime?: string;
  matchStartTime?: string;
  matchEndTime?: string;
  leagueId?: string;
  leagueWeek?: number;
  createdAt: string;
}

export interface MatchPlayer {
  matchId: string;
  userId: string;
  draftOrder: number;
  totalPnlPercent: number;
  isWinner: boolean;
}

// ── Draft ──

export interface DraftState {
  matchId: string;
  matchType: MatchType;
  currentPick: number;
  totalPicks: number; // 2 for fast, 16 for full
  currentPlayerId: string;
  timeLeft: number;
  picks: DraftPick[];
  availableTokens: Token[];
  phase: 'countdown' | 'active' | 'complete';
}

export interface DraftPick {
  id: string;
  matchId: string;
  userId: string;
  tokenSymbol: string;
  pickRound: number;
  pickOrder: number;
  weight: number;
  positionType: PositionType;
  boostMultiplier: number; // 1 = no boost
  // Pricing
  entryPrice?: number;
  currentPrice?: number;
  currentPnlPercent: number;
  // Status
  status: PositionStatus;
  tpPercent?: number;
  slPercent?: number;
  realizedPnlPercent?: number;
  closedAt?: string;
  // Pear Protocol
  pearPositionId?: string;
}

export type PositionType = 'long' | 'short' | 'bench';

export type PositionStatus =
  | 'open'
  | 'tp_set'
  | 'sl_set'
  | 'tp_sl_set'
  | 'closed_tp'
  | 'closed_sl'
  | 'closed_user'
  | 'liquidated'
  | 'benched';

// ── Tokens ──

export interface Token {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change1h: number;
  fundingRate: number;
  openInterest: number;
  volume24h: number;
  marketCap?: number;
}

// ── Lineup ──

export interface Lineup {
  matchId: string;
  userId: string;
  active: DraftPick[];   // 6 for full, 1 for fast
  bench: DraftPick[];    // 2 for full, 0 for fast
  boostsUsed: number;
  boostsRemaining: number;
}

// ── TP/SL ──

export interface TPSLOrder {
  pickId: string;
  takeProfit?: number;  // percentage, e.g. 0.10 = +10%
  stopLoss?: number;    // percentage, e.g. -0.05 = -5%
}

export const SUGGESTED_TPSL: Record<number, { tp: number; sl: number }> = {
  3: { tp: 0.15, sl: -0.10 },   // 3x base
  6: { tp: 0.10, sl: -0.08 },   // 6x (2x boost)
  9: { tp: 0.08, sl: -0.05 },   // 9x (3x boost)
};

// ── Leagues ──

export interface League {
  id: string;
  name: string;
  tradeMode: TradeMode;
  tier: StakingTier;
  status: 'filling' | 'active' | 'complete';
  currentWeek: number;
  totalWeeks: number;
  maxPlayers: number;
  wagerAmountUsdc: number;
  members: LeagueMember[];
  createdAt: string;
}

export interface LeagueMember {
  leagueId: string;
  userId: string;
  coManagerId?: string;
  wins: number;
  losses: number;
  totalPnlPercent: number;
  rank: number;
  hasRageQuit: boolean;
}

// ── UNITE ──

export type UniteTransactionType =
  | 'earn_match'
  | 'earn_league'
  | 'earn_leaderboard'
  | 'spend_boost'
  | 'stake'
  | 'unstake'
  | 'claim';

export interface UniteTransaction {
  id: string;
  userId: string;
  type: UniteTransactionType;
  amount: number;
  txHash?: string;
  matchId?: string;
  createdAt: string;
}

// ── Leaderboard ──

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  walletAddress: string;
  ensName?: string;
  totalPnlPercent: number;
  matchesWon: number;
  matchesPlayed: number;
  winRate: number;
}

// ── Pear Protocol ──

export interface PearTokens {
  jwt: string;
  refreshToken: string;
  expiresAt: string;
}

export interface PearAgentWallet {
  address: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'pending';
}

export interface PearMarketData {
  coin: string;
  markPrice: number;
  midPrice: number;
  change24h: number;
  fundingRate: number;
  openInterest: number;
  volume24h: number;
}

export interface PearPosition {
  positionId: string;
  longAssets: { coin: string; weight: number }[];
  shortAssets: { coin: string; weight: number }[];
  leverage: number;
  size: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  entryPrice: number;
  markPrice: number;
  marginRatio: number;
  takeProfit?: number;
  stopLoss?: number;
}

// ── WebSocket Events ──

export interface WSEvents {
  // Client → Server
  join_queue: { tradeMode: TradeMode; mode: MatchMode; matchType: MatchType; tier: StakingTier; duration: MatchDuration };
  leave_queue: {};
  join_match: { matchId: string };
  draft_pick: { matchId: string; tokenSymbol: string };
  set_lineup: { matchId: string; lineup: { symbol: string; position: PositionType; boostMultiplier?: number }[] };
  close_position: { matchId: string; pickId: string };
  set_tpsl: { matchId: string; pickId: string; tp?: number; sl?: number };
  swap_bench: { matchId: string; benchPickId: string; activePickId: string; boostMultiplier?: number };

  // Server → Client
  match_found: { matchId: string; opponent: { walletAddress: string; ensName?: string }; draftStartTime: string };
  draft_countdown: { secondsRemaining: number };
  draft_turn: { currentPlayerId: string; secondsLeft: number; pickNumber: number };
  draft_pick_made: { userId: string; tokenSymbol: string; weight: number; pickOrder: number };
  draft_complete: { picks: DraftPick[] };
  price_update: { tokens: { symbol: string; price: number; change1h: number; change24h: number }[] };
  pnl_update: { matchId: string; players: { userId: string; totalPnlPercent: number; positions: { pickId: string; pnlPercent: number; status: PositionStatus }[] }[] };
  position_closed: { matchId: string; pickId: string; reason: 'tp' | 'sl' | 'user' | 'liquidated' | 'match_end'; realizedPnlPercent: number };
  match_settled: { matchId: string; winnerId: string; winnerPnlPercent: number; loserPnlPercent: number; payoutUsdc: number; uniteEarned: number };
}
