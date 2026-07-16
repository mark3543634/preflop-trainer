// =============================================================================
// tableStory.ts — derive visible preflop action history from a RangeNode story.
// No strategy is invented here. Bet amounts are included only when sizing data
// exists on the node; otherwise the UI shows an action without a fake number.
// =============================================================================
import { POSITIONS, type Action, type Position, type RangeNode } from '../types';
import { actionLabel } from './labels';

export type TableActionTone = 'fold' | 'call' | 'aggressive';

export interface TableActionBadge {
  label: string;
  tone: TableActionTone;
}

export type TableActionBadges = Partial<Record<Position, TableActionBadge>>;

function positionsBefore(position: Position): Position[] {
  const index = POSITIONS.indexOf(position);
  return POSITIONS.slice(0, index);
}

function positionsBetween(first: Position, second: Position): Position[] {
  const firstIndex = POSITIONS.indexOf(first);
  const secondIndex = POSITIONS.indexOf(second);
  if (secondIndex <= firstIndex) return [];
  return POSITIONS.slice(firstIndex + 1, secondIndex);
}

function foldBadge(): TableActionBadge {
  return { label: 'ФОЛД', tone: 'fold' };
}

function sizedLabel(label: string, size?: number): string {
  return size === undefined ? label : `${label} ${size} BB`;
}

function chosenBadge(node: RangeNode, action: Action): TableActionBadge {
  switch (action) {
    case 'fold':
      return foldBadge();
    case 'call':
      return { label: 'КОЛЛ', tone: 'call' };
    case 'raise':
      return {
        label: sizedLabel(actionLabel(action).toUpperCase(), node.sizing.openBB),
        tone: 'aggressive',
      };
    case '3bet':
    case '4bet':
    case '5bet':
      return {
        label: sizedLabel(actionLabel(action).toUpperCase(), node.sizing.raiseBB),
        tone: 'aggressive',
      };
  }
}

function setFolds(badges: TableActionBadges, positions: Position[], except?: Position): void {
  for (const position of positions) {
    if (position !== except) badges[position] = foldBadge();
  }
}

/** Action history visible when the decision reaches hero. */
export function tableActionBadges(node: RangeNode, heroChosen?: Action): TableActionBadges {
  const badges: TableActionBadges = {};
  const villain = node.villainPosition;

  switch (node.scenario) {
    case 'RFI':
      setFolds(badges, positionsBefore(node.hero));
      break;

    case 'vs_RFI':
    case 'blind_defense':
      setFolds(badges, positionsBefore(node.hero), villain);
      if (villain) {
        badges[villain] = {
          label: sizedLabel('РЕЙЗ', node.sizing.openBB),
          tone: 'aggressive',
        };
      }
      break;

    case 'vs_3bet':
      setFolds(badges, positionsBefore(node.hero));
      badges[node.hero] = {
        label: sizedLabel('ОПЕН', node.sizing.openBB),
        tone: 'aggressive',
      };
      if (villain) {
        setFolds(badges, positionsBetween(node.hero, villain));
        badges[villain] = {
          label: sizedLabel('3-БЕТ', node.sizing.raiseBB),
          tone: 'aggressive',
        };
      }
      break;

    case 'vs_4bet':
      badges[node.hero] = {
        label: sizedLabel('3-БЕТ', node.sizing.raiseBB),
        tone: 'aggressive',
      };
      if (villain) {
        badges[villain] = { label: '4-БЕТ', tone: 'aggressive' };
      }
      break;

    case 'squeeze':
      // A squeeze node guarantees one or more callers but does not identify
      // their seats. Mark only facts encoded in the node: folds before opener
      // and the opener's raise. Never guess which player called.
      if (villain) {
        setFolds(badges, positionsBefore(villain));
        badges[villain] = {
          label: sizedLabel('РЕЙЗ', node.sizing.openBB),
          tone: 'aggressive',
        };
      }
      break;
  }

  if (heroChosen) badges[node.hero] = chosenBadge(node, heroChosen);
  return badges;
}
