// ═══════════════════════════════════════════════════════
// DraftCrypto — Lobby Page
// ═══════════════════════════════════════════════════════

import { PageShell } from '@/components/layout';
import { LobbyContent } from '@/components/lobby/lobby-content';

export default function LobbyPage() {
  return (
    <PageShell>
      <LobbyContent />
    </PageShell>
  );
}
