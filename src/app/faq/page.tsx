'use client';

import { useState } from 'react';
import { PageShell } from '@/components/layout';
import { cn } from '@/lib/utils';

interface FAQItem {
  q: string;
  a: string;
  category: string;
}

const FAQS: FAQItem[] = [
  // Getting Started
  { category: 'Getting Started', q: 'What do I need to get started?', a: 'A web3 wallet (MetaMask, Phantom, or WalletConnect-compatible) on Arbitrum One. You\'ll need a small amount of ETH on Arbitrum for gas fees. For Live mode, you\'ll also need USDC for wagers. Paper mode is completely free.' },
  { category: 'Getting Started', q: 'Is there a cost to play?', a: 'Paper mode is 100% free — you play with simulated positions and earn 10% of normal UNITE rewards. Live mode requires a USDC wager ($0.50 for Fun tier, $2 for Serious, $10 for Whale). A 5% platform fee is taken from the match pot upon settlement.' },
  { category: 'Getting Started', q: 'What is the UNITE token?', a: 'UNITE is the Fantasy Crypto utility token on Arbitrum. You earn it by winning matches, placing on leaderboards, and referring friends. Stake UNITE to unlock tiers (Fun 1K, Serious 10K, Whale 100K) which determine your wager limits and boost allowances.' },

  // Drafting
  { category: 'Drafting', q: 'How does the draft work?', a: 'In a Full Draft (8 picks per player), you take turns picking crypto tokens in a snake draft order. Each pick has a 30-second timer. If time expires, the system auto-picks for you. Fast Match is a single-pick format. After the draft, you assign each pick as Long, Short, or Bench and set mandatory TP/SL levels.' },
  { category: 'Drafting', q: 'What happens if I disconnect during a draft?', a: 'The auto-pick system will select tokens for you based on market cap ranking from remaining available tokens. You can adjust your lineup after the draft is complete, before the match begins.' },
  { category: 'Drafting', q: 'What is a snake draft?', a: 'In a snake draft, the pick order reverses each round. If you pick first in round 1, you pick last in round 2. This ensures fairness — the player who picks first doesn\'t always get the best tokens.' },
  { category: 'Drafting', q: 'Can I pick the same token as my opponent?', a: 'No. Once a token is drafted, it\'s off the board. This is a core part of the strategy — sometimes you draft defensively to deny your opponent a pick.' },

  // Matches
  { category: 'Matches', q: 'How is the winner determined?', a: 'Each player\'s total weighted PnL is calculated based on their positions. Each pick has a weight (25% for rounds 1-2, 15% for rounds 3-4, 10% for rounds 5-6), a position direction (Long or Short), and optional boost multiplier. The player with the higher total weighted PnL wins.' },
  { category: 'Matches', q: 'What are boosts?', a: 'Boosts multiply the weight of a specific position — essentially going heavier on a high-conviction pick. Fun tier gets 0 boosts, Serious gets 1 boost (up to 2x), Whale gets 2 boosts (up to 3x). Boosts cost UNITE to use.' },
  { category: 'Matches', q: 'What are TP and SL?', a: 'Take-Profit (TP) and Stop-Loss (SL) are mandatory for every active position. TP auto-closes your position when profit hits a target percentage. SL auto-closes when loss hits a threshold. This protects both players from runaway losses and ensures matches resolve within the time limit.' },
  { category: 'Matches', q: 'How long do matches last?', a: 'Matches can be 1 Day (24h), 3 Day (72h), or 1 Week (168h). The match timer starts after both players submit their lineups.' },

  // Live vs Paper
  { category: 'Live vs Paper', q: 'What is the difference between Live and Paper mode?', a: 'Live mode executes real leveraged trades via Pear Protocol on Hyperliquid. USDC wagers are escrowed in a smart contract. Paper mode simulates PnL based on real market prices — no real trades, no wagers. Paper earns 10% of normal UNITE rewards.' },
  { category: 'Live vs Paper', q: 'Can I switch between Live and Paper?', a: 'Yes. You set your preferred mode in your profile. Each match is independently Live or Paper based on the creator\'s choice. You can play Paper and Live matches simultaneously.' },

  // Leagues
  { category: 'Leagues', q: 'How do leagues work?', a: 'Leagues are 12-player, 12-week round-robin competitions. Each week you\'re matched against a different opponent for a head-to-head match. Standings are tracked by win-loss record, with cumulative PnL as a tiebreaker.' },
  { category: 'Leagues', q: 'What is a co-manager?', a: 'You can invite one co-manager to help manage your league lineup. They can set positions (Long/Short/Bench) and use boosts, but cannot rage quit or make wager decisions on your behalf.' },
  { category: 'Leagues', q: 'What happens if I rage quit?', a: 'Rage quitting forfeits all remaining matches for the season. Your opponents for those weeks receive automatic wins, and your wagers are distributed to them. Your record shows as losses. This is irreversible.' },

  // Technical
  { category: 'Technical', q: 'What blockchain does Fantasy Crypto run on?', a: 'Arbitrum One — an Ethereum Layer 2 with fast transactions and low gas fees. The UNITE token, wager vault, and staking contracts are all on Arbitrum.' },
  { category: 'Technical', q: 'What are the gas costs?', a: 'Arbitrum gas fees are typically a few cents per transaction. You\'ll pay gas for: connecting your wallet (free, just a signature), approving USDC (one-time), creating/joining matches (vault interaction), and staking/unstaking UNITE.' },
  { category: 'Technical', q: 'Is Fantasy Crypto open source?', a: 'Our smart contracts will be verified and published on Arbiscan. The frontend is currently closed source. Smart contract audits will be published before mainnet launch.' },

  // Support
  { category: 'Support', q: 'I found a bug. What should I do?', a: 'Please report bugs to bugs@fantasycrypto.gg or reach out on our Discord. If you discover a security vulnerability, please disclose it responsibly — do not exploit it. We may offer bounties for critical findings.' },
  { category: 'Support', q: 'How do I contact support?', a: 'Email support@fantasycrypto.gg or join our Discord community. For urgent issues related to stuck funds, use the emergency channel on Discord.' },
];

export default function FAQPage() {
  const categories = [...new Set(FAQS.map(f => f.category))];
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <PageShell>
      <div className="p-4 pb-12">
        <div className="border-b border-fc-border pb-4 mb-6">
          <h1 className="text-sm font-mono tracking-widest font-bold">FAQ</h1>
          <p className="text-3xs text-fc-text-dim tracking-wider mt-1">Frequently asked questions</p>
        </div>

        {categories.map(cat => (
          <div key={cat} className="mb-6">
            <h2 className="text-3xs font-mono tracking-widest text-fc-green font-semibold mb-2">{cat.toUpperCase()}</h2>
            <div className="space-y-1">
              {FAQS.filter(f => f.category === cat).map((faq, i) => {
                const globalIdx = FAQS.indexOf(faq);
                const isOpen = openId === globalIdx;
                return (
                  <button
                    key={i}
                    onClick={() => setOpenId(isOpen ? null : globalIdx)}
                    className={cn(
                      'w-full text-left fc-card p-3 transition-colors',
                      isOpen && 'border-fc-border-green',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-3xs font-mono tracking-wider text-fc-text">{faq.q}</span>
                      <span className={cn(
                        'text-fc-text-dim text-xs transition-transform shrink-0',
                        isOpen && 'rotate-45',
                      )}>+</span>
                    </div>
                    {isOpen && (
                      <p className="text-3xs text-fc-text-muted tracking-wider leading-relaxed mt-2 border-t border-fc-border pt-2">
                        {faq.a}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
