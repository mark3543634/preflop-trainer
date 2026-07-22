import { StyleSheet, View } from 'react-native';
import type { ConcreteCard, Suit } from '../engine/rangeEquity';
import { colors, radius, spacing } from '../theme';
import { AppText } from './primitives';

const SUIT_SYMBOL: Record<Suit, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
};

function isRed(suit: Suit): boolean {
  return suit === 'h' || suit === 'd';
}

export function BoardCards({
  cards,
  size = 58,
  label = 'Флоп',
}: {
  cards: readonly ConcreteCard[];
  size?: number;
  label?: string;
}) {
  return (
    <View style={styles.row} accessibilityLabel={`${label} ${cards.join(' ')}`}>
      {cards.map((card) => {
        const rank = card[0];
        const suit = card[1] as Suit;
        const ink = isRed(suit) ? colors.danger : colors.cardInk;
        return (
          <View
            key={card}
            style={[
              styles.card,
              { width: size, height: Math.round(size * 1.34), borderRadius: radius.button },
            ]}
          >
            <AppText
              weight="black"
              color={ink}
              style={{ fontSize: size * 0.36, lineHeight: size * 0.4 }}
            >
              {rank}
            </AppText>
            <AppText color={ink} style={{ fontSize: size * 0.44, lineHeight: size * 0.48 }}>
              {SUIT_SYMBOL[suit]}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  card: {
    backgroundColor: colors.cardFace,
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
