'use client';

import { SectionTitle, Card } from '@/components/ui';

const STEPS = [
  { n: '01', title: 'Connect', desc: 'Link wallet via WalletConnect or Phantom' },
  { n: '02', title: 'Draft', desc: 'Pick tokens in a live snake draft (30s turns)' },
  { n: '03', title: 'Compete', desc: 'Set Long/Short lineup and track live PnL' },
  { n: '04', title: 'Win', desc: 'Beat your opponent, collect the pot + UNITE' },
];

export function LandingHowItWorks() {
  return (
    <div className="mb-7">
      <SectionTitle>How It Works</SectionTitle>
      <div className="grid grid-cols-2 gap-1.5">
        {STEPS.map((s) => (
          <Card key={s.n} className="p-3">
            <div className="text-lg font-bold text-fc-green opacity-50 mb-1">{s.n}</div>
            <div className="text-2xs font-bold mb-1">{s.title}</div>
            <div className="text-3xs text-fc-text-muted leading-relaxed">{s.desc}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
