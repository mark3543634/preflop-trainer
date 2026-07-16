// =============================================================================
// FeedbackOverlay — shown after each decision. Verdict header (color-coded),
// frequency bar for the hand, stat tiles, one coaching line, and "Next hand".
// =============================================================================
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { DecisionResult, RangeNode } from '../types';
import { colors, radius, spacing, verdictColor } from '../theme';
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
      return `${chosen} — самое частое действие с ${r.hand} в этом споте.`;
    case 'correct':
      return `${chosen} входит в допустимый микс, но ${best} встречается чаще.`;
    case 'inaccuracy':
      return `${chosen} редко используется с ${r.hand}. Предпочтительнее ${best}.`;
    case 'blunder':
      return `${chosen} отсутствует в стратегии для ${r.hand}. Здесь следует выбрать ${best}.`;
  }
}

export function FeedbackOverlay({
  node,
  result,
  rngMode,
  onNext,
  nextLabel = 'Следующая рука',
}: {
  node: RangeNode;
  result: DecisionResult;
  rngMode: boolean;
  onNext: () => void;
  nextLabel?: string;
}) {
  const [rangeVisible, setRangeVisible] = useState(false);
  const vc = verdictColor[result.grade.verdict];
  const scoreText = (result.grade.score > 0 ? '+' : '') + String(result.grade.score);
  const evText = result.grade.evLoss === null ? '—' : `${result.grade.evLoss.toFixed(2)}`;
  const bestText = result.grade.bestActions.map(actionLabel).join(' / ') || '—';

  return (
    <View style={styles.wrap}>
      <View style={[styles.sheet, { borderTopColor: vc }]}>
        <View style={[styles.verdictPill, { backgroundColor: vc }]}>
          <AppText weight="bold" color={colors.bg}>
            {VERDICT_TITLE[result.grade.verdict]}
          </AppText>
        </View>

        <View style={styles.section}>
          <FrequencyBar
            frequencies={result.grade.frequencies}
            order={node.actions}
            chosen={result.chosen}
          />
        </View>

        <View style={styles.tiles}>
          <StatTile label="GTO Score" value={scoreText} color={vc} />
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

        {node.PLACEHOLDER ? (
          <AppText variant="caption" color={colors.muted} style={{ marginBottom: spacing.sm }}>
            ⚠ Тестовые данные — не настоящий solver output.
          </AppText>
        ) : null}

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
        playedHand={result.hand}
        onClose={() => setRangeVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderTopWidth: 4,
    padding: spacing.xl,
    gap: spacing.md,
  },
  verdictPill: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  section: {
    marginTop: spacing.sm,
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
  },
});
