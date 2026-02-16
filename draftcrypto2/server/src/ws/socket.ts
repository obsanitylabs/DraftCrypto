// ═══════════════════════════════════════════════════════
// DraftCrypto Server — Socket.io Handler
// ═══════════════════════════════════════════════════════

import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { prisma, queueStore, config, logger } from '../lib/index.js';
import { tradeService } from '../services/trade.js';

interface QueueEntry {
  userId: string;
  walletAddress: string;
  socketId: string;
  joinedAt: number;
}

export function setupSocketIO(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.corsOrigin.split(',').map(s => s.trim()),
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id }, 'Client connected');

    // ── Join Matchmaking Queue ──
    socket.on('join_queue', async (data: {
      userId: string;
      walletAddress: string;
      tradeMode: string;
      tier: string;
      matchType: string;
      duration: string;
    }) => {
      // Validate matchType
      const matchConfig = config.game.matchTypes[data.matchType];
      if (!matchConfig) {
        socket.emit('error', { message: `Invalid match type: ${data.matchType}` });
        return;
      }

      const queueKey = `queue:h2h:${data.tradeMode}:${data.tier}:${data.matchType}`;

      const entry: QueueEntry = {
        userId: data.userId,
        walletAddress: data.walletAddress,
        socketId: socket.id,
        joinedAt: Date.now(),
      };

      // Check if someone is already waiting
      const waiting = await queueStore.lpop(queueKey);

      if (waiting) {
        const opponent: QueueEntry = JSON.parse(waiting);
        if (opponent.userId === data.userId) {
          // Same user — put back and wait
          await queueStore.lpush(queueKey, waiting);
          return;
        }

        // Match found! Create match in DB
        const tierConfig = config.game.tiers[data.tier];
        const durationHours = config.game.durations[data.duration] || 24;

        const match = await prisma.match.create({
          data: {
            matchType: data.matchType,
            tradeMode: data.tradeMode,
            mode: 'h2h',
            tier: data.tier,
            status: 'drafting',
            wagerAmountUsdc: data.tradeMode === 'live' ? tierConfig?.wager : null,
            durationHours,
            draftStartTime: new Date(Date.now() + config.game.draftCountdownSeconds * 1000),
            players: {
              createMany: {
                data: [
                  { userId: opponent.userId, draftOrder: 0 },
                  { userId: data.userId, draftOrder: 1 },
                ],
              },
            },
          },
        });

        // Notify both players
        const matchData = {
          matchId: match.id,
          matchType: data.matchType,
          tradeMode: data.tradeMode,
          tier: data.tier,
          duration: data.duration,
          draftStartsAt: match.draftStartTime,
          totalPicks: matchConfig.totalPicks,
        };

        io.to(opponent.socketId).emit('match_found', {
          ...matchData,
          opponentAddress: data.walletAddress,
          draftOrder: 0,
        });

        io.to(socket.id).emit('match_found', {
          ...matchData,
          opponentAddress: opponent.walletAddress,
          draftOrder: 1,
        });

        logger.info({ matchId: match.id, p1: opponent.userId, p2: data.userId }, 'Match created via queue');
      } else {
        // No one waiting — add to queue
        await queueStore.lpush(queueKey, JSON.stringify(entry));
        socket.emit('queue_joined', { position: 1, queueKey });
        logger.info({ userId: data.userId, queueKey }, 'Player joined queue');
      }
    });

    // ── Leave Queue ──
    socket.on('leave_queue', async () => {
      socket.emit('queue_left');
    });

    // ── Join Match Room ──
    socket.on('join_match', async (data: { matchId: string; userId: string }) => {
      socket.join(`match:${data.matchId}`);
      socket.data.matchId = data.matchId;
      socket.data.userId = data.userId;
      logger.info({ matchId: data.matchId, userId: data.userId }, 'Joined match room');

      socket.to(`match:${data.matchId}`).emit('player_joined', {
        userId: data.userId,
      });
    });

    // ── Draft Pick (with server-side validation) ──
    socket.on('draft_pick', async (data: {
      matchId: string;
      userId: string;
      tokenSymbol: string;
    }) => {
      try {
        const match = await prisma.match.findUnique({
          where: { id: data.matchId },
          include: { players: true },
        });

        if (!match || match.status !== 'drafting') {
          socket.emit('error', { message: 'Match not in drafting phase' });
          return;
        }

        const matchConfig = config.game.matchTypes[match.matchType];
        if (!matchConfig) {
          socket.emit('error', { message: 'Invalid match type configuration' });
          return;
        }

        // Validate user is a player in this match
        const isPlayer = match.players.some(p => p.userId === data.userId);
        if (!isPlayer) {
          socket.emit('error', { message: 'You are not a player in this match' });
          return;
        }

        // Validate token is in the draftable pool
        if (!config.game.draftTokens.includes(data.tokenSymbol)) {
          socket.emit('error', { message: `${data.tokenSymbol} is not a draftable token` });
          return;
        }

        // Get existing picks for this match
        const existingPicks = await prisma.draftPick.findMany({
          where: { matchId: data.matchId },
        });

        // FIX: Check if token has already been drafted by ANYONE in this match
        const alreadyDrafted = existingPicks.some(p => p.tokenSymbol === data.tokenSymbol);
        if (alreadyDrafted) {
          socket.emit('error', { message: `${data.tokenSymbol} has already been drafted` });
          return;
        }

        // FIX: Check if this player has reached their pick limit
        const playerPicks = existingPicks.filter(p => p.userId === data.userId);
        if (playerPicks.length >= matchConfig.picksPerPlayer) {
          socket.emit('error', { message: 'You have already used all your draft picks' });
          return;
        }

        // FIX: Server-side round and weight assignment based on actual pick sequence
        // Total pick count determines which "round" we're in
        const totalPicksSoFar = existingPicks.length;
        const playerPickNumber = playerPicks.length + 1; // this player's Nth pick (1-indexed)
        const globalPickOrder = totalPicksSoFar + 1;

        // Weight is assigned by the player's pick number, not client-provided round
        const weight = config.game.roundWeights[playerPickNumber] || 0.10;

        // Create draft pick in DB
        const pick = await prisma.draftPick.create({
          data: {
            matchId: data.matchId,
            userId: data.userId,
            tokenSymbol: data.tokenSymbol,
            pickRound: playerPickNumber,
            pickOrder: globalPickOrder,
            weight,
          },
        });

        // Broadcast to match room
        io.to(`match:${data.matchId}`).emit('pick_made', {
          pickId: pick.id,
          userId: data.userId,
          tokenSymbol: data.tokenSymbol,
          pickRound: playerPickNumber,
          pickOrder: globalPickOrder,
          weight,
        });

        // Check if draft is complete
        const newTotalPicks = totalPicksSoFar + 1;

        if (newTotalPicks >= matchConfig.totalPicks) {
          await prisma.match.update({
            where: { id: data.matchId },
            data: { status: 'lineup' },
          });

          io.to(`match:${data.matchId}`).emit('draft_complete', {
            matchId: data.matchId,
          });

          logger.info({ matchId: data.matchId, totalPicks: newTotalPicks }, 'Draft complete');
        }
      } catch (err) {
        logger.error({ err, data }, 'Draft pick failed');
        socket.emit('error', { message: 'Draft pick failed' });
      }
    });

    // ── Submit Lineup ──
    socket.on('submit_lineup', async (data: {
      matchId: string;
      userId: string;
      picks: Array<{
        pickId: string;
        positionType: 'long' | 'short' | 'bench';
        boostMultiplier?: number;
        tpPercent?: number;
        slPercent?: number;
      }>;
    }) => {
      try {
        // Validate the user owns these picks
        for (const pick of data.picks) {
          const dbPick = await prisma.draftPick.findFirst({
            where: { id: pick.pickId, matchId: data.matchId, userId: data.userId },
          });
          if (!dbPick) {
            socket.emit('error', { message: `Invalid pick: ${pick.pickId}` });
            return;
          }
        }

        // Update each pick
        for (const pick of data.picks) {
          await prisma.draftPick.update({
            where: { id: pick.pickId },
            data: {
              positionType: pick.positionType,
              boostMultiplier: pick.boostMultiplier || 1,
              tpPercent: pick.tpPercent,
              slPercent: pick.slPercent,
            },
          });
        }

        // Check if both players have submitted
        const match = await prisma.match.findUnique({
          where: { id: data.matchId },
          include: { players: true, picks: true },
        });

        if (!match) return;

        const p1Picks = match.picks.filter(p => p.userId === match.players[0]?.userId);
        const p2Picks = match.picks.filter(p => p.userId === match.players[1]?.userId);
        const p1Ready = p1Picks.length > 0 && p1Picks.every(p => p.positionType !== null);
        const p2Ready = p2Picks.length > 0 && p2Picks.every(p => p.positionType !== null);

        // Notify room this player is ready
        io.to(`match:${data.matchId}`).emit('lineup_submitted', {
          userId: data.userId,
        });

        if (p1Ready && p2Ready) {
          const now = new Date();
          await prisma.match.update({
            where: { id: data.matchId },
            data: {
              status: 'active',
              matchStartTime: now,
              matchEndTime: new Date(now.getTime() + match.durationHours * 3600 * 1000),
            },
          });

          // Execute paper trades (snapshot entry prices)
          for (const player of match.players) {
            await tradeService.executeLineup(data.matchId, player.userId);
          }

          io.to(`match:${data.matchId}`).emit('match_started', {
            matchId: data.matchId,
            matchStartTime: now.toISOString(),
            matchEndTime: new Date(now.getTime() + match.durationHours * 3600 * 1000).toISOString(),
          });

          logger.info({ matchId: data.matchId }, 'Match started (paper mode)');
        }
      } catch (err) {
        logger.error({ err }, 'Lineup submission failed');
        socket.emit('error', { message: 'Lineup submission failed' });
      }
    });

    // ── Request PnL Update ──
    socket.on('request_pnl', async (data: { matchId: string }) => {
      try {
        const match = await prisma.match.findUnique({
          where: { id: data.matchId },
          include: { players: true },
        });

        if (!match || match.status !== 'active') return;

        const pnlResults: Record<string, any> = {};
        for (const player of match.players) {
          pnlResults[player.userId] = await tradeService.calculatePnl(data.matchId, player.userId);
        }

        socket.emit('pnl_update', { matchId: data.matchId, pnl: pnlResults });
      } catch (err) {
        logger.error({ err }, 'PnL request failed');
      }
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Client disconnected');
    });
  });

  return io;
}
