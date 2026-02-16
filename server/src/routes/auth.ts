// ═══════════════════════════════════════════════════════
// Fantasy Crypto Server — Auth Routes
// ═══════════════════════════════════════════════════════

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma, redis, logger } from '../lib/index.js';
import { verifyWalletSignature, generateAuthMessage, authGuard } from '../middleware/auth.js';

const LoginSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string(),
  nonce: z.string(),
  walletType: z.enum(['metamask', 'walletconnect', 'phantom']).default('metamask'),
});

const ProfileUpdateSchema = z.object({
  ensName: z.string().max(100).optional(),
  xHandle: z.string().max(50).optional(),
  tgHandle: z.string().max(50).optional(),
  preferredTradeMode: z.enum(['live', 'paper']).optional(),
});

export async function authRoutes(app: FastifyInstance) {
  // ── Get nonce for wallet signature ──
  app.post('/auth/nonce', async (request) => {
    const { walletAddress } = z.object({
      walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    }).parse(request.body);

    const nonce = randomUUID();
    await redis.setex(`nonce:${walletAddress.toLowerCase()}`, 300, nonce); // 5 min TTL
    return { nonce, message: generateAuthMessage(nonce) };
  });

  // ── Login with wallet signature ──
  app.post('/auth/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body);
    const { walletAddress, signature, nonce, walletType } = body;
    const addr = walletAddress.toLowerCase();

    // Verify nonce
    const storedNonce = await redis.get(`nonce:${addr}`);
    if (!storedNonce || storedNonce !== nonce) {
      return reply.code(400).send({ error: 'Invalid or expired nonce' });
    }

    // Verify signature
    const message = generateAuthMessage(nonce);
    if (!verifyWalletSignature(message, signature, addr)) {
      return reply.code(401).send({ error: 'Invalid signature' });
    }

    // Consume nonce
    await redis.del(`nonce:${addr}`);

    // Upsert user
    const user = await prisma.user.upsert({
      where: { walletAddress: addr },
      update: { walletType, updatedAt: new Date() },
      create: { walletAddress: addr, walletType },
    });

    // Generate JWT
    const token = app.jwt.sign(
      { sub: user.id, wallet: addr },
      { expiresIn: '7d' },
    );

    return { token, user: sanitizeUser(user) };
  });

  // ── Get current user ──
  app.get('/auth/me', { preHandler: authGuard }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
    });
    if (!user) return { user: null };
    return { user: sanitizeUser(user) };
  });

  // ── Update profile ──
  app.patch('/auth/profile', { preHandler: authGuard }, async (request) => {
    const body = ProfileUpdateSchema.parse(request.body);
    const user = await prisma.user.update({
      where: { id: request.user.id },
      data: body,
    });
    return { user: sanitizeUser(user) };
  });
}

function sanitizeUser(user: any) {
  const { pearJwtEncrypted, pearRefreshTokenEncrypted, ...safe } = user;
  return safe;
}
