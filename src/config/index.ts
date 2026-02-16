// ═══════════════════════════════════════════════════════
// Fantasy Crypto — Configuration
// ═══════════════════════════════════════════════════════

// ── Chain Config ──
export const CHAIN_ID = 42161; // Arbitrum One
export const CHAIN_NAME = 'Arbitrum One';
export const RPC_URL = 'https://arb1.arbitrum.io/rpc';
export const BLOCK_EXPLORER = 'https://arbiscan.io';

// ── Contract Addresses (Arbitrum) ──
export const CONTRACTS = {
  UNITE_TOKEN: '0xb14448B48452D7bA076aBeb3c505Fc044DEAF4E9' as `0x${string}`,
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as `0x${string}`, // Native USDC on Arbitrum
  FANTASY_VAULT: '' as `0x${string}`, // TBD after deployment
  UNITE_STAKING: '' as `0x${string}`, // TBD after deployment
} as const;

// ── Pear Protocol ──
export const PEAR = {
  BASE_URL: 'https://hl-v2.pearprotocol.io',
  BUILDER_CODE: '0xA47D4d99191db54A4829cdf3de2417E527c3b042',
  AGENT_WALLET_ROTATION_DAYS: 25, // rotate before 30-day expiry
} as const;

// ── Game Rules ──
export const GAME = {
  // Draft
  DRAFT_PICK_TIME_SECONDS: 30,
  DRAFT_COUNTDOWN_SECONDS: 10,
  FAST_PICKS_PER_PLAYER: 1,
  FULL_PICKS_PER_PLAYER: 8,
  FULL_ACTIVE_POSITIONS: 6,
  FULL_BENCH_POSITIONS: 2,

  // Position sizing
  MIN_POSITION_SIZE_USD: 25,
  MIN_CAPITAL_FAST: 25,     // 1 × $25
  MIN_CAPITAL_FULL: 200,    // 8 × $25

  // Leverage
  BASE_LEVERAGE: 3,
  MAX_BOOSTED_LEVERAGE: 9,  // whale 3x boost on 3x base

  // Draft round weights (full draft)
  ROUND_WEIGHTS: {
    1: 0.25, 2: 0.25,  // 3x conviction
    3: 0.15, 4: 0.15,  // 2x conviction
    5: 0.10, 6: 0.10,  // 1x conviction
    7: 0.10, 8: 0.10,  // bench (same weight when activated)
  } as Record<number, number>,

  ROUND_MULTIPLIER_LABELS: {
    1: '3x', 2: '3x',
    3: '2x', 4: '2x',
    5: '1x', 6: '1x',
    7: '1x', 8: '1x',
  } as Record<number, string>,

  // Durations
  DURATION_HOURS: {
    '1D': 24,
    '3D': 72,
    '1W': 168,
  } as Record<string, number>,

  // Fees
  PLATFORM_FEE_PERCENT: 5,

  // Settlement
  PNL_SNAPSHOT_INTERVAL_SECONDS: 60,

  // TP/SL defaults
  SUGGESTED_TPSL: {
    3: { tp: 0.15, sl: -0.10 },
    6: { tp: 0.10, sl: -0.08 },
    9: { tp: 0.08, sl: -0.05 },
  } as Record<number, { tp: number; sl: number }>,

  // Liquidation warning threshold
  MARGIN_WARNING_PERCENT: 80,

  // UNITE rewards
  UNITE_REWARDS: {
    WIN_H2H: 100,
    WIN_LEAGUE_WEEK: 150,
    PARTICIPATION: 10,
    LEADERBOARD_TOP_10: 500,
  },

  // Paper trade
  PAPER_REWARD_MULTIPLIER: 0.1, // 10% of live rewards
  PAPER_VIRTUAL_CAPITAL: 10_000, // $10k virtual for paper PnL calc
} as const;

// ── Staking Tiers ──
export const STAKING_TIERS = {
  none: {
    label: 'No Tier',
    uniteRequired: 0,
    wagerUsdc: 0,
    boostCount: 0,
    boostMax: 1,
    color: '#3d4439',
  },
  fun: {
    label: 'Fun',
    uniteRequired: 1_000,
    wagerUsdc: 0.50,
    boostCount: 1,
    boostMax: 2,
    color: '#6b7265',
  },
  serious: {
    label: 'Serious',
    uniteRequired: 10_000,
    wagerUsdc: 2.00,
    boostCount: 2,
    boostMax: 2,
    color: '#adf0c7',
  },
  whale: {
    label: 'Whale',
    uniteRequired: 100_000,
    wagerUsdc: 10.00,
    boostCount: 2,
    boostMax: 3,
    color: '#ffdc4a',
  },
} as const;

// ── API Routes ──
export const API = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
} as const;
