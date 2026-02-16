// ═══════════════════════════════════════════════════════
// Fantasy Crypto — Paper Trade Service
// ═══════════════════════════════════════════════════════

import { pearService } from './pear';
import { GAME } from '@/config';
import type { DraftPick, PositionType, Token } from '@/types';

interface PaperPosition {
  pickId: string;
  tokenSymbol: string;
  positionType: PositionType;
  entryPrice: number;
  currentPrice: number;
  weight: number;
  boostMultiplier: number;
  pnlPercent: number;
  isOpen: boolean;
  closedAt?: string;
  realizedPnlPercent?: number;
  tpPercent?: number;
  slPercent?: number;
}

class PaperTradeService {
  private positions: Map<string, PaperPosition> = new Map();
  private priceCache: Map<string, number> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;

  // ═══════════════════
  // POSITION MANAGEMENT
  // ═══════════════════

  /**
   * Record entry prices for lineup at match start.
   * Uses current Pear market data prices as entry points.
   */
  async openPositions(picks: DraftPick[]): Promise<PaperPosition[]> {
    // Fetch current prices from Pear market data
    const symbols = picks.map(p => p.tokenSymbol);
    const tokenData = await pearService.getMarketOverview(symbols);

    const priceMap = new Map<string, number>();
    tokenData.forEach(t => priceMap.set(t.coin, t.markPrice));

    const positions: PaperPosition[] = [];

    for (const pick of picks) {
      if (pick.positionType === 'bench') continue;

      const entryPrice = priceMap.get(pick.tokenSymbol) || 0;
      const position: PaperPosition = {
        pickId: pick.id,
        tokenSymbol: pick.tokenSymbol,
        positionType: pick.positionType,
        entryPrice,
        currentPrice: entryPrice,
        weight: pick.weight,
        boostMultiplier: pick.boostMultiplier || 1,
        pnlPercent: 0,
        isOpen: true,
      };

      this.positions.set(pick.id, position);
      this.priceCache.set(pick.tokenSymbol, entryPrice);
      positions.push(position);
    }

    return positions;
  }

  /**
   * Close a single paper position at current market price.
   */
  async closePosition(pickId: string): Promise<{ realizedPnlPercent: number }> {
    const pos = this.positions.get(pickId);
    if (!pos || !pos.isOpen) throw new Error('Position not found or already closed');

    // Fetch latest price
    const [tokenData] = await pearService.getMarketOverview([pos.tokenSymbol]);
    const closePrice = tokenData?.markPrice || pos.currentPrice;

    const pnl = this.calculatePnlPercent(pos.entryPrice, closePrice, pos.positionType);
    const leveragedPnl = pnl * GAME.BASE_LEVERAGE * pos.boostMultiplier;

    pos.isOpen = false;
    pos.closedAt = new Date().toISOString();
    pos.realizedPnlPercent = leveragedPnl;
    pos.currentPrice = closePrice;

    return { realizedPnlPercent: leveragedPnl };
  }

  /**
   * Swap bench token into active lineup.
   */
  async swapPosition(
    closingPickId: string,
    benchPick: DraftPick,
    boostMultiplier: number = 1
  ): Promise<{ closed: PaperPosition; opened: PaperPosition }> {
    const closed = await this.closePosition(closingPickId);

    // Open the bench token
    const [tokenData] = await pearService.getMarketOverview([benchPick.tokenSymbol]);
    const entryPrice = tokenData?.markPrice || 0;

    const newPosition: PaperPosition = {
      pickId: benchPick.id,
      tokenSymbol: benchPick.tokenSymbol,
      positionType: benchPick.positionType === 'bench' ? 'long' : benchPick.positionType,
      entryPrice,
      currentPrice: entryPrice,
      weight: benchPick.weight,
      boostMultiplier,
      pnlPercent: 0,
      isOpen: true,
    };

    this.positions.set(benchPick.id, newPosition);

    return {
      closed: this.positions.get(closingPickId)!,
      opened: newPosition,
    };
  }

  /**
   * Set TP/SL on a paper position.
   */
  setTPSL(pickId: string, tp?: number, sl?: number): void {
    const pos = this.positions.get(pickId);
    if (!pos) return;
    if (tp !== undefined) pos.tpPercent = tp;
    if (sl !== undefined) pos.slPercent = sl;
  }

  // ═══════════════════
  // PNL CALCULATION
  // ═══════════════════

  /**
   * Update all open positions with latest prices.
   * Returns total weighted PnL % for the portfolio.
   */
  async updatePrices(): Promise<{
    positions: PaperPosition[];
    totalPnlPercent: number;
  }> {
    const openPositions = Array.from(this.positions.values()).filter(p => p.isOpen);
    if (openPositions.length === 0) return { positions: [], totalPnlPercent: 0 };

    // Fetch latest prices
    const symbols = [...new Set(openPositions.map(p => p.tokenSymbol))];
    const tokenData = await pearService.getMarketOverview(symbols);

    const priceMap = new Map<string, number>();
    tokenData.forEach(t => priceMap.set(t.coin, t.markPrice));

    let weightedPnlSum = 0;
    let totalWeight = 0;

    for (const pos of openPositions) {
      const currentPrice = priceMap.get(pos.tokenSymbol) || pos.currentPrice;
      pos.currentPrice = currentPrice;

      const rawPnl = this.calculatePnlPercent(pos.entryPrice, currentPrice, pos.positionType);
      const leveragedPnl = rawPnl * GAME.BASE_LEVERAGE * pos.boostMultiplier;
      pos.pnlPercent = leveragedPnl;

      // Check TP/SL
      if (pos.tpPercent !== undefined && leveragedPnl >= pos.tpPercent) {
        pos.isOpen = false;
        pos.closedAt = new Date().toISOString();
        pos.realizedPnlPercent = pos.tpPercent;
      } else if (pos.slPercent !== undefined && leveragedPnl <= pos.slPercent) {
        pos.isOpen = false;
        pos.closedAt = new Date().toISOString();
        pos.realizedPnlPercent = pos.slPercent;
      }

      const effectivePnl = pos.isOpen ? leveragedPnl : (pos.realizedPnlPercent || 0);
      weightedPnlSum += effectivePnl * pos.weight;
      totalWeight += pos.weight;
    }

    const totalPnlPercent = totalWeight > 0 ? weightedPnlSum / totalWeight : 0;

    return {
      positions: Array.from(this.positions.values()),
      totalPnlPercent,
    };
  }

  private calculatePnlPercent(entryPrice: number, currentPrice: number, type: PositionType): number {
    if (entryPrice === 0) return 0;
    if (type === 'long') {
      return (currentPrice - entryPrice) / entryPrice;
    } else if (type === 'short') {
      return (entryPrice - currentPrice) / entryPrice;
    }
    return 0;
  }

  // ═══════════════════
  // POLLING
  // ═══════════════════

  startPolling(intervalMs: number = GAME.PNL_SNAPSHOT_INTERVAL_SECONDS * 1000, onUpdate?: (data: {
    positions: PaperPosition[];
    totalPnlPercent: number;
  }) => void): void {
    this.stopPolling();
    this.pollInterval = setInterval(async () => {
      try {
        const result = await this.updatePrices();
        onUpdate?.(result);
      } catch (err) {
        console.error('Paper trade price poll error:', err);
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // ═══════════════════
  // GETTERS
  // ═══════════════════

  getPosition(pickId: string): PaperPosition | undefined {
    return this.positions.get(pickId);
  }

  getAllPositions(): PaperPosition[] {
    return Array.from(this.positions.values());
  }

  getOpenPositions(): PaperPosition[] {
    return Array.from(this.positions.values()).filter(p => p.isOpen);
  }

  reset(): void {
    this.stopPolling();
    this.positions.clear();
    this.priceCache.clear();
  }
}

// Singleton
export const paperTradeService = new PaperTradeService();
