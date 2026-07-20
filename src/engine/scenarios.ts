// =============================================================================
// scenarios.ts — the valid 6-max preflop decision matrix as a pure function.
// UI must only ever show legal combos; it asks legalScenarios(hero).
// =============================================================================
import { POSITIONS, type LegalScenario, type Position, type ScenarioType } from '../types';

function posIndex(p: Position): number {
  return POSITIONS.indexOf(p);
}

/** Positions that act strictly before `hero` preflop (potential openers). */
function earlierPositions(hero: Position): Position[] {
  const h = posIndex(hero);
  return POSITIONS.filter((p) => posIndex(p) < h);
}

/** Positions that act strictly after `hero` preflop (potential 3bettors). */
function laterPositions(hero: Position): Position[] {
  const h = posIndex(hero);
  return POSITIONS.filter((p) => posIndex(p) > h);
}

/**
 * legalScenarios(hero): which scenarios the hero can train, and against which
 * villain positions. An empty villainPositions array means no villain is needed
 * (e.g. RFI). The matrix covers every heads-up decision represented by the
 * imported source charts:
 *
 *   UTG: RFI; vs_3bet from any later position.
 *   HJ:  RFI; vs_RFI(UTG); vs_3bet; vs_4bet(UTG).
 *   CO:  RFI; vs_RFI(UTG/HJ); vs_3bet; vs_4bet(UTG/HJ).
 *   BTN: RFI; vs_RFI(UTG/HJ/CO); vs_3bet; vs_4bet; squeeze.
 *   SB:  RFI(steal/complete); vs_RFI(any earlier); vs_3bet; vs_4bet;
 *        blind_defense.
 *   BB:  blind_defense(any earlier); squeeze; vs_4bet after BB has 3-bet.
 *
 * This function only models legal action order. It never supplies strategy:
 * sandbox availability still requires an actual RangeNode from source data.
 */
export function legalScenarios(hero: Position): LegalScenario[] {
  const earlier = earlierPositions(hero);
  const later = laterPositions(hero);
  const out: LegalScenario[] = [];

  switch (hero) {
    case 'UTG':
      out.push({ scenario: 'RFI', villainPositions: [] });
      out.push({ scenario: 'vs_3bet', villainPositions: later });
      break;

    case 'HJ':
      out.push({ scenario: 'RFI', villainPositions: [] });
      out.push({ scenario: 'vs_RFI', villainPositions: earlier });
      out.push({ scenario: 'vs_3bet', villainPositions: later });
      out.push({ scenario: 'vs_4bet', villainPositions: earlier });
      break;

    case 'CO':
      out.push({ scenario: 'RFI', villainPositions: [] });
      out.push({ scenario: 'vs_RFI', villainPositions: earlier });
      out.push({ scenario: 'vs_3bet', villainPositions: later });
      out.push({ scenario: 'vs_4bet', villainPositions: earlier });
      break;

    case 'BTN':
      out.push({ scenario: 'RFI', villainPositions: [] });
      out.push({ scenario: 'vs_RFI', villainPositions: earlier });
      out.push({ scenario: 'vs_3bet', villainPositions: later });
      out.push({ scenario: 'vs_4bet', villainPositions: earlier });
      out.push({ scenario: 'squeeze', villainPositions: earlier });
      break;

    case 'SB':
      out.push({ scenario: 'RFI', villainPositions: [] }); // steal / complete
      out.push({ scenario: 'vs_RFI', villainPositions: earlier });
      out.push({ scenario: 'vs_3bet', villainPositions: later });
      out.push({ scenario: 'vs_4bet', villainPositions: earlier });
      out.push({ scenario: 'blind_defense', villainPositions: earlier });
      break;

    case 'BB':
      out.push({ scenario: 'blind_defense', villainPositions: earlier });
      out.push({ scenario: 'squeeze', villainPositions: earlier });
      // BB cannot face a later-position 3-bet. After BB 3-bets an earlier
      // opener and that player raises again, the actual story is vs_4bet.
      out.push({ scenario: 'vs_4bet', villainPositions: earlier });
      break;
  }

  return out;
}

/** Convenience: is a given (hero, scenario, villain?) combination legal? */
export function isLegalScenario(
  hero: Position,
  scenario: ScenarioType,
  villainPosition?: Position,
): boolean {
  const entry = legalScenarios(hero).find((s) => s.scenario === scenario);
  if (!entry) return false;
  if (entry.villainPositions.length === 0) return villainPosition === undefined;
  return villainPosition !== undefined && entry.villainPositions.includes(villainPosition);
}
