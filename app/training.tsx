// Training route for Sandbox / Review drills. Renders the shared TrainingView,
// then the session summary when the drill finishes.
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { TrainingView } from '../src/components/TrainingView';
import { SessionSummaryView } from '../src/components/SessionSummaryView';
import { Screen } from '../src/components/primitives';
import { planFromPairs, useSession } from '../src/store/sessionStore';
import { xpForResult } from '../src/engine/progression';
import type { SessionSummary } from '../src/types';

export default function TrainingRoute() {
  const router = useRouter();
  const replay = useSession((s) => s.replay);
  const startWithPlan = useSession((s) => s.startWithPlan);
  const meta = useSession((s) => s.lastMeta);
  const finishReason = useSession((s) => s.finishReason);
  const [done, setDone] = useState<SessionSummary | null>(null);

  if (done) {
    const xp = meta?.awardProgress ? xpForResult(done.handsPlayed, done.gtoScore) : undefined;
    return (
      <Screen>
        <SessionSummaryView
          summary={done}
          title={finishReason === 'mistake_cap' ? 'Экзамен завершён' : 'Сессия завершена'}
          subtitle={
            finishReason === 'mistake_cap'
              ? `Достигнут лимит ошибок · ${meta?.title ?? ''}`
              : meta?.title
          }
          xpEarned={xp}
          onReplay={() => {
            if (replay()) setDone(null);
          }}
          onReviewMistakes={
            done.mistakes.length > 0
              ? () => {
                  const mistakePlan = planFromPairs(
                    done.mistakes.map((mistake) => ({
                      providerId: mistake.providerId,
                      nodeId: mistake.nodeId,
                      hand: mistake.hand,
                    })),
                  );
                  if (mistakePlan.plan.length === 0) return;
                  startWithPlan(mistakePlan.nodes, mistakePlan.plan, {
                    title: 'Работа над ошибками',
                    origin: 'sandbox',
                    examMode: false,
                    awardProgress: true,
                  });
                  setDone(null);
                }
              : undefined
          }
          onDone={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <TrainingView onComplete={(summary) => setDone(summary)} />
    </Screen>
  );
}
