// =============================================================================
// nodeId.ts — deterministic mapping from a spot selection to a RangeNode id.
// UI selections map straight to data via buildNodeId(...).
// =============================================================================
import type { GameFormat, Position, ScenarioType } from '../types';

// Compact format token used inside ids, e.g. "cash6max".
function formatToken(format: GameFormat): string {
  switch (format) {
    case 'cash_6max':
      return 'cash6max';
    case 'mtt_8max':
      return 'mtt8max';
  }
}

export interface NodeIdParts {
  format: GameFormat;
  stackBB: number;
  hero: Position;
  scenario: ScenarioType;
  villainPosition?: Position;
}

/**
 * Build a node id deterministically from a spot selection.
 *   RFI:            "cash6max_100bb_BTN_RFI"
 *   vs_RFI:         "cash6max_100bb_BTN_vs_RFI_CO"
 *   blind_defense:  "cash6max_100bb_BB_blind_defense_BTN"
 * Villain position is appended only when present.
 */
export function buildNodeId(parts: NodeIdParts): string {
  const { format, stackBB, hero, scenario, villainPosition } = parts;
  const base = `${formatToken(format)}_${stackBB}bb_${hero}_${scenario}`;
  return villainPosition ? `${base}_${villainPosition}` : base;
}
