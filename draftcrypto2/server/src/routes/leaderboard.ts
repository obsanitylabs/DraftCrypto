// ═══════════════════════════════════════════════════════
// DraftCrypto Server — Leaderboard + UNITE Routes
// ═══════════════════════════════════════════════════════

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, config } from '../lib/index.js';
import { authGuard } from '../middleware/auth.js';

export async function leaderboardRoutes(app: FastifyInstance) {
  // ── Global leaderboard ──
  app.get('/leaderboard', async (request) => {
    const { period, tradeMode, limit } = z.object({
      period: z.enum(['weekly', 'monthly', 'alltime']).default('weekly'),
      tradeMode: z.enum(['all', 'live', 'paper']).default('all'),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }).parse(request.query);

    const dateFilter = period === 'weekly'
      ? new Date(Date.now() - 7 * 86400_000)
      : period === 'monthly'
        ? new Date(Date.now() - 30 * 86400_000)
        : new Date(0);

    const players = await prisma.matchPlayer.groupBy({
      by: ['userId'],
      where: {
        match: {
          status: 'settled',
          createdAt: { gte: dateFilter },
          ...(tradeMode !== 'all' && { tradeMode }),
        },
      },
      _sum: { totalPnl: true },
      _count: { matchId: true },
      orderBy: { _sum: { totalPnl: 'desc' } },
      take: limit,
    });

    // Hydrate with user data + win counts
    const entries = await Promise.all(
      players.map(async (p, i) => {
        const user = await prisma.user.findUnique({
          where: { id: p.userId },
          select: { id: true, walletAddress: true, ensName: true },
        });
        const wins = await prisma.matchPlayer.count({
          where: {
            userId: p.userId,
            isWinner: true,
            match: {
              status: 'settled',
              createdAt: { gte: dateFilter },
              ...(tradeMode !== 'all' && { tradeMode }),
            },
          },
        });
        return {
          rank: i + 1,
          user,
          totalPnl: Number(p._sum.totalPnl || 0),
          matchesPlayed: p._count.matchId,
          wins,
          winRate: p._count.matchId > 0 ? (wins / p._count.matchId) * 100 : 0,
        };
      }),
    );

    return { entries, period, tradeMode };
  });
}

export async function uniteRoutes(app: FastifyInstance) {
  // ── Get UNITE balance + transaction history ──
  app.get('/unite/balance', { preHandler: authGuard }, async (request) => {
    const userId = request.user.id;

    const txs = await prisma.uniteTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const earned = txs
      .filter(t => t.type.startsWith('earn'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const spent = txs
      .filter(t => t.type.startsWith('spend'))
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const staked = txs
      .filter(t => t.type === 'stake')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const unstaked = txs
      .filter(t => t.type === 'unstake')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = earned - spent;
    const stakedBalance = staked - unstaked;

    // Determine tier
    let tier = 'none';
    if (stakedBalance >= 100_000) tier = 'whale';
    else if (stakedBalance >= 10_000) tier = 'serious';
    else if (stakedBalance >= 1_000) tier = 'fun';

    return {
      balance,
      staked: stakedBalance,
      tier,
      tierConfig: config.game.tiers[tier] || null,
      transactions: txs.map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        txHash: t.txHash,
        matchId: t.matchId,
        createdAt: t.createdAt,
      })),
    };
  });

  // ── Get UNITE transaction history ──
  app.get('/unite/transactions', { preHandler: authGuard }, async (request) => {
    const userId = request.user.id;
    const { limit, offset } = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(request.query);

    const txs = await prisma.uniteTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return { transactions: txs };
  });
}
