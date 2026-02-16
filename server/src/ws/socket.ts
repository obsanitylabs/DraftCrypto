// ═══════════════════════════════════════════════════════
// Fantasy Crypto Server — Socket.io Handler
// ═══════════════════════════════════════════════════════

import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { prisma, redis, config, logger } from '../lib/index.js';
import { tradeService } from '../services/trade.js';

interface QueueEntry {
  userId: string;
  walletAddress: string;
  socketId: string;
  joinedAt: number;
}

export function setupSocketIO(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
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
      const queueKey = `queue:h2h:${data.tradeMode}:${data.tier}:${data.matchType}`;

      const entry: QueueEntry = {
        userId: data.userId,
        walletAddress: data.walletAddress,
        socketId: socket.id,
        joinedAt: Date.now(),
      };

      // Check if someone is already waiting
      const waiting = await redis.lpop(queueKey);

      if (waiting) {
        const opponent: QueueEntry = JSON.parse(waiting);
        if (opponent.userId === data.userId) {
          // Same user — put back and wait
          await redis.lpush(queueKey, waiting);
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
        const matchPayload = {
          matchId: match.id,
          matchType: data.matchType,
          draftStartTime: match.draftStartTime,
        };

        io.to(opponent.socketId).emit('match_found', {
          ...matchPayload,
          opponent: { walletAddress: data.walletAddress },
          draftOrder: 0,
        });

        socket.emit('match_found', {
          ...matchPayload,
          opponent: { walletAddress: opponent.walletAddress },
          draftOrder: 1,
        });

        // Create draft room
        const roomId = `draft:${match.id}`;
        io.in(opponent.socketId).socketsJoin(roomId);
        socket.join(roomId);

        // Start countdown
        let countdown = config.game.draftCountdownSeconds;
        const countdownInterval = setInterval(() => {
          countdown--;
          io.to(roomId).emit('draft_countdown', { secondsRemaining: countdown });
          if (countdown <= 0) {
            clearInterval(countdownInterval);
            startDraft(io, match.id, roomId);
          }
        }, 1000);

        logger.info({ matchId: match.id }, 'Match found via queue');
      } else {
        // No opponent — add to queue
        await redis.rpush(queueKey, JSON.stringify(entry));
        // Auto-expire queue entry after 5 minutes
        await redis.expire(queueKey, 300);
        socket.emit('queue_joined', { position: 1 });
      }
    });

    // ── Leave Queue ──
    socket.on('leave_queue', async (data: { tradeMode: string; tier: string; matchType: string }) => {
      const queueKey = `queue:h2h:${data.tradeMode}:${data.tier}:${data.matchType}`;
      // Remove this socket's entry from queue
      const entries = await redis.lrange(queueKey, 0, -1);
      for (const entry of entries) {
        const parsed: QueueEntry = JSON.parse(entry);
        if (parsed.socketId === socket.id) {
          await redis.lrem(queueKey, 1, entry);
          break;
        }
      }
    });

    // ── Draft Pick ──
    socket.on('draft_pick', async (data: { matchId: string; userId: string; tokenSymbol: string }) => {
      const roomId = `draft:${data.matchId}`;

      // Get current draft state from Redis
      const stateKey = `draft:${data.matchId}:state`;
      const stateJson = await redis.get(stateKey);
      if (!stateJson) return;

      const state = JSON.parse(stateJson);
      if (state.currentPlayerId !== data.userId) return; // Not your turn

      const weight = config.game.roundWeights[state.currentRound] || 0.10;

      // Save pick to DB
      const pick = await prisma.draftPick.create({
        data: {
          matchId: data.matchId,
          userId: data.userId,
          tokenSymbol: data.tokenSymbol,
          pickRound: state.currentRound,
          pickOrder: state.currentPick,
          weight,
        },
      });

      // Broadcast to room
      io.to(roomId).emit('draft_pick_made', {
        userId: data.userId,
        token: data.tokenSymbol,
        weight,
        pickOrder: state.currentPick,
        pickId: pick.id,
      });

      // Advance state
      state.currentPick++;
      state.currentRound = Math.floor(state.currentPick / 2) + 1;
      state.pickedTokens.push(data.tokenSymbol);

      // Snake draft: alternate turns
      const totalPicks = state.matchType === 'fast' ? 2 : 16;
      if (state.currentPick >= totalPicks) {
        // Draft complete
        io.to(roomId).emit('draft_complete', {});
        await redis.del(stateKey);

        // Move match to lineup phase
        await prisma.match.update({
          where: { id: data.matchId },
          data: { status: 'lineup' },
        });
      } else {
        // Determine next player (snake order)
        const isPlayerA = isSnakePickPlayerA(state.currentPick, state.matchType);
        state.currentPlayerId = isPlayerA ? state.playerAId : state.playerBId;
        state.timeLeft = config.game.draftPickTimeSeconds;

        await redis.setex(stateKey, 3600, JSON.stringify(state));

        io.to(roomId).emit('draft_turn', {
          currentPlayer: state.currentPlayerId,
          secondsLeft: state.timeLeft,
          pickNumber: state.currentPick,
          round: state.currentRound,
        });
      }
    });

    // ── Join Match Room (for PnL updates) ──
    socket.on('join_match', (data: { matchId: string }) => {
      socket.join(`match:${data.matchId}`);
    });

    // ── Close Position ──
    socket.on('close_position', async (data: { matchId: string; pickId: string; userId: string }) => {
      try {
        const pick = await prisma.draftPick.findUnique({ where: { id: data.pickId } });
        if (!pick || pick.userId !== data.userId || pick.isClosed) return;

        // Get current price
        const prices = await tradeService.getMarketPrices([pick.tokenSymbol]);
        const currentPrice = prices[0]?.price || 0;

        await tradeService.closePosition(
          data.pickId,
          currentPrice,
          Number(pick.currentPnl),
          'user',
        );

        io.to(`match:${data.matchId}`).emit('position_closed', {
          pickId: data.pickId,
          userId: data.userId,
          realizedPnl: Number(pick.currentPnl),
        });
      } catch (err) {
        logger.error({ err, data }, 'Close position failed');
      }
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Client disconnected');
    });
  });

  return io;
}

// ── Draft Room Setup ──
async function startDraft(io: SocketServer, matchId: string, roomId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { players: { orderBy: { draftOrder: 'asc' } } },
  });
  if (!match || match.players.length < 2) return;

  const state = {
    matchId,
    matchType: match.matchType,
    currentPick: 0,
    currentRound: 1,
    totalPicks: match.matchType === 'fast' ? 2 : 16,
    currentPlayerId: match.players[0].userId,
    playerAId: match.players[0].userId,
    playerBId: match.players[1].userId,
    pickedTokens: [] as string[],
    timeLeft: config.game.draftPickTimeSeconds,
  };

  await redis.setex(`draft:${matchId}:state`, 3600, JSON.stringify(state));

  io.to(roomId).emit('draft_start', {
    matchType: match.matchType,
    totalPicks: state.totalPicks,
    firstPicker: state.currentPlayerId,
    timePerPick: config.game.draftPickTimeSeconds,
  });

  io.to(roomId).emit('draft_turn', {
    currentPlayer: state.currentPlayerId,
    secondsLeft: state.timeLeft,
    pickNumber: 0,
    round: 1,
  });

  // Timer for auto-pick
  startPickTimer(io, matchId, roomId);
}

function startPickTimer(io: SocketServer, matchId: string, roomId: string) {
  const timerKey = `draft:${matchId}:timer`;

  const interval = setInterval(async () => {
    const stateJson = await redis.get(`draft:${matchId}:state`);
    if (!stateJson) {
      clearInterval(interval);
      return;
    }

    const state = JSON.parse(stateJson);
    state.timeLeft--;

    if (state.timeLeft <= 0) {
      // Auto-pick: random available token
      // In production, pick from watchlist or top by volume
      io.to(roomId).emit('auto_pick_warning', { userId: state.currentPlayerId });
      // The client should handle auto-pick, or server forces one
    }

    await redis.setex(`draft:${matchId}:state`, 3600, JSON.stringify(state));
  }, 1000);

  redis.set(timerKey, 'active', 'EX', 3600);
}

function isSnakePickPlayerA(pickIndex: number, matchType: string): boolean {
  if (matchType === 'fast') return pickIndex === 0;
  const snakeA = new Set([0, 3, 4, 7, 8, 11, 12, 15]);
  return snakeA.has(pickIndex);
}
