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
  estimateHandVsRangeEquity,
  estimateRangeEquity,
  randomFlop,
  RANGE_EQUITY_TIE_BAND,
  sampleActionCombo,
  seededRandom,
  type ConcreteCombo,
  type Flop,
  type HandVsRangeEquityResult,
  type RangeEquityResult,
  type RangeReadingAnswer,
} from '../../src/engine/rangeEquity';
import { colors, radius, spacing } from '../../src/theme';

const ANSWER_LABELS: Record<RangeReadingAnswer, string> = {
  opener: 'Рейзер',
  even: 'Примерно поровну',
  defender: 'Коллер',
};

type ReadingMode = 'ranges' | 'hand';
type DecisionStage = 'range' | 'purpose';
type BetPurpose = 'value' | 'protection' | 'check';

const PURPOSE_LABELS: Record<BetPurpose, string> = {
  value: 'Ставка — добор с более слабых',
  protection: 'Ставка — защита',
  check: 'Не ставить — чек',
};

/** Stable simulation seed for one randomly dealt board. */
function seedForFlop(flop: Flop, question: number): number {
  let hash = (2166136261 ^ question) >>> 0;
  for (const card of flop) {
    for (const character of card) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
  }
  return hash;
}

export default function RangeReadingScreen() {
  const router = useRouter();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [chosen, setChosen] = useState<RangeReadingAnswer | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [flop, setFlop] = useState<Flop>(() => randomFlop());
  const [mode, setMode] = useState<ReadingMode>('ranges');
  const [stage, setStage] = useState<DecisionStage>('range');
  const [purpose, setPurpose] = useState<BetPurpose | null>(null);
  const scenario = RANGE_READING_SCENARIOS[questionIndex % RANGE_READING_SCENARIOS.length];
  const openerNode = getCombinedNode(scenario.openerNodeId);
  const defenderNode = getCombinedNode(scenario.defenderNodeId);

  const heroCards = useMemo<ConcreteCombo | null>(() => {
    if (!openerNode) return null;
    return sampleActionCombo(
      openerNode,
      'raise',
      flop,
      seededRandom(seedForFlop(flop, questionIndex) ^ 0x9e3779b9),
    );
  }, [flop, openerNode, questionIndex]);

  const result = useMemo<RangeEquityResult | null>(() => {
    if (!openerNode || !defenderNode) return null;
    try {
      return estimateRangeEquity({
        openerNode,
        openerAction: 'raise',
        defenderNode,
        defenderAction: 'call',
        flop,
        iterations: 2500,
        seed: seedForFlop(flop, questionIndex),
      });
    } catch {
      return null;
    }
  }, [defenderNode, flop, openerNode, questionIndex]);

  const handEquity = useMemo<HandVsRangeEquityResult | null>(() => {
    if (mode !== 'hand' || !heroCards || !defenderNode) return null;
    try {
      return estimateHandVsRangeEquity({
        heroCards,
        villainNode: defenderNode,
        villainAction: 'call',
        flop,
        iterations: 1800,
        seed: seedForFlop(flop, questionIndex) ^ 0x85ebca6b,
      });
    } catch {
      return null;
    }
  }, [defenderNode, flop, heroCards, mode, questionIndex]);

  function answer(value: RangeReadingAnswer): void {
    if (chosen || !result) return;
    setChosen(value);
    setAnswered((count) => count + 1);
    if (value === result.answer) setCorrect((count) => count + 1);
  }

  function next(): void {
    setChosen(null);
    setStage('range');
    setPurpose(null);
    setFlop(randomFlop());
    setQuestionIndex((index) => index + 1);
  }

  function rerollFlop(): void {
    setChosen(null);
    setStage('range');
    setPurpose(null);
    setFlop(randomFlop());
  }

  function chooseMode(nextMode: ReadingMode): void {
    setMode(nextMode);
    setChosen(null);
    setStage('range');
    setPurpose(null);
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

      <View style={styles.modeSelector}>
        <ModeButton
          label="Только диапазоны"
          description="Определить преимущество диапазона"
          selected={mode === 'ranges'}
          onPress={() => chooseMode('ranges')}
        />
        <ModeButton
          label="Диапазон + рука"
          description="Затем выбрать ставку и её цель"
          selected={mode === 'hand'}
          onPress={() => chooseMode('hand')}
        />
      </View>

      <Card style={styles.storyCard}>
        <View style={styles.questionMeta}>
          <AppText variant="caption" color={colors.muted}>
            ВОПРОС {questionIndex + 1}
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

        {mode === 'hand' && heroCards ? (
          <View style={styles.heroHandBlock}>
            <View style={styles.heroHandCopy}>
              <AppText variant="caption" weight="bold" color={colors.primary}>
                ВАША РУКА · {scenario.opener}
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                После оценки диапазонов вы выберете действие на флопе
              </AppText>
            </View>
            <BoardCards cards={heroCards} size={48} label="Карты героя" />
          </View>
        ) : null}

        <View style={styles.flopBlock}>
          <View style={styles.flopHeader}>
            <AppText variant="caption" weight="bold" color={colors.muted}>
              СЛУЧАЙНЫЙ ФЛОП · 22 100 ВАРИАНТОВ
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Сгенерировать случайный флоп"
              onPress={rerollFlop}
              style={styles.rerollButton}
            >
              <Ionicons name="shuffle" size={16} color={colors.primary} />
              <AppText variant="caption" weight="bold" color={colors.primary}>
                ЕЩЁ
              </AppText>
            </Pressable>
          </View>
          <BoardCards cards={flop} />
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
      ) : mode === 'hand' && stage === 'purpose' ? (
        <Card style={styles.purposeCard}>
          <View style={styles.purposeHeader}>
            <View style={styles.purposeNumber}>
              <AppText weight="black" color={colors.bg}>
                2
              </AppText>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="title" weight="black">
                Решение с вашей рукой
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                Вы играете за {scenario.opener} после колла от {scenario.defender}
              </AppText>
            </View>
          </View>

          {purpose === null ? (
            <>
              <AppText weight="bold">Какую линию вы выбираете на этом флопе?</AppText>
              <PurposeButton
                icon="cash-outline"
                label={PURPOSE_LABELS.value}
                description="Хотим получить колл от рук слабее нашей"
                onPress={() => setPurpose('value')}
              />
              <PurposeButton
                icon="shield-checkmark-outline"
                label={PURPOSE_LABELS.protection}
                description="Хотим лишить более слабые руки их будущего equity"
                onPress={() => setPurpose('protection')}
              />
              <PurposeButton
                icon="pause-outline"
                label={PURPOSE_LABELS.check}
                description="Не ставим на флопе и сохраняем весь диапазон чека"
                onPress={() => setPurpose('check')}
              />
            </>
          ) : (
            <>
              <View style={styles.purposeChosen}>
                <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color={colors.muted}>
                    ВАШ ВЫБОР
                  </AppText>
                  <AppText weight="black">{PURPOSE_LABELS[purpose]}</AppText>
                </View>
              </View>

              {handEquity ? (
                <View style={styles.handEquityCard}>
                  <AppText variant="caption" color={colors.muted}>
                    ШОУДАУН-EQUITY РУКИ ПРОТИВ ДИАПАЗОНА КОЛЛА
                  </AppText>
                  <AppText weight="black" color={colors.primary} style={styles.handEquityValue}>
                    {(handEquity.heroEquity * 100).toFixed(1)}%
                  </AppText>
                  <AppText variant="caption" color={colors.muted}>
                    Расчёт по {handEquity.iterations.toLocaleString('ru-RU')} ранаутам без модели
                    будущих ставок и фолдов.
                  </AppText>
                </View>
              ) : null}

              <View style={styles.honestNote}>
                <Ionicons name="information-circle-outline" size={20} color={colors.gold} />
                <AppText variant="caption" color={colors.muted} style={{ flex: 1 }}>
                  Цель зафиксирована для разбора. Приложение не называет её правильной или
                  ошибочной: для GTO-оценки ставки нужны отдельные postflop solver-данные.
                </AppText>
              </View>
              <Pressable accessibilityRole="button" onPress={next} style={styles.nextButton}>
                <AppText weight="black" color={colors.bg} style={{ fontSize: 17 }}>
                  СЛЕДУЮЩАЯ РАЗДАЧА
                </AppText>
              </Pressable>
            </>
          )}
        </Card>
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
          <Pressable
            accessibilityRole="button"
            onPress={() => (mode === 'hand' ? setStage('purpose') : next())}
            style={styles.nextButton}
          >
            <AppText weight="black" color={colors.bg} style={{ fontSize: 17 }}>
              {mode === 'hand' ? 'К РЕШЕНИЮ НА ФЛОПЕ' : 'СЛЕДУЮЩИЙ ФЛОП'}
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

function ModeButton({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.modeButton, selected ? styles.modeButtonSelected : null]}
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={19}
        color={selected ? colors.primary : colors.muted}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText weight="bold">{label}</AppText>
        <AppText variant="caption" color={colors.muted}>
          {description}
        </AppText>
      </View>
    </Pressable>
  );
}

function PurposeButton({
  icon,
  label,
  description,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.purposeButton, pressed ? { opacity: 0.82 } : null]}
    >
      <View style={styles.purposeIcon}>
        <Ionicons name={icon} size={21} color={colors.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText weight="black">{label}</AppText>
        <AppText variant="caption" color={colors.muted}>
          {description}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
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
  modeSelector: { flexDirection: 'row', gap: spacing.sm },
  modeButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
  },
  modeButtonSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
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
  heroHandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  heroHandCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  flopBlock: { gap: spacing.sm, paddingVertical: spacing.sm },
  flopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rerollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
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
  purposeCard: { gap: spacing.md, borderWidth: 1, borderColor: colors.primaryBorder },
  purposeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  purposeNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  purposeButton: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  purposeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  purposeChosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.primarySoft,
  },
  handEquityCard: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.button,
    backgroundColor: colors.bg,
  },
  handEquityValue: { fontSize: 36, lineHeight: 42 },
  honestNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
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
