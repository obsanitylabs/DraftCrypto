import { PageShell } from '@/components/layout';
import { LineupManager } from '@/components/draft/lineup-manager';

export default function LineupPage({ params }: { params: { matchId: string } }) {
  return (
    <PageShell>
      <LineupManager matchId={params.matchId} />
    </PageShell>
  );
}
