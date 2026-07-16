// Stats tab: GTO score + trend, totals, ranked biggest-leak cards, range viewer.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStats } from '../../src/store/statsStore';
import { useSession } from '../../src/store/sessionStore';
import { useSettings } from '../../src/store/settingsStore';
import { allCombinedNodes, getCombinedNode, getNode } from '../../src/data/ranges';
import { accuracy, mergeStatsByNodeId, sortLeaks, type NodeStat } from '../../src/engine/leaks';
import { AppText, Button, Card } from '../../src/components/primitives';
import { StatTile } from '../../src/components/StatTile';
import { RangeHeatmap } from '../../src/components/RangeHeatmap';
import { RangeNodePickerModal } from '../../src/components/RangeNodePickerModal';
import { spotTitle } from '../../src/components/labels';
import { colors, glow, radius, spacing } from '../../src/theme';

export default function StatsScreen() {
  const router = useRouter();
  const globalScore = useStats((s) => s.globalGtoScore());
  const totalDecisions = useStats((s) => s.totalDecisions);
  const gtoHistory = useStats((s) => s.gtoHistory);
  const perNode = useStats((s) => s.perNode);
  const allLeaks = useMemo(
    () =>
      sortLeaks(
        mergeStatsByNodeId(Object.values(perNode), (nodeId) => getCombinedNode(nodeId)?.providerId),
      ),
    [perNode],
  );
  const start = useSession((s) => s.start);
  const leaks = allLeaks;
  const { width } = useWindowDimensions();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const accuracyPct = Math.max(0, Math.min(100, globalScore));
  const evHands = leaks.reduce((a, s) => a + s.evHands, 0);
  const evSum = leaks.reduce((a, s) => a + s.sumEvLoss, 0);
  const overallEv = evHands === 0 ? 0 : evSum / evHands;

  function drillNode(stat: NodeStat) {
    const node = getNode(stat.providerId, stat.nodeId);
    if (!node) return;
    start([node], 15, {
      title: spotTitle(node.hero, node.scenario, node.villainPosition),
      origin: 'sandbox',
      examMode: useSettings.getState().examMode,
      examMistakeCap: useSettings.getState().examMistakeCap,
      awardProgress: true,
    });
    router.push('/training');
  }

  const providerNodes = allCombinedNodes();
  const previewNode =
    (selectedNodeId && getCombinedNode(selectedNodeId)) ||
    (leaks[0] && getNode(leaks[0].providerId, leaks[0].nodeId)) ||
    providerNodes[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* GTO score */}
      <View style={[styles.scoreCard, glow(colors.primary, 16, 0.18)]}>
        <View>
          <AppText variant="caption" color={colors.muted}>
            СОВПАДЕНИЕ С ЧАРТОМ
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <AppText weight="black" style={{ fontSize: 56 }}>
              {globalScore}
            </AppText>
            <AppText color={colors.muted} style={{ fontSize: 24 }}>
              {' '}
              / 100
            </AppText>
          </View>
        </View>
        <Trend history={gtoHistory} />
      </View>

      <View style={styles.tiles}>
        <StatTile label="Руки" value={totalDecisions.toLocaleString()} />
        <StatTile label="Точность" value={`${accuracyPct}%`} color={colors.primary} />
        <StatTile
          label="Средняя потеря EV"
          value={evHands === 0 ? '—' : overallEv.toFixed(2)}
          color={colors.gold}
          sub={evHands === 0 ? 'Нет EV в источнике' : 'bb'}
        />
      </View>

      <AppText variant="title" weight="bold" style={{ marginTop: spacing.sm }}>
        Главные зоны повторения
      </AppText>
      {leaks.length === 0 ? (
        <Card>
          <AppText color={colors.muted}>
            Данных пока нет. Пройдите несколько тренировок — здесь появятся споты с наивысшим
            приоритетом повторения.
          </AppText>
        </Card>
      ) : (
        leaks
          .slice(0, 6)
          .map((stat, i) => (
            <LeakCard
              key={`${stat.providerId}:${stat.nodeId}`}
              stat={stat}
              rank={i + 1}
              onDrill={() => drillNode(stat)}
              onView={() => router.push(`/heatmap/${stat.nodeId}?provider=${stat.providerId}`)}
            />
          ))
      )}

      <AppText variant="title" weight="bold" style={{ marginTop: spacing.md }}>
        Просмотр диапазона
      </AppText>
      <AppText variant="caption" color={colors.muted}>
        Единая библиотека · спотов: {providerNodes.length}
      </AppText>
      {previewNode ? (
        <Card style={styles.rangeCard}>
          <View style={styles.rangeHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Сменить спот для просмотра"
              onPress={() => setPickerVisible(true)}
              style={{ flex: 1 }}
            >
              <AppText variant="caption" color={colors.muted}>
                ВЫБРАННЫЙ СПОТ
              </AppText>
              <AppText weight="bold">
                {spotTitle(previewNode.hero, previewNode.scenario, previewNode.villainPosition)}
              </AppText>
            </Pressable>
            <Button label="Сменить" variant="surface" onPress={() => setPickerVisible(true)} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Открыть весь диапазон"
            onPress={() =>
              router.push(`/heatmap/${previewNode.id}?provider=${previewNode.providerId}`)
            }
            style={styles.rangePreview}
          >
            <RangeHeatmap node={previewNode} width={Math.min(width - 80, 320)} />
            <AppText variant="caption" color={colors.primary}>
              Открыть весь диапазон ›
            </AppText>
          </Pressable>
        </Card>
      ) : null}
      <RangeNodePickerModal
        visible={pickerVisible}
        nodes={providerNodes}
        selectedNodeId={previewNode?.id}
        onSelect={(node) => {
          setSelectedNodeId(node.id);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />
    </ScrollView>
  );
}

function LeakCard({
  stat,
  rank,
  onDrill,
  onView,
}: {
  stat: NodeStat;
  rank: number;
  onDrill: () => void;
  onView: () => void;
}) {
  const node = getNode(stat.providerId, stat.nodeId);
  const acc = accuracy(stat);
  const severity = Math.max(0.05, Math.min(1, (100 - acc) / 100)); // longer red bar = worse
  const metric = `${acc}% по чарту · приоритет повторения`;
  return (
    <View style={styles.leakCard}>
      <View style={styles.leakHead}>
        <AppText weight="black" color={colors.danger} style={styles.rank}>
          {rank}
        </AppText>
        <Pressable style={{ flex: 1 }} onPress={onView}>
          <AppText weight="bold">
            {node ? spotTitle(node.hero, node.scenario, node.villainPosition) : stat.nodeId}
          </AppText>
          <AppText variant="caption" color={colors.danger}>
            {metric} · рук: {stat.hands}
          </AppText>
        </Pressable>
        <Button label="Тренировать" onPress={onDrill} />
      </View>
      <View style={styles.leakTrack}>
        <View style={[styles.leakFill, { width: `${Math.round(severity * 100)}%` }]} />
      </View>
    </View>
  );
}

function Trend({ history }: { history: number[] }) {
  if (history.length === 0) {
    return <Ionicons name="trending-up" size={40} color={colors.muted} />;
  }
  const recent = history.slice(-16);
  return (
    <View style={styles.spark}>
      {recent.map((v, i) => {
        const h = 6 + Math.max(0, Math.min(100, v)) * 0.34;
        const c = v >= 80 ? colors.primary : v >= 50 ? colors.gold : colors.danger;
        return (
          <View key={i} style={{ width: 5, height: h, backgroundColor: c, borderRadius: 2 }} />
        );
      })}
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
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  scoreCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 44 },
  leakCard: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.button,
    padding: spacing.md,
    gap: spacing.sm,
  },
  leakHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rank: { width: 20, textAlign: 'center', fontSize: 18 },
  leakTrack: {
    height: 6,
    backgroundColor: colors.dangerTrack,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  leakFill: { height: 6, backgroundColor: colors.danger, borderRadius: radius.pill },
  rangeCard: { gap: spacing.md },
  rangeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rangePreview: { alignItems: 'center', gap: spacing.sm },
});
