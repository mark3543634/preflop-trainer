import {
  planSession,
  sampleWeightedHand,
  summarize,
  runningGtoScore,
  Session,
  shouldEndExam,
} from '../session';
import { allHands } from '../hands';
import type { DecisionResult, Grade, RangeNode } from '../../types';

// Deterministic seeded RNG (mulberry32) so session tests are reproducible.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const testNode: RangeNode = {
  id: 'sess_node',
  providerId: 'pekarstas',
  sourceId: 'pekarstas',
  format: 'cash_6max',
  stackBB: 100,
  hero: 'BTN',
  scenario: 'RFI',
  actions: ['raise', 'fold'],
  hands: Object.fromEntries(allHands().map((h) => [h, { raise: { freq: 1, ev: 0 } }])),
  sizing: { effectiveStackBB: 100 },
  strategyConfidence: 'solver_verified',
  frequencyBasis: 'solver_frequency',
};

describe('sampleWeightedHand', () => {
  it('always returns a valid canonical hand', () => {
    const rng = mulberry32(1);
    const set = new Set(allHands());
    for (let i = 0; i < 200; i++) {
      expect(set.has(sampleWeightedHand(rng))).toBe(true);
    }
  });

  it('favors offsuit hands over pairs (12 vs 6 combos)', () => {
    const rng = mulberry32(42);
    let offsuit = 0;
    let pair = 0;
    for (let i = 0; i < 5000; i++) {
      const h = sampleWeightedHand(rng);
      if (h.endsWith('o')) offsuit++;
      else if (h.length === 2) pair++;
    }
    expect(offsuit).toBeGreaterThan(pair);
  });

  it('respects data-derived reach weights', () => {
    const reachWeights = Object.fromEntries(allHands().map((hand) => [hand, hand === 'AA' ? 1 : 0]));
    const rng = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      expect(sampleWeightedHand(rng, reachWeights)).toBe('AA');
    }
  });
});

describe('planSession', () => {
  it('deals exactly N hands', () => {
    const plan = planSession([testNode], 25, mulberry32(7));
    expect(plan.length).toBe(25);
  });

  it('uses only the supplied node ids', () => {
    const plan = planSession([testNode], 15, mulberry32(3));
    expect(plan.every((p) => p.nodeId === 'sess_node')).toBe(true);
  });

  it('returns empty plan for no nodes', () => {
    expect(planSession([], 10, mulberry32(1))).toEqual([]);
  });

  it('does not deal hands that cannot reach an advanced node', () => {
    const advancedNode: RangeNode = {
      ...testNode,
      id: 'advanced_node',
      reachWeights: Object.fromEntries(
        allHands().map((hand) => [hand, hand === 'AKs' || hand === 'AA' ? 1 : 0]),
      ),
    };
    const plan = planSession([advancedNode], 100, mulberry32(77));
    expect(plan.every((item) => item.hand === 'AKs' || item.hand === 'AA')).toBe(true);
  });
});

describe('summarize / runningGtoScore', () => {
  function res(score: number, verdict: Grade['verdict'], evLoss: number | null): DecisionResult {
    return {
      providerId: 'pekarstas',
      nodeId: 'n',
      hand: 'AA',
      chosen: 'raise',
      grade: { verdict, score, evLoss, bestActions: ['raise'], frequencies: { raise: 1 } },
    };
  }

  it('averages decision scores for the GTO score', () => {
    expect(runningGtoScore([res(100, 'best', 0), res(0, 'inaccuracy', 1)])).toBe(50);
    expect(runningGtoScore([])).toBe(0);
  });

  it('aggregates EV loss and collects mistakes', () => {
    const results = [
      res(100, 'best', 0),
      res(-50, 'blunder', 3),
      res(0, 'inaccuracy', 1.5),
    ];
    const s = summarize(results);
    expect(s.handsPlayed).toBe(3);
    expect(s.totalEvLoss).toBeCloseTo(4.5, 5);
    expect(s.avgEvLoss).toBeCloseTo(1.5, 5);
    expect(s.mistakes.map((m) => m.grade.verdict)).toEqual(['blunder', 'inaccuracy']);
  });

  it('ignores null EV entries in averages', () => {
    const s = summarize([res(100, 'best', null), res(-50, 'blunder', 2)]);
    expect(s.avgEvLoss).toBeCloseTo(2, 5); // only the one with EV counts
  });
});

describe('Session runner', () => {
  it('runs a full session end-to-end and summarizes', () => {
    const plan = planSession([testNode], 5, mulberry32(9));
    const session = new Session([testNode], plan);
    expect(session.length).toBe(5);

    while (!session.isComplete()) {
      session.submit('raise'); // every hand raises at freq 1 -> all "best"
    }
    const summary = session.summary();
    expect(summary.handsPlayed).toBe(5);
    expect(summary.gtoScore).toBe(100);
    expect(summary.mistakes.length).toBe(0);
  });

  it('records mistakes for off-strategy actions', () => {
    const plan = planSession([testNode], 3, mulberry32(11));
    const session = new Session([testNode], plan);
    session.submit('fold'); // freq 0 -> blunder
    expect(session.results[0].grade.verdict).toBe('blunder');
    expect(session.position).toBe(1);
  });

  it('throws if submitting past the end', () => {
    const session = new Session([testNode], []);
    expect(() => session.submit('raise')).toThrow();
  });

  it('can terminate an exam early and summarizes only answered hands', () => {
    const plan = planSession([testNode], 10, mulberry32(12));
    const session = new Session([testNode], plan);
    session.submit('fold');
    session.terminate();
    expect(session.isComplete()).toBe(true);
    expect(session.summary().handsPlayed).toBe(1);
  });
});

describe('exam mistake cap', () => {
  it('ends only exam sessions at a positive configured cap', () => {
    expect(shouldEndExam(true, 3, 3)).toBe(true);
    expect(shouldEndExam(true, 2, 3)).toBe(false);
    expect(shouldEndExam(false, 10, 3)).toBe(false);
    expect(shouldEndExam(true, 1, 0)).toBe(false);
  });
});
