// ═══════════════════════════════════════════════════════
// Fantasy Crypto Server — Settlement Service
// ═══════════════════════════════════════════════════════

import { prisma, config, logger } from '../lib/index.js';

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

    // Calculate final PnL for each player
    const playerPnls = new Map<string, number>();

    for (const player of match.players) {
      const picks = match.picks.filter(p => p.userId === player.userId);
      let totalPnl = 0;

      for (const pick of picks) {
        if (pick.positionType === 'bench') continue;
        const pnl = Number(pick.realizedPnl ?? pick.currentPnl ?? 0);
        totalPnl += pnl * Number(pick.weight);
      }

      playerPnls.set(player.userId, totalPnl);
      await prisma.matchPlayer.update({
        where: { matchId_userId: { matchId, userId: player.userId } },
        data: { totalPnl },
      });
    }

    // Determine winner (highest weighted PnL %)
    let winnerId: string | null = null;
    let bestPnl = -Infinity;

    for (const [userId, pnl] of playerPnls) {
      if (pnl > bestPnl) {
        bestPnl = pnl;
        winnerId = userId;
      }
    }

    // Handle tie — first player to achieve PnL wins (fallback: player1)
    if (winnerId) {
      await prisma.matchPlayer.update({
        where: { matchId_userId: { matchId, userId: winnerId } },
        data: { isWinner: true },
      });
    }

    // Distribute UNITE rewards
    const rewardMultiplier = match.tradeMode === 'paper'
      ? config.game.paperRewardMultiplier
      : 1;

    for (const player of match.players) {
      const isWinner = player.userId === winnerId;
      const reward = isWinner
        ? config.game.uniteRewards.winH2h * rewardMultiplier
        : config.game.uniteRewards.participation * rewardMultiplier;

      if (reward > 0) {
        await prisma.uniteTransaction.create({
          data: {
            userId: player.userId,
            type: isWinner ? 'earn_match' : 'earn_match',
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
      { matchId, winnerId, playerPnls: Object.fromEntries(playerPnls) },
      'Match settled',
    );

    // TODO: If live mode, trigger FantasyCryptoVault.settleMatch on-chain
  }

  // Close expired matches (called by BullMQ job)
  async processExpiredMatches(): Promise<void> {
    const expired = await prisma.match.findMany({
      where: {
        status: 'active',
        matchEndTime: { lte: new Date() },
      },
    });

    for (const match of expired) {
      try {
        await this.settleMatch(match.id);
      } catch (err) {
        logger.error({ matchId: match.id, err }, 'Settlement failed');
      }
    }

    if (expired.length > 0) {
      logger.info({ count: expired.length }, 'Processed expired matches');
    }
  }
}

export const settlementService = new SettlementService();
