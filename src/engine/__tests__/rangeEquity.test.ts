import { getCombinedNode } from '../../data/ranges';
import {
  estimateRangeEquity,
  evaluateFive,
  evaluateSeven,
  expandHandKey,
  weightedActionCombos,
  type ConcreteCard,
} from '../rangeEquity';

describe('range equity engine', () => {
  it('expands canonical hands into physical combos', () => {
    expect(expandHandKey('AA')).toHaveLength(6);
    expect(expandHandKey('AKs')).toHaveLength(4);
    expect(expandHandKey('AKo')).toHaveLength(12);
  });

  it('orders standard showdown categories correctly', () => {
    const score = (cards: ConcreteCard[]) => evaluateFive(cards);
    const straightFlush = score(['As', 'Ks', 'Qs', 'Js', 'Ts']);
    const quads = score(['Ah', 'Ad', 'Ac', 'As', '2d']);
    const fullHouse = score(['Kh', 'Kd', 'Kc', '2s', '2d']);
    const flush = score(['Ah', 'Jh', '8h', '5h', '2h']);
    const straight = score(['9s', '8h', '7d', '6c', '5s']);
    expect(straightFlush).toBeGreaterThan(quads);
    expect(quads).toBeGreaterThan(fullHouse);
    expect(fullHouse).toBeGreaterThan(flush);
    expect(flush).toBeGreaterThan(straight);
  });

  it('recognizes the wheel and selects the best five of seven cards', () => {
    const wheel = evaluateFive(['As', '2h', '3d', '4c', '5s']);
    const sixHigh = evaluateFive(['2s', '3h', '4d', '5c', '6s']);
    expect(sixHigh).toBeGreaterThan(wheel);
    expect(evaluateSeven(['As', 'Ks', 'Qs', 'Js', 'Ts', '2h', '3d'])).toBeGreaterThan(
      evaluateSeven(['Ah', 'Ad', 'Ac', 'As', '2d', '3h', '4c']),
    );
  });

  it('removes board-blocked combos from an action range', () => {
    const node = getCombinedNode('cash6max_100bb_BTN_RFI');
    if (!node) throw new Error('test node missing');
    const all = weightedActionCombos(node, 'raise');
    const blocked = weightedActionCombos(node, 'raise', ['As', 'Kd', '2c']);
    expect(blocked.combos.length).toBeLessThan(all.combos.length);
    expect(blocked.combos.every((combo) => !combo.cards.includes('As'))).toBe(true);
  });

  it('returns deterministic, normalized range equity from node data', () => {
    const openerNode = getCombinedNode('cash6max_100bb_BTN_RFI');
    const defenderNode = getCombinedNode('cash6max_100bb_BB_blind_defense_BTN');
    if (!openerNode || !defenderNode) throw new Error('test nodes missing');
    const input = {
      openerNode,
      openerAction: 'raise' as const,
      defenderNode,
      defenderAction: 'call' as const,
      flop: ['Ah', '7d', '2s'] as const,
      iterations: 120,
      seed: 42,
    };
    const first = estimateRangeEquity(input);
    const second = estimateRangeEquity(input);
    expect(first).toEqual(second);
    expect(first.openerEquity + first.defenderEquity).toBeCloseTo(1, 10);
    expect(first.openerEquity).toBeGreaterThanOrEqual(0);
    expect(first.openerEquity).toBeLessThanOrEqual(1);
    expect(['opener', 'even', 'defender']).toContain(first.answer);
  });
});
