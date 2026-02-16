// ═══════════════════════════════════════════════════════
// Fantasy Crypto Server — BullMQ Jobs
// ═══════════════════════════════════════════════════════

import { Queue, Worker, Job } from 'bullmq';
import { Server as SocketServer } from 'socket.io';
import { redis, prisma, logger } from '../lib/index.js';
import { tradeService } from '../services/trade.js';
import { settlementService } from '../services/settlement.js';

// ── Queue Definitions ──
export const pnlQueue = new Queue('pnl-updates', { connection: redis });
export const settlementQueue = new Queue('settlement', { connection: redis });
export const leaderboardQueue = new Queue('leaderboard', { connection: redis });

// ── Start Workers ──
export function startWorkers(io: SocketServer) {
  // ═══ PnL Update Worker ═══
  // Runs every 60s for active paper matches, broadcasts to match rooms
  const pnlWorker = new Worker('pnl-updates', async (job: Job) => {
    const { matchId } = job.data;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { players: true },
    });

    if (!match || match.status !== 'active') return;

    // Calculate PnL for each player
    const pnlResults: Record<string, { totalPnl: number; positions: any[] }> = {};

    for (const player of match.players) {
      const result = await tradeService.calculatePnl(matchId, player.userId);
      pnlResults[player.userId] = result;

      // Update match player PnL
      await prisma.matchPlayer.update({
        where: { matchId_userId: { matchId, userId: player.userId } },
        data: { totalPnl: result.totalPnl },
      });

      // Snapshot for history
      await prisma.pnlSnapshot.create({
        data: {
          time: new Date(),
          matchId,
          userId: player.userId,
          totalPnl: result.totalPnl,
        },
      });
    }

    // Broadcast to match room
    const roomId = `match:${matchId}`;
    for (const player of match.players) {
      const opponent = match.players.find(p => p.userId !== player.userId);
      const myPnl = pnlResults[player.userId];
      const oppPnl = opponent ? pnlResults[opponent.userId] : null;

      // Emit personalized PnL to each player's socket
      io.to(roomId).emit('pnl_update', {
        matchId,
        players: match.players.map(p => ({
          userId: p.userId,
          totalPnl: pnlResults[p.userId]?.totalPnl || 0,
          positions: pnlResults[p.userId]?.positions || [],
        })),
      });
    }
  }, { connection: redis, concurrency: 10 });

  // ═══ Settlement Worker ═══
  const settlementWorker = new Worker('settlement', async (job: Job) => {
    if (job.name === 'check-expired') {
      await settlementService.processExpiredMatches();
    } else if (job.name === 'settle-match') {
      await settlementService.settleMatch(job.data.matchId);
    }
  }, { connection: redis, concurrency: 5 });

  // ═══ Leaderboard Worker ═══
  const leaderboardWorker = new Worker('leaderboard', async (job: Job) => {
    // Recalculate weekly leaderboard and distribute UNITE rewards
    if (job.name === 'weekly-rewards') {
      logger.info('Processing weekly leaderboard rewards');

      const oneWeekAgo = new Date(Date.now() - 7 * 86400_000);
      const topPlayers = await prisma.matchPlayer.groupBy({
        by: ['userId'],
        where: {
          isWinner: true,
          match: { status: 'settled', createdAt: { gte: oneWeekAgo } },
        },
        _sum: { totalPnl: true },
        orderBy: { _sum: { totalPnl: 'desc' } },
        take: 10,
      });

      for (const [i, player] of topPlayers.entries()) {
        const reward = i === 0 ? 2500 : i <= 2 ? 1500 : 500;
        await prisma.uniteTransaction.create({
          data: {
            userId: player.userId,
            type: 'earn_leaderboard',
            amount: reward,
          },
        });
      }

      logger.info({ topPlayerCount: topPlayers.length }, 'Weekly rewards distributed');
    }
  }, { connection: redis });

  // ── Error handlers ──
  for (const worker of [pnlWorker, settlementWorker, leaderboardWorker]) {
    worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err: err.message }, 'Job failed');
    });
  }

  logger.info('BullMQ workers started');
}

// ── Schedule Recurring Jobs ──
export async function scheduleJobs() {
  // Check for expired matches every 30 seconds
  await settlementQueue.add('check-expired', {}, {
    repeat: { every: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  // Weekly leaderboard rewards (Sunday midnight UTC)
  await leaderboardQueue.add('weekly-rewards', {}, {
    repeat: { pattern: '0 0 * * 0' }, // cron: every Sunday at 00:00
    removeOnComplete: 10,
  });

  logger.info('Recurring jobs scheduled');
}

// ── Schedule PnL updates for a match ──
export async function schedulePnlUpdates(matchId: string, intervalMs: number = 60_000) {
  await pnlQueue.add(
    `pnl:${matchId}`,
    { matchId },
    {
      repeat: { every: intervalMs },
      removeOnComplete: 100,
      removeOnFail: 20,
      jobId: `pnl-repeat:${matchId}`,
    },
  );
}

// ── Stop PnL updates for a match ──
export async function stopPnlUpdates(matchId: string) {
  const repeatableJobs = await pnlQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.id === `pnl-repeat:${matchId}`) {
      await pnlQueue.removeRepeatableByKey(job.key);
    }
  }
}
