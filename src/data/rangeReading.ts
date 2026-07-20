// =============================================================================
// Range-reading questions. Boards and action sequences are presentation data;
// there are deliberately NO hand-written answers here. Every answer is derived
// at runtime from RangeNode action frequencies by engine/rangeEquity.ts.
// =============================================================================
import type { ConcreteCard } from '../engine/rangeEquity';
import type { Position } from '../types';

export interface RangeReadingScenario {
  id: string;
  opener: Position;
  defender: Position;
  openerNodeId: string;
  defenderNodeId: string;
  openBB: number;
  seed: number;
  flop: readonly [ConcreteCard, ConcreteCard, ConcreteCard];
}

export const RANGE_READING_SCENARIOS: readonly RangeReadingScenario[] = [
  {
    id: 'utg-bb-ak2-rainbow',
    opener: 'UTG',
    defender: 'BB',
    openerNodeId: 'cash6max_100bb_UTG_RFI',
    defenderNodeId: 'cash6max_100bb_BB_blind_defense_UTG',
    openBB: 2.5,
    seed: 101,
    flop: ['As', 'Kd', '2c'],
  },
  {
    id: 'utg-bb-765-two-tone',
    opener: 'UTG',
    defender: 'BB',
    openerNodeId: 'cash6max_100bb_UTG_RFI',
    defenderNodeId: 'cash6max_100bb_BB_blind_defense_UTG',
    openBB: 2.5,
    seed: 102,
    flop: ['7h', '6h', '5c'],
  },
  {
    id: 'co-bb-t94-two-tone',
    opener: 'CO',
    defender: 'BB',
    openerNodeId: 'cash6max_100bb_CO_RFI',
    defenderNodeId: 'cash6max_100bb_BB_blind_defense_CO',
    openBB: 2.5,
    seed: 201,
    flop: ['Tc', '9c', '4d'],
  },
  {
    id: 'co-bb-882-rainbow',
    opener: 'CO',
    defender: 'BB',
    openerNodeId: 'cash6max_100bb_CO_RFI',
    defenderNodeId: 'cash6max_100bb_BB_blind_defense_CO',
    openBB: 2.5,
    seed: 202,
    flop: ['8s', '8d', '2h'],
  },
  {
    id: 'btn-bb-a72-rainbow',
    opener: 'BTN',
    defender: 'BB',
    openerNodeId: 'cash6max_100bb_BTN_RFI',
    defenderNodeId: 'cash6max_100bb_BB_blind_defense_BTN',
    openBB: 2.5,
    seed: 301,
    flop: ['Ah', '7d', '2s'],
  },
  {
    id: 'btn-bb-654-rainbow',
    opener: 'BTN',
    defender: 'BB',
    openerNodeId: 'cash6max_100bb_BTN_RFI',
    defenderNodeId: 'cash6max_100bb_BB_blind_defense_BTN',
    openBB: 2.5,
    seed: 302,
    flop: ['6c', '5d', '4h'],
  },
  {
    id: 'btn-bb-kqj-rainbow',
    opener: 'BTN',
    defender: 'BB',
    openerNodeId: 'cash6max_100bb_BTN_RFI',
    defenderNodeId: 'cash6max_100bb_BB_blind_defense_BTN',
    openBB: 2.5,
    seed: 303,
    flop: ['Ks', 'Qh', 'Jd'],
  },
] as const;
