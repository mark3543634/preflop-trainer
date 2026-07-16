// =============================================================================
// session.ts — the PURE session engine. No React, no I/O.
//
// Deals N hands weighted by real combo counts, records per-decision Grades, and
// produces a SessionSummary (GTO score, EV loss, mistakes for the review queue).
// =============================================================================
import { allHands, comboCount } from './hands';
import { grade, type GradeOptions } from './grade';
import type {
  Action,
  DecisionResult,
  HandKey,
  RangeNode,
  SessionSummary,
} from '../types';
import { rangeRefKey } from './rangeRef';

/** A dealt question: which node, which hand. */
export interface PlannedHand {
  providerId: RangeNode['providerId'];
  nodeId: string;
  hand: HandKey;
}

/** RNG source: returns a float in [0,1). Injectable for deterministic tests. */
export type Rng = () => number;

const defaultRng: Rng = Math.random;

/** Exam mode stops after the configured number of mistakes; normal drills never do. */
export function shouldEndExam(examMode: boolean, mistakes: number, cap: number): boolean {
  return examMode && cap > 0 && mistakes >= cap;
}

/**
 * Sample a single hand weighted by combo counts (pair=6, suited=4, offsuit=12)
 * so common spots show up more often than rare ones.
 */
export function sampleWeightedHand(
  rng: Rng = defaultRng,
  reachWeights?: Partial<Record<HandKey, number>>,
): HandKey {
  const hands = allHands();
  let total = 0;
  const reachOf = (hand: HandKey): number =>
    reachWeights === undefined ? 1 : Math.max(0, reachWeights[hand] ?? 0);
  for (const h of hands) total += comboCount(h) * reachOf(h);
  // Missing/broken parent data must not crash a drill. Validation tests catch
  // this for public nodes; the unconditional fallback keeps imported local data usable.
  if (total <= 0) return sampleWeightedHand(rng);
  let roll = rng() * total;
  for (const h of hands) {
    roll -= comboCount(h) * reachOf(h);
    if (roll < 0) return h;
  }
  return hands[hands.length - 1]; // floating-point fallback
}

/**
 * Plan a session: deal `length` hands across the given node set. The node for
 * each hand is chosen uniformly at random (a "mix" drill spreads across all
 * supplied nodes; a "single spot" passes one node).
 */
export function planSession(
  nodes: RangeNode[],
  length: number,
  rng: Rng = defaultRng,
): PlannedHand[] {
  if (nodes.length === 0) return [];
  const planned: PlannedHand[] = [];
  for (let i = 0; i < length; i++) {
    const node = nodes[Math.floor(rng() * nodes.length) % nodes.length];
    planned.push({
      providerId: node.providerId,
      nodeId: node.id,
      hand: sampleWeightedHand(rng, node.reachWeights),
    });
  }
  return planned;
}

/**
 * Mutable session runner. UI drives it: get the current planned hand, submit an
 * action, get a Grade, advance. Engine stays pure of React; the store wraps it.
 */
export class Session {
  readonly plan: PlannedHand[];
  private readonly nodeById: Record<string, RangeNode>;
  private readonly options: GradeOptions;
  private index = 0;
  readonly results: DecisionResult[] = [];

  constructor(nodes: RangeNode[], plan: PlannedHand[], options: GradeOptions = {}) {
    this.plan = plan;
    this.options = options;
    this.nodeById = Object.fromEntries(nodes.map((n) => [rangeRefKey(n.providerId, n.id), n]));
  }

  get length(): number {
    return this.plan.length;
  }

  get position(): number {
    return this.index;
  }

  isComplete(): boolean {
    return this.index >= this.plan.length;
  }

  /** The current planned hand, or null when the session is finished. */
  current(): PlannedHand | null {
    return this.isComplete() ? null : this.plan[this.index];
  }

  /** The node behind the current hand (undefined if it isn't shipped). */
  currentNode(): RangeNode | undefined {
    const cur = this.current();
    return cur ? this.nodeById[rangeRefKey(cur.providerId, cur.nodeId)] : undefined;
  }

  nodeFor(providerId: RangeNode['providerId'], nodeId: string): RangeNode | undefined {
    return this.nodeById[rangeRefKey(providerId, nodeId)];
  }

  /**
   * Submit the user's action for the current hand. Records the Grade and
   * advances. Per-call rng override lets the UI roll fresh each hand.
   */
  submit(chosen: Action, rngRoll?: number): DecisionResult {
    const cur = this.current();
    const node = this.currentNode();
    if (!cur || !node) {
      throw new Error('Session.submit() called with no current node');
    }
    const opts: GradeOptions = { ...this.options };
    if (rngRoll !== undefined) opts.rng = rngRoll;
    const g = grade(node, cur.hand, chosen, opts);
    const result: DecisionResult = {
      providerId: node.providerId,
      nodeId: cur.nodeId,
      hand: cur.hand,
      chosen,
      grade: g,
    };
    this.results.push(result);
    this.index += 1;
    return result;
  }

  /** End an exam early while keeping already-recorded decisions replayable. */
  terminate(): void {
    this.index = this.plan.length;
  }

  /** Running average GTO score over decisions made so far (0 if none yet). */
  runningGtoScore(): number {
    return runningGtoScore(this.results);
  }

  /** Final summary. Safe to call at any time (reflects decisions so far). */
  summary(): SessionSummary {
    return summarize(this.results);
  }
}

/** Average decision score over the results (0 when empty). */
export function runningGtoScore(results: DecisionResult[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, r) => acc + r.grade.score, 0);
  return Math.round(sum / results.length);
}

/** Build a SessionSummary from recorded decisions. */
export function summarize(results: DecisionResult[]): SessionSummary {
  const withEv = results.filter((r) => r.grade.evLoss !== null);
  const totalEvLoss = withEv.reduce((acc, r) => acc + (r.grade.evLoss ?? 0), 0);
  const mistakes = results.filter(
    (r) => r.grade.verdict === 'inaccuracy' || r.grade.verdict === 'blunder',
  );
  return {
    results,
    gtoScore: runningGtoScore(results),
    totalEvLoss: Math.round(totalEvLoss * 100) / 100,
    avgEvLoss: withEv.length === 0 ? 0 : Math.round((totalEvLoss / withEv.length) * 100) / 100,
    evHands: withEv.length,
    mistakes,
    handsPlayed: results.length,
  };
}
