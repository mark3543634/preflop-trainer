// =============================================================================
// FeedbackOverlay — shown after each decision. Verdict header (color-coded),
// frequency bar for the hand, stat tiles, one coaching line, and "Next hand".
// =============================================================================
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { DecisionResult, RangeNode } from '../types';
import { colors, glow, radius, spacing, verdictColor } from '../theme';
import { AppText, Button } from './primitives';
import { FrequencyBar } from './FrequencyBar';
import { StatTile } from './StatTile';
import { actionLabel } from './labels';
import { t } from '../i18n';
import { RangeViewerModal } from './RangeViewerModal';

const VERDICT_TITLE = {
  best: t('verdict.best'),
  correct: t('verdict.correct'),
  inaccuracy: t('verdict.inaccuracy'),
  blunder: t('verdict.blunder'),
} as const;

function coachingLine(node: RangeNode, r: DecisionResult): string {
  if (node.note) return node.note;
  const best = r.grade.bestActions.map(actionLabel).join(' / ') || '—';
  const chosen = actionLabel(r.chosen);
  switch (r.grade.verdict) {
    case 'best':
      return `${chosen} — самое частое действие с ${r.hand} в выбранном чарте.`;
    case 'correct':
      return `${chosen} входит в допустимый микс, но ${best} встречается чаще.`;
    case 'inaccuracy':
      return `${chosen} редко используется с ${r.hand}. Предпочтительнее ${best}.`;
    case 'blunder':
      return `${chosen} отсутствует в выбранном чарте для ${r.hand}. Здесь указано ${best}.`;
  }
}

export function FeedbackOverlay({
  node,
  result,
  rngMode,
  onNext,
  autoOpenRange = false,
  nextLabel = 'Следующая рука',
}: {
  node: RangeNode;
  result: DecisionResult;
  rngMode: boolean;
  onNext: () => void;
  autoOpenRange?: boolean;
  nextLabel?: string;
}) {
  const [rangeVisible, setRangeVisible] = useState(autoOpenRange);
  const { width, height } = useWindowDimensions();
  const wideLayout = width >= 900 && height >= 650;
  const vc = verdictColor[result.grade.verdict];
  const scoreText = (result.grade.score > 0 ? '+' : '') + String(result.grade.score);
  const evText = result.grade.evLoss === null ? '—' : `${result.grade.evLoss.toFixed(2)}`;
  const bestText = result.grade.bestActions.map(actionLabel).join(' / ') || '—';

  return (
    <View style={[styles.wrap, wideLayout ? styles.wrapWide : null]}>
      <View
        style={[
          styles.sheet,
          wideLayout ? [styles.sheetWide, glow(vc, 24, 0.18)] : null,
          { borderTopColor: vc },
        ]}
      >
        {!wideLayout ? <View style={styles.handle} /> : null}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
        >
          <View style={styles.verdictRow}>
            <View style={[styles.verdictPill, { backgroundColor: vc }]}>
              <AppText weight="black" color={colors.bg}>
                {VERDICT_TITLE[result.grade.verdict]}
              </AppText>
            </View>
            <View style={styles.decisionSummary}>
              <AppText variant="caption" color={colors.muted}>
                РУКА {result.hand}
              </AppText>
              <AppText weight="bold">Вы выбрали: {actionLabel(result.chosen)}</AppText>
            </View>
          </View>

          <View style={styles.section}>
            <AppText variant="caption" color={colors.muted} weight="bold">
              ЧАСТОТЫ ДЕЙСТВИЙ
            </AppText>
            <FrequencyBar
              frequencies={result.grade.frequencies}
              order={node.actions}
              chosen={result.chosen}
            />
          </View>

          <View style={styles.tiles}>
            <StatTile label="Оценка по чарту" value={scoreText} color={vc} />
            <StatTile
              label="Потеря EV (bb)"
              value={evText}
              color={result.grade.evLoss ? colors.gold : colors.muted}
            />
            <StatTile label="Лучшее" value={bestText} color={colors.primary} />
          </View>

          {rngMode && result.grade.rngExpected ? (
            <View style={styles.rngNote}>
              <AppText variant="caption" color={colors.muted}>
                🎲 RNG указал: {actionLabel(result.grade.rngExpected)} (только информация)
              </AppText>
            </View>
          ) : null}

          <AppText variant="body" color={colors.text} style={styles.coach}>
            {coachingLine(node, result)}
          </AppText>

          {node.containsConditionalAdvice ? (
            <AppText variant="caption" color={colors.muted}>
              ⚠ Некоторые действия в исходном чарте зависят от типа соперника. Это не подтверждённые
              solver-frequency.
            </AppText>
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          <Button
            label="Посмотреть диапазон"
            variant="surface"
            onPress={() => setRangeVisible(true)}
            style={{ flex: 1 }}
          />
          <Button label={nextLabel} onPress={onNext} style={{ flex: 1 }} />
        </View>
      </View>
      <RangeViewerModal
        visible={rangeVisible}
        node={node}
        result={result}
        onClose={() => setRangeVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  wrapWide: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderTopWidth: 4,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  sheetWide: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '82%',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  sheetContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  verdictPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  decisionSummary: { minWidth: 130 },
  section: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rngNote: {
    alignItems: 'center',
  },
  coach: {
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
});
