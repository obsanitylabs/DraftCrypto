// ═══════════════════════════════════════════════════════
// Fantasy Crypto Server — Admin Routes
// ═══════════════════════════════════════════════════════

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, redis, config, logger } from '../lib/index.js';
import { authGuard } from '../middleware/auth.js';

// ── Admin wallet whitelist (env-configured) ──
const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || '')
  .split(',')
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

async function adminGuard(request: any, reply: any) {
  await authGuard(request, reply);
  if (reply.sent) return;
  const wallet = request.user?.walletAddress?.toLowerCase();
  if (!wallet || !ADMIN_WALLETS.includes(wallet)) {
    reply.code(403).send({ error: 'Forbidden: admin access required' });
  }
}

export async function adminRoutes(app: FastifyInstance) {

  // ═══════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════

  // ── Platform overview ──
  app.get('/admin/analytics/overview', { preHandler: adminGuard }, async () => {
    const now = new Date();
    const day = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      usersToday,
      usersWeek,
      totalMatches,
      matchesToday,
      activeMatches,
      settledMatches,
      cancelledMatches,
      totalUniteDistributed,
      totalUniteSpent,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: day } } }),
      prisma.user.count({ where: { createdAt: { gte: week } } }),
      prisma.match.count(),
      prisma.match.count({ where: { createdAt: { gte: day } } }),
      prisma.match.count({ where: { status: { in: ['matching', 'drafting', 'lineup', 'active'] } } }),
      prisma.match.count({ where: { status: 'settled' } }),
      prisma.match.count({ where: { status: 'cancelled' } }),
      prisma.uniteTransaction.aggregate({ where: { type: { startsWith: 'earn' } }, _sum: { amount: true } }),
      prisma.uniteTransaction.aggregate({ where: { type: { startsWith: 'spend' } }, _sum: { amount: true } }),
    ]);

    // Trade mode breakdown
    const [liveMatches, paperMatches] = await Promise.all([
      prisma.match.count({ where: { tradeMode: 'live' } }),
      prisma.match.count({ where: { tradeMode: 'paper' } }),
    ]);

    // Tier breakdown
    const tierCounts = await prisma.match.groupBy({
      by: ['tier'],
      _count: true,
    });

    // Wager volume (live matches only)
    const wagerVolume = await prisma.match.aggregate({
      where: { tradeMode: 'live', status: 'settled' },
      _sum: { wagerAmountUsdc: true },
    });

    // Estimated fees (5% of total pot = 2 × wager per match)
    const totalWagerVolume = Number(wagerVolume._sum.wagerAmountUsdc || 0) * 2;
    const feesCollected = totalWagerVolume * (config.game.platformFeePercent / 100);

    return {
      users: {
        total: totalUsers,
        today: usersToday,
        thisWeek: usersWeek,
      },
      matches: {
        total: totalMatches,
        today: matchesToday,
        active: activeMatches,
        settled: settledMatches,
        cancelled: cancelledMatches,
        live: liveMatches,
        paper: paperMatches,
        tierBreakdown: Object.fromEntries(tierCounts.map(t => [t.tier, t._count])),
      },
      volume: {
        totalWagerVolumeUsdc: totalWagerVolume,
        feesCollectedUsdc: feesCollected,
      },
      unite: {
        totalDistributed: Number(totalUniteDistributed._sum.amount || 0),
        totalSpent: Number(totalUniteSpent._sum.amount || 0),
        netCirculating: Number(totalUniteDistributed._sum.amount || 0) - Number(totalUniteSpent._sum.amount || 0),
      },
    };
  });

  // ── Time-series data (matches & users per day) ──
  app.get('/admin/analytics/timeseries', { preHandler: adminGuard }, async (request) => {
    const { days = '30' } = request.query as { days?: string };
    const numDays = Math.min(parseInt(days) || 30, 365);
    const since = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);

    // Raw daily user signups
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });

    // Raw daily match creation
    const matches = await prisma.match.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, tradeMode: true, status: true },
    });

    // Aggregate by day
    const dayBuckets: Record<string, { users: number; matches: number; liveMatches: number; paperMatches: number }> = {};
    for (let i = 0; i < numDays; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dayBuckets[key] = { users: 0, matches: 0, liveMatches: 0, paperMatches: 0 };
    }

    for (const u of users) {
      const key = u.createdAt.toISOString().split('T')[0];
      if (dayBuckets[key]) dayBuckets[key].users++;
    }
    for (const m of matches) {
      const key = m.createdAt.toISOString().split('T')[0];
      if (dayBuckets[key]) {
        dayBuckets[key].matches++;
        if (m.tradeMode === 'live') dayBuckets[key].liveMatches++;
        else dayBuckets[key].paperMatches++;
      }
    }

    return {
      days: numDays,
      series: Object.entries(dayBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
    };
  });

  // ── Revenue breakdown ──
  app.get('/admin/analytics/revenue', { preHandler: adminGuard }, async () => {
    const settledLive = await prisma.match.findMany({
      where: { tradeMode: 'live', status: 'settled', wagerAmountUsdc: { not: null } },
      select: { wagerAmountUsdc: true, tier: true, createdAt: true },
    });

    const byTier: Record<string, { matches: number; volume: number; fees: number }> = {};
    for (const m of settledLive) {
      const wager = Number(m.wagerAmountUsdc || 0);
      const pot = wager * 2;
      const fee = pot * (config.game.platformFeePercent / 100);
      if (!byTier[m.tier]) byTier[m.tier] = { matches: 0, volume: 0, fees: 0 };
      byTier[m.tier].matches++;
      byTier[m.tier].volume += pot;
      byTier[m.tier].fees += fee;
    }

    return { byTier };
  });

  // ── Active connections / queue status ──
  app.get('/admin/analytics/realtime', { preHandler: adminGuard }, async () => {
    // Queue sizes from Redis
    const queueKeys = await redis.keys('queue:*');
    const queues: Record<string, number> = {};
    for (const key of queueKeys) {
      queues[key] = await redis.llen(key);
    }

    // Active draft states
    const draftKeys = await redis.keys('draft:*');

    return {
      queues,
      activeDrafts: draftKeys.length,
      queueKeys: queueKeys.length,
    };
  });

  // ═══════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ═══════════════════════════════════════════════════════

  // ── List users (paginated, searchable) ──
  app.get('/admin/users', { preHandler: adminGuard }, async (request) => {
    const { search, limit = '50', offset = '0', sortBy = 'createdAt', order = 'desc' } = request.query as any;

    const where = search ? {
      OR: [
        { walletAddress: { contains: search, mode: 'insensitive' as const } },
        { ensName: { contains: search, mode: 'insensitive' as const } },
        { xHandle: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { [sortBy]: order },
        include: {
          _count: { select: { matchPlayers: true, uniteTransactions: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, limit: parseInt(limit), offset: parseInt(offset) };
  });

  // ── Get user detail ──
  app.get('/admin/users/:userId', { preHandler: adminGuard }, async (request) => {
    const { userId } = request.params as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        matchPlayers: {
          include: { match: true },
          orderBy: { match: { createdAt: 'desc' } },
          take: 20,
        },
        uniteTransactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    if (!user) return { error: 'User not found' };

    // Calculate stats
    const wins = await prisma.matchPlayer.count({ where: { userId, isWinner: true } });
    const totalMatches = await prisma.matchPlayer.count({ where: { userId } });
    const uniteBalance = await prisma.uniteTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    return {
      user,
      stats: {
        wins,
        totalMatches,
        winRate: totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0',
        uniteBalance: uniteBalance._sum.amount || 0,
      },
    };
  });

  // ── Ban/suspend user ──
  app.post('/admin/users/:userId/ban', { preHandler: adminGuard }, async (request) => {
    const { userId } = request.params as { userId: string };
    const { reason, duration } = request.body as { reason: string; duration?: string };

    // Store ban in Redis (or could add a status field to User model)
    const banKey = `ban:${userId}`;
    const banData = JSON.stringify({
      reason,
      bannedBy: request.user.walletAddress,
      bannedAt: new Date().toISOString(),
      expiresAt: duration ? new Date(Date.now() + parseDuration(duration)).toISOString() : null,
    });

    if (duration) {
      await redis.setex(banKey, parseDuration(duration) / 1000, banData);
    } else {
      await redis.set(banKey, banData); // permanent
    }

    await logAdminAction(request.user.walletAddress, 'ban_user', { userId, reason, duration });
    return { success: true, message: `User ${userId} banned` };
  });

  // ── Unban user ──
  app.post('/admin/users/:userId/unban', { preHandler: adminGuard }, async (request) => {
    const { userId } = request.params as { userId: string };
    await redis.del(`ban:${userId}`);
    await logAdminAction(request.user.walletAddress, 'unban_user', { userId });
    return { success: true };
  });

  // ═══════════════════════════════════════════════════════
  // BALANCE & UNITE ADJUSTMENTS
  // ═══════════════════════════════════════════════════════

  // ── Credit/debit UNITE balance ──
  app.post('/admin/users/:userId/unite-adjust', { preHandler: adminGuard }, async (request) => {
    const { userId } = request.params as { userId: string };
    const schema = z.object({
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
      reason: z.string().min(1).max(500),
    });
    const { amount, type, reason } = schema.parse(request.body);

    const adjustedAmount = type === 'credit' ? Math.abs(amount) : -Math.abs(amount);

    const tx = await prisma.uniteTransaction.create({
      data: {
        userId,
        type: type === 'credit' ? 'earn_match' : 'spend_boost', // reuse existing enum
        amount: adjustedAmount,
      },
    });

    await logAdminAction(request.user.walletAddress, 'unite_adjust', {
      userId, amount: adjustedAmount, reason, transactionId: tx.id,
    });

    return { success: true, transaction: tx, adjustedAmount };
  });

  // ── Force unstake ──
  app.post('/admin/users/:userId/force-unstake', { preHandler: adminGuard }, async (request) => {
    const { userId } = request.params as { userId: string };
    const schema = z.object({
      amount: z.number().positive(),
      reason: z.string().min(1).max(500),
    });
    const { amount, reason } = schema.parse(request.body);

    // Create unstake transaction record
    const tx = await prisma.uniteTransaction.create({
      data: {
        userId,
        type: 'unstake',
        amount: -amount,
      },
    });

    await logAdminAction(request.user.walletAddress, 'force_unstake', {
      userId, amount, reason, transactionId: tx.id,
    });

    // NOTE: Actual on-chain unstake would require a separate admin function
    // on the UNITEStaking contract. This records the off-chain state change.

    return { success: true, transaction: tx };
  });

  // ═══════════════════════════════════════════════════════
  // PNL ADJUSTMENTS
  // ═══════════════════════════════════════════════════════

  // ── Manual PnL correction ──
  app.post('/admin/matches/:matchId/pnl-adjust', { preHandler: adminGuard }, async (request) => {
    const { matchId } = request.params as { matchId: string };
    const schema = z.object({
      userId: z.string(),
      pickId: z.string().optional(),
      adjustedPnl: z.number(),
      reason: z.enum([
        'high_slippage',
        'low_liquidity',
        'price_feed_error',
        'execution_failure',
        'market_manipulation',
        'other',
      ]),
      notes: z.string().min(1).max(1000),
    });
    const { userId, pickId, adjustedPnl, reason, notes } = schema.parse(request.body);

    let result: any;

    if (pickId) {
      // Adjust specific pick PnL
      const pick = await prisma.draftPick.findFirst({ where: { id: pickId, matchId, userId } });
      if (!pick) return { error: 'Pick not found' };

      const oldPnl = pick.currentPnl;
      result = await prisma.draftPick.update({
        where: { id: pickId },
        data: { currentPnl: adjustedPnl, realizedPnl: adjustedPnl },
      });

      await logAdminAction(request.user.walletAddress, 'pnl_adjust_pick', {
        matchId, userId, pickId, oldPnl, newPnl: adjustedPnl, reason, notes,
      });
    } else {
      // Adjust player's total PnL for the match
      const player = await prisma.matchPlayer.findFirst({ where: { matchId, userId } });
      if (!player) return { error: 'Player not found in match' };

      const oldPnl = player.totalPnl;
      result = await prisma.matchPlayer.updateMany({
        where: { matchId, userId },
        data: { totalPnl: adjustedPnl },
      });

      await logAdminAction(request.user.walletAddress, 'pnl_adjust_total', {
        matchId, userId, oldPnl, newPnl: adjustedPnl, reason, notes,
      });
    }

    return { success: true, result };
  });

  // ── Re-settle a match (recalculate winner after PnL adjustment) ──
  app.post('/admin/matches/:matchId/resettle', { preHandler: adminGuard }, async (request) => {
    const { matchId } = request.params as { matchId: string };
    const { reason } = request.body as { reason: string };

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { players: true },
    });

    if (!match) return { error: 'Match not found' };
    if (match.status !== 'settled') return { error: 'Can only resettle settled matches' };

    // Determine new winner
    const sorted = match.players.sort((a, b) => Number(b.totalPnl) - Number(a.totalPnl));
    const newWinnerId = sorted[0]?.userId;
    const oldWinnerId = match.winnerId;

    if (newWinnerId !== oldWinnerId) {
      // Update winner flags
      await prisma.matchPlayer.updateMany({
        where: { matchId },
        data: { isWinner: false },
      });
      await prisma.matchPlayer.updateMany({
        where: { matchId, userId: newWinnerId },
        data: { isWinner: true },
      });
      await prisma.match.update({
        where: { id: matchId },
        data: { winnerId: newWinnerId },
      });
    }

    await logAdminAction(request.user.walletAddress, 'resettle_match', {
      matchId, oldWinnerId, newWinnerId, reason,
    });

    return {
      success: true,
      winnerChanged: newWinnerId !== oldWinnerId,
      oldWinner: oldWinnerId,
      newWinner: newWinnerId,
      players: sorted.map(p => ({ userId: p.userId, totalPnl: p.totalPnl })),
    };
  });

  // ── Cancel/void a match ──
  app.post('/admin/matches/:matchId/cancel', { preHandler: adminGuard }, async (request) => {
    const { matchId } = request.params as { matchId: string };
    const { reason } = request.body as { reason: string };

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return { error: 'Match not found' };

    await prisma.match.update({
      where: { id: matchId },
      data: { status: 'cancelled' },
    });

    await logAdminAction(request.user.walletAddress, 'cancel_match', { matchId, reason, previousStatus: match.status });
    return { success: true };
  });

  // ═══════════════════════════════════════════════════════
  // MATCH MANAGEMENT
  // ═══════════════════════════════════════════════════════

  // ── List matches (admin view with filters) ──
  app.get('/admin/matches', { preHandler: adminGuard }, async (request) => {
    const { status, tradeMode, tier, limit = '50', offset = '0' } = request.query as any;

    const where: any = {};
    if (status) where.status = status;
    if (tradeMode) where.tradeMode = tradeMode;
    if (tier) where.tier = tier;

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          players: { include: { user: { select: { walletAddress: true, ensName: true } } } },
        },
      }),
      prisma.match.count({ where }),
    ]);

    return { matches, total };
  });

  // ── Match detail with full picks ──
  app.get('/admin/matches/:matchId', { preHandler: adminGuard }, async (request) => {
    const { matchId } = request.params as { matchId: string };

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        players: {
          include: {
            user: { select: { walletAddress: true, ensName: true } },
          },
        },
      },
    });

    return { match };
  });

  // ═══════════════════════════════════════════════════════
  // REFERRAL MANAGEMENT
  // ═══════════════════════════════════════════════════════

  app.get('/admin/referrals', { preHandler: adminGuard }, async (request) => {
    const { limit = '50', offset = '0' } = request.query as any;

    const referralTxs = await prisma.uniteTransaction.findMany({
      where: { type: 'earn_match' }, // referral rewards are tracked as earn_match
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { walletAddress: true, ensName: true } } },
    });

    const totalReferralUnite = await prisma.uniteTransaction.aggregate({
      where: { type: 'earn_match' },
      _sum: { amount: true },
    });

    return {
      transactions: referralTxs,
      totalDistributed: totalReferralUnite._sum.amount || 0,
    };
  });

  // ═══════════════════════════════════════════════════════
  // SYSTEM HEALTH
  // ═══════════════════════════════════════════════════════

  app.get('/admin/system/health', { preHandler: adminGuard }, async () => {
    const checks: Record<string, any> = {};

    // Database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', latency: 'ok' };
    } catch (e: any) {
      checks.database = { status: 'unhealthy', error: e.message };
    }

    // Redis
    try {
      const start = Date.now();
      await redis.ping();
      checks.redis = { status: 'healthy', latencyMs: Date.now() - start };
    } catch (e: any) {
      checks.redis = { status: 'unhealthy', error: e.message };
    }

    // Memory
    const mem = process.memoryUsage();
    checks.memory = {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    };

    checks.uptime = Math.round(process.uptime());
    checks.nodeVersion = process.version;

    return { checks };
  });

  // ═══════════════════════════════════════════════════════
  // AUDIT LOG
  // ═══════════════════════════════════════════════════════

  app.get('/admin/audit-log', { preHandler: adminGuard }, async (request) => {
    const { limit = '100', offset = '0', action } = request.query as any;

    // Fetch from Redis sorted set (most recent first)
    const logs = await redis.lrange('admin:audit_log', parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    const total = await redis.llen('admin:audit_log');

    const parsed = logs.map((l: string) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);

    const filtered = action
      ? parsed.filter((l: any) => l.action === action)
      : parsed;

    return { logs: filtered, total };
  });
}

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════

async function logAdminAction(adminWallet: string, action: string, data: Record<string, any>) {
  const entry = JSON.stringify({
    action,
    admin: adminWallet,
    timestamp: new Date().toISOString(),
    ...data,
  });
  await redis.lpush('admin:audit_log', entry);
  await redis.ltrim('admin:audit_log', 0, 9999); // keep last 10k entries
  logger.info({ action, admin: adminWallet, ...data }, `Admin action: ${action}`);
}

function parseDuration(d: string): number {
  const units: Record<string, number> = {
    h: 3600000, d: 86400000, w: 604800000, m: 2592000000,
  };
  const match = d.match(/^(\d+)([hdwm])$/);
  if (!match) return 86400000; // default 1 day
  return parseInt(match[1]) * (units[match[2]] || 86400000);
}
