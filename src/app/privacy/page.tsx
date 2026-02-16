import { PageShell } from '@/components/layout';

export default function PrivacyPage() {
  return (
    <PageShell>
      <div className="p-4 pb-12 space-y-6">
        <div className="border-b border-fc-border pb-4">
          <h1 className="text-sm font-mono tracking-widest font-bold">PRIVACY POLICY</h1>
          <p className="text-3xs text-fc-text-dim tracking-wider mt-1">Last updated: February 2026</p>
        </div>

        <Section title="1. INFORMATION WE COLLECT">
          <p>Fantasy Crypto collects minimal information necessary to provide our service:</p>
          <p><strong>Wallet Information:</strong> Your public wallet address (Ethereum/Arbitrum) used to authenticate and interact with the platform. We do not have access to your private keys or seed phrases.</p>
          <p><strong>On-Chain Data:</strong> Transaction data related to USDC wagers, UNITE token staking, and match settlements on the Arbitrum network. This data is publicly available on the blockchain.</p>
          <p><strong>Optional Profile Data:</strong> ENS name, X (Twitter) handle, and Telegram handle if you choose to provide them.</p>
          <p><strong>Usage Data:</strong> Match history, draft picks, PnL records, and league participation for leaderboard and analytics purposes.</p>
          <p><strong>Email Address:</strong> Only if you voluntarily join our waitlist or subscribe to notifications.</p>
          <p><strong>Referral Data:</strong> Referral codes and the wallet addresses of referred users for UNITE reward distribution.</p>
        </Section>

        <Section title="2. HOW WE USE YOUR INFORMATION">
          <p>We use collected information to: authenticate your identity via wallet signature verification, facilitate match creation and settlement, calculate and display PnL and leaderboard rankings, distribute UNITE token rewards, process referral bonuses, improve our platform and user experience, and send notifications about matches and account activity (if opted in).</p>
        </Section>

        <Section title="3. BLOCKCHAIN TRANSPARENCY">
          <p>Fantasy Crypto operates on the Arbitrum blockchain. By nature, blockchain transactions are public, immutable, and transparent. Your wallet address and associated on-chain transactions (wagers, settlements, staking) are visible to anyone on the public ledger. We cannot delete or modify blockchain data.</p>
        </Section>

        <Section title="4. DATA SHARING">
          <p>We do not sell, rent, or trade your personal information to third parties. We may share data with: Pear Protocol for trade execution on Hyperliquid (only if you use Live trade mode), blockchain infrastructure providers for RPC access and transaction processing, and law enforcement if required by applicable law.</p>
        </Section>

        <Section title="5. DATA RETENTION">
          <p>Off-chain data (profile information, match history, email addresses) is retained for the duration of your account activity. You may request deletion of off-chain data by contacting us. On-chain data cannot be deleted due to the immutable nature of blockchain technology.</p>
        </Section>

        <Section title="6. COOKIES & TRACKING">
          <p>Fantasy Crypto uses local storage to maintain your authentication session (JWT token). We do not use third-party tracking cookies or advertising pixels. We may use privacy-respecting analytics to understand aggregate usage patterns.</p>
        </Section>

        <Section title="7. SECURITY">
          <p>We employ industry-standard security measures including: wallet-based authentication (no passwords stored), encrypted communication (TLS), server-side encryption for sensitive data (Pear Protocol JWT tokens), and smart contract security audits before mainnet deployment. Despite these measures, no system is 100% secure. Use the platform at your own risk.</p>
        </Section>

        <Section title="8. YOUR RIGHTS">
          <p>You may: request a copy of your off-chain data, request deletion of your off-chain data, opt out of email communications at any time, and disconnect your wallet and stop using the platform at any time. To exercise these rights, contact us at privacy@fantasycrypto.gg.</p>
        </Section>

        <Section title="9. AGE RESTRICTION">
          <p>Fantasy Crypto is intended for users aged 18 and older. We do not knowingly collect information from individuals under 18. If you believe a minor has provided us with personal information, please contact us immediately.</p>
        </Section>

        <Section title="10. CHANGES TO THIS POLICY">
          <p>We may update this Privacy Policy from time to time. Material changes will be communicated through the platform. Continued use after changes constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="11. CONTACT">
          <p>For privacy-related inquiries: privacy@fantasycrypto.gg</p>
        </Section>
      </div>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-3xs font-mono tracking-widest text-fc-green font-semibold">{title}</h2>
      <div className="text-3xs text-fc-text-muted tracking-wider leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}
