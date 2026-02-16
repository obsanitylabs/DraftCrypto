// ═══════════════════════════════════════════════════════
// DraftCrypto Server — BullMQ Jobs (with fallback polling)
// ═══════════════════════════════════════════════════════

import { Queue, Worker, Job } from 'bullmq';
import { Server as SocketServer } from 'socket.io';
import { redis, prisma, isRedisAvailable, logger } from '../lib/index.js';
import { tradeService } from '../services/trade.js';
import { settlementService } from '../services/settlement.js';

// Queue definitions (only used when Redis available)
let pnlQueue: Queue | null = null;
let settlementQueue: Queue | null = null;
let leaderboardQueue: Queue | null = null;

// ── Start Workers (BullMQ — requires Redis) ──
export function startWorkers(io: SocketServer) {
  if (!isRedisAvailable()) {
    logger.info('No Redis — starting fallback polling for PnL, settlement, and stale cleanup');
    startFallbackPolling(io);
    return;
  }

  pnlQueue = new Queue('pnl-updates', { connection: redis });
  settlementQueue = new Queue('settlement', { connection: redis });
  leaderboardQueue = new Queue('leaderboard', { connection: redis });

  // ═══ PnL Update Worker ═══
  const pnlWorker = new Worker('pnl-updates', async (job: Job) => {
    const { matchId } = job.data;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { players: true },
    });

    if (!match || match.status !== 'active') return;

    const pnlResults: Record<string, { totalPnl: number; positions: any[] }> = {};

    for (const player of match.players) {
      const result = await tradeService.calculatePnl(matchId, player.userId);
      pnlResults[player.userId] = result;

      await prisma.matchPlayer.update({
        where: { matchId_userId: { matchId, userId: player.userId } },
        data: { totalPnl: result.totalPnl },
      });
    }

    // Broadcast to match room
    io.to(`match:${matchId}`).emit('pnl_update', {
      matchId,
      pnl: pnlResults,
    });

    // Snapshot PnL (for charts)
    const now = new Date();
    for (const player of match.players) {
      const result = pnlResults[player.userId];
      if (result) {
        await prisma.pnlSnapshot.create({
          data: {
            time: now,
            matchId,
            userId: player.userId,
            totalPnl: result.totalPnl,
          },
        }).catch(() => {}); // ignore duplicate key
      }
    }
  }, { connection: redis, concurrency: 5 });

  // ═══ Settlement Worker ═══
  const settlementWorker = new Worker('settlement', async (job: Job) => {
    if (job.name === 'check-expired') {
      await settlementService.processExpiredMatches();
    } else if (job.name === 'settle-match') {
      await settlementService.settleMatch(job.data.matchId);
    } else if (job.name === 'cleanup-stale') {
      await settlementService.cancelStaleMatches();
    }
  }, { connection: redis });

  // ═══ Leaderboard Worker ═══
  const leaderboardWorker = new Worker('leaderboard', async (job: Job) => {
    const topPlayers = await prisma.matchPlayer.groupBy({
      by: ['userId'],
      where: { match: { status: 'settled' } },
      _sum: { totalPnl: true },
      _count: { matchId: true },
      orderBy: { _sum: { totalPnl: 'desc' } },
      take: 100,
    });

    logger.info({ count: topPlayers.length }, 'Leaderboard recalculated');
  }, { connection: redis });

  pnlWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'PnL job failed'));
  settlementWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Settlement job failed'));
}

// ── Schedule Repeating Jobs (BullMQ) ──
export async function scheduleJobs() {
  if (!isRedisAvailable() || !settlementQueue || !leaderboardQueue) return;

  // Check for expired matches every 30 seconds
  await settlementQueue.add('check-expired', {}, {
    repeat: { every: 30_000 },
    removeOnComplete: 10,
  });

  // Clean up stale matches every 5 minutes
  await settlementQueue.add('cleanup-stale', {}, {
    repeat: { every: 300_000 },
    removeOnComplete: 5,
  });

  // Update leaderboard every 5 minutes
  await leaderboardQueue.add('recalculate', {}, {
    repeat: { every: 300_000 },
    removeOnComplete: 5,
  });

  logger.info('Scheduled repeating jobs');
}

// ── Enqueue PnL update for a match ──
export async function enqueuePnlUpdate(matchId: string) {
  if (pnlQueue) {
    await pnlQueue.add('update-pnl', { matchId }, {
      removeOnComplete: 5,
      attempts: 2,
    });
  }
}

// ── Fallback Polling (no Redis) ──
function startFallbackPolling(io: SocketServer) {
  // Poll for PnL updates every 60 seconds
  setInterval(async () => {
    try {
      const activeMatches = await prisma.match.findMany({
        where: { status: 'active' },
        include: { players: true },
      });

      for (const match of activeMatches) {
        const pnlResults: Record<string, any> = {};

        for (const player of match.players) {
          const result = await tradeService.calculatePnl(match.id, player.userId);
          pnlResults[player.userId] = result;

          await prisma.matchPlayer.update({
            where: { matchId_userId: { matchId: match.id, userId: player.userId } },
            data: { totalPnl: result.totalPnl },
          });
        }

        io.to(`match:${match.id}`).emit('pnl_update', {
          matchId: match.id,
          pnl: pnlResults,
        });
      }
    } catch (err) {
      logger.error({ err }, 'Fallback PnL polling error');
    }
  }, 60_000);

  // Poll for expired matches every 30 seconds
  setInterval(async () => {
    try {
      await settlementService.processExpiredMatches();
    } catch (err) {
      logger.error({ err }, 'Fallback settlement polling error');
    }
  }, 30_000);

  // Clean up stale matches every 5 minutes
  setInterval(async () => {
    try {
      await settlementService.cancelStaleMatches();
    } catch (err) {
      logger.error({ err }, 'Fallback stale cleanup error');
    }
  }, 300_000);

  logger.info('Fallback polling started (60s PnL, 30s settlement, 5m stale cleanup)');
}
