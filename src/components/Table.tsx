// =============================================================================
// Table — stylized top-view 6-max felt.
//   mode="picker": interactive seat selector (Sandbox "your position").
//   mode="play":   players with avatars, stacks, dealer button, pot (Training).
// Hero is pinned bottom-center; the rest ring around the oval.
// =============================================================================
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { POSITIONS, type Position } from '../types';
import { avatarPalette, colors, fontWeight, glow, radius } from '../theme';
import type { TableActionBadges, TableActionTone } from './tableStory';

// Seat coordinates as fractions of the table box, clockwise from bottom-center.
const SEAT_COORDS: { x: number; y: number }[] = [
  { x: 0.5, y: 0.88 }, // 0 hero (bottom center)
  { x: 0.12, y: 0.6 }, // 1 lower-left
  { x: 0.16, y: 0.26 }, // 2 upper-left
  { x: 0.5, y: 0.1 }, // 3 top center
  { x: 0.84, y: 0.26 }, // 4 upper-right
  { x: 0.88, y: 0.6 }, // 5 lower-right
];

function seatOf(pos: Position, hero: Position): number {
  return (POSITIONS.indexOf(pos) - POSITIONS.indexOf(hero) + 6) % 6;
}

// Fixed seat layout for the picker (does NOT rotate with selection):
// BTN bottom, blinds to its left, early positions up top.
const PICKER_SEAT: Record<Position, number> = {
  BTN: 0, // bottom center
  CO: 5, // lower-right
  HJ: 4, // upper-right
  UTG: 3, // top
  SB: 2, // upper-left
  BB: 1, // lower-left
};

interface TableProps {
  mode?: 'picker' | 'play';
  hero: Position;
  selected?: Position; // picker: highlighted seat
  onSelectSeat?: (p: Position) => void; // picker
  availablePositions?: readonly Position[]; // picker: seats backed by shipped data
  villainPosition?: Position; // play
  villainBadge?: string; // play, e.g. "RAISE"
  actionBadges?: TableActionBadges; // play: visible action history by seat
  potLabel?: string; // play
  stackBB?: number; // play
  width?: number;
  height?: number;
}

export function Table({
  mode = 'play',
  hero,
  selected,
  onSelectSeat,
  availablePositions,
  villainPosition,
  villainBadge,
  actionBadges,
  potLabel,
  stackBB,
  width = 320,
  height = 230,
}: TableProps) {
  return (
    <View style={[styles.wrap, { width, height }]}>
      <View style={styles.felt} />
      <View style={styles.feltInner} />

      {mode === 'play' && potLabel ? (
        <View style={styles.pot}>
          <Text style={styles.potText}>{potLabel}</Text>
        </View>
      ) : null}

      {POSITIONS.map((pos) => {
        const seat = mode === 'picker' ? PICKER_SEAT[pos] : seatOf(pos, hero);
        const coord = SEAT_COORDS[seat];
        const isHero = pos === hero;
        const isVillain = mode === 'play' && pos === villainPosition;
        const actionBadge =
          actionBadges?.[pos] ??
          (isVillain && villainBadge
            ? { label: villainBadge, tone: 'aggressive' as const }
            : undefined);
        const isSelected = mode === 'picker' && pos === selected;
        const left = coord.x * width - 30;
        const top = coord.y * height - 24;

        if (mode === 'picker') {
          const active = isSelected;
          const available = availablePositions === undefined || availablePositions.includes(pos);
          return (
            <Pressable
              key={pos}
              accessibilityRole="button"
              accessibilityLabel={`Позиция ${pos}${available ? '' : ', нет данных'}`}
              accessibilityState={{ selected: active, disabled: !available }}
              disabled={!available}
              onPress={() => available && onSelectSeat?.(pos)}
              style={[
                styles.pickerSeat,
                { left, top },
                active ? [styles.pickerSeatActive, glow(colors.primary, 10)] : null,
                !available ? styles.pickerSeatDisabled : null,
              ]}
            >
              <Text style={[styles.pickerLabel, { color: active ? colors.bg : colors.muted }]}>
                {pos}
              </Text>
              {!available ? <Ionicons name="lock-closed" size={9} color={colors.muted} /> : null}
            </Pressable>
          );
        }

        // play mode
        const ring = isHero ? colors.primary : isVillain ? colors.gold : colors.border;
        const dim = !isHero && !isVillain && actionBadge?.tone !== 'aggressive';
        const tint = avatarPalette[POSITIONS.indexOf(pos) % avatarPalette.length];
        return (
          <View key={pos} style={[styles.player, { left, top }]}>
            <View
              style={[
                styles.avatar,
                { borderColor: ring, backgroundColor: tint, opacity: dim ? 0.38 : 1 },
              ]}
            >
              <Ionicons name="person" size={20} color={colors.bg} />
              {pos === 'BTN' ? (
                <View style={styles.dealer}>
                  <Text style={styles.dealerText}>D</Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.nameTag, { opacity: dim ? 0.45 : 1 }]}>
              <Text style={[styles.name, { color: isHero ? colors.primary : colors.text }]}>
                {isHero ? 'Hero' : pos}
              </Text>
              {stackBB ? <Text style={styles.stack}>{stackBB}bb</Text> : null}
            </View>
            {actionBadge ? (
              <View style={[styles.badge, badgeToneStyle(actionBadge.tone)]}>
                <Text style={styles.badgeText}>{actionBadge.label}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function badgeToneStyle(tone: TableActionTone): { backgroundColor: string } {
  switch (tone) {
    case 'fold':
      return { backgroundColor: colors.danger };
    case 'call':
      return { backgroundColor: colors.gold };
    case 'aggressive':
      return { backgroundColor: colors.primary };
  }
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
  felt: {
    position: 'absolute',
    left: '6%',
    top: '12%',
    width: '88%',
    height: '76%',
    borderRadius: 999,
    backgroundColor: colors.felt,
    borderWidth: 2,
    borderColor: colors.feltBorder,
  },
  feltInner: {
    position: 'absolute',
    left: '12%',
    top: '20%',
    width: '76%',
    height: '60%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.feltInner,
  },
  pot: {
    position: 'absolute',
    alignSelf: 'center',
    top: '32%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  potText: {
    color: colors.text,
    fontWeight: fontWeight.bold,
    fontSize: 13,
    backgroundColor: colors.feltChip,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  // picker
  pickerSeat: {
    position: 'absolute',
    width: 60,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSeatActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pickerSeatDisabled: { opacity: 0.32 },
  pickerLabel: { fontWeight: fontWeight.bold, fontSize: 14 },
  // play
  player: { position: 'absolute', width: 60, alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealer: {
    position: 'absolute',
    right: -8,
    top: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealerText: { color: colors.bg, fontSize: 10, fontWeight: fontWeight.black },
  nameTag: { alignItems: 'center', marginTop: 2 },
  name: { fontSize: 11, fontWeight: fontWeight.bold },
  stack: { color: colors.muted, fontSize: 10 },
  badge: {
    position: 'absolute',
    top: -12,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 4,
  },
  badgeText: { color: colors.bg, fontSize: 9, fontWeight: fontWeight.bold },
});
