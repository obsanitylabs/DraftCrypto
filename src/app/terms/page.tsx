import { PageShell } from '@/components/layout';

export default function TermsPage() {
  return (
    <PageShell>
      <div className="px-4 py-8 pb-16 space-y-8 max-w-5xl mx-auto">
        <div className="border-b border-fc-border pb-6">
          <h1 className="text-xl font-mono tracking-widest font-bold">TERMS OF SERVICE</h1>
          <p className="text-sm text-fc-text-dim tracking-wider mt-2">Last updated: February 2026</p>
        </div>

        <Section title="1. ACCEPTANCE OF TERMS">
          <p>By accessing or using DraftCrypto (&quot;the Platform&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the Platform. These Terms constitute a legally binding agreement between you and DraftCrypto.</p>
        </Section>

        <Section title="2. ELIGIBILITY">
          <p>You must be at least 18 years old to use the Platform. You represent and warrant that: you are of legal age in your jurisdiction, you have the legal capacity to enter into these Terms, your use of the Platform complies with all applicable laws in your jurisdiction, and you are not located in a jurisdiction where cryptocurrency trading or fantasy gaming is prohibited. You are solely responsible for ensuring compliance with local laws.</p>
        </Section>

        <Section title="3. ACCOUNT & WALLET">
          <p>Your account is identified by your blockchain wallet address. You are solely responsible for: maintaining the security of your wallet and private keys, all activity that occurs through your wallet address, and ensuring you have sufficient funds (ETH for gas, USDC for wagers, UNITE for staking). We will never ask for your private keys or seed phrase. Any message, website, or person requesting this information is fraudulent.</p>
        </Section>

        <Section title="4. PLATFORM SERVICES">
          <p>DraftCrypto provides: head-to-head and league-based crypto portfolio drafting competitions, live and paper (simulated) trade modes, USDC wager escrow via smart contracts, UNITE token rewards and staking, leaderboards and performance tracking, and referral programs. We reserve the right to modify, suspend, or discontinue any feature at any time.</p>
        </Section>

        <Section title="5. MATCHES & WAGERS">
          <p>In Live trade mode, USDC wagers are locked in the DraftCryptoVault smart contract for the duration of the match. A 5% platform fee is deducted from the total pot upon settlement. Match results are determined by the cumulative weighted PnL of each player&apos;s drafted portfolio. Settlement is final once the smart contract executes. In Paper trade mode, no real wagers are placed and PnL is simulated based on live market prices.</p>
        </Section>

        <Section title="6. DRAFTS & FAIR PLAY">
          <p>All participants must complete their draft picks within the allotted time (30 seconds per pick). Failure to pick within the time limit will trigger an auto-pick. Collusion, match-fixing, multi-accounting, exploiting bugs, or any form of manipulation is strictly prohibited and may result in immediate account suspension and forfeiture of wagers and rewards.</p>
        </Section>

        <Section title="7. LEAGUES">
          <p>League participation requires commitment for the full season (12 weeks). Rage quitting a league forfeits all remaining matches and distributes your wagers to opponents. Co-managers share lineup management permissions but cannot rage quit or withdraw wagers on your behalf.</p>
        </Section>

        <Section title="8. UNITE TOKEN">
          <p>UNITE tokens are earned through match wins, league participation, leaderboard placement, and referrals. UNITE is a utility token for platform features (tier access, boosts) and does not represent equity, ownership, or any financial instrument. Staking UNITE is subject to a 7-day unstake cooldown. We reserve the right to adjust reward rates, tier thresholds, and token utility.</p>
        </Section>

        <Section title="9. REFERRAL PROGRAM">
          <p>Each user receives a unique referral code. When a new user connects their wallet using your referral link, both you and the referred user receive 100 UNITE, auto-staked. Referral abuse (self-referral, bot accounts, etc.) will result in forfeiture of referral rewards and potential account suspension.</p>
        </Section>

        <Section title="10. FEES">
          <p>The following fees apply: 5% platform fee on Live mode match pot settlements, Arbitrum network gas fees for on-chain transactions (paid by user), and no fees for Paper mode matches. Fee structures may change with reasonable notice.</p>
        </Section>

        <Section title="11. INTELLECTUAL PROPERTY">
          <p>All content, branding, design, code, and materials on the Platform are owned by DraftCrypto or its licensors. You may not reproduce, distribute, modify, or create derivative works without written permission. User-generated content (ENS names, handles) remains your property.</p>
        </Section>

        <Section title="12. PROHIBITED CONDUCT">
          <p>You agree not to: manipulate matches or collude with other players, use automated bots or scripts to gain unfair advantages, exploit bugs or vulnerabilities (report them instead), create multiple accounts to circumvent restrictions, use the Platform for money laundering or illicit purposes, attempt to reverse-engineer or hack the Platform, or harass, threaten, or abuse other users.</p>
        </Section>

        <Section title="13. DISCLAIMERS">
          <p>The Platform is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. We do not guarantee uninterrupted access, error-free operation, or specific outcomes. Please review the Risk Disclosure for a comprehensive understanding of the risks involved.</p>
        </Section>

        <Section title="14. LIMITATION OF LIABILITY">
          <p>To the maximum extent permitted by law, DraftCrypto shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of funds, data, or goodwill, arising from your use of the Platform.</p>
        </Section>

        <Section title="15. TERMINATION">
          <p>We may suspend or terminate your access to the Platform at any time for violation of these Terms or any other reason. Upon termination: active matches will be settled or cancelled, outstanding wagers will be returned where possible, and earned UNITE tokens will remain accessible for withdrawal if not forfeited due to violations.</p>
        </Section>

        <Section title="16. DISPUTE RESOLUTION">
          <p>Any disputes arising from these Terms shall be resolved through binding arbitration. You agree to waive your right to a jury trial and to participate in class action lawsuits against DraftCrypto.</p>
        </Section>

        <Section title="17. MODIFICATIONS">
          <p>We may update these Terms at any time. Material changes will be communicated via the Platform. Continued use after modifications constitutes acceptance. If you disagree with updated Terms, discontinue use immediately.</p>
        </Section>

        <Section title="18. CONTACT">
          <p>For questions about these Terms: legal@draftcrypto.com</p>
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
