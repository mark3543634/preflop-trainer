// =============================================================================
// rangeEquity.ts — pure postflop equity calculator for the range-reading mode.
//
// IMPORTANT: this module contains no hand-written poker strategy. Starting-hand
// weights come exclusively from RangeNode action frequencies loaded from data.
// The evaluator below only applies ordinary Hold'em showdown rules.
// =============================================================================
import { RANKS, type Action, type HandKey, type RangeNode, type Rank } from '../types';

export const SUITS = ['s', 'h', 'd', 'c'] as const;
export type Suit = (typeof SUITS)[number];
export type ConcreteCard = `${Rank}${Suit}`;
export type ConcreteCombo = readonly [ConcreteCard, ConcreteCard];
export type RangeReadingAnswer = 'opener' | 'even' | 'defender';

export const RANGE_EQUITY_TIE_BAND = 0.025;

interface WeightedCombo {
  cards: ConcreteCombo;
  weight: number;
}

export interface RangeEquityInput {
  openerNode: RangeNode;
  openerAction: Action;
  defenderNode: RangeNode;
  defenderAction: Action;
  flop: readonly [ConcreteCard, ConcreteCard, ConcreteCard];
  iterations?: number;
  seed?: number;
}

export interface RangeEquityResult {
  openerEquity: number;
  defenderEquity: number;
  tieRate: number;
  iterations: number;
  openerComboWeight: number;
  defenderComboWeight: number;
  answer: RangeReadingAnswer;
}

const RANK_VALUE: Record<Rank, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  T: 10,
  '9': 9,
  '8': 8,
  '7': 7,
  '6': 6,
  '5': 5,
  '4': 4,
  '3': 3,
  '2': 2,
};

function cardRank(card: ConcreteCard): Rank {
  return card[0] as Rank;
}

function cardSuit(card: ConcreteCard): Suit {
  return card[1] as Suit;
}

export function fullDeck(): ConcreteCard[] {
  return RANKS.flatMap((rank) => SUITS.map((suit) => `${rank}${suit}` as ConcreteCard));
}

/** Expand a canonical hand into its 6 pair, 4 suited, or 12 offsuit combos. */
export function expandHandKey(hand: HandKey): ConcreteCombo[] {
  const first = hand[0] as Rank;
  const second = hand[1] as Rank;
  if (!(first in RANK_VALUE) || !(second in RANK_VALUE)) {
    throw new Error(`Invalid hand key: ${hand}`);
  }

  if (hand.length === 2 && first === second) {
    const combos: ConcreteCombo[] = [];
    for (let i = 0; i < SUITS.length; i += 1) {
      for (let j = i + 1; j < SUITS.length; j += 1) {
        combos.push([
          `${first}${SUITS[i]}` as ConcreteCard,
          `${second}${SUITS[j]}` as ConcreteCard,
        ]);
      }
    }
    return combos;
  }

  if (hand.length !== 3 || first === second || (hand[2] !== 's' && hand[2] !== 'o')) {
    throw new Error(`Invalid hand key: ${hand}`);
  }

  if (hand[2] === 's') {
    return SUITS.map(
      (suit) => [`${first}${suit}` as ConcreteCard, `${second}${suit}` as ConcreteCard] as const,
    );
  }

  return SUITS.flatMap((firstSuit) =>
    SUITS.filter((secondSuit) => secondSuit !== firstSuit).map(
      (secondSuit) =>
        [`${first}${firstSuit}` as ConcreteCard, `${second}${secondSuit}` as ConcreteCard] as const,
    ),
  );
}

function encode(category: number, kickers: readonly number[]): number {
  let value = category;
  for (let i = 0; i < 5; i += 1) value = value * 15 + (kickers[i] ?? 0);
  return value;
}

/** Comparable score for exactly five cards. Higher is stronger. */
export function evaluateFive(cards: readonly ConcreteCard[]): number {
  if (cards.length !== 5 || new Set(cards).size !== 5) {
    throw new Error('evaluateFive expects five unique cards');
  }

  const values = cards.map((card) => RANK_VALUE[cardRank(card)]).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const unique = [...new Set(values)];
  const wheel = unique.length === 5 && unique.join(',') === '14,5,4,3,2';
  const straightHigh =
    unique.length === 5 && (values[0] - values[4] === 4 || wheel) ? (wheel ? 5 : values[0]) : 0;
  const flush = cards.every((card) => cardSuit(card) === cardSuit(cards[0]));

  if (flush && straightHigh) return encode(8, [straightHigh]);
  if (groups[0][1] === 4) return encode(7, [groups[0][0], groups[1][0]]);
  if (groups[0][1] === 3 && groups[1][1] === 2) return encode(6, [groups[0][0], groups[1][0]]);
  if (flush) return encode(5, values);
  if (straightHigh) return encode(4, [straightHigh]);
  if (groups[0][1] === 3) {
    return encode(3, [
      groups[0][0],
      ...groups
        .slice(1)
        .map(([value]) => value)
        .sort((a, b) => b - a),
    ]);
  }
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const highPair = Math.max(groups[0][0], groups[1][0]);
    const lowPair = Math.min(groups[0][0], groups[1][0]);
    return encode(2, [highPair, lowPair, groups[2][0]]);
  }
  if (groups[0][1] === 2) {
    return encode(1, [
      groups[0][0],
      ...groups
        .slice(1)
        .map(([value]) => value)
        .sort((a, b) => b - a),
    ]);
  }
  return encode(0, values);
}

/** Best five-card score out of seven cards. */
export function evaluateSeven(cards: readonly ConcreteCard[]): number {
  if (cards.length !== 7 || new Set(cards).size !== 7) {
    throw new Error('evaluateSeven expects seven unique cards');
  }
  let best = -1;
  for (let a = 0; a < 3; a += 1) {
    for (let b = a + 1; b < 4; b += 1) {
      for (let c = b + 1; c < 5; c += 1) {
        for (let d = c + 1; d < 6; d += 1) {
          for (let e = d + 1; e < 7; e += 1) {
            best = Math.max(best, evaluateFive([cards[a], cards[b], cards[c], cards[d], cards[e]]));
          }
        }
      }
    }
  }
  return best;
}

/** Concrete combos weighted only by the selected action's data frequency. */
export function weightedActionCombos(
  node: RangeNode,
  action: Action,
  blockedCards: readonly ConcreteCard[] = [],
): { combos: WeightedCombo[]; totalWeight: number } {
  const blocked = new Set(blockedCards);
  const combos: WeightedCombo[] = [];
  for (const [hand, strategy] of Object.entries(node.hands)) {
    const weight = strategy[action]?.freq ?? 0;
    if (weight <= 0) continue;
    for (const cards of expandHandKey(hand)) {
      if (!blocked.has(cards[0]) && !blocked.has(cards[1])) combos.push({ cards, weight });
    }
  }
  return { combos, totalWeight: combos.reduce((sum, combo) => sum + combo.weight, 0) };
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleWeighted(
  combos: readonly WeightedCombo[],
  totalWeight: number,
  rng: () => number,
): WeightedCombo {
  let roll = rng() * totalWeight;
  for (const combo of combos) {
    roll -= combo.weight;
    if (roll <= 0) return combo;
  }
  return combos[combos.length - 1];
}

function overlaps(a: ConcreteCombo, b: ConcreteCombo): boolean {
  return a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1];
}

function sampleDefender(
  combos: readonly WeightedCombo[],
  totalWeight: number,
  opener: ConcreteCombo,
  rng: () => number,
): WeightedCombo {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const sampled = sampleWeighted(combos, totalWeight, rng);
    if (!overlaps(opener, sampled.cards)) return sampled;
  }
  const eligible = combos.filter((combo) => !overlaps(opener, combo.cards));
  const eligibleWeight = eligible.reduce((sum, combo) => sum + combo.weight, 0);
  if (eligible.length === 0 || eligibleWeight <= 0)
    throw new Error('Ranges have no compatible combos');
  return sampleWeighted(eligible, eligibleWeight, rng);
}

export function estimateRangeEquity(input: RangeEquityInput): RangeEquityResult {
  const iterations = input.iterations ?? 2500;
  if (!Number.isInteger(iterations) || iterations <= 0)
    throw new Error('iterations must be positive');
  if (new Set(input.flop).size !== 3) throw new Error('Flop must contain three unique cards');

  const opener = weightedActionCombos(input.openerNode, input.openerAction, input.flop);
  const defender = weightedActionCombos(input.defenderNode, input.defenderAction, input.flop);
  if (opener.totalWeight <= 0 || defender.totalWeight <= 0) {
    throw new Error('Selected action has no weighted combos');
  }

  const rng = seededRandom(input.seed ?? 1);
  let openerPoints = 0;
  let defenderPoints = 0;
  let ties = 0;

  for (let i = 0; i < iterations; i += 1) {
    const openerCombo = sampleWeighted(opener.combos, opener.totalWeight, rng).cards;
    const defenderCombo = sampleDefender(
      defender.combos,
      defender.totalWeight,
      openerCombo,
      rng,
    ).cards;
    const blocked = new Set<ConcreteCard>([...input.flop, ...openerCombo, ...defenderCombo]);
    const remaining = fullDeck().filter((card) => !blocked.has(card));
    const turnIndex = Math.floor(rng() * remaining.length);
    const turn = remaining.splice(turnIndex, 1)[0];
    const river = remaining[Math.floor(rng() * remaining.length)];
    const board = [...input.flop, turn, river] as const;
    const openerScore = evaluateSeven([...openerCombo, ...board]);
    const defenderScore = evaluateSeven([...defenderCombo, ...board]);
    if (openerScore > defenderScore) openerPoints += 1;
    else if (defenderScore > openerScore) defenderPoints += 1;
    else {
      ties += 1;
      openerPoints += 0.5;
      defenderPoints += 0.5;
    }
  }

  const openerEquity = openerPoints / iterations;
  const defenderEquity = defenderPoints / iterations;
  const difference = openerEquity - defenderEquity;
  const answer: RangeReadingAnswer =
    Math.abs(difference) <= RANGE_EQUITY_TIE_BAND ? 'even' : difference > 0 ? 'opener' : 'defender';

  return {
    openerEquity,
    defenderEquity,
    tieRate: ties / iterations,
    iterations,
    openerComboWeight: opener.totalWeight,
    defenderComboWeight: defender.totalWeight,
    answer,
  };
}
