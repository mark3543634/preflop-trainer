// =============================================================================
// grade.ts — the PURE grading engine. No React, no I/O, fully unit-tested.
//
// It reads frequencies/EV from a RangeNode's data ONLY. It never branches on
// hardcoded hand names or fabricated strategy — swap in real solver data and
// the grading is automatically correct.
// =============================================================================
import type { Action, Grade, HandKey, HandStrategy, RangeNode, Verdict } from '../types';

// A hand qualifies as a legitimate "mixed" action at or above this frequency.
export const MIXED_THRESHOLD = 0.05;

// Reference size (bb) used to scale a blunder's score from its EV loss.
// An EV loss of this many bb maps to roughly the full -100. ~one pot-ish unit.
export const POT_REFERENCE_BB = 10;

// Fixed blunder score when no EV data is available to scale by.
export const FIXED_BLUNDER_SCORE = -50;

export interface GradeOptions {
  /** RNG roll in [0,1). When rngMode is on, surfaces the RNG-implied action. */
  rng?: number;
  /** Whether RNG mode is enabled (settings flag). Never hard-fails the user. */
  rngMode?: boolean;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Frequency the strat assigns to an action (0 if absent). */
function freqOf(strat: HandStrategy, action: Action): number {
  return strat[action]?.freq ?? 0;
}

/** EV the strat assigns to an action (undefined if absent). */
function evOf(strat: HandStrategy, action: Action): number | undefined {
  return strat[action]?.ev;
}

/**
 * Grade a single decision against a node's data.
 * Pure: given the same inputs it always returns the same Grade.
 */
export function grade(
  node: RangeNode,
  hand: HandKey,
  chosen: Action,
  options: GradeOptions = {},
): Grade {
  const strat: HandStrategy = node.hands[hand] ?? {};

  // (1) Frequencies for every legal action, in display order, for the feedback bar.
  const frequencies: Partial<Record<Action, number>> = {};
  for (const action of node.actions) {
    const f = freqOf(strat, action);
    if (f > 0) frequencies[action] = f;
  }

  // (2) Best frequency + all actions that share it (a pure or co-equal mix top).
  let bestFreq = 0;
  for (const action of node.actions) {
    bestFreq = Math.max(bestFreq, freqOf(strat, action));
  }
  const bestActions: Action[] = node.actions.filter(
    (a) => bestFreq > 0 && freqOf(strat, a) === bestFreq,
  );

  // (3) Chosen frequency.
  const chosenFreq = freqOf(strat, chosen);

  // (4) Classify.
  const isBest = bestActions.includes(chosen);
  let verdict: Verdict;
  if (isBest) {
    verdict = 'best';
  } else if (chosenFreq >= MIXED_THRESHOLD) {
    verdict = 'correct';
  } else if (chosenFreq > 0) {
    verdict = 'inaccuracy';
  } else {
    verdict = 'blunder';
  }

  // (6) EV loss (bb): best available EV minus chosen EV, clamped >= 0.
  //     Null when either side has no EV data.
  let bestEv: number | undefined;
  for (const action of node.actions) {
    const ev = evOf(strat, action);
    if (ev !== undefined) bestEv = bestEv === undefined ? ev : Math.max(bestEv, ev);
  }
  const chosenEv = evOf(strat, chosen);
  const evLoss: number | null =
    bestEv !== undefined && chosenEv !== undefined ? Math.max(0, bestEv - chosenEv) : null;

  // (5) Score, -100..+100.
  let score: number;
  switch (verdict) {
    case 'best':
      score = 100;
      break;
    case 'correct':
      // Proportion of the best frequency this mixed action carries.
      score = Math.round((100 * chosenFreq) / bestFreq);
      break;
    case 'inaccuracy':
      score = 0;
      break;
    case 'blunder':
      if (evLoss !== null) {
        // Scale the penalty by how much EV was burned vs a pot-ish reference.
        const magnitude = clamp(Math.round((100 * evLoss) / POT_REFERENCE_BB), 1, 100);
        score = -magnitude;
      } else {
        score = FIXED_BLUNDER_SCORE;
      }
      break;
  }

  const result: Grade = {
    verdict,
    score,
    evLoss,
    bestActions,
    frequencies,
  };

  // (7) RNG mode: walk the cumulative frequency distribution with the roll and
  //     report the implied action. Informational only — never changes grading.
  // Community chart heights can encode opponent-dependent branches rather than
  // solver randomization. RNG bucketing is therefore enabled only for verified
  // solver frequencies.
  if (
    options.rngMode &&
    options.rng !== undefined &&
    node.frequencyBasis === 'solver_frequency'
  ) {
    result.rngExpected = rngImpliedAction(node, strat, options.rng);
  }

  return result;
}

/**
 * Walk the cumulative frequency distribution (in node.actions display order)
 * and return the action the roll lands in. Roll is clamped to [0,1).
 */
export function rngImpliedAction(node: RangeNode, strat: HandStrategy, rng: number): Action {
  const roll = clamp(rng, 0, 0.999999);
  // Total assigned frequency (may be slightly off 1.0 with rounded placeholder data).
  let total = 0;
  for (const action of node.actions) total += freqOf(strat, action);
  if (total <= 0) return node.actions[node.actions.length - 1]; // degenerate: last action

  let cumulative = 0;
  for (const action of node.actions) {
    cumulative += freqOf(strat, action) / total;
    if (roll < cumulative) return action;
  }
  // Floating-point fallthrough: return the last action with positive frequency.
  for (let i = node.actions.length - 1; i >= 0; i--) {
    if (freqOf(strat, node.actions[i]) > 0) return node.actions[i];
  }
  return node.actions[node.actions.length - 1];
}
