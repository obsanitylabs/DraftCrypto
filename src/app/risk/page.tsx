import { PageShell } from '@/components/layout';

export default function RiskPage() {
  return (
    <PageShell>
      <div className="px-4 py-8 pb-16 space-y-8 max-w-3xl mx-auto">
        <div className="border-b border-fc-border pb-6">
          <h1 className="text-xl font-mono tracking-widest font-bold">RISK DISCLOSURE</h1>
          <p className="text-sm text-fc-text-dim tracking-wider mt-2">Last updated: February 2026</p>
        </div>

        <div className="fc-card border-yellow-500/30 bg-yellow-950/10 p-5">
          <p className="text-sm text-yellow-300 tracking-wider leading-relaxed font-semibold">
            ⚠ IMPORTANT: Please read this disclosure carefully before using DraftCrypto. By using the platform, you acknowledge and accept all risks described below.
          </p>
        </div>

        <Section title="1. CRYPTOCURRENCY VOLATILITY">
          <p>Cryptocurrency prices are highly volatile and can experience extreme fluctuations within short periods. The value of your positions may increase or decrease rapidly and significantly. Past performance does not guarantee future results. You could lose all of your wager in a single match.</p>
        </Section>

        <Section title="2. LEVERAGED TRADING RISK">
          <p>DraftCrypto utilizes leveraged positions through Pear Protocol on Hyperliquid. In Live trade mode, your positions carry up to 3x base leverage, and up to 9x with boost multipliers. Leverage amplifies both gains and losses. A small adverse price movement can result in the complete loss of your position. Take-profit and stop-loss parameters are mandatory but do not guarantee execution at the specified prices, particularly during periods of high volatility or low liquidity.</p>
        </Section>

        <Section title="3. SMART CONTRACT RISK">
          <p>DraftCrypto uses smart contracts deployed on the Arbitrum blockchain for USDC wager escrow and UNITE token staking. Smart contracts may contain bugs, vulnerabilities, or design flaws that could lead to loss of funds. While we conduct security audits, no audit can guarantee the absence of vulnerabilities. You interact with smart contracts at your own risk.</p>
        </Section>

        <Section title="4. PROTOCOL & COUNTERPARTY RISK">
          <p>DraftCrypto depends on third-party protocols including Pear Protocol, Hyperliquid, and Arbitrum. Any disruption, hack, exploit, or failure of these protocols could affect your positions, wagers, or access to the platform. We are not responsible for losses caused by third-party protocol failures.</p>
        </Section>

        <Section title="5. WAGER RISK">
          <p>In Live trade mode, USDC wagers are escrowed in a smart contract. If you lose a head-to-head match, you will lose your entire wager minus the platform fee. In league play, losing multiple weeks can result in cumulative wager losses over the season. Only wager what you can afford to lose.</p>
        </Section>

        <Section title="6. LIQUIDITY RISK">
          <p>Certain cryptocurrency markets may have limited liquidity, leading to slippage, delayed execution, or inability to close positions at desired prices. During extreme market conditions, normal market operations may be disrupted.</p>
        </Section>

        <Section title="7. REGULATORY RISK">
          <p>The regulatory landscape for cryptocurrency, DeFi, and fantasy trading is evolving. Changes in laws or regulations could restrict or prohibit the use of DraftCrypto in certain jurisdictions. It is your responsibility to ensure that using this platform complies with the laws applicable in your jurisdiction. DraftCrypto is not available to residents of jurisdictions where such services are prohibited.</p>
        </Section>

        <Section title="8. TECHNOLOGY RISK">
          <p>Using DraftCrypto requires: a compatible web3 wallet, reliable internet connection, and sufficient ETH on Arbitrum for gas fees. Technical failures including network congestion, wallet malfunctions, browser incompatibilities, or API downtime could prevent you from managing positions, completing drafts, or submitting lineups in a timely manner. Auto-pick will be used if you fail to make a draft selection within the time limit.</p>
        </Section>

        <Section title="9. UNITE TOKEN RISK">
          <p>UNITE is a utility token used within the DraftCrypto ecosystem. The value of UNITE may fluctuate and is not guaranteed. Staking UNITE is subject to a 7-day unstake cooldown, during which you cannot access your staked tokens. UNITE tokens should not be considered an investment or financial instrument.</p>
        </Section>

        <Section title="10. NO FINANCIAL ADVICE">
          <p>Nothing on DraftCrypto constitutes financial, investment, trading, or other advice. All decisions to participate in matches, wagers, or staking are made solely by you. We strongly recommend consulting with a qualified financial advisor before engaging in any cryptocurrency or leveraged trading activity.</p>
        </Section>

        <Section title="11. LIMITATION OF LIABILITY">
          <p>DraftCrypto, its team, affiliates, and partners shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the platform, including but not limited to loss of wagers, adverse PnL, smart contract failures, or third-party protocol disruptions.</p>
        </Section>

        <Section title="12. ACKNOWLEDGMENT">
          <p>By connecting your wallet and using DraftCrypto, you acknowledge that you have read, understood, and accepted all risks described in this disclosure. You confirm that you are at least 18 years old and legally able to participate in cryptocurrency trading and fantasy gaming in your jurisdiction.</p>
        </Section>
      </div>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-mono tracking-widest text-fc-green font-semibold">{title}</h2>
      <div className="text-sm text-fc-text-muted tracking-wider leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
}
