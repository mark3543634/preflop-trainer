// Lesson flow: a data-driven step machine over a lesson's steps
// (concept -> worked example -> drill -> checkpoint). Handles unlock gating
// outcome (mastery), thresholds, and "coming soon" for missing node data.
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { findLesson, lessonAvailable, type LessonStep } from '../../src/data/curriculum';
import { getNode } from '../../src/data/ranges';
import { useSession } from '../../src/store/sessionStore';
import { useProgress } from '../../src/store/progressStore';
import { TrainingView } from '../../src/components/TrainingView';
import { SessionSummaryView } from '../../src/components/SessionSummaryView';
import { AppText, Button, Card, Screen } from '../../src/components/primitives';
import { FrequencyBar, nodeHandFreqs } from '../../src/components/FrequencyBar';
import { HoleCards } from '../../src/components/HoleCards';
import { actionLabel } from '../../src/components/labels';
import { masteryForScore } from '../../src/engine/progression';
import { colors, spacing } from '../../src/theme';
import type { RangeNode, SessionSummary } from '../../src/types';
import { useSettings } from '../../src/store/settingsStore';

export default function LessonRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const found = findLesson(String(id));
  const start = useSession((s) => s.start);
  const replay = useSession((s) => s.replay);
  const recordLessonResult = useProgress((s) => s.recordLessonResult);
  const providerId = useSettings((s) => s.provider);

  const [stepIndex, setStepIndex] = useState(0);
  const [checkpoint, setCheckpoint] = useState<{ summary: SessionSummary; passed: boolean } | null>(null);
  const [lessonDone, setLessonDone] = useState(false);
  const startedRef = useRef<number | null>(null);

  const lesson = found?.lesson;
  const steps = lesson?.steps ?? [];
  const current: LessonStep | undefined = steps[stepIndex];
  const hasCheckpoint = steps.some((s) => s.kind === 'checkpoint');

  // Start a session when entering a drill/checkpoint step (once per step).
  useEffect(() => {
    if (!current) return;
    if (current.kind !== 'drill' && current.kind !== 'checkpoint') return;
    if (startedRef.current === stepIndex) return;
    startedRef.current = stepIndex;

    if (current.kind === 'drill') {
      const node = getNode(providerId, current.nodeId);
      if (!node) return;
      start([node], current.length, {
        title: `${lesson?.title} · тренировка`,
        origin: 'lesson',
        examMode: false,
        awardProgress: true,
      });
    } else {
      const nodes = current.nodeIds.map((nodeId) => getNode(providerId, nodeId)).filter((n): n is RangeNode => !!n);
      if (nodes.length === 0) return;
      start(nodes, current.length, {
        title: `${lesson?.title} · проверка`,
        origin: 'lesson',
        examMode: false,
        awardProgress: true,
      });
    }
  }, [current, stepIndex, lesson, providerId, start]);

  if (!lesson) {
    return (
      <Screen style={styles.center}>
        <AppText color={colors.muted}>Урок не найден.</AppText>
      </Screen>
    );
  }

  if (!lessonAvailable(lesson, providerId)) {
    return (
      <Screen style={styles.center}>
        <AppText variant="title" weight="bold" center>
          🚧 Скоро
        </AppText>
        <AppText color={colors.muted} center style={{ marginTop: spacing.sm }}>
          Для урока требуются лицензированные данные, которых пока нет в публичном наборе.
        </AppText>
        <Button label="Назад" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  function advance() {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) {
      // No checkpoint in this lesson -> completing the last step finishes it.
      if (!hasCheckpoint) {
        recordLessonResult(lesson!.id, lesson!.scoring ? 0 : 0, true);
        setLessonDone(true);
      }
      return;
    }
    setStepIndex(nextIndex);
  }

  // ---- Checkpoint result screen --------------------------------------------
  if (checkpoint) {
    const tier = masteryForScore(checkpoint.summary.gtoScore);
    return (
      <Screen>
        <SessionSummaryView
          summary={checkpoint.summary}
          title={checkpoint.passed ? 'Проверка пройдена ✓' : 'Пока не получилось'}
          subtitle={
            checkpoint.passed
              ? `Уровень: ${masteryLabel(tier)}. Повторите урок для более высокого результата.`
              : `Для завершения нужно 80. Ваш результат: ${checkpoint.summary.gtoScore}.`
          }
          onReplay={() => {
            if (replay()) setCheckpoint(null);
          }}
          onDone={() => router.back()}
          doneLabel={checkpoint.passed ? 'Продолжить' : 'Назад'}
        />
      </Screen>
    );
  }

  // ---- Lesson complete (no-checkpoint lessons) -----------------------------
  if (lessonDone) {
    return (
      <Screen style={styles.center}>
        <AppText variant="heading" weight="black" center>
          Урок завершён ✓
        </AppText>
        <AppText color={colors.muted} center style={{ marginTop: spacing.sm }}>
          {lesson.title}
        </AppText>
        <Button label="Вернуться к пути" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  if (!current) {
    return <Screen style={styles.center} />;
  }

  // ---- Step renderers -------------------------------------------------------
  switch (current.kind) {
    case 'concept':
      return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <StepProgress index={stepIndex} total={steps.length} />
          <Card style={{ gap: spacing.md }}>
            <AppText variant="heading" weight="bold">
              {current.title}
            </AppText>
            <AppText variant="body" color={colors.text} style={{ lineHeight: 22 }}>
              {current.body}
            </AppText>
          </Card>
          <Button label="Понятно" onPress={advance} />
        </ScrollView>
      );

    case 'worked': {
      const node = getNode(providerId, current.nodeId);
      return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <StepProgress index={stepIndex} total={steps.length} />
          <AppText variant="title" weight="bold">
            Примеры с ответами
          </AppText>
          {current.prompt ? (
            <AppText color={colors.muted}>{current.prompt}</AppText>
          ) : null}
          {node
            ? current.hands.map((hand) => {
                const strat = node.hands[hand] ?? {};
                const best = node.actions
                  .map((a) => ({ a, f: strat[a]?.freq ?? 0 }))
                  .sort((x, y) => y.f - x.f)[0];
                return (
                  <Card key={hand} style={{ gap: spacing.sm }}>
                    <View style={styles.workedRow}>
                      <HoleCards hand={hand} size={40} />
                      <AppText weight="bold">
                        Чаще всего: {best ? actionLabel(best.a) : '—'}
                      </AppText>
                    </View>
                    <FrequencyBar frequencies={nodeHandFreqs(node, hand)} order={node.actions} />
                  </Card>
                );
              })
            : null}
          <Button label="Начать тренировку" onPress={advance} />
        </ScrollView>
      );
    }

    case 'drill':
      return (
        <Screen>
          <TrainingView onComplete={() => advance()} feedbackNextLabel="Далее" />
        </Screen>
      );

    case 'checkpoint':
      return (
        <Screen>
          <TrainingView
            feedbackNextLabel="Далее"
            onComplete={(summary) => {
              const passed = summary.gtoScore >= current.threshold;
              recordLessonResult(lesson.id, summary.gtoScore, passed);
              setCheckpoint({ summary, passed });
            }}
          />
        </Screen>
      );
  }
}

function StepProgress({ index, total }: { index: number; total: number }) {
  return (
    <AppText variant="caption" color={colors.muted}>
      Шаг {index + 1} из {total}
    </AppText>
  );
}

function masteryLabel(tier: ReturnType<typeof masteryForScore>): string {
  switch (tier) {
    case 'none':
      return 'Без уровня';
    case 'learned':
      return 'Изучено';
    case 'practiced':
      return 'Отработано';
    case 'mastered':
      return 'Освоено';
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  workedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
