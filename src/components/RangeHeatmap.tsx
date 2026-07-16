// =============================================================================
// RangeHeatmap — the classic 13x13 starting-hand grid for a node. Each cell is
// filled proportionally by its action mix (so mixed strategies are visible).
// Upper-right triangle = suited, lower-left = offsuit, diagonal = pairs.
// =============================================================================
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RANKS, type Action, type HandKey, type RangeNode } from '../types';
import { actionColor, colors, fontWeight } from '../theme';
import { actionLabel } from './labels';

function cellHand(r: number, c: number): HandKey {
  const a = RANKS[r];
  const b = RANKS[c];
  if (r === c) return `${a}${a}`;
  if (r < c) return `${a}${b}s`;
  return `${b}${a}o`;
}

function Cell({
  node,
  hand,
  size,
  selected,
  onPress,
}: {
  node: RangeNode;
  hand: HandKey;
  size: number;
  selected?: boolean;
  onPress?: (h: HandKey) => void;
}) {
  const strat = node.hands[hand] ?? {};
  const slices = node.actions
    .map((a) => ({ action: a, freq: strat[a]?.freq ?? 0 }))
    .filter((s) => s.freq > 0);
  const total = slices.reduce((s, x) => s + x.freq, 0) || 1;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Рука ${hand}${selected ? ', выбрана' : ''}`}
      accessibilityState={{ selected }}
      onPress={onPress ? () => onPress(hand) : undefined}
      style={[styles.cell, { width: size, height: size }]}
    >
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.fillRow}>
          {slices.length === 0 ? (
            <View style={{ flex: 1, backgroundColor: colors.surface }} />
          ) : (
            slices.map((s) => (
              <View
                key={s.action}
                style={{
                  flex: s.freq / total,
                  backgroundColor: actionColor[s.action] ?? colors.muted,
                }}
              />
            ))
          )}
        </View>
      </View>
      {selected ? <View pointerEvents="none" style={styles.selectedOutline} /> : null}
      <Text style={[styles.cellText, { fontSize: size * 0.32 }]}>{hand}</Text>
    </Pressable>
  );
}

export function RangeHeatmap({
  node,
  width = 340,
  selectedHand,
  onSelectHand,
}: {
  node: RangeNode;
  width?: number;
  selectedHand?: HandKey;
  onSelectHand?: (h: HandKey) => void;
}) {
  const size = Math.floor(width / 13);
  return (
    <View style={{ width: size * 13, alignSelf: 'center' }}>
      {RANKS.map((_, r) => (
        <View key={r} style={styles.row}>
          {RANKS.map((__, c) => {
            const hand = cellHand(r, c);
            return (
              <Cell
                key={c}
                node={node}
                hand={hand}
                size={size}
                selected={selectedHand === hand}
                onPress={onSelectHand}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Small legend mapping action -> color for a node's action set. */
export function HeatmapLegend({ actions }: { actions: Action[] }) {
  return (
    <View style={styles.legend}>
      {actions.map((a) => (
        <View key={a} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: actionColor[a] ?? colors.muted }]} />
          <Text style={styles.legendText}>{actionLabel(a)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fillRow: {
    flex: 1,
    flexDirection: 'row',
  },
  cellText: {
    color: colors.bg,
    fontWeight: fontWeight.bold,
  },
  selectedOutline: {
    ...StyleSheet.absoluteFill,
    borderWidth: 3,
    borderColor: colors.text,
    zIndex: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    color: colors.muted,
    fontSize: 12,
  },
});
