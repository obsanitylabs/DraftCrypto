# DraftCrypto — Security & Code Audit

**Date:** February 16, 2026
**Scope:** Full-stack review — frontend (Next.js), backend (Fastify), smart contracts (Solidity), wallet integration
**Status:** Pre-launch paper mode preview

---

## Executive Summary

The codebase has a solid architectural foundation with good patterns in the smart contracts (ReentrancyGuard, Ownable2Step, SafeERC20) and a well-structured backend. However, several critical issues must be resolved before any mode involving real funds goes live. The paper mode preview requires fixes to draft validation, PnL consistency, and authentication wiring to function correctly for users.

---

## 1. Solana Wallet Support — NOT IMPLEMENTED

**Severity:** Informational (paper mode) / Blocker (live mode with Solana deposits)

The wallet modal (`src/components/wallet/wallet-modal.tsx`) only supports EVM wallets via wagmi:

- **MetaMask** → injected connector
- **WalletConnect** → WalletConnect connector
- **Phantom** → only its EVM mode (`window.phantom.ethereum`), not native Solana

There is no `@solana/wallet-adapter` dependency anywhere in the project. The entire chain config is hardcoded to Arbitrum One (chain ID 42161). If Solana-native USDC deposits are desired, the following are needed:

- Solana wallet adapter integration (`@solana/wallet-adapter-react`)
- SPL USDC acceptance on Solana
- Bridge mechanism (Wormhole) to move funds to Arbitrum where the vault lives

**Note:** The UI references Phantom as "Solana & EVM wallet" which is misleading since it only uses the EVM side.

**Recommendation:** For paper mode, update the Phantom description to "EVM wallet" or add a note that Solana-native support is coming. For live mode, implement full Solana wallet adapter or remove Solana references.

---

## 2. Vault Contract — EXISTS BUT NO CROSS-CHAIN

**Severity:** Informational (paper mode) / High (live mode)

`contracts/contracts/FantasyCryptoVault.sol` is well-written with good security patterns. The test file (`contracts/test/FantasyCrypto.test.ts`, 386 lines) covers basic match flows.

### Missing Components

| Component | Status |
|-----------|--------|
| Wormhole integration | Not implemented — zero cross-chain code |
| Timelock on owner | Not implemented — `settleMatch()` is `onlyOwner` with no delay |
| On-chain settlement verification | Not implemented — backend provides winner with no proof |
| Staking contract tests | Missing — only vault has test coverage |

### Details

- **No Wormhole integration:** The vault only accepts Arbitrum-native USDC (`0xaf88d065e77c8cC2239327C5EDb3A432268e5831`). Users holding USDC on Solana, Ethereum, or Base have no bridge mechanism.
- **No timelock on owner:** If the owner key is compromised, all active wagers can be drained via fake settlements. The contract comment says "Owner should be a multisig or timelock in production" but nothing enforces this.
- **No on-chain settlement verification:** The backend calls `settleMatch(matchId, winner)` with a winner address. There is no on-chain proof of PnL. A compromised backend could settle matches to any address.
- **emergencyWithdraw:** Accepts any ERC20 to treasury with no timelock. Acceptable pattern but should be disclosed in audit.

**Recommendation:** Deploy behind Gnosis Safe multisig. Add timelock to settlement. Consider commit-reveal scheme or oracle for PnL verification before enabling live wagers.

---

## 3. Critical Issues — Loss of Funds Risk

### 3.1 Frontend Auth Bypasses Backend

**Severity:** CRITICAL
**File:** `src/components/wallet/wallet-modal.tsx` (lines 170–182)
**Status:** FIXED

The `performAuth` function generates its own nonce locally and creates a local user session without calling the backend API. The comment reads: "In production: POST to /api/auth/login." This means the frontend has no real authentication — anyone can fake a wallet connection.

**Impact:** For paper mode, users have no persistent accounts. For live mode, funds could be attributed to spoofed addresses.

**Fix:** Wire `performAuth` to call `api.auth.getNonce()` → sign → `api.auth.login()` and store the JWT.

---

### 3.2 Server JWT Secret Defaults to Hardcoded String

**Severity:** CRITICAL
**File:** `server/src/lib/index.ts`
**Status:** FIXED

```
jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production-32chars'
```

If deployed without setting the environment variable, anyone can forge authentication tokens.

**Fix:** Throw on startup if `JWT_SECRET` is not set in production.

---

### 3.3 No Rate Limiting on Match Creation

**Severity:** HIGH
**File:** `server/src/routes/matches.ts`
**Status:** FIXED

A user can spam `POST /matches` and fill the database. No rate limiter exists on any route.

**Fix:** Add `@fastify/rate-limit` with per-user throttling on mutation endpoints.

---

### 3.4 Self-Play UNITE Farming

**Severity:** HIGH
**File:** `server/src/ws/socket.ts`, `contracts/contracts/FantasyCryptoVault.sol`
**Status:** Noted — requires off-chain heuristics for full mitigation

A user with two wallets could play against themselves to farm UNITE rewards. The vault contract checks `CannotJoinOwn` by address, but separate wallets bypass this. The backend performs no IP or behavioral analysis.

**Recommendation:** Track IP addresses per match. Flag accounts that consistently match against the same opponent. Consider requiring minimum time between matches.

---

## 4. High Severity — Logic Flaws

### 4.1 PnL Calculation Mismatch Between Frontend and Backend

**Severity:** HIGH
**File:** `src/services/paper-trade.ts` (line 179) vs `server/src/services/trade.ts`
**Status:** FIXED

The frontend divides weighted PnL sum by total weight:
```
totalPnlPercent = weightedPnlSum / totalWeight
```

The backend sums `leveragedPnl * weight` without dividing:
```
totalWeightedPnl += leveragedPnl * weight
```

These produce different results. The winner shown to the user on the frontend could differ from the winner determined by backend settlement.

**Fix:** Normalize both to use the same formula. Backend now divides by total weight.

---

### 4.2 Settlement Doesn't Close Open Positions First

**Severity:** HIGH
**File:** `server/src/services/settlement.ts`
**Status:** FIXED

When `processExpiredMatches()` fires, it reads `pick.realizedPnl ?? pick.currentPnl`, but `currentPnl` may be stale if the last PnL update job ran 60 seconds ago. Final settlement could use outdated prices.

**Fix:** Fetch final prices and close all open positions with current market data before calculating the winner.

---

### 4.3 Draft Pick Weight Not Validated

**Severity:** HIGH
**File:** `server/src/ws/socket.ts` (line 140)
**Status:** FIXED

The draft pick handler uses the client-provided `pickRound` to look up weight from the config. There is no validation that `pickRound` is within the expected range. A malicious client could send `pickRound: 1` (weight 0.25) for every pick, gaining disproportionate weight on all positions.

**Fix:** Server now tracks pick count per player and assigns round/weight server-side based on the actual pick sequence.

---

### 4.4 No Draft Pick Deduplication

**Severity:** HIGH
**File:** `server/src/ws/socket.ts`
**Status:** FIXED

Nothing prevents a player from picking the same token twice or picking a token the opponent already picked. The socket handler creates picks without checking existing picks in the match.

**Fix:** Query existing picks for the match before accepting. Reject duplicate tokens and tokens already drafted by the opponent.

---

## 5. Medium Severity — Operational Risks

### 5.1 Binance API Single Point of Failure

**Severity:** MEDIUM
**File:** `server/src/services/trade.ts`

If Binance blocks the server IP or rate-limits requests, paper mode breaks entirely. The CoinGecko fallback has aggressive rate limits (10–30 req/min on free tier).

**Recommendation:** Consider adding a WebSocket price feed (Binance WS or CoinGecko Pro) for real-time data. Add circuit breaker pattern with longer cache TTL on failures.

---

### 5.2 No Match Timeout for Stale Matches

**Severity:** MEDIUM
**File:** `server/src/routes/matches.ts`, `server/src/jobs/index.ts`
**Status:** FIXED

If a player creates a match and no one joins, it stays in `matching` status forever, cluttering the lobby.

**Fix:** Added cleanup job that cancels matches stuck in `matching` or `drafting` status for more than 30 minutes.

---

### 5.3 Emergency Withdraw Can Access Active Match Funds

**Severity:** MEDIUM
**File:** `contracts/contracts/FantasyCryptoVault.sol`

The `emergencyWithdraw` function can withdraw any ERC20 including USDC. If the contract balance exceeds tracked match amounts (e.g. from direct transfers), the excess is withdrawable. Not directly exploitable by external users, but the owner could grief active matches.

**Recommendation:** Track total escrowed amount and restrict USDC withdrawal to excess beyond escrowed balance, similar to how the staking contract protects staked UNITE.

---

## 6. Low Severity — Code Quality

### 6.1 "Fantasy Crypto" Branding Remains in Multiple Files

**Severity:** LOW
**Status:** FIXED

Affected locations:
- Auth message: "Sign this message to authenticate with Fantasy Crypto"
- Wallet modal header text
- FAQ content (Arbitrum question)
- Network switch modal text
- Pear service comments
- Paper trade service comments
- Various component file headers

---

### 6.2 No Input Sanitization on Profile Fields

**Severity:** LOW
**File:** `server/src/routes/auth.ts`

`xHandle` and `tgHandle` accept any string up to 50 chars. Could contain XSS payloads if rendered unsafely in the frontend.

**Recommendation:** Add regex validation for social handles. Sanitize on output.

---

### 6.3 Outdated Dependencies

**Severity:** LOW

| Package | Current | Note |
|---------|---------|------|
| `next` | `14.2.x` | Has known security patches in later versions. Pin to latest 14.2.x or upgrade to 15. |
| `@openzeppelin/contracts` | `^5.0.0` | Should pin to specific version (5.1.0+) and verify against advisories. |
| `fastify` | `^4.28.0` | Fastify 5.x is available. Not urgent but worth tracking. |

---

## 7. Recommendations Summary

### Paper Mode Preview (No Real Funds)

| Item | Priority | Status |
|------|----------|--------|
| Fix PnL mismatch (#4.1) | P0 | ✅ Fixed |
| Fix draft validation (#4.3, #4.4) | P0 | ✅ Fixed |
| Wire frontend auth to backend (#3.1) | P0 | ✅ Fixed |
| Fix remaining branding (#6.1) | P1 | ✅ Fixed |
| Add match expiry cleanup (#5.2) | P1 | ✅ Fixed |
| Add rate limiting (#3.3) | P1 | ✅ Fixed |
| Fix settlement to close positions first (#4.2) | P1 | ✅ Fixed |
| Enforce JWT_SECRET in production (#3.2) | P1 | ✅ Fixed |

### Before Enabling Live Wagers

| Item | Priority |
|------|----------|
| Deploy vault behind Gnosis Safe multisig | P0 |
| Add timelock to settlement | P0 |
| Professional smart contract audit | P0 |
| Add on-chain PnL oracle or commit-reveal scheme | P0 |
| Implement self-play detection heuristics | P1 |
| Add Wormhole bridge for cross-chain USDC | P1 |
| Implement full Solana wallet adapter (if targeting Solana users) | P1 |
| Track escrowed balance in vault emergency withdraw | P1 |
| Add input sanitization on profile fields | P2 |
| Pin and update dependency versions | P2 |
| Add staking contract test coverage | P2 |

---

## 8. Files Modified in This Audit

### Frontend
- `src/components/wallet/wallet-modal.tsx` — Auth wiring, branding
- `src/services/paper-trade.ts` — PnL formula fix, branding
- `src/app/page.tsx` — Preview banner

### Backend
- `server/src/lib/index.ts` — JWT enforcement, Redis-optional
- `server/src/services/trade.ts` — PnL normalization
- `server/src/services/settlement.ts` — Close positions before settling
- `server/src/ws/socket.ts` — Draft validation (server-side rounds, deduplication)
- `server/src/routes/matches.ts` — Rate limiting
- `server/src/jobs/index.ts` — Stale match cleanup
- `server/src/middleware/auth.ts` — Branding
- `server/src/index.ts` — Rate limit plugin registration

### New Files
- `SECURITY_AUDIT.md` — This document
