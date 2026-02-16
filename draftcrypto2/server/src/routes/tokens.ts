// ═══════════════════════════════════════════════════════
// DraftCrypto Server — Token Routes
// ═══════════════════════════════════════════════════════

import { FastifyInstance } from 'fastify';
import { tradeService } from '../services/trade.js';

export async function tokenRoutes(app: FastifyInstance) {
  // ── Get draftable tokens with live prices ──
  app.get('/tokens', async () => {
    const tokens = await tradeService.getDraftTokenList();
    return { tokens };
  });

  // ── Get prices for specific tokens ──
  app.get('/tokens/prices', async (request) => {
    const { symbols } = request.query as { symbols?: string };
    const list = symbols ? symbols.split(',').map(s => s.trim().toUpperCase()) : [];
    if (list.length === 0) {
      const tokens = await tradeService.getDraftTokenList();
      return { prices: tokens };
    }
    const prices = await tradeService.getMarketPrices(list);
    return { prices };
  });
}
