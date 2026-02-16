// ═══════════════════════════════════════════════════════
// DraftCrypto Server — Admin Routes
// ═══════════════════════════════════════════════════════

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, redis, isRedisAvailable, config, logger } from '../lib/index.js';
import { authGuard } from '../middleware/auth.js';

// ── Admin wallet whitelist (env-configured) ──
const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || '')
  .split(',')
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

// In-memory audit log fallback
const memoryAuditLog: string[] = [];

async function adminGuard(request: any, reply: any) {
  await authGuard(request, reply);
  if (reply.sent) return;
  const wallet = request.user?.walletAddress?.toLowerCase();
  if (!wallet || !ADMIN_WALLETS.includes(wallet)) {
    reply.code(403).send({ error: 'Forbidden: admin access required' });
  }
}

export async function adminRoutes(app: FastifyInstance) {

  // ── Platform overview ──
  app.get('/admin/analytics/overview', { preHandler: adminGuard }, async () => {
    const now = new Date();
    const day = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, usersToday, usersWeek,
      totalMatches, matchesToday, activeMatches, settledMatches, cancelledMatches,
      totalUniteDistributed, totalUniteSpent,
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

    const [liveMatches, paperMatches] = await Promise.all([
      prisma.match.count({ where: { tradeMode: 'live' } }),
      prisma.match.count({ where: { tradeMode: 'paper' } }),
    ]);

    const tierCounts = await prisma.match.groupBy({ by: ['tier'], _count: true });

    const wagerVolume = await prisma.match.aggregate({
      where: { tradeMode: 'live', status: 'settled' },
      _sum: { wagerAmountUsdc: true },
    });

    const totalWagerVolume = Number(wagerVolume._sum.wagerAmountUsdc || 0) * 2;
    const feesCollected = totalWagerVolume * (config.game.platformFeePercent / 100);

    return {
      users: { total: totalUsers, today: usersToday, thisWeek: usersWeek },
      matches: {
        total: totalMatches, today: matchesToday, active: activeMatches,
        settled: settledMatches, cancelled: cancelledMatches,
        live: liveMatches, paper: paperMatches,
        tierBreakdown: Object.fromEntries(tierCounts.map(t => [t.tier, t._count])),
      },
      volume: { totalWagerVolumeUsdc: totalWagerVolume, feesCollectedUsdc: feesCollected },
      unite: {
        totalDistributed: Number(totalUniteDistributed._sum.amount || 0),
        totalSpent: Number(totalUniteSpent._sum.amount || 0),
        netCirculating: Number(totalUniteDistributed._sum.amount || 0) - Number(totalUniteSpent._sum.amount || 0),
      },
    };
  });

  // ── Time-series data ──
  app.get('/admin/analytics/timeseries', { preHandler: adminGuard }, async (request) => {
    const { days = '30' } = request.query as { days?: string };
    const numDays = Math.min(parseInt(days) || 30, 365);
    const since = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);

    const users = await prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } });
    const matches = await prisma.match.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, tradeMode: true, status: true } });

    const dayBuckets: Record<string, { users: number; matches: number; liveMatches: number; paperMatches: number }> = {};
    for (let i = 0; i < numDays; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dayBuckets[key] = { users: 0, matches: 0, liveMatches: 0, paperMatches: 0 };
    }

    for (const u of users) { const key = u.createdAt.toISOString().split('T')[0]; if (dayBuckets[key]) dayBuckets[key].users++; }
    for (const m of matches) { const key = m.createdAt.toISOString().split('T')[0]; if (dayBuckets[key]) { dayBuckets[key].matches++; if (m.tradeMode === 'live') dayBuckets[key].liveMatches++; else dayBuckets[key].paperMatches++; } }

    return { days: numDays, series: Object.entries(dayBuckets).sort(([a], [b]) => a.localeCompare(b)).map(([date, data]) => ({ date, ...data })) };
  });

  // ── Active connections / queue status ──
  app.get('/admin/analytics/realtime', { preHandler: adminGuard }, async () => {
    if (!isRedisAvailable()) {
      return { queues: {}, activeDrafts: 0, queueKeys: 0, note: 'Redis unavailable — using in-memory fallback' };
    }

    const queueKeys = await redis.keys('queue:*');
    const queues: Record<string, number> = {};
    for (const key of queueKeys) { queues[key] = await redis.llen(key); }
    const draftKeys = await redis.keys('draft:*');

    return { queues, activeDrafts: draftKeys.length, queueKeys: queueKeys.length };
  });

  // ── List users ──
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
      prisma.user.findMany({ where, take: parseInt(limit), skip: parseInt(offset), orderBy: { [sortBy]: order }, include: { _count: { select: { matchPlayers: true, uniteTransactions: true } } } }),
      prisma.user.count({ where }),
    ]);

    return { users, total, limit: parseInt(limit), offset: parseInt(offset) };
  });

  // ── User detail ──
  app.get('/admin/users/:userId', { preHandler: adminGuard }, async (request) => {
    const { userId } = request.params as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        matchPlayers: { include: { match: true }, orderBy: { match: { createdAt: 'desc' } }, take: 20 },
        uniteTransactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!user) return { error: 'User not found' };

    const wins = await prisma.matchPlayer.count({ where: { userId, isWinner: true } });
    const totalMatches = await prisma.matchPlayer.count({ where: { userId } });
    const uniteBalance = await prisma.uniteTransaction.aggregate({ where: { userId }, _sum: { amount: true } });

    return { user, stats: { wins, totalMatches, winRate: totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0', uniteBalance: uniteBalance._sum.amount || 0 } };
  });

  // ── Cancel match ──
  app.post('/admin/matches/:matchId/cancel', { preHandler: adminGuard }, async (request) => {
    const { matchId } = request.params as { matchId: string };
    const { reason } = request.body as { reason: string };
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return { error: 'Match not found' };

    await prisma.match.update({ where: { id: matchId }, data: { status: 'cancelled' } });
    await logAdminAction(request.user.walletAddress, 'cancel_match', { matchId, reason, previousStatus: match.status });
    return { success: true };
  });

  // ── UNITE adjustment ──
  app.post('/admin/users/:userId/unite-adjust', { preHandler: adminGuard }, async (request) => {
    const { userId } = request.params as { userId: string };
    const schema = z.object({ amount: z.number(), type: z.enum(['credit', 'debit']), reason: z.string().min(1).max(500) });
    const { amount, type, reason } = schema.parse(request.body);
    const adjustedAmount = type === 'credit' ? Math.abs(amount) : -Math.abs(amount);

    const tx = await prisma.uniteTransaction.create({ data: { userId, type: type === 'credit' ? 'earn_match' : 'spend_boost', amount: adjustedAmount } });
    await logAdminAction(request.user.walletAddress, 'unite_adjust', { userId, amount: adjustedAmount, reason, transactionId: tx.id });
    return { success: true, transaction: tx, adjustedAmount };
  });

  // ── List matches (admin) ──
  app.get('/admin/matches', { preHandler: adminGuard }, async (request) => {
    const { status, tradeMode, tier, limit = '50', offset = '0' } = request.query as any;
    const where: any = {};
    if (status) where.status = status;
    if (tradeMode) where.tradeMode = tradeMode;
    if (tier) where.tier = tier;

    const [matches, total] = await Promise.all([
      prisma.match.findMany({ where, take: parseInt(limit), skip: parseInt(offset), orderBy: { createdAt: 'desc' }, include: { players: { include: { user: { select: { walletAddress: true, ensName: true } } } } } }),
      prisma.match.count({ where }),
    ]);
    return { matches, total };
  });

  // ── System health ──
  app.get('/admin/system/health', { preHandler: adminGuard }, async () => {
    const checks: Record<string, any> = {};

    try { await prisma.$queryRaw`SELECT 1`; checks.database = { status: 'healthy' }; }
    catch (e: any) { checks.database = { status: 'unhealthy', error: e.message }; }

    if (isRedisAvailable()) {
      try { const start = Date.now(); await redis.ping(); checks.redis = { status: 'healthy', latencyMs: Date.now() - start }; }
      catch (e: any) { checks.redis = { status: 'unhealthy', error: e.message }; }
    } else {
      checks.redis = { status: 'unavailable', note: 'Using in-memory fallback' };
    }

    const mem = process.memoryUsage();
    checks.memory = { heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024), rssMB: Math.round(mem.rss / 1024 / 1024) };
    checks.uptime = Math.round(process.uptime());

    return { checks };
  });

  // ── Audit log ──
  app.get('/admin/audit-log', { preHandler: adminGuard }, async (request) => {
    const { limit = '100', offset = '0' } = request.query as any;

    if (isRedisAvailable()) {
      const logs = await redis.lrange('admin:audit_log', parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
      const total = await redis.llen('admin:audit_log');
      const parsed = logs.map((l: string) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      return { logs: parsed, total };
    } else {
      const sliced = memoryAuditLog.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
      const parsed = sliced.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      return { logs: parsed, total: memoryAuditLog.length };
    }
  });
}

// ── Helpers ──

async function logAdminAction(adminWallet: string, action: string, data: Record<string, any>) {
  const entry = JSON.stringify({
    action, admin: adminWallet, timestamp: new Date().toISOString(), ...data,
  });

  if (isRedisAvailable()) {
    await redis.lpush('admin:audit_log', entry);
    await redis.ltrim('admin:audit_log', 0, 9999);
  } else {
    memoryAuditLog.unshift(entry);
    if (memoryAuditLog.length > 10000) memoryAuditLog.length = 10000;
  }

  logger.info({ action, admin: adminWallet, ...data }, `Admin action: ${action}`);
}
