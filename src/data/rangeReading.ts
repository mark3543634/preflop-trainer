// =============================================================================
// Range-reading spots. Action sequences are presentation data;
// there are deliberately NO hand-written answers here. Every answer is derived
// at runtime from RangeNode action frequencies, while every flop is dealt from
// a complete 52-card deck by engine/rangeEquity.ts.
// =============================================================================
import type { Position } from '../types';

export interface RangeReadingScenario {
  id: string;
  opener: Position;
  defender: Position;
  openerNodeId: string;
  defenderNodeId: string;
  openBB: number;
}

export const RANGE_READING_SCENARIOS: readonly RangeReadingScenario[] = [
  {
    id: 'utg-bb',
    opener: 'UTG',
    defender: 'BB',
    openerNodeId: 'cash6max_100bb_UTG_RFI',
    defenderNodeId: 'cash6max_100bb_BB_blind_defense_UTG',
    openBB: 2.5,
  },
  {
    id: 'co-bb',
    opener: 'CO',
    defender: 'BB',
    openerNodeId: 'cash6max_100bb_CO_RFI',
    defenderNodeId: 'cash6max_100bb_BB_blind_defense_CO',
    openBB: 2.5,
  },
  {
    id: 'btn-bb',
    opener: 'BTN',
    defender: 'BB',
    openerNodeId: 'cash6max_100bb_BTN_RFI',
    defenderNodeId: 'cash6max_100bb_BB_blind_defense_BTN',
    openBB: 2.5,
  },
] as const;
