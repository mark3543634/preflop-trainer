// =============================================================================
// HoleCards — render a HandKey ("AKs") as two playing cards.
// Suits are illustrative (we only train hand classes, not specific suits).
// =============================================================================
import { StyleSheet, Text, View } from 'react-native';
import { handShape, handRanks } from '../engine/hands';
import { colors, fontWeight, radius } from '../theme';
import type { HandKey } from '../types';

const SPADE = '♠';
const HEART = '♥';
const DIAMOND = '♦';

// Pick representative suits for a hand class.
function suitsFor(hand: HandKey): [string, string] {
  switch (handShape(hand)) {
    case 'suited':
      return [SPADE, SPADE];
    case 'pair':
      return [SPADE, HEART];
    case 'offsuit':
      return [SPADE, DIAMOND];
  }
}

function CardFace({ rank, suit, size }: { rank: string; suit: string; size: number }) {
  const red = suit === HEART || suit === DIAMOND;
  return (
    <View style={[styles.card, { width: size, height: size * 1.4 }]}>
      <Text
        style={[styles.rank, { color: red ? colors.danger : colors.cardInk, fontSize: size * 0.5 }]}
      >
        {rank}
      </Text>
      <Text
        style={[styles.suit, { color: red ? colors.danger : colors.cardInk, fontSize: size * 0.5 }]}
      >
        {suit}
      </Text>
    </View>
  );
}

export function HoleCards({ hand, size = 56 }: { hand: HandKey; size?: number }) {
  const [hi, lo] = handRanks(hand);
  const [s1, s2] = suitsFor(hand);
  return (
    <View style={styles.row}>
      <CardFace rank={hi} suit={s1} size={size} />
      <View style={{ width: size * 0.18 }} />
      <CardFace rank={lo} suit={s2} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.cardFace,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  rank: {
    fontWeight: fontWeight.black,
  },
  suit: {
    marginTop: -2,
  },
});
