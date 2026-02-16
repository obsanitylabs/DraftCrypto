// ═══════════════════════════════════════════════════════
// Fantasy Crypto — Pear Protocol Service
// ═══════════════════════════════════════════════════════

import { PEAR, GAME } from '@/config';
import type { PearTokens, PearMarketData, PearPosition, Token } from '@/types';

class PearService {
  private baseUrl = PEAR.BASE_URL;
  private builderCode = PEAR.BUILDER_CODE;

  // ═══════════════════
  // AUTH
  // ═══════════════════

  async authenticate(walletAddress: string, signature: string): Promise<PearTokens> {
    const res = await this.post('/auth/login', {
      walletAddress,
      signature,
      builderCode: this.builderCode,
    });
    return res as PearTokens;
  }

  async refreshToken(refreshToken: string): Promise<PearTokens> {
    const res = await this.post('/auth/refresh', { refreshToken });
    return res as PearTokens;
  }

  // ═══════════════════
  // AGENT WALLET
  // ═══════════════════

  async getAgentWallet(jwt: string): Promise<{ address: string; expiresAt: string; status: string }> {
    const res = await this.get('/agent-wallet/status', jwt);
    return res;
  }

  async createAgentWallet(jwt: string): Promise<{ address: string; expiresAt: string }> {
    const res = await this.post('/agent-wallet/create', {}, jwt);
    return res;
  }

  // ═══════════════════
  // MARKET DATA
  // ═══════════════════

  async getMarketOverview(assets?: string[]): Promise<PearMarketData[]> {
    const body = assets ? { assets } : {};
    const res = await this.post('/market-data/overview', body);
    return res.data || [];
  }

  async getAssetContext(
    longAssets: { coin: string; weight: number }[],
    shortAssets: { coin: string; weight: number }[]
  ): Promise<{
    pairRatio: number;
    correlation: number;
    zScore: number;
    volatility: number;
  }> {
    const res = await this.post('/market-data/asset-context', { longAssets, shortAssets });
    return res;
  }

  async getCandles(
    longAssets: { coin: string; weight: number }[],
    shortAssets: { coin: string; weight: number }[],
    interval: string = '1h'
  ): Promise<{ time: number; open: number; high: number; low: number; close: number }[]> {
    const res = await this.post('/market-data/candle', { longAssets, shortAssets, interval });
    return res.data || [];
  }

  // ═══════════════════
  // TOKEN LIST (for draft)
  // ═══════════════════

  async getTokenList(): Promise<Token[]> {
    const data = await this.getMarketOverview();
    return data.map((d) => ({
      symbol: d.coin,
      name: d.coin,
      price: d.markPrice,
      change24h: d.change24h,
      change1h: 0, // TODO: calculate from candle data
      fundingRate: d.fundingRate,
      openInterest: d.openInterest,
      volume24h: d.volume24h,
    }));
  }

  // ═══════════════════
  // TRADE EXECUTION
  // ═══════════════════

  async executeMarketOrder(
    jwt: string,
    params: {
      longAssets: { coin: string; weight: number }[];
      shortAssets: { coin: string; weight: number }[];
      leverage: number;
      size: number; // USDC notional
    }
  ): Promise<{ positionId: string; entryPrice: number; filledSize: number }> {
    // Enforce leverage cap
    const leverage = Math.min(params.leverage, GAME.MAX_BOOSTED_LEVERAGE);

    const res = await this.post('/trade/market-order', {
      longAssets: params.longAssets,
      shortAssets: params.shortAssets,
      leverage,
      size: params.size,
      builderCode: this.builderCode,
    }, jwt);
    return res;
  }

  async closePosition(jwt: string, positionId: string): Promise<{
    realizedPnl: number;
    realizedPnlPercent: number;
    closePrice: number;
  }> {
    const res = await this.post('/trade/close-position', { positionId }, jwt);
    return res;
  }

  async adjustPositionSize(
    jwt: string,
    positionId: string,
    newSize: number
  ): Promise<{ success: boolean }> {
    const res = await this.post('/trade/adjust-position-size', {
      positionId,
      newSize,
    }, jwt);
    return res;
  }

  async setTPSL(
    jwt: string,
    positionId: string,
    takeProfit?: number,
    stopLoss?: number
  ): Promise<{ success: boolean }> {
    const res = await this.post('/trade/set-tpsl', {
      positionId,
      ...(takeProfit !== undefined && { takeProfit }),
      ...(stopLoss !== undefined && { stopLoss }),
    }, jwt);
    return res;
  }

  // ═══════════════════
  // POSITIONS
  // ═══════════════════

  async getOpenPositions(jwt: string): Promise<PearPosition[]> {
    const res = await this.get('/positions/open', jwt);
    return res.data || [];
  }

  async getTradeHistory(jwt: string): Promise<{
    positionId: string;
    realizedPnl: number;
    realizedPnlPercent: number;
    closedAt: string;
    closeReason: string;
  }[]> {
    const res = await this.get('/trade-history', jwt);
    return res.data || [];
  }

  // ═══════════════════
  // WEBSOCKET
  // ═══════════════════

  connectWebSocket(
    jwt: string,
    handlers: {
      onPriceUpdate?: (data: { coin: string; price: number; change1h: number; change24h: number }[]) => void;
      onPositionUpdate?: (data: PearPosition) => void;
      onLiquidationWarning?: (data: { positionId: string; marginRatio: number }) => void;
      onError?: (error: Error) => void;
    }
  ): WebSocket {
    const ws = new WebSocket(`${this.baseUrl.replace('https', 'wss')}/ws?token=${jwt}`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'price_update':
            handlers.onPriceUpdate?.(msg.data);
            break;
          case 'position_update':
            handlers.onPositionUpdate?.(msg.data);
            break;
          case 'liquidation_warning':
            handlers.onLiquidationWarning?.(msg.data);
            break;
        }
      } catch (err) {
        handlers.onError?.(err as Error);
      }
    };

    ws.onerror = (event) => {
      handlers.onError?.(new Error('WebSocket error'));
    };

    return ws;
  }

  // ═══════════════════
  // INTERNAL HTTP
  // ═══════════════════

  private async post(path: string, body: Record<string, unknown>, jwt?: string): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Pear API error ${res.status}: ${error}`);
    }

    return res.json();
  }

  private async get(path: string, jwt?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

    const res = await fetch(`${this.baseUrl}${path}`, { headers });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Pear API error ${res.status}: ${error}`);
    }

    return res.json();
  }
}

// Singleton
export const pearService = new PearService();
