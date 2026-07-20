// Range-reading tab: learn how two data-backed preflop ranges interact with a flop.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BoardCards } from '../../src/components/BoardCards';
import { AppText, Card } from '../../src/components/primitives';
import { RANGE_READING_SCENARIOS } from '../../src/data/rangeReading';
import { getCombinedNode } from '../../src/data/ranges';
import {
  estimateRangeEquity,
  RANGE_EQUITY_TIE_BAND,
  type RangeEquityResult,
  type RangeReadingAnswer,
} from '../../src/engine/rangeEquity';
import { colors, radius, spacing } from '../../src/theme';

const ANSWER_LABELS: Record<RangeReadingAnswer, string> = {
  opener: 'Рейзер',
  even: 'Примерно поровну',
  defender: 'Коллер',
};

export default function RangeReadingScreen() {
  const router = useRouter();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [chosen, setChosen] = useState<RangeReadingAnswer | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const scenario = RANGE_READING_SCENARIOS[questionIndex % RANGE_READING_SCENARIOS.length];
  const openerNode = getCombinedNode(scenario.openerNodeId);
  const defenderNode = getCombinedNode(scenario.defenderNodeId);

  const result = useMemo<RangeEquityResult | null>(() => {
    if (!openerNode || !defenderNode) return null;
    try {
      return estimateRangeEquity({
        openerNode,
        openerAction: 'raise',
        defenderNode,
        defenderAction: 'call',
        flop: scenario.flop,
        iterations: 2500,
        seed: scenario.seed,
      });
    } catch {
      return null;
    }
  }, [defenderNode, openerNode, scenario]);

  function answer(value: RangeReadingAnswer): void {
    if (chosen || !result) return;
    setChosen(value);
    setAnswered((count) => count + 1);
    if (value === result.answer) setCorrect((count) => count + 1);
  }

  function next(): void {
    setChosen(null);
    setQuestionIndex((index) => (index + 1) % RANGE_READING_SCENARIOS.length);
  }

  function openRange(nodeId: string, providerId: string): void {
    router.push(`/heatmap/${nodeId}?provider=${providerId}`);
  }

  const resolvedAnswer = result
    ? result.answer === 'opener'
      ? scenario.opener
      : result.answer === 'defender'
        ? scenario.defender
        : ANSWER_LABELS.even
    : '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="heading" weight="black">
            Чтение диапазонов
          </AppText>
          <AppText color={colors.muted} style={{ marginTop: spacing.xs }}>
            Определите, чей preflop-диапазон получил больше equity на флопе.
          </AppText>
        </View>
        <View style={styles.scoreChip}>
          <AppText variant="caption" color={colors.muted}>
            Верно
          </AppText>
          <AppText weight="black" color={colors.primary} style={{ fontSize: 20 }}>
            {correct}/{answered}
          </AppText>
        </View>
      </View>

      <Card style={styles.storyCard}>
        <View style={styles.questionMeta}>
          <AppText variant="caption" color={colors.muted}>
            ВОПРОС {questionIndex + 1} ИЗ {RANGE_READING_SCENARIOS.length}
          </AppText>
          <AppText variant="caption" color={colors.muted}>
            100 BB · Cash 6-max
          </AppText>
        </View>

        <View style={styles.actionLine}>
          <PositionBadge position={scenario.opener} active />
          <ActionArrow label={`РЕЙЗ ${scenario.openBB} BB`} />
          <PositionBadge position={scenario.defender} />
          <ActionArrow label="КОЛЛ" last />
        </View>

        <View style={styles.flopBlock}>
          <AppText variant="caption" weight="bold" color={colors.muted} center>
            ФЛОП
          </AppText>
          <BoardCards cards={scenario.flop} />
        </View>

        <AppText variant="title" weight="black" center>
          Чей диапазон лучше попал во флоп?
        </AppText>
        <AppText variant="caption" color={colors.muted} center>
          Сравнивается equity всего диапазона рейза против всего диапазона колла.
        </AppText>
      </Card>

      {!result ? (
        <Card style={styles.unavailable}>
          <Ionicons name="construct-outline" size={24} color={colors.gold} />
          <AppText color={colors.gold} weight="bold">
            Для этой ситуации не хватает данных диапазонов.
          </AppText>
        </Card>
      ) : chosen === null ? (
        <View style={styles.answers}>
          <AnswerButton label={`${scenario.opener} · рейзер`} onPress={() => answer('opener')} />
          <AnswerButton label="Примерно поровну" onPress={() => answer('even')} />
          <AnswerButton
            label={`${scenario.defender} · коллер`}
            onPress={() => answer('defender')}
          />
        </View>
      ) : (
        <Card style={[styles.feedback, chosen === result.answer ? styles.good : styles.bad]}>
          <View style={styles.feedbackHead}>
            <Ionicons
              name={chosen === result.answer ? 'checkmark-circle' : 'close-circle'}
              size={28}
              color={chosen === result.answer ? colors.primary : colors.danger}
            />
            <View style={{ flex: 1 }}>
              <AppText
                variant="title"
                weight="black"
                color={chosen === result.answer ? colors.primary : colors.danger}
              >
                {chosen === result.answer ? 'Верно' : 'Не совсем'}
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                Ответ по расчёту: {resolvedAnswer}
              </AppText>
            </View>
          </View>

          <EquityRow
            leftLabel={`${scenario.opener} · рейз`}
            rightLabel={`${scenario.defender} · колл`}
            left={result.openerEquity}
            right={result.defenderEquity}
          />

          <AppText color={colors.muted}>
            По загруженным preflop-частотам {scenario.opener} имеет{' '}
            {(result.openerEquity * 100).toFixed(1)}% equity, а {scenario.defender} —{' '}
            {(result.defenderEquity * 100).toFixed(1)}%.
          </AppText>
          <AppText variant="caption" color={colors.muted}>
            Оценка по {result.iterations.toLocaleString('ru-RU')} симуляциям. Разница до{' '}
            {(RANGE_EQUITY_TIE_BAND * 100).toFixed(1)} п.п. считается примерно равной. Это сравнение
            equity диапазонов, а не готовая postflop-стратегия.
          </AppText>

          <View style={styles.rangeButtons}>
            <Pressable
              accessibilityRole="button"
              onPress={() => openRange(openerNode!.id, openerNode!.providerId)}
              style={styles.secondaryButton}
            >
              <AppText weight="bold">Диапазон {scenario.opener}</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => openRange(defenderNode!.id, defenderNode!.providerId)}
              style={styles.secondaryButton}
            >
              <AppText weight="bold">Диапазон {scenario.defender}</AppText>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={next} style={styles.nextButton}>
            <AppText weight="black" color={colors.bg} style={{ fontSize: 17 }}>
              СЛЕДУЮЩИЙ ФЛОП
            </AppText>
          </Pressable>
        </Card>
      )}

      <Card style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
        <AppText variant="caption" color={colors.muted} style={{ flex: 1 }}>
          Ответ не записан вручную: приложение удаляет заблокированные карты и считает его из частот
          рейза и колла в текущей библиотеке диапазонов.
        </AppText>
      </Card>
    </ScrollView>
  );
}

function PositionBadge({ position, active = false }: { position: string; active?: boolean }) {
  return (
    <View style={[styles.positionBadge, active ? styles.positionActive : null]}>
      <AppText weight="black" color={active ? colors.bg : colors.text}>
        {position}
      </AppText>
    </View>
  );
}

function ActionArrow({ label, last = false }: { label: string; last?: boolean }) {
  return (
    <View style={styles.actionStep}>
      <Ionicons name={last ? 'return-down-back' : 'arrow-forward'} size={16} color={colors.muted} />
      <AppText variant="caption" weight="bold" color={last ? colors.gold : colors.primary}>
        {label}
      </AppText>
    </View>
  );
}

function AnswerButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.answerButton, pressed ? { opacity: 0.82 } : null]}
    >
      <AppText weight="black" center>
        {label}
      </AppText>
    </Pressable>
  );
}

function EquityRow({
  leftLabel,
  rightLabel,
  left,
  right,
}: {
  leftLabel: string;
  rightLabel: string;
  left: number;
  right: number;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.equityLabels}>
        <AppText variant="caption" weight="bold">
          {leftLabel} · {(left * 100).toFixed(1)}%
        </AppText>
        <AppText variant="caption" weight="bold">
          {(right * 100).toFixed(1)}% · {rightLabel}
        </AppText>
      </View>
      <View style={styles.equityTrack}>
        <View style={{ flex: left, backgroundColor: colors.primary }} />
        <View style={{ flex: right, backgroundColor: colors.gold }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scoreChip: {
    minWidth: 70,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    padding: spacing.sm,
  },
  storyCard: { gap: spacing.lg },
  questionMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  actionLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  positionBadge: {
    minWidth: 50,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  positionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionStep: { alignItems: 'center', gap: 2 },
  flopBlock: { gap: spacing.sm, paddingVertical: spacing.sm },
  answers: { gap: spacing.sm },
  answerButton: {
    minHeight: 56,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  unavailable: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  feedback: { gap: spacing.lg, borderWidth: 1 },
  good: { borderColor: colors.primaryBorder },
  bad: { borderColor: colors.dangerBorder },
  feedbackHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  equityLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  equityTrack: { flexDirection: 'row', height: 14, borderRadius: radius.pill, overflow: 'hidden' },
  rangeButtons: { flexDirection: 'row', gap: spacing.sm },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  nextButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    backgroundColor: colors.primary,
  },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
});
