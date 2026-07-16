import { grade, rngImpliedAction, FIXED_BLUNDER_SCORE } from '../grade';
import type { RangeNode } from '../../types';

// A minimal, EXPLICIT test node (not the placeholder generator) so the grading
// assertions are exact and independent of any fabricated data.
function node(hands: RangeNode['hands']): RangeNode {
  return {
    id: 'test_node',
    providerId: 'pekarstas',
    sourceId: 'pekarstas',
    format: 'cash_6max',
    stackBB: 100,
    hero: 'BTN',
    scenario: 'vs_RFI',
    villainPosition: 'CO',
    actions: ['3bet', 'call', 'fold'],
    hands,
    sizing: { effectiveStackBB: 100 },
  };
}

describe('grade — classification & scoring', () => {
  it('pure best action scores +100', () => {
    const n = node({ AA: { '3bet': { freq: 1 } } });
    const g = grade(n, 'AA', '3bet');
    expect(g.verdict).toBe('best');
    expect(g.score).toBe(100);
    expect(g.bestActions).toEqual(['3bet']);
  });

  it('co-equal mix: either top action is "best"', () => {
    const n = node({ KK: { '3bet': { freq: 0.5 }, call: { freq: 0.5 } } });
    expect(grade(n, 'KK', '3bet').verdict).toBe('best');
    expect(grade(n, 'KK', 'call').verdict).toBe('best');
    expect(grade(n, 'KK', '3bet').bestActions).toEqual(['3bet', 'call']);
  });

  it('legit mixed action (not best) is "correct", scored by freq ratio', () => {
    const n = node({
      QQ: { '3bet': { freq: 0.4 }, call: { freq: 0.6 } },
    });
    const g = grade(n, 'QQ', '3bet');
    expect(g.verdict).toBe('correct');
    // round(100 * 0.4 / 0.6) = 67
    expect(g.score).toBe(67);
  });

  it('near-zero frequency (<0.05) is an "inaccuracy", score 0', () => {
    const n = node({
      A5s: { '3bet': { freq: 0.97 }, call: { freq: 0.03 } },
    });
    const g = grade(n, 'A5s', 'call');
    expect(g.verdict).toBe('inaccuracy');
    expect(g.score).toBe(0);
  });

  it('zero frequency is a "blunder"; fixed -50 without EV data', () => {
    const n = node({ '72o': { fold: { freq: 1 } } });
    const g = grade(n, '72o', '3bet');
    expect(g.verdict).toBe('blunder');
    expect(g.score).toBe(FIXED_BLUNDER_SCORE);
    expect(g.evLoss).toBeNull();
  });
});

describe('grade — EV loss math', () => {
  it('computes evLoss as bestEv - chosenEv, clamped >= 0', () => {
    const n = node({
      JJ: {
        '3bet': { freq: 0.4, ev: 2.0 },
        call: { freq: 0.6, ev: 2.5 },
      },
    });
    const g = grade(n, 'JJ', '3bet');
    // best EV is 2.5 (call), chosen EV 2.0 -> loss 0.5
    expect(g.evLoss).toBeCloseTo(0.5, 5);
  });

  it('scales a blunder score by EV loss when EV is present', () => {
    const n = node({
      '32o': {
        '3bet': { freq: 1, ev: 0 },
        fold: { freq: 0, ev: -8 }, // chosen action carries EV even at freq 0
      },
    });
    const g = grade(n, '32o', 'fold');
    expect(g.verdict).toBe('blunder');
    expect(g.evLoss).toBeCloseTo(8, 5);
    // magnitude = round(100 * 8 / 10) = 80 -> score -80
    expect(g.score).toBe(-80);
  });
});

describe('grade — frequency bar output', () => {
  it('reports only actions with positive frequency, in display order', () => {
    const n = node({
      KQs: { '3bet': { freq: 0.3 }, call: { freq: 0.7 }, fold: { freq: 0 } },
    });
    const g = grade(n, 'KQs', 'call');
    expect(g.frequencies).toEqual({ '3bet': 0.3, call: 0.7 });
  });
});

describe('grade — RNG mode', () => {
  const n = node({
    TT: { '3bet': { freq: 0.3 }, call: { freq: 0.3 }, fold: { freq: 0.4 } },
  });

  it('buckets the roll along the cumulative distribution', () => {
    const strat = n.hands.TT;
    expect(rngImpliedAction(n, strat, 0.1)).toBe('3bet'); // [0, .3)
    expect(rngImpliedAction(n, strat, 0.5)).toBe('call'); // [.3, .6)
    expect(rngImpliedAction(n, strat, 0.8)).toBe('fold'); // [.6, 1)
  });

  it('surfaces rngExpected only when rngMode is on, never changing the verdict', () => {
    const withRng = grade(n, 'TT', '3bet', { rngMode: true, rng: 0.8 });
    expect(withRng.rngExpected).toBe('fold');
    // grading still based on classification: 3bet has freq 0.3 -> correct
    expect(withRng.verdict).toBe('correct');

    const withoutRng = grade(n, 'TT', '3bet', { rng: 0.8 });
    expect(withoutRng.rngExpected).toBeUndefined();
  });
});
