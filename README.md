<p align="center">
  <img src="https://img.shields.io/badge/version-0.3.0-00cc66?style=flat-square" />
  <img src="https://img.shields.io/badge/mode-paper%20trading-ffdc4a?style=flat-square" />
  <img src="https://img.shields.io/badge/chain-Arbitrum-2d374b?style=flat-square" />
  <img src="https://img.shields.io/badge/license-proprietary-333?style=flat-square" />
</p>
<h1 align="center">DraftCrypto</h1>
<p align="center">
  <strong>Draft Altcoin Portfolios. Trade Alts vs Alts. Win Real USDC.</strong>
</p>
<p align="center">
  <a href="https://draftcrypto.io">draftcrypto.com</a> · 
  </p>

DraftCrypto is a fantasy trading platform that combines fantasy sports mechanics with cryptocurrency markets. Players draft altcoin portfolios in live snake drafts, set long/short lineups, and compete head-to-head or in leagues — with real USDC prizes on the line.
Currently in paper trading preview. Live on-chain settlement coming soon.

How It Works

Connect — Link your wallet via WalletConnect or injected provider
Draft — Pick tokens in a live snake draft with 30-second turns
Compete — Set your Long/Short lineup and track live PnL
Win — Beat your opponent, collect the pot + UNITE rewards

Match Formats
FormatPicksDurationDescriptionFast Match1 per player1DQuick head-to-head, single token pairFull Draft8 per player1D / 3D / 1WSnake draft, full portfolio managementLeague8 per player12 weeksRound-robin with standings and playoffs
Draft Weighting
Picks made in earlier rounds carry more portfolio weight, rewarding draft strategy:
RoundWeightMultiplier125%3×220%3×315%2×415%2×5–610%1×7–82.5%1×
Tech Stack
Frontend

Next.js 15 with App Router and static export
TypeScript end-to-end
Tailwind CSS with custom design system (dark terminal aesthetic)
Zustand for state management
wagmi + viem for wallet connection (WalletConnect, MetaMask, Coinbase, Phantom)
Deployed on Netlify with serverless functions

Backend

Fastify with WebSocket support for real-time drafts
Prisma ORM with PostgreSQL
Redis for price caching (optional — falls back to in-memory)
Hyperliquid API for real-time price feeds (30 tokens)
JWT authentication with wallet signature verification

Smart Contracts

Solidity (Hardhat toolchain)
Arbitrum One deployment target
FantasyCryptoVault.sol — USDC escrow and settlement
UNITEStaking.sol — Tier-based staking for platform access

Project Structure
DraftCrypto/
├── src/                    # Next.js frontend
│   ├── app/                # Pages (App Router)
│   ├── components/         # UI components
│   │   ├── draft/          # Draft room, token list, picks
│   │   ├── landing/        # Hero, how-it-works, leaderboard
│   │   ├── league/         # League lobby and detail views
│   │   ├── lobby/          # Match creation and queue
│   │   ├── match/          # Live match view, share cards
│   │   ├── profile/        # Profile stats, leaderboard
│   │   ├── ui/             # Design system primitives
│   │   ├── unite/          # UNITE token staking
│   │   └── wallet/         # Wallet connection modal
│   ├── hooks/              # useDraft, useSocket, usePWA
│   ├── lib/                # API client, utils, socket, wagmi config
│   ├── services/           # Paper trading engine, Pear Protocol client
│   ├── stores/             # Zustand stores (auth, match, draft, lineup)
│   └── types/              # TypeScript type definitions
├── server/                 # Fastify backend
│   ├── src/
│   │   ├── routes/         # REST endpoints (auth, matches, tokens, etc.)
│   │   ├── ws/             # WebSocket draft room handler
│   │   ├── services/       # Trade engine, settlement
│   │   ├── middleware/     # JWT auth middleware
│   │   ├── jobs/           # Stale match cleanup, scheduled tasks
│   │   └── lib/            # Config, Redis, Prisma client
│   └── prisma/             # Database schema
├── contracts/              # Solidity smart contracts
├── netlify/functions/      # Serverless functions (waitlist)
└── docs/                   # Setup guides
Getting Started
Prerequisites

Node.js 20+
PostgreSQL (for backend)
Redis (optional)

Frontend
bashnpm install
npm run dev
# → http://localhost:3000
The frontend runs standalone with mock data and a simulated draft experience. No backend required for preview.
Backend
bashcd server
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

npm install
npx prisma db push
npm run dev
# → http://localhost:3001
Environment Variables
VariableRequiredDescriptionDATABASE_URLBackendPostgreSQL connection stringJWT_SECRETBackend32+ char secret (crashes on startup if missing in production)REDIS_URLOptionalRedis connection (falls back to in-memory cache)WAITLIST_WEBHOOK_URLNetlifyGoogle Apps Script URL for waitlist collectionNEXT_PUBLIC_ADMIN_WALLETOptionalAdditional admin wallet addresses (comma-separated)
Deployment
Frontend (Netlify)
Push to main triggers auto-deploy. The site builds as a static Next.js export.
bashgit add .
git commit -m "deploy"
git push origin main
Backend
Deploy to any Node.js host (Railway, Render, Fly.io, etc.):
bashcd server
npm install
npx prisma migrate deploy
npm start
Current Status
✅ Paper Mode (v0.3)

Real-time Binance price feeds (30 tokens)
Simulated draft experience with AI opponent
PnL tracking with weighted portfolio calculation
Wallet authentication (signature-based)
Rate limiting and security hardening
Waitlist collection via Google Sheets

🚧 In Progress

Backend ↔ frontend integration for real multiplayer drafts
Hyperliquid API integration for live price data
League system backend routes

📋 Roadmap to Live

Professional smart contract audit
Gnosis Safe multisig for settlement
Timelock on admin operations
On-chain PnL oracle
Self-play detection heuristics

Security
A full security audit has been completed for the paper mode launch. See SECURITY_AUDIT.md for the complete findings and remediation status.
Key protections in place:

JWT authentication with wallet signature verification
Rate limiting (100 req/min global, 10 req/min on mutations)
Server-side draft validation (weights, deduplication, pick order)
Paper-only mode enforced at the API level
Stale match cleanup (5-minute polling)


<p align="center">
  <sub>Built by <a href="https://x.com/obsanity">Obsanity Labs</a></sub>
</p>
