// =============================================================================
// FrequencyBar — the GTO frequency mix for the current hand, as a stacked bar.
// =============================================================================
import { StyleSheet, Text, View } from 'react-native';
import type { Action, HandKey, RangeNode } from '../types';
import { actionColor, colors, fontWeight, radius } from '../theme';
import { actionLabel } from './labels';

/** Typed frequency map for a node's hand, in the node's action order. */
export function nodeHandFreqs(node: RangeNode, hand: HandKey): Partial<Record<Action, number>> {
  const strat = node.hands[hand] ?? {};
  const out: Partial<Record<Action, number>> = {};
  for (const a of node.actions) out[a] = strat[a]?.freq ?? 0;
  return out;
}

export function FrequencyBar({
  frequencies,
  order,
  chosen,
}: {
  frequencies: Partial<Record<Action, number>>;
  order: Action[];
  chosen?: Action;
}) {
  const entries = order
    .map((a) => ({ action: a, freq: frequencies[a] ?? 0 }))
    .filter((e) => e.freq > 0);
  const total = entries.reduce((s, e) => s + e.freq, 0) || 1;

  return (
    <View>
      <View style={styles.bar}>
        {entries.map((e) => (
          <View
            key={e.action}
            style={{
              flex: e.freq / total,
              backgroundColor: actionColor[e.action] ?? colors.muted,
            }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {entries.map((e) => (
          <View key={e.action} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: actionColor[e.action] ?? colors.muted }]} />
            <Text
              style={[
                styles.legendText,
                { color: e.action === chosen ? colors.text : colors.muted },
                e.action === chosen ? { fontWeight: fontWeight.bold } : undefined,
              ]}
            >
              {actionLabel(e.action)} {Math.round(e.freq * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
  },
});
