import { PageShell } from '@/components/layout';
import Link from 'next/link';

export default function HowToPlayPage() {
  return (
    <PageShell>
      <div className="p-4 pb-12 space-y-8">
        <div className="border-b border-fc-border pb-4">
          <h1 className="text-sm font-mono tracking-widest font-bold">HOW TO PLAY</h1>
          <p className="text-3xs text-fc-text-dim tracking-wider mt-1">
            Draft crypto. Compete head-to-head. Win USDC.
          </p>
        </div>

        {/* Overview */}
        <Step number={0} title="THE CONCEPT" accent>
          <p>Fantasy Crypto is like fantasy football, but for crypto markets. You draft a portfolio of tokens, set each as Long or Short, and compete against an opponent. Whoever has the better PnL at the end of the match wins the pot.</p>
        </Step>

        {/* Step 1 */}
        <Step number={1} title="CONNECT & CHOOSE MODE">
          <p>Connect your wallet on Arbitrum One. Choose your match settings:</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Card label="FAST MATCH" desc="1 pick each. Quick 5-min draft. Pure conviction play." />
            <Card label="FULL DRAFT" desc="8 picks each. Snake draft. Deeper strategy." />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Card label="PAPER MODE" desc="Free to play. Simulated PnL. Earn 10% UNITE." />
            <Card label="LIVE MODE" desc="Real USDC wager. Real trades via Pear. Full UNITE." />
          </div>
        </Step>

        {/* Step 2 */}
        <Step number={2} title="THE DRAFT">
          <p>You and your opponent take turns picking crypto tokens in a snake draft:</p>
          <div className="fc-card p-3 mt-3 space-y-2">
            <DraftRow round={1} label="Round 1-2" weight="25%" desc="Your core positions — highest weight" />
            <DraftRow round={3} label="Round 3-4" weight="15%" desc="Secondary picks — solid conviction plays" />
            <DraftRow round={5} label="Round 5-6" weight="10%" desc="Speculative picks — upside potential" />
            <DraftRow round={7} label="Round 7-8" weight="Bench" desc="Reserves — can sub in during match" />
          </div>
          <p className="mt-3">Each pick has a 30-second timer. If time runs out, auto-pick selects the highest market cap token remaining.</p>
          <p className="mt-2">Snake order means if you pick first in Round 1, your opponent picks first in Round 2. This keeps it fair.</p>
        </Step>

        {/* Step 3 */}
        <Step number={3} title="SET YOUR LINEUP">
          <p>After drafting, assign each token a position:</p>
          <div className="flex gap-2 mt-3">
            <PositionCard type="LONG" color="text-fc-green" emoji="📈" desc="Profit when price goes up" />
            <PositionCard type="SHORT" color="text-red-400" emoji="📉" desc="Profit when price goes down" />
            <PositionCard type="BENCH" color="text-fc-text-dim" emoji="⏸" desc="No PnL — reserves only" />
          </div>
          <p className="mt-3">Then set mandatory Take-Profit (TP) and Stop-Loss (SL) for each active position. These auto-close your position when triggered.</p>
        </Step>

        {/* Step 4 */}
        <Step number={4} title="USE BOOSTS">
          <p>Boosts multiply the weight of a specific position — double or triple down on your highest conviction pick.</p>
          <div className="fc-card p-3 mt-3 space-y-1">
            <TierRow tier="FUN" unite="1K" boosts="0 boosts" multiplier="—" />
            <TierRow tier="SERIOUS" unite="10K" boosts="1 boost" multiplier="up to 2x" />
            <TierRow tier="WHALE" unite="100K" boosts="2 boosts" multiplier="up to 3x" />
          </div>
          <p className="mt-3">A Round 1 pick (25% weight) with a 3x boost becomes 75% of your total PnL. High risk, high reward.</p>
        </Step>

        {/* Step 5 */}
        <Step number={5} title="WATCH & MANAGE">
          <p>Once both lineups are locked, the match goes live. Track real-time PnL for both players. You can close positions early if you want to lock in gains or limit losses. The match ends when the timer runs out (1 Day, 3 Day, or 1 Week).</p>
        </Step>

        {/* Step 6 */}
        <Step number={6} title="SETTLEMENT">
          <p>When the match ends, the total weighted PnL is calculated for each player. The player with the higher PnL wins.</p>
          <div className="fc-card p-3 mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-3xs text-fc-text-dim tracking-wider">Winner receives</span>
              <span className="text-3xs text-fc-green font-mono tracking-wider">95% of total pot</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-3xs text-fc-text-dim tracking-wider">Platform fee</span>
              <span className="text-3xs text-fc-text-muted font-mono tracking-wider">5%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-3xs text-fc-text-dim tracking-wider">UNITE earned (winner)</span>
              <span className="text-3xs text-fc-green font-mono tracking-wider">100 UNITE</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-3xs text-fc-text-dim tracking-wider">UNITE earned (loser)</span>
              <span className="text-3xs text-fc-text-muted font-mono tracking-wider">10 UNITE</span>
            </div>
          </div>
        </Step>

        {/* Leagues */}
        <Step number={7} title="LEAGUES (12-WEEK SEASON)">
          <p>Join a 12-player league for season-long competition. Each week you&apos;re matched head-to-head against a different opponent. Track wins, losses, and cumulative PnL across the season. Top finishers earn bonus UNITE rewards.</p>
          <p className="mt-2">You can invite a co-manager to help manage lineups, or rage quit if things go south (but you&apos;ll forfeit all remaining matches).</p>
        </Step>

        {/* CTA */}
        <div className="fc-card fc-accent-top p-5 text-center space-y-3">
          <p className="text-xs font-mono tracking-widest font-bold text-fc-green">READY TO DRAFT?</p>
          <p className="text-3xs text-fc-text-muted tracking-wider">
            Start with Paper mode for free. No wager required.
          </p>
          <div className="flex gap-2 justify-center mt-2">
            <Link
              href="/lobby"
              className="fc-btn-primary px-4 py-2.5 text-2xs font-mono tracking-widest"
            >
              FIND A MATCH
            </Link>
            <Link
              href="/faq"
              className="fc-btn-secondary px-4 py-2.5 text-2xs font-mono tracking-widest"
            >
              READ FAQ
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ── Subcomponents ──

function Step({ number, title, accent, children }: { number: number; title: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {number > 0 && (
          <span className="w-7 h-7 flex items-center justify-center bg-fc-green/10 text-fc-green text-xs font-mono font-bold shrink-0">
            {number}
          </span>
        )}
        <h2 className={`text-3xs font-mono tracking-widest font-semibold ${accent ? 'text-fc-green' : 'text-fc-text'}`}>
          {title}
        </h2>
      </div>
      <div className="text-3xs text-fc-text-muted tracking-wider leading-relaxed space-y-1 pl-10">
        {children}
      </div>
    </div>
  );
}

function Card({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="fc-card p-3">
      <div className="text-3xs font-mono tracking-widest text-fc-text font-semibold">{label}</div>
      <div className="text-[9px] text-fc-text-dim tracking-wider mt-1">{desc}</div>
    </div>
  );
}

function DraftRow({ round, label, weight, desc }: { round: number; label: string; weight: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] font-mono text-fc-green w-8 shrink-0">{weight}</span>
      <div>
        <span className="text-3xs font-mono tracking-wider text-fc-text">{label}</span>
        <span className="text-[9px] text-fc-text-dim tracking-wider ml-2">— {desc}</span>
      </div>
    </div>
  );
}

function PositionCard({ type, color, emoji, desc }: { type: string; color: string; emoji: string; desc: string }) {
  return (
    <div className="flex-1 fc-card p-3 text-center">
      <div className="text-lg">{emoji}</div>
      <div className={`text-3xs font-mono tracking-widest font-semibold mt-1 ${color}`}>{type}</div>
      <div className="text-[9px] text-fc-text-dim tracking-wider mt-1">{desc}</div>
    </div>
  );
}

function TierRow({ tier, unite, boosts, multiplier }: { tier: string; unite: string; boosts: string; multiplier: string }) {
  return (
    <div className="flex items-center justify-between text-3xs font-mono tracking-wider">
      <span className="text-fc-text">{tier}</span>
      <span className="text-fc-text-dim">{unite} UNITE</span>
      <span className="text-fc-text-muted">{boosts}</span>
      <span className="text-fc-green">{multiplier}</span>
    </div>
  );
}
