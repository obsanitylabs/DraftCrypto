'use client';

import { SectionTitle, Card } from '@/components/ui';

const STEPS = [
  { n: '01', title: 'Connect', desc: 'Link wallet via WalletConnect or Phantom', icon: '🔗' },
  { n: '02', title: 'Draft', desc: 'Pick tokens in a live snake draft (30s turns)', icon: '🎯' },
  { n: '03', title: 'Compete', desc: 'Set Long/Short lineup and track live PnL', icon: '⚡' },
  { n: '04', title: 'Win', desc: 'Beat your opponent, collect the pot + UNITE', icon: '🏆' },
];

export function LandingHowItWorks() {
  return (
    <div className="mb-12" id="how-it-works">
      <SectionTitle>How It Works</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STEPS.map((s) => (
          <Card key={s.n} className="p-5 group hover:border-fc-border-green transition-all duration-300">
            <div className="text-2xl mb-3">{s.icon}</div>
            <div className="text-3xl font-bold text-fc-green/20 mb-2 group-hover:text-fc-green/40 transition-colors">{s.n}</div>
            <div className="text-sm font-bold mb-2">{s.title}</div>
            <div className="text-sm text-fc-text-muted leading-relaxed">{s.desc}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
