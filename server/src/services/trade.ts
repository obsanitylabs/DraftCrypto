// ═══════════════════════════════════════════════════════
// Fantasy Crypto Server — Trade Service
// ═══════════════════════════════════════════════════════

import { prisma, config, logger } from '../lib/index.js';

interface PriceData {
  symbol: string;
  price: number;
}

export class TradeService {
  private pearBaseUrl = config.pear.baseUrl;

  // ── Execute lineup positions (after lineup submission) ──
  async executeLineup(matchId: string, userId: string): Promise<void> {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error('Match not found');

    const picks = await prisma.draftPick.findMany({
      where: { matchId, userId, positionType: { not: 'bench' } },
    });

    if (match.tradeMode === 'live') {
      await this.executeLiveTrades(userId, picks);
    } else {
      await this.executePaperTrades(picks);
    }
  }

  // ── Live: Execute via Pear Protocol ──
  private async executeLiveTrades(userId: string, picks: any[]): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.pearJwtEncrypted) {
      throw new Error('Pear authentication required for live mode');
    }

    // TODO: Decrypt JWT, call Pear market-order API
    // For each pick, create Hyperliquid position via Pear
    for (const pick of picks) {
      try {
        // const result = await pearApi.executeMarketOrder(...)
        // await prisma.draftPick.update({ where: { id: pick.id }, data: { pearPositionId: result.positionId, entryPrice: result.entryPrice } });
        logger.info({ pickId: pick.id, symbol: pick.tokenSymbol }, 'Live trade placeholder');
      } catch (err) {
        logger.error({ pickId: pick.id, err }, 'Live trade execution failed');
      }
    }
  }

  // ── Paper: Snapshot entry prices from Pear market data ──
  private async executePaperTrades(picks: any[]): Promise<void> {
    const symbols = picks.map(p => p.tokenSymbol);
    const prices = await this.getMarketPrices(symbols);

    for (const pick of picks) {
      const priceData = prices.find(p => p.symbol === pick.tokenSymbol);
      if (priceData) {
        await prisma.draftPick.update({
          where: { id: pick.id },
          data: { entryPrice: priceData.price },
        });
      }
    }

    logger.info({ count: picks.length }, 'Paper trades recorded');
  }

  // ── Calculate PnL for a match ──
  async calculatePnl(matchId: string, userId: string): Promise<{
    totalPnl: number;
    positions: Array<{ pickId: string; symbol: string; pnlPercent: number }>;
  }> {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error('Match not found');

    const picks = await prisma.draftPick.findMany({
      where: { matchId, userId, isClosed: false, positionType: { not: 'bench' } },
    });

    if (match.tradeMode === 'live') {
      return this.getLivePnl(userId, picks);
    } else {
      return this.getPaperPnl(picks);
    }
  }

  private async getLivePnl(userId: string, picks: any[]) {
    // TODO: Fetch from Pear positions API
    return { totalPnl: 0, positions: [] };
  }

  private async getPaperPnl(picks: any[]) {
    const symbols = picks.map(p => p.tokenSymbol);
    const prices = await this.getMarketPrices(symbols);
    const positions: Array<{ pickId: string; symbol: string; pnlPercent: number }> = [];
    let totalWeightedPnl = 0;

    for (const pick of picks) {
      const priceData = prices.find(p => p.symbol === pick.tokenSymbol);
      if (!priceData || !pick.entryPrice) continue;

      const entryPrice = Number(pick.entryPrice);
      const currentPrice = priceData.price;
      const leverage = config.game.baseLeverage * pick.boostMultiplier;

      let rawPnl: number;
      if (pick.positionType === 'long') {
        rawPnl = ((currentPrice - entryPrice) / entryPrice) * 100;
      } else {
        rawPnl = ((entryPrice - currentPrice) / entryPrice) * 100;
      }

      const leveragedPnl = rawPnl * leverage;
      const weight = Number(pick.weight);
      totalWeightedPnl += leveragedPnl * weight;

      positions.push({
        pickId: pick.id,
        symbol: pick.tokenSymbol,
        pnlPercent: leveragedPnl,
      });

      // Update in DB
      await prisma.draftPick.update({
        where: { id: pick.id },
        data: { currentPnl: leveragedPnl },
      });

      // Check TP/SL
      if (pick.tpPercent && leveragedPnl >= Number(pick.tpPercent)) {
        await this.closePosition(pick.id, currentPrice, leveragedPnl, 'tp');
      } else if (pick.slPercent && leveragedPnl <= Number(pick.slPercent)) {
        await this.closePosition(pick.id, currentPrice, leveragedPnl, 'sl');
      }
    }

    return { totalPnl: totalWeightedPnl, positions };
  }

  // ── Close a position ──
  async closePosition(
    pickId: string,
    closePrice: number,
    realizedPnl: number,
    reason: 'user' | 'tp' | 'sl' | 'liquidation' = 'user',
  ): Promise<void> {
    await prisma.draftPick.update({
      where: { id: pickId },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closePrice,
        realizedPnl,
      },
    });

    logger.info({ pickId, reason, realizedPnl }, 'Position closed');
  }

  // ── Fetch market prices from Pear ──
  async getMarketPrices(symbols: string[]): Promise<PriceData[]> {
    try {
      const response = await fetch(
        `${this.pearBaseUrl}/market-data/overview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assets: symbols }),
        },
      );

      if (!response.ok) {
        throw new Error(`Pear API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return symbols.map((symbol, i) => ({
        symbol,
        price: data[i]?.price || 0,
      }));
    } catch (err) {
      logger.error({ err, symbols }, 'Failed to fetch market prices');
      // Return mock prices as fallback in dev
      return symbols.map(symbol => ({ symbol, price: 100 }));
    }
  }
}

export const tradeService = new TradeService();
