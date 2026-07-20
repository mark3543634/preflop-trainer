// Review route: drills the spaced-repetition mistake queue (due items).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { TrainingView } from '../src/components/TrainingView';
import { SessionSummaryView } from '../src/components/SessionSummaryView';
import { AppText, Button, Screen } from '../src/components/primitives';
import { useReview } from '../src/store/reviewStore';
import { useSession, planFromPairs } from '../src/store/sessionStore';
import { colors, spacing } from '../src/theme';
import type { SessionSummary } from '../src/types';

export default function ReviewRoute() {
  const router = useRouter();
  const startWithPlan = useSession((s) => s.startWithPlan);
  const session = useSession((s) => s.session);
  const [done, setDone] = useState<SessionSummary | null>(null);
  const initRef = useRef(false);
  const reviewPlan = useMemo(() => {
    const due = useReview.getState().due();
    return planFromPairs(
      due.map((item) => ({
        providerId: item.providerId,
        nodeId: item.nodeId,
        hand: item.hand,
      })),
    );
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (reviewPlan.plan.length === 0) return;
    startWithPlan(reviewPlan.nodes, reviewPlan.plan, {
      title: 'Очередь повторения',
      origin: 'review',
      examMode: false,
    });
  }, [reviewPlan, startWithPlan]);

  if (reviewPlan.plan.length === 0) {
    return (
      <Screen
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <AppText variant="title" weight="bold" center>
          Пока нечего повторять
        </AppText>
        <AppText color={colors.muted} center>
          Очередь пуста. Ошибки из тренировок появятся здесь по расписанию интервальных повторений.
        </AppText>
        <Button label="Назад" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen>
        <SessionSummaryView
          summary={done}
          title="Повторение завершено"
          subtitle="Верные ответы увеличивают интервал, ошибки начинают цикл заново."
          onDone={() => router.back()}
        />
      </Screen>
    );
  }

  if (!session) return <Screen />;

  return (
    <Screen>
      <TrainingView onComplete={(summary) => setDone(summary)} feedbackNextLabel="Далее" />
    </Screen>
  );
}
