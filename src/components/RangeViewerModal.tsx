// =============================================================================
// RangeViewerModal — inspect the full node range without leaving a live drill.
// Strategy and frequencies come exclusively from the current RangeNode.
// =============================================================================
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HandKey, RangeNode } from '../types';
import { rangeSource } from '../data/ranges';
import { colors, radius, spacing } from '../theme';
import { AppText, Button, Card } from './primitives';
import { FrequencyBar, nodeHandFreqs } from './FrequencyBar';
import { HoleCards } from './HoleCards';
import { HeatmapLegend, RangeHeatmap } from './RangeHeatmap';
import { spotTitle } from './labels';

export function RangeViewerModal({
  visible,
  node,
  playedHand,
  onClose,
}: {
  visible: boolean;
  node: RangeNode;
  playedHand: HandKey;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const [selectedHand, setSelectedHand] = useState<HandKey>(playedHand);

  const gridWidth = Math.min(width - spacing.lg * 2, 390);
  const source = rangeSource(node.providerId);

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
          <View style={styles.playedChip}>
            <Ionicons name="locate" size={15} color={colors.primary} />
            <AppText variant="caption" weight="bold" color={colors.primary}>
              {playedHand} — сыгранная рука выделена рамкой
            </AppText>
          </View>

          <RangeHeatmap
            node={node}
            width={gridWidth}
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
            <FrequencyBar frequencies={nodeHandFreqs(node, selectedHand)} order={node.actions} />
          </Card>

          <View style={styles.sourceNote}>
            <Ionicons name="information-circle-outline" size={17} color={colors.gold} />
            <AppText variant="caption" color={colors.muted} style={styles.sourceText}>
              Источник: {source.title} · {source.license}. Частоты показаны напрямую из данных
              выбранного пака.
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
    borderColor: colors.primaryDim,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  handCard: { gap: spacing.md, marginTop: spacing.sm },
  handHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  handTitle: { flex: 1 },
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
