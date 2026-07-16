// =============================================================================
// RangeViewerModal — inspect the full node range without leaving a live drill.
// Strategy and frequencies come exclusively from the current RangeNode.
// =============================================================================
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DecisionResult, HandKey, RangeNode } from '../types';
import { actionColor, colors, radius, spacing, verdictColor } from '../theme';
import { AppText, Button, Card } from './primitives';
import { FrequencyBar, nodeHandFreqs } from './FrequencyBar';
import { HoleCards } from './HoleCards';
import { HeatmapLegend, RangeHeatmap } from './RangeHeatmap';
import { actionLabel, spotTitle, verdictLabel } from './labels';

export function RangeViewerModal({
  visible,
  node,
  result,
  onClose,
}: {
  visible: boolean;
  node: RangeNode;
  result: DecisionResult;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const playedHand = result.hand;
  const [selectedHand, setSelectedHand] = useState<HandKey>(playedHand);

  const gridWidth = Math.min(width - spacing.lg * 2, 390);
  const chosenFrequency = node.hands[playedHand]?.[result.chosen]?.freq ?? 0;
  const chosenColor =
    result.chosen === 'fold'
      ? colors.danger
      : (actionColor[result.chosen] ?? verdictColor[result.grade.verdict]);
  const bestActions = result.grade.bestActions.map(actionLabel).join(' / ') || '—';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="title" weight="black">
              Диапазон спота
            </AppText>
            <AppText variant="caption" color={colors.muted} numberOfLines={1}>
              {spotTitle(node.hero, node.scenario, node.villainPosition)}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть диапазон"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.playedChip, { borderColor: chosenColor }]}>
            <Ionicons name="locate" size={15} color={chosenColor} />
            <AppText variant="caption" weight="bold" color={chosenColor}>
              {playedHand} · Вы выбрали: {actionLabel(result.chosen)}
            </AppText>
          </View>

          <RangeHeatmap
            node={node}
            width={gridWidth}
            highlightedHand={playedHand}
            highlightColor={chosenColor}
            selectedHand={selectedHand}
            onSelectHand={setSelectedHand}
          />
          <HeatmapLegend actions={node.actions} />

          <Card style={styles.handCard}>
            <View style={styles.handHeader}>
              <HoleCards hand={selectedHand} size={38} />
              <View style={styles.handTitle}>
                <AppText variant="title" weight="black">
                  {selectedHand}
                </AppText>
                <AppText variant="caption" color={colors.muted}>
                  {selectedHand === playedHand
                    ? 'Текущая сыгранная рука'
                    : 'Выбранная рука диапазона'}
                </AppText>
              </View>
            </View>
            <FrequencyBar
              frequencies={nodeHandFreqs(node, selectedHand)}
              order={node.actions}
              chosen={selectedHand === playedHand ? result.chosen : undefined}
            />
            {selectedHand === playedHand ? (
              <View style={styles.comparison}>
                <View style={styles.comparisonItem}>
                  <AppText variant="caption" color={colors.muted}>
                    Ваш выбор
                  </AppText>
                  <AppText weight="bold" color={chosenColor}>
                    {actionLabel(result.chosen)}
                  </AppText>
                </View>
                <View style={styles.comparisonItem}>
                  <AppText variant="caption" color={colors.muted}>
                    В диапазоне
                  </AppText>
                  <AppText weight="bold">{Math.round(chosenFrequency * 100)}%</AppText>
                </View>
                <View style={styles.comparisonItem}>
                  <AppText variant="caption" color={colors.muted}>
                    Лучшее
                  </AppText>
                  <AppText weight="bold" color={colors.primary} numberOfLines={1}>
                    {bestActions}
                  </AppText>
                </View>
                <AppText variant="caption" weight="bold" color={verdictColor[result.grade.verdict]}>
                  Оценка решения: {verdictLabel(result.grade.verdict)}
                </AppText>
              </View>
            ) : null}
          </Card>

          <View style={styles.sourceNote}>
            <Ionicons name="information-circle-outline" size={17} color={colors.gold} />
            <AppText variant="caption" color={colors.muted} style={styles.sourceText}>
              Частоты показаны из основного набора диапазонов без изменения или усреднения.
            </AppText>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Вернуться к разбору" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: { flex: 1, minWidth: 0 },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  playedChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  handCard: { gap: spacing.md, marginTop: spacing.sm },
  handHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  handTitle: { flex: 1 },
  comparison: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  comparisonItem: {
    flexGrow: 1,
    minWidth: 90,
    gap: spacing.xs,
  },
  sourceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    padding: spacing.md,
  },
  sourceText: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
