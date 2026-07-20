// =============================================================================
// SessionSummaryView — end-of-session results (sandbox / review).
// =============================================================================
import { ScrollView, StyleSheet, View } from 'react-native';
import type { SessionSummary } from '../types';
import { colors, spacing, verdictColor } from '../theme';
import { AppText, Button, Card } from './primitives';
import { StatTile } from './StatTile';
import { actionLabel, spotTitle, verdictLabel } from './labels';
import { getNode } from '../data/ranges';

export function SessionSummaryView({
  summary,
  title,
  subtitle,
  onReplay,
  onReviewMistakes,
  onDone,
  doneLabel = 'Готово',
}: {
  summary: SessionSummary;
  title: string;
  subtitle?: string;
  onReplay?: () => void;
  onReviewMistakes?: () => void;
  onDone: () => void;
  doneLabel?: string;
}) {
  const scoreColor =
    summary.gtoScore >= 80 ? colors.primary : summary.gtoScore >= 50 ? colors.gold : colors.danger;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppText variant="heading" weight="black" center>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="body" color={colors.muted} center style={{ marginTop: 4 }}>
          {subtitle}
        </AppText>
      ) : null}

      <View style={styles.scoreWrap}>
        <AppText variant="caption" color={colors.muted}>
          СОВПАДЕНИЕ С ЧАРТОМ
        </AppText>
        <AppText weight="black" color={scoreColor} style={{ fontSize: 64 }}>
          {summary.gtoScore}
        </AppText>
      </View>

      <View style={styles.tiles}>
        <StatTile label="Руки" value={String(summary.handsPlayed)} />
        <StatTile
          label="Средняя потеря EV"
          value={summary.evHands === 0 ? '—' : summary.avgEvLoss.toFixed(2)}
          color={colors.gold}
          sub={summary.evHands === 0 ? 'Нет EV в источнике' : 'bb'}
        />
        <StatTile
          label="Ошибки"
          value={String(summary.mistakes.length)}
          color={summary.mistakes.length ? colors.danger : colors.primary}
        />
      </View>

      {summary.mistakes.length > 0 ? (
        <View style={styles.mistakes}>
          <AppText variant="title" weight="bold" style={{ marginBottom: spacing.sm }}>
            Повторить ошибки
          </AppText>
          {summary.mistakes.map((m, i) => {
            const node = getNode(m.providerId, m.nodeId);
            return (
              <Card key={`${m.nodeId}-${m.hand}-${i}`} style={styles.mistakeRow}>
                <View style={{ flex: 1 }}>
                  <AppText weight="bold">{m.hand}</AppText>
                  <AppText variant="caption" color={colors.muted}>
                    {node ? spotTitle(node.hero, node.scenario, node.villainPosition) : m.nodeId}
                  </AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText weight="bold" color={verdictColor[m.grade.verdict]}>
                    {verdictLabel(m.grade.verdict)}
                  </AppText>
                  <AppText variant="caption" color={colors.muted}>
                    вы: {actionLabel(m.chosen)} → лучше:{' '}
                    {m.grade.bestActions.map(actionLabel).join('/')}
                  </AppText>
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <AppText center color={colors.primary} style={{ marginTop: spacing.lg }}>
          Ошибок в этой сессии нет.
        </AppText>
      )}

      <View style={styles.actions}>
        {onReviewMistakes && summary.mistakes.length > 0 ? (
          <Button
            label="Разобрать ошибки"
            variant="surface"
            onPress={onReviewMistakes}
            style={{ flex: 1.4 }}
          />
        ) : null}
        {onReplay ? (
          <Button label="Повторить" variant="surface" onPress={onReplay} style={{ flex: 1 }} />
        ) : null}
        <Button label={doneLabel} onPress={onDone} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  scoreWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mistakes: {
    marginTop: spacing.md,
  },
  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
