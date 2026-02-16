// ═══════════════════════════════════════════════════════
// DraftCrypto — API Client
// ═══════════════════════════════════════════════════════

import { API } from '@/config';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('fc_token', token);
  } else {
    localStorage.removeItem('fc_token');
  }
}

export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = typeof window !== 'undefined' ? localStorage.getItem('fc_token') : null;
  }
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API.BASE_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API Error ${res.status}`);
  }

  return res.json();
}

// ── Auth ──

export const api = {
  auth: {
    getNonce: (walletAddress: string) =>
      request<{ nonce: string; message: string }>('/auth/nonce', {
        method: 'POST',
        body: JSON.stringify({ walletAddress }),
      }),

    login: (data: { walletAddress: string; signature: string; nonce: string; walletType: string }) =>
      request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: () => request<{ user: any }>('/auth/me'),

    updateProfile: (data: Record<string, any>) =>
      request<{ user: any }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  // ── Tokens ──

  tokens: {
    list: () =>
      request<{ tokens: Array<{ symbol: string; price: number }> }>('/tokens'),

    prices: (symbols?: string[]) => {
      const qs = symbols ? `?symbols=${symbols.join(',')}` : '';
      return request<{ prices: Array<{ symbol: string; price: number }> }>(`/tokens/prices${qs}`);
    },
  },

  // ── Matches ──

  matches: {
    list: (params?: { tradeMode?: string; tier?: string; mode?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<{ matches: any[] }>(`/matches${qs}`);
    },

    get: (matchId: string) =>
      request<{ match: any }>(`/matches/${matchId}`),

    create: (data: { matchType: string; tradeMode: string; tier: string; duration: string }) =>
      request<{ match: any }>('/matches', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    join: (matchId: string) =>
      request<{ match: any }>(`/matches/${matchId}/join`, { method: 'POST' }),

    submitLineup: (matchId: string, picks: any[]) =>
      request<{ success: boolean }>(`/matches/${matchId}/lineup`, {
        method: 'POST',
        body: JSON.stringify({ picks }),
      }),

    myActive: () => request<{ matches: any[] }>('/matches/my/active'),

    myHistory: (limit = 20, offset = 0) =>
      request<{ matches: any[] }>(`/matches/my/history?limit=${limit}&offset=${offset}`),
  },

  // ── Leaderboard ──

  leaderboard: {
    get: (params?: { period?: string; tradeMode?: string; limit?: number }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<{ entries: any[]; period: string; tradeMode: string }>(`/leaderboard${qs}`);
    },
  },

  // ── UNITE ──

  unite: {
    balance: () => request<{
      balance: number;
      staked: number;
      tier: string;
      tierConfig: any;
      transactions: any[];
    }>('/unite/balance'),

    transactions: (limit = 20, offset = 0) =>
      request<{ transactions: any[] }>(`/unite/transactions?limit=${limit}&offset=${offset}`),
  },

  // ── Leagues ──

  leagues: {
    list: (params?: { tradeMode?: string; tier?: string; status?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<{ leagues: any[] }>(`/leagues${qs}`);
    },

    get: (leagueId: string) =>
      request<{ league: any }>(`/leagues/${leagueId}`),

    create: (data: { name: string; tradeMode: string; tier: string }) =>
      request<{ league: any }>('/leagues', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    join: (leagueId: string) =>
      request<{ league: any }>(`/leagues/${leagueId}/join`, { method: 'POST' }),

    standings: (leagueId: string) =>
      request<{ standings: any[] }>(`/leagues/${leagueId}/standings`),

    schedule: (leagueId: string) =>
      request<{ schedule: any[] }>(`/leagues/${leagueId}/schedule`),

    inviteCoManager: (leagueId: string, walletAddress: string) =>
      request<{ success: boolean }>(`/leagues/${leagueId}/co-manager`, {
        method: 'POST',
        body: JSON.stringify({ walletAddress }),
      }),

    rageQuit: (leagueId: string) =>
      request<{ success: boolean }>(`/leagues/${leagueId}/rage-quit`, { method: 'POST' }),
  },

  // ── Health ──

  health: () => request<{ status: string; version: string; mode: string }>('/health'),
};
