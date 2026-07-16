// Range heatmap viewer for a single node id. Tap a cell to inspect its mix.
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getNode } from '../../src/data/ranges';
import { RangeHeatmap, HeatmapLegend } from '../../src/components/RangeHeatmap';
import { FrequencyBar, nodeHandFreqs } from '../../src/components/FrequencyBar';
import { HoleCards } from '../../src/components/HoleCards';
import { AppText, Card, Screen } from '../../src/components/primitives';
import { spotTitle } from '../../src/components/labels';
import { colors, spacing } from '../../src/theme';
import type { HandKey } from '../../src/types';
import { useSettings } from '../../src/store/settingsStore';
import { isPublicProvider } from '../../src/storage/migrations';

export default function HeatmapRoute() {
  const { id, provider } = useLocalSearchParams<{ id: string; provider?: string }>();
  const activeProvider = useSettings((state) => state.provider);
  const providerId = isPublicProvider(provider) ? provider : activeProvider;
  const node = getNode(providerId, String(id));
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<HandKey | null>(null);

  if (!node) {
    return (
      <Screen style={styles.center}>
        <AppText variant="title" weight="bold">
          🚧 Скоро
        </AppText>
        <AppText color={colors.muted} center style={{ marginTop: spacing.sm }}>
          Для этого спота пока нет диапазона.
        </AppText>
      </Screen>
    );
  }

  const gridWidth = Math.min(width - spacing.lg * 2, 380);
  const strat = selected ? node.hands[selected] ?? {} : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AppText variant="title" weight="bold">
        {spotTitle(node.hero, node.scenario, node.villainPosition)}
      </AppText>
      {node.PLACEHOLDER ? (
        <AppText variant="caption" color={colors.gold}>
          ⚠ Тестовые данные — не настоящий solver output.
        </AppText>
      ) : null}

      <RangeHeatmap node={node} width={gridWidth} onSelectHand={setSelected} />
      <HeatmapLegend actions={node.actions} />

      {selected && strat ? (
        <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <View style={styles.detailHead}>
            <HoleCards hand={selected} size={36} />
            <AppText weight="bold">{selected}</AppText>
          </View>
          <FrequencyBar frequencies={nodeHandFreqs(node, selected)} order={node.actions} />
        </Card>
      ) : (
        <AppText variant="caption" color={colors.muted} center style={{ marginTop: spacing.sm }}>
          Нажмите на ячейку, чтобы увидеть микс действий.
        </AppText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
