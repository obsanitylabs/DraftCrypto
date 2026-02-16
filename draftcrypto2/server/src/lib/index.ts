// ═══════════════════════════════════════════════════════
// DraftCrypto Server — Lib (db, redis, config, logger)
// ═══════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import pino from 'pino';

// ── Prisma ──
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

// ── Redis (optional — falls back to in-memory for dev/preview) ──
let redisAvailable = false;
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export async function connectRedis(): Promise<boolean> {
  try {
    await redis.connect();
    redisAvailable = true;
    logger.info('Redis connected');
    return true;
  } catch (err) {
    logger.warn('Redis not available — using in-memory fallback');
    return false;
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

// ── In-Memory Nonce Store (fallback when Redis unavailable) ──
const nonceMap = new Map<string, { value: string; expiresAt: number }>();

export const nonceStore = {
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (redisAvailable) {
      await redis.setex(key, ttlSeconds, value);
    } else {
      nonceMap.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
  },

  async get(key: string): Promise<string | null> {
    if (redisAvailable) {
      return redis.get(key);
    } else {
      const entry = nonceMap.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        nonceMap.delete(key);
        return null;
      }
      return entry.value;
    }
  },

  async del(key: string): Promise<void> {
    if (redisAvailable) {
      await redis.del(key);
    } else {
      nonceMap.delete(key);
    }
  },
};

// ── In-Memory Queue Store (matchmaking fallback) ──
const queueMap = new Map<string, string[]>();

export const queueStore = {
  async lpush(key: string, value: string): Promise<void> {
    if (redisAvailable) {
      await redis.lpush(key, value);
    } else {
      const list = queueMap.get(key) || [];
      list.unshift(value);
      queueMap.set(key, list);
    }
  },

  async lpop(key: string): Promise<string | null> {
    if (redisAvailable) {
      return redis.lpop(key);
    } else {
      const list = queueMap.get(key) || [];
      return list.shift() || null;
    }
  },
};

// ── Logger ──
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

// ── JWT Secret Enforcement ──
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    logger.error('FATAL: JWT_SECRET environment variable is required in production');
    process.exit(1);
  }
  if (!secret) {
    logger.warn('Using default JWT secret — DO NOT use in production');
    return 'dev-secret-change-in-production-min-32-characters-long';
  }
  if (secret.length < 32) {
    logger.warn('JWT_SECRET should be at least 32 characters');
  }
  return secret;
}

// ── Config ──
export const config = {
  port: parseInt(process.env.PORT || '3001'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  jwtSecret: getJwtSecret(),
  pear: {
    baseUrl: process.env.PEAR_BASE_URL || 'https://hl-v2.pearprotocol.io',
    builderCode: process.env.PEAR_BUILDER_CODE || '',
  },
  game: {
    draftPickTimeSeconds: 30,
    draftCountdownSeconds: 10,
    baseLeverage: 3,
    platformFeePercent: 5,
    paperRewardMultiplier: 0.1,
    // Weights per pick number (1-indexed). Full draft = 8 picks per player.
    // Picks 1-2: 0.25 (conviction), 3-4: 0.15, 5-6: 0.10, 7-8: 0.10 (bench)
    roundWeights: { 1: 0.25, 2: 0.25, 3: 0.15, 4: 0.15, 5: 0.10, 6: 0.10, 7: 0.10, 8: 0.10 } as Record<number, number>,
    uniteRewards: {
      winH2h: 100,
      winLeagueWeek: 150,
      participation: 10,
      leaderboardTop10: 500,
    },
    tiers: {
      fun:     { wager: 0.50, uniteRequired: 1_000,   boostCount: 0, boostMax: 1 },
      serious: { wager: 2.00, uniteRequired: 10_000,  boostCount: 1, boostMax: 2 },
      whale:   { wager: 10.0, uniteRequired: 100_000, boostCount: 2, boostMax: 3 },
    } as Record<string, { wager: number; uniteRequired: number; boostCount: number; boostMax: number }>,
    durations: { '1D': 24, '3D': 72, '1W': 168 } as Record<string, number>,
    matchTypes: {
      fast: { picksPerPlayer: 1, totalPicks: 2 },
      full: { picksPerPlayer: 8, totalPicks: 16 },
    } as Record<string, { picksPerPlayer: number; totalPicks: number }>,
    // Token pool for drafting
    draftTokens: [
      'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX',
      'DOT', 'LINK', 'MATIC', 'UNI', 'NEAR', 'OP', 'ARB', 'FTM',
      'APT', 'SUI', 'INJ', 'TIA', 'SEI', 'JUP', 'PYTH', 'WIF',
      'PEPE', 'BONK', 'HYPE', 'RENDER', 'FET', 'TAO',
    ],
    // Stale match timeout (minutes)
    staleMatchTimeoutMinutes: 30,
  },
  contracts: {
    unite: '0xb14448B48452D7bA076aBeb3c505Fc044DEAF4E9',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    vault: '',
    staking: '',
  },
};
