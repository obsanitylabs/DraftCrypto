// ═══════════════════════════════════════════════════════
// DraftCrypto Server — Auth Middleware
// ═══════════════════════════════════════════════════════

import { FastifyRequest, FastifyReply } from 'fastify';
import { ethers } from 'ethers';
import { logger } from '../lib/index.js';

export interface AuthUser {
  id: string;
  walletAddress: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; wallet: string };
    user: AuthUser;
  }
}

// Verify JWT and attach user to request
export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

// Verify wallet signature for login
export function verifyWalletSignature(
  message: string,
  signature: string,
  expectedAddress: string,
): boolean {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

// Generate nonce message for wallet to sign
export function generateAuthMessage(nonce: string): string {
  return `Sign this message to authenticate with DraftCrypto.\n\nNonce: ${nonce}`;
}
