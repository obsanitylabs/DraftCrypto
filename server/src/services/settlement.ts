// ═══════════════════════════════════════════════════════
// DraftCrypto Server — Settlement Service
// ═══════════════════════════════════════════════════════

import { prisma, config, logger } from '../lib/index.js';
import { tradeService } from './trade.js';

export class SettlementService {
  // Called when match duration expires or all positions closed
  async settleMatch(matchId: string): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        players: true,
        picks: true,
      },
    });

    if (!match || match.status !== 'active') {
      logger.warn({ matchId }, 'Cannot settle — not active');
      return;
    }

    // Update to settling
    await prisma.match.update({
      where: { id: matchId },
      data: { status: 'settling' },
    });

    // FIX: Close all open positions at current market prices FIRST
    // This ensures settlement uses live prices, not stale PnL snapshots
    await tradeService.closeAllPositions(matchId);

    // Reload picks with realized PnL after closing
    const freshPicks = await prisma.draftPick.findMany({
      where: { matchId },
    });

    // Calculate final normalized PnL for each player
    const playerPnls = new Map<string, number>();

    for (const player of match.players) {
      const playerPicks = freshPicks.filter(
        p => p.userId === player.userId && p.positionType !== 'bench'
      );

      let weightedPnlSum = 0;
      let totalWeight = 0;

      for (const pick of playerPicks) {
        const pnl = Number(pick.realizedPnl ?? pick.currentPnl ?? 0);
        const weight = Number(pick.weight);
        weightedPnlSum += pnl * weight;
        totalWeight += weight;
      }

      // Normalize by total weight — consistent with frontend and trade service
      const normalizedPnl = totalWeight > 0 ? weightedPnlSum / totalWeight : 0;

      playerPnls.set(player.userId, normalizedPnl);
      await prisma.matchPlayer.update({
        where: { matchId_userId: { matchId, userId: player.userId } },
        data: { totalPnl: normalizedPnl },
      });
    }

    // Determine winner (highest normalized weighted PnL %)
    let winnerId: string | null = null;
    let bestPnl = -Infinity;

    for (const [userId, pnl] of playerPnls) {
      if (pnl > bestPnl) {
        bestPnl = pnl;
        winnerId = userId;
      }
    }

    // Check for draw (equal PnL within 0.01% tolerance)
    const pnlValues = Array.from(playerPnls.values());
    const isDraw = pnlValues.length === 2 &&
      Math.abs(pnlValues[0] - pnlValues[1]) < 0.01;

    if (isDraw) {
      winnerId = null; // draw — no winner
    }

    // Mark winner
    if (winnerId) {
      await prisma.matchPlayer.update({
        where: { matchId_userId: { matchId, userId: winnerId } },
        data: { isWinner: true },
      });
    }

    // Distribute UNITE rewards (paper mode = 10% of normal)
    const rewardMultiplier = match.tradeMode === 'paper'
      ? config.game.paperRewardMultiplier
      : 1;

    for (const player of match.players) {
      const isWinner = player.userId === winnerId;
      const reward = Math.floor(
        (isWinner
          ? config.game.uniteRewards.winH2h
          : config.game.uniteRewards.participation
        ) * rewardMultiplier
      );

      if (reward > 0) {
        await prisma.uniteTransaction.create({
          data: {
            userId: player.userId,
            type: 'earn_match',
            amount: reward,
            matchId,
          },
        });
      }
    }

    // Finalize match
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'settled',
        winnerId,
      },
    });

    logger.info(
      { matchId, winnerId, isDraw, playerPnls: Object.fromEntries(playerPnls) },
      'Match settled',
    );
  }

  // Close expired matches (called by BullMQ job or manual poll)
  async processExpiredMatches(): Promise<number> {
    const expired = await prisma.match.findMany({
      where: {
        status: 'active',
        matchEndTime: { lte: new Date() },
      },
    });

    let settled = 0;
    for (const match of expired) {
      try {
        await this.settleMatch(match.id);
        settled++;
      } catch (err) {
        logger.error({ matchId: match.id, err }, 'Settlement failed');
      }
    }

    if (expired.length > 0) {
      logger.info({ count: expired.length, settled }, 'Processed expired matches');
    }

    return settled;
  }

  // Cancel stale matches (stuck in matching/drafting for too long)
  async cancelStaleMatches(): Promise<number> {
    const timeout = config.game.staleMatchTimeoutMinutes;
    const cutoff = new Date(Date.now() - timeout * 60 * 1000);

    const stale = await prisma.match.findMany({
      where: {
        status: { in: ['matching', 'drafting', 'lineup'] },
        createdAt: { lte: cutoff },
      },
    });

    let cancelled = 0;
    for (const match of stale) {
      try {
        await prisma.match.update({
          where: { id: match.id },
          data: { status: 'cancelled' },
        });
        cancelled++;
      } catch (err) {
        logger.error({ matchId: match.id, err }, 'Stale match cancellation failed');
      }
    }

    if (stale.length > 0) {
      logger.info({ count: stale.length, cancelled, timeoutMinutes: timeout }, 'Cancelled stale matches');
    }

    return cancelled;
  }
}

export const settlementService = new SettlementService();
