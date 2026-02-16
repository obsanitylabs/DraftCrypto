// ═══════════════════════════════════════════════════════
// DraftCrypto Server — Trade Service (Paper Mode)
// ═══════════════════════════════════════════════════════

import { prisma, config, logger } from '../lib/index.js';

interface PriceData {
  symbol: string;
  price: number;
}

// Cache prices for 10 seconds to avoid rate limits
let priceCache: { data: PriceData[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 10_000;

export class TradeService {
  // ── Execute lineup positions (after lineup submission) ──
  async executeLineup(matchId: string, userId: string): Promise<void> {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error('Match not found');

    const picks = await prisma.draftPick.findMany({
      where: { matchId, userId, positionType: { not: 'bench' } },
    });

    // Paper mode: snapshot entry prices from live market data
    await this.executePaperTrades(picks);
  }

  // ── Paper: Snapshot entry prices from live market data ──
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

  // ── Calculate PnL for a match (normalized — divides by total weight) ──
  async calculatePnl(matchId: string, userId: string): Promise<{
    totalPnl: number;
    positions: Array<{ pickId: string; symbol: string; pnlPercent: number; currentPrice: number }>;
  }> {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error('Match not found');

    const picks = await prisma.draftPick.findMany({
      where: { matchId, userId, positionType: { not: 'bench' } },
    });

    return this.getPaperPnl(picks);
  }

  private async getPaperPnl(picks: any[]) {
    const openPicks = picks.filter(p => !p.isClosed);
    const closedPicks = picks.filter(p => p.isClosed);

    const symbols = openPicks.map(p => p.tokenSymbol);
    const prices = symbols.length > 0 ? await this.getMarketPrices(symbols) : [];

    const positions: Array<{ pickId: string; symbol: string; pnlPercent: number; currentPrice: number }> = [];
    let weightedPnlSum = 0;
    let totalWeight = 0;

    // Process open positions with live prices
    for (const pick of openPicks) {
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
      weightedPnlSum += leveragedPnl * weight;
      totalWeight += weight;

      positions.push({
        pickId: pick.id,
        symbol: pick.tokenSymbol,
        pnlPercent: leveragedPnl,
        currentPrice,
      });

      // Update in DB
      await prisma.draftPick.update({
        where: { id: pick.id },
        data: { currentPnl: leveragedPnl },
      });

      // Check TP/SL
      if (pick.tpPercent && leveragedPnl >= Number(pick.tpPercent)) {
        await this.closePosition(pick.id, currentPrice, leveragedPnl, 'tp');
      } else if (pick.slPercent && leveragedPnl <= -Math.abs(Number(pick.slPercent))) {
        await this.closePosition(pick.id, currentPrice, leveragedPnl, 'sl');
      }
    }

    // Include closed positions in the total
    for (const pick of closedPicks) {
      const realizedPnl = Number(pick.realizedPnl ?? pick.currentPnl ?? 0);
      const weight = Number(pick.weight);
      weightedPnlSum += realizedPnl * weight;
      totalWeight += weight;

      positions.push({
        pickId: pick.id,
        symbol: pick.tokenSymbol,
        pnlPercent: realizedPnl,
        currentPrice: Number(pick.closePrice ?? pick.entryPrice ?? 0),
      });
    }

    // FIX: Normalize by total weight — matches frontend formula
    const totalPnl = totalWeight > 0 ? weightedPnlSum / totalWeight : 0;

    return { totalPnl, positions };
  }

  // ── Close a position ──
  async closePosition(
    pickId: string,
    closePrice: number,
    realizedPnl: number,
    reason: 'user' | 'tp' | 'sl' | 'liquidation' | 'settlement' = 'user',
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

  // ── Close all open positions for a match at current prices ──
  async closeAllPositions(matchId: string): Promise<void> {
    const openPicks = await prisma.draftPick.findMany({
      where: { matchId, isClosed: false, positionType: { not: 'bench' } },
    });

    if (openPicks.length === 0) return;

    const symbols = [...new Set(openPicks.map(p => p.tokenSymbol))];
    const prices = await this.getMarketPrices(symbols);

    for (const pick of openPicks) {
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

      await this.closePosition(pick.id, currentPrice, leveragedPnl, 'settlement');
    }

    logger.info({ matchId, count: openPicks.length }, 'All positions closed for settlement');
  }

  // ── Fetch prices from Binance (free, no API key needed) ──
  async getMarketPrices(symbols: string[]): Promise<PriceData[]> {
    // Return cache if fresh
    if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL_MS) {
      return symbols.map(s => {
        const cached = priceCache!.data.find(p => p.symbol === s);
        return cached || { symbol: s, price: 0 };
      });
    }

    try {
      // Binance ticker/price endpoint — returns all pairs, no auth needed
      const response = await fetch('https://api.binance.com/api/v3/ticker/price');
      if (!response.ok) throw new Error(`Binance API error: ${response.status}`);

      const data = await response.json() as Array<{ symbol: string; price: string }>;

      // Build price map: BTC → BTCUSDT price
      const priceMap = new Map<string, number>();
      for (const item of data) {
        if (item.symbol.endsWith('USDT')) {
          const base = item.symbol.replace('USDT', '');
          priceMap.set(base, parseFloat(item.price));
        }
      }

      const result: PriceData[] = config.game.draftTokens.map(symbol => ({
        symbol,
        price: priceMap.get(symbol) || 0,
      }));

      // Update cache
      priceCache = { data: result, timestamp: Date.now() };

      return symbols.map(s => {
        const found = result.find(p => p.symbol === s);
        return found || { symbol: s, price: 0 };
      });
    } catch (err) {
      logger.error({ err }, 'Failed to fetch market prices from Binance');

      // Try CoinGecko as fallback
      try {
        return await this.getCoinGeckoPrices(symbols);
      } catch (fallbackErr) {
        logger.error({ fallbackErr }, 'CoinGecko fallback also failed');
        return symbols.map(s => ({ symbol: s, price: 0 }));
      }
    }
  }

  // ── CoinGecko fallback (rate-limited but free) ──
  private async getCoinGeckoPrices(symbols: string[]): Promise<PriceData[]> {
    const cgMap: Record<string, string> = {
      BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
      XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', AVAX: 'avalanche-2',
      DOT: 'polkadot', LINK: 'chainlink', MATIC: 'matic-network', UNI: 'uniswap',
      NEAR: 'near', OP: 'optimism', ARB: 'arbitrum', FTM: 'fantom',
      APT: 'aptos', SUI: 'sui', INJ: 'injective-protocol', TIA: 'celestia',
      SEI: 'sei-network', JUP: 'jupiter-exchange-solana', PYTH: 'pyth-network',
      WIF: 'dogwifcoin', PEPE: 'pepe', BONK: 'bonk', HYPE: 'hyperliquid',
      RENDER: 'render-token', FET: 'fetch-ai', TAO: 'bittensor',
    };

    const ids = symbols.map(s => cgMap[s]).filter(Boolean).join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    );
    const data = await response.json() as Record<string, { usd: number }>;

    return symbols.map(symbol => {
      const cgId = cgMap[symbol];
      const price = cgId && data[cgId] ? data[cgId].usd : 0;
      return { symbol, price };
    });
  }

  // ── Get all draftable tokens with current prices ──
  async getDraftTokenList(): Promise<Array<{ symbol: string; price: number }>> {
    const prices = await this.getMarketPrices(config.game.draftTokens);
    return prices.map(p => ({ symbol: p.symbol, price: p.price }));
  }
}

export const tradeService = new TradeService();
