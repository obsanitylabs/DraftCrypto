import { PageShell } from '@/components/layout';
import { DraftRoom } from '@/components/draft/draft-room';

export default function DraftPage({ params }: { params: { matchId: string } }) {
  return (
    <PageShell>
      <DraftRoom matchId={params.matchId} />
    </PageShell>
  );
}
