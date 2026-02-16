// ═══════════════════════════════════════════════════════
// Fantasy Crypto Server — Lib (db, redis, config, logger)
// ═══════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import pino from 'pino';

// ── Prisma ──
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

// ── Redis ──
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // required for BullMQ
  lazyConnect: true,
});

// ── Logger ──
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

// ── Config ──
export const config = {
  port: parseInt(process.env.PORT || '3001'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production-32chars',
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
    roundWeights: { 1: 0.25, 2: 0.25, 3: 0.15, 4: 0.15, 5: 0.10, 6: 0.10 } as Record<number, number>,
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
  },
  contracts: {
    unite: '0xb14448B48452D7bA076aBeb3c505Fc044DEAF4E9',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    vault: '',   // deployed later
    staking: '', // deployed later
  },
};
