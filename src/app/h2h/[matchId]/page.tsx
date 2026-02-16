import { PageShell } from '@/components/layout';
import { MatchView } from '@/components/match/match-view';

export default function MatchPage({ params }: { params: { matchId: string } }) {
  return (
    <PageShell>
      <MatchView matchId={params.matchId} />
    </PageShell>
  );
}
