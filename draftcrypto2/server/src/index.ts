// ═══════════════════════════════════════════════════════
// DraftCrypto Server — Entry Point
// ═══════════════════════════════════════════════════════

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { createServer } from 'http';
import { prisma, connectRedis, isRedisAvailable, config, logger } from './lib/index.js';
import { authRoutes } from './routes/auth.js';
import { matchRoutes } from './routes/matches.js';
import { leaderboardRoutes, uniteRoutes } from './routes/leaderboard.js';
import { adminRoutes } from './routes/admin.js';
import { tokenRoutes } from './routes/tokens.js';
import { setupSocketIO } from './ws/socket.js';
import { startWorkers, scheduleJobs } from './jobs/index.js';

async function main() {
  // ── Fastify ──
  const app = Fastify({
    logger: false, // using pino directly
  });

  await app.register(cors, {
    origin: config.corsOrigin.split(',').map(s => s.trim()),
    credentials: true,
  });

  await app.register(jwt, {
    secret: config.jwtSecret,
    formatUser(payload: any) {
      return { id: payload.sub, walletAddress: payload.wallet };
    },
  });

  // ── Rate Limiting ──
  await app.register(rateLimit, {
    global: true,
    max: 100,            // 100 requests per window per IP
    timeWindow: '1 minute',
    // Tighter limits on mutation endpoints added per-route
  });

  // ── Routes ──
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(matchRoutes, { prefix: '/api' });
  await app.register(leaderboardRoutes, { prefix: '/api' });
  await app.register(uniteRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api' });
  await app.register(tokenRoutes, { prefix: '/api' });

  // ── Health check ──
  app.get('/api/health', async () => ({
    status: 'ok',
    version: '0.3.0',
    mode: 'paper-preview',
    uptime: process.uptime(),
    redis: isRedisAvailable(),
  }));

  // ── Create HTTP server for Socket.io ──
  const httpServer = createServer(app.server);

  // ── Socket.io ──
  const io = setupSocketIO(httpServer);

  // ── Redis + BullMQ Workers (optional) ──
  const redisOk = await connectRedis();
  if (redisOk) {
    startWorkers(io);
    await scheduleJobs();
    logger.info('Redis connected, workers started');
  } else {
    // Start fallback polling even without Redis
    startWorkers(io);
    logger.info('Running without Redis — in-memory queue, fallback polling');
  }

  // ── Prisma connect ──
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err) {
    logger.error({ err }, 'Database connection failed — exiting');
    process.exit(1);
  }

  // ── Start ──
  await app.listen({ port: config.port, host: '0.0.0.0' });
  logger.info({ port: config.port }, `DraftCrypto server running (paper preview v0.3.0)`);

  // ── Graceful shutdown ──
  const shutdown = async () => {
    logger.info('Shutting down...');
    await app.close();
    await prisma.$disconnect();
    if (isRedisAvailable()) {
      const { redis } = await import('./lib/index.js');
      redis.disconnect();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error(err, 'Server startup failed');
  process.exit(1);
});
