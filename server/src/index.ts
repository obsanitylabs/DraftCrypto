// ═══════════════════════════════════════════════════════
// Fantasy Crypto Server — Entry Point
// ═══════════════════════════════════════════════════════

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { createServer } from 'http';
import { prisma, redis, config, logger } from './lib/index.js';
import { authRoutes } from './routes/auth.js';
import { matchRoutes } from './routes/matches.js';
import { leaderboardRoutes, uniteRoutes } from './routes/leaderboard.js';
import { adminRoutes } from './routes/admin.js';
import { setupSocketIO } from './ws/socket.js';
import { startWorkers, scheduleJobs } from './jobs/index.js';

async function main() {
  // ── Fastify ──
  const app = Fastify({
    logger: false, // using pino directly
  });

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(jwt, {
    secret: config.jwtSecret,
    formatUser(payload: any) {
      return { id: payload.sub, walletAddress: payload.wallet };
    },
  });

  // ── Routes ──
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(matchRoutes, { prefix: '/api' });
  await app.register(leaderboardRoutes, { prefix: '/api' });
  await app.register(uniteRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api' });

  // ── Health check ──
  app.get('/api/health', async () => ({
    status: 'ok',
    version: '0.1.0',
    uptime: process.uptime(),
  }));

  // ── Create HTTP server for Socket.io ──
  const httpServer = createServer(app.server);

  // ── Socket.io ──
  const io = setupSocketIO(httpServer);

  // ── BullMQ Workers ──
  try {
    await redis.connect();
    startWorkers(io);
    await scheduleJobs();
    logger.info('Redis connected, workers started');
  } catch (err) {
    logger.warn({ err }, 'Redis not available — running without queues');
  }

  // ── Prisma connect ──
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err) {
    logger.warn({ err }, 'Database not available — some features disabled');
  }

  // ── Start ──
  await app.listen({ port: config.port, host: '0.0.0.0' });
  logger.info({ port: config.port }, `Fantasy Crypto server running`);

  // ── Graceful shutdown ──
  const shutdown = async () => {
    logger.info('Shutting down...');
    await app.close();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error(err, 'Server startup failed');
  process.exit(1);
});
