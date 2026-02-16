// ═══════════════════════════════════════════════════════
// Fantasy Crypto — Mock Token Data (for demo / development)
// ═══════════════════════════════════════════════════════

import type { Token } from '@/types';

export const MOCK_TOKENS: Token[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 97245, change24h: 2.4, change1h: 0.3, fundingRate: 0.01, openInterest: 12_500_000_000, volume24h: 42_000_000_000 },
  { symbol: 'ETH', name: 'Ethereum', price: 3812, change24h: -0.8, change1h: -0.2, fundingRate: -0.02, openInterest: 8_200_000_000, volume24h: 18_000_000_000 },
  { symbol: 'SOL', name: 'Solana', price: 198.50, change24h: 5.1, change1h: 1.2, fundingRate: 0.03, openInterest: 3_800_000_000, volume24h: 6_500_000_000 },
  { symbol: 'LINK', name: 'Chainlink', price: 24.30, change24h: 1.2, change1h: 0.1, fundingRate: 0.00, openInterest: 820_000_000, volume24h: 1_200_000_000 },
  { symbol: 'AVAX', name: 'Avalanche', price: 42.10, change24h: -2.1, change1h: -0.8, fundingRate: -0.01, openInterest: 650_000_000, volume24h: 980_000_000 },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.182, change24h: 8.3, change1h: 2.1, fundingRate: 0.05, openInterest: 1_200_000_000, volume24h: 3_400_000_000 },
  { symbol: 'ARB', name: 'Arbitrum', price: 1.45, change24h: 0.5, change1h: 0.1, fundingRate: 0.00, openInterest: 420_000_000, volume24h: 580_000_000 },
  { symbol: 'OP', name: 'Optimism', price: 2.88, change24h: -1.3, change1h: -0.4, fundingRate: -0.01, openInterest: 380_000_000, volume24h: 520_000_000 },
  { symbol: 'MATIC', name: 'Polygon', price: 0.72, change24h: 3.7, change1h: 0.6, fundingRate: 0.02, openInterest: 540_000_000, volume24h: 720_000_000 },
  { symbol: 'UNI', name: 'Uniswap', price: 12.50, change24h: -0.4, change1h: 0.0, fundingRate: 0.00, openInterest: 310_000_000, volume24h: 420_000_000 },
  { symbol: 'AAVE', name: 'Aave', price: 285.00, change24h: 4.2, change1h: 0.8, fundingRate: 0.01, openInterest: 280_000_000, volume24h: 380_000_000 },
  { symbol: 'HYPE', name: 'Hyperliquid', price: 32.10, change24h: 12.5, change1h: 3.4, fundingRate: 0.08, openInterest: 2_100_000_000, volume24h: 4_800_000_000 },
  { symbol: 'WIF', name: 'dogwifhat', price: 2.45, change24h: 6.8, change1h: 1.5, fundingRate: 0.04, openInterest: 480_000_000, volume24h: 920_000_000 },
  { symbol: 'PEPE', name: 'Pepe', price: 0.0000185, change24h: 9.2, change1h: 2.8, fundingRate: 0.06, openInterest: 680_000_000, volume24h: 1_800_000_000 },
  { symbol: 'INJ', name: 'Injective', price: 28.60, change24h: 3.1, change1h: 0.5, fundingRate: 0.01, openInterest: 320_000_000, volume24h: 480_000_000 },
  { symbol: 'SUI', name: 'Sui', price: 1.82, change24h: -3.4, change1h: -1.0, fundingRate: -0.02, openInterest: 520_000_000, volume24h: 780_000_000 },
  { symbol: 'TIA', name: 'Celestia', price: 15.40, change24h: 2.8, change1h: 0.4, fundingRate: 0.01, openInterest: 380_000_000, volume24h: 560_000_000 },
  { symbol: 'SEI', name: 'Sei', price: 0.68, change24h: -1.9, change1h: -0.3, fundingRate: -0.01, openInterest: 180_000_000, volume24h: 240_000_000 },
  { symbol: 'JUP', name: 'Jupiter', price: 1.24, change24h: 4.5, change1h: 0.9, fundingRate: 0.02, openInterest: 420_000_000, volume24h: 680_000_000 },
  { symbol: 'RENDER', name: 'Render', price: 8.90, change24h: 1.6, change1h: 0.2, fundingRate: 0.01, openInterest: 260_000_000, volume24h: 380_000_000 },
  { symbol: 'FET', name: 'Fetch.ai', price: 2.35, change24h: 5.8, change1h: 1.3, fundingRate: 0.03, openInterest: 340_000_000, volume24h: 520_000_000 },
  { symbol: 'STX', name: 'Stacks', price: 2.10, change24h: -0.6, change1h: 0.1, fundingRate: 0.00, openInterest: 190_000_000, volume24h: 280_000_000 },
  { symbol: 'NEAR', name: 'Near Protocol', price: 6.45, change24h: 2.2, change1h: 0.3, fundingRate: 0.01, openInterest: 420_000_000, volume24h: 580_000_000 },
  { symbol: 'ATOM', name: 'Cosmos', price: 9.80, change24h: -1.5, change1h: -0.5, fundingRate: -0.01, openInterest: 380_000_000, volume24h: 480_000_000 },
];
