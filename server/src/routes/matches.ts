// ═══════════════════════════════════════════════════════
// Fantasy Crypto Server — Match Routes
// ═══════════════════════════════════════════════════════

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, config, logger } from '../lib/index.js';
import { authGuard } from '../middleware/auth.js';

const CreateMatchSchema = z.object({
  matchType: z.enum(['fast', 'full']),
  tradeMode: z.enum(['live', 'paper']),
  tier: z.enum(['fun', 'serious', 'whale']),
  duration: z.enum(['1D', '3D', '1W']),
  mode: z.enum(['h2h', 'league']).default('h2h'),
});

const SubmitLineupSchema = z.object({
  picks: z.array(z.object({
    pickId: z.string().uuid(),
    positionType: z.enum(['long', 'short', 'bench']),
    boostMultiplier: z.number().int().min(1).max(3).default(1),
    tpPercent: z.number().optional(),
    slPercent: z.number().optional(),
  })),
});

export async function matchRoutes(app: FastifyInstance) {
  // ── Create match ──
  app.post('/matches', { preHandler: authGuard }, async (request, reply) => {
    const body = CreateMatchSchema.parse(request.body);
    const userId = request.user.id;

    const tierConfig = config.game.tiers[body.tier];
    if (!tierConfig) return reply.code(400).send({ error: 'Invalid tier' });

    const durationHours = config.game.durations[body.duration];

    const match = await prisma.match.create({
      data: {
        matchType: body.matchType,
        tradeMode: body.tradeMode,
        mode: body.mode,
        tier: body.tier,
        status: 'matching',
        wagerAmountUsdc: body.tradeMode === 'live' ? tierConfig.wager : null,
        durationHours,
        players: {
          create: { userId, draftOrder: 0 },
        },
      },
      include: { players: { include: { user: true } } },
    });

    logger.info({ matchId: match.id, userId, tier: body.tier }, 'Match created');
    return { match };
  });

  // ── Join match ──
  app.post('/matches/:matchId/join', { preHandler: authGuard }, async (request, reply) => {
    const { matchId } = z.object({ matchId: z.string().uuid() }).parse(request.params);
    const userId = request.user.id;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { players: true },
    });

    if (!match) return reply.code(404).send({ error: 'Match not found' });
    if (match.status !== 'matching') return reply.code(400).send({ error: 'Match not joinable' });
    if (match.players.some(p => p.userId === userId)) return reply.code(400).send({ error: 'Already in match' });
    if (match.players.length >= 2) return reply.code(400).send({ error: 'Match full' });

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'drafting',
        draftStartTime: new Date(Date.now() + config.game.draftCountdownSeconds * 1000),
        players: {
          create: { userId, draftOrder: 1 },
        },
      },
      include: { players: { include: { user: true } } },
    });

    logger.info({ matchId, userId }, 'Player joined match');
    return { match: updated };
  });

  // ── List open matches ──
  app.get('/matches', async (request) => {
    const { tradeMode, tier, mode } = z.object({
      tradeMode: z.enum(['live', 'paper']).optional(),
      tier: z.enum(['fun', 'serious', 'whale']).optional(),
      mode: z.enum(['h2h', 'league']).optional(),
    }).parse(request.query);

    const matches = await prisma.match.findMany({
      where: {
        status: 'matching',
        ...(tradeMode && { tradeMode }),
        ...(tier && { tier }),
        ...(mode && { mode }),
      },
      include: {
        players: { include: { user: { select: { id: true, walletAddress: true, ensName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { matches };
  });

  // ── Get match details ──
  app.get('/matches/:matchId', async (request) => {
    const { matchId } = z.object({ matchId: z.string().uuid() }).parse(request.params);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        players: { include: { user: { select: { id: true, walletAddress: true, ensName: true } } } },
        picks: { orderBy: { pickOrder: 'asc' } },
      },
    });

    if (!match) return { error: 'Not found' };
    return { match };
  });

  // ── Submit lineup (after draft) ──
  app.post('/matches/:matchId/lineup', { preHandler: authGuard }, async (request, reply) => {
    const { matchId } = z.object({ matchId: z.string().uuid() }).parse(request.params);
    const body = SubmitLineupSchema.parse(request.body);
    const userId = request.user.id;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { players: true },
    });

    if (!match) return reply.code(404).send({ error: 'Match not found' });
    if (match.status !== 'lineup' && match.status !== 'drafting') {
      return reply.code(400).send({ error: 'Not in lineup phase' });
    }

    // Update each pick
    for (const pick of body.picks) {
      await prisma.draftPick.update({
        where: { id: pick.pickId },
        data: {
          positionType: pick.positionType,
          boostMultiplier: pick.boostMultiplier,
          tpPercent: pick.tpPercent,
          slPercent: pick.slPercent,
        },
      });
    }

    // Check if both players have submitted lineups
    const allPicks = await prisma.draftPick.findMany({ where: { matchId } });
    const player1Picks = allPicks.filter(p => match.players[0] && p.userId === match.players[0].userId);
    const player2Picks = allPicks.filter(p => match.players[1] && p.userId === match.players[1].userId);
    const p1Ready = player1Picks.every(p => p.positionType !== null);
    const p2Ready = player2Picks.every(p => p.positionType !== null);

    if (p1Ready && p2Ready) {
      const now = new Date();
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'active',
          matchStartTime: now,
          matchEndTime: new Date(now.getTime() + match.durationHours * 3600 * 1000),
        },
      });
    }

    logger.info({ matchId, userId, picksCount: body.picks.length }, 'Lineup submitted');
    return { success: true };
  });

  // ── Get user's active matches ──
  app.get('/matches/my/active', { preHandler: authGuard }, async (request) => {
    const userId = request.user.id;

    const matches = await prisma.match.findMany({
      where: {
        status: { in: ['matching', 'drafting', 'lineup', 'active'] },
        players: { some: { userId } },
      },
      include: {
        players: { include: { user: { select: { id: true, walletAddress: true, ensName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { matches };
  });

  // ── Get user's match history ──
  app.get('/matches/my/history', { preHandler: authGuard }, async (request) => {
    const userId = request.user.id;
    const { limit, offset } = z.object({
      limit: z.coerce.number().int().min(1).max(50).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(request.query);

    const matches = await prisma.match.findMany({
      where: {
        status: { in: ['settled', 'cancelled'] },
        players: { some: { userId } },
      },
      include: {
        players: { include: { user: { select: { id: true, walletAddress: true, ensName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return { matches };
  });
}
