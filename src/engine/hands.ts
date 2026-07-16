// =============================================================================
// hands.ts — pure helpers for the 169 canonical Hold'em hands.
// =============================================================================
import { RANKS, type HandKey, type Rank } from '../types';

/**
 * Generate all 169 canonical hand keys.
 *   13 pocket pairs + 78 suited + 78 offsuit = 169.
 * Order: pairs and non-pairs follow RANKS order (A..2), high card first.
 *   e.g. "AA", "AKs", "AKo", "72o".
 */
export function enumerateHands(): HandKey[] {
  const hands: HandKey[] = [];
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = 0; j < RANKS.length; j++) {
      const hi = RANKS[i];
      const lo = RANKS[j];
      if (i === j) {
        hands.push(`${hi}${lo}`); // pocket pair, e.g. "AA"
      } else if (i < j) {
        hands.push(`${hi}${lo}s`); // suited (higher rank first)
      } else {
        hands.push(`${lo}${hi}o`); // offsuit (higher rank first)
      }
    }
  }
  // De-duplicate: the loop above visits suited and offsuit each once but pairs
  // only on the diagonal, so it already yields exactly 169 unique keys.
  return Array.from(new Set(hands));
}

export type HandShape = 'pair' | 'suited' | 'offsuit';

/** Classify a hand key by shape (drives combo weighting). */
export function handShape(hand: HandKey): HandShape {
  if (hand.length === 2) return 'pair';
  return hand.endsWith('s') ? 'suited' : 'offsuit';
}

/**
 * Number of card combinations a hand represents:
 *   pairs = 6, suited = 4, offsuit = 12.
 * Used to weight dealing so common spots appear more often.
 */
export function comboCount(hand: HandKey): number {
  switch (handShape(hand)) {
    case 'pair':
      return 6;
    case 'suited':
      return 4;
    case 'offsuit':
      return 12;
  }
}

/** The two ranks of a hand key, high card first. */
export function handRanks(hand: HandKey): [Rank, Rank] {
  return [hand[0] as Rank, hand[1] as Rank];
}

/** Cache the full set once; it is immutable. */
let ALL_HANDS: HandKey[] | null = null;
export function allHands(): HandKey[] {
  if (ALL_HANDS === null) ALL_HANDS = enumerateHands();
  return ALL_HANDS;
}
