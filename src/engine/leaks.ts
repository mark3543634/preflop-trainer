// =============================================================================
// leaks.ts — pure per-node performance stats + "money framing" (bb/100).
// =============================================================================
import type { DecisionResult, ProviderId } from '../types';
import { rangeRefKey } from './rangeRef';

export interface NodeStat {
  providerId: ProviderId;
  nodeId: string;
  hands: number;
  sumScore: number; // sum of decision GTO scores
  sumEvLoss: number; // sum of evLoss (bb), only decisions with EV
  evHands: number; // count of decisions that had EV data
  mistakes: number; // inaccuracy | blunder count
}

export function emptyNodeStat(providerId: ProviderId, nodeId: string): NodeStat {
  return { providerId, nodeId, hands: 0, sumScore: 0, sumEvLoss: 0, evHands: 0, mistakes: 0 };
}

/** Fold a decision result into a node's running stat (returns a new object). */
export function accumulate(stat: NodeStat, r: DecisionResult): NodeStat {
  const isMistake = r.grade.verdict === 'inaccuracy' || r.grade.verdict === 'blunder';
  const hasEv = r.grade.evLoss !== null;
  return {
    nodeId: stat.nodeId,
    providerId: stat.providerId,
    hands: stat.hands + 1,
    sumScore: stat.sumScore + r.grade.score,
    sumEvLoss: stat.sumEvLoss + (r.grade.evLoss ?? 0),
    evHands: stat.evHands + (hasEv ? 1 : 0),
    mistakes: stat.mistakes + (isMistake ? 1 : 0),
  };
}

export function nodeStatKey(stat: Pick<NodeStat, 'providerId' | 'nodeId'>): string {
  return rangeRefKey(stat.providerId, stat.nodeId);
}

/** Average GTO score for the node (0 if no hands). */
export function accuracy(stat: NodeStat): number {
  return stat.hands === 0 ? 0 : Math.round(stat.sumScore / stat.hands);
}

/** Average EV loss in bb per decision (0 if no EV data). */
export function avgEvLoss(stat: NodeStat): number {
  return stat.evHands === 0 ? 0 : stat.sumEvLoss / stat.evHands;
}

/**
 * Estimated cost of a leak in bb/100 hands. Returns null unless both real EV
 * and an explicit occurrence frequency are supplied by a trustworthy source:
 *   bb/100 ≈ avgEvLoss(bb) × spotFrequency × 100.
 */
export function estimateBb100(stat: NodeStat, spotFrequency?: number): number | null {
  if (stat.evHands === 0 || spotFrequency === undefined || spotFrequency < 0) return null;
  return Math.round(avgEvLoss(stat) * spotFrequency * 100 * 100) / 100;
}

/** Nodes sorted worst-first by observed EV loss, then by low GTO score. */
export function sortLeaks(stats: NodeStat[]): NodeStat[] {
  return [...stats].sort((a, b) => {
    const byMoney = avgEvLoss(b) - avgEvLoss(a);
    if (byMoney !== 0) return byMoney;
    return accuracy(a) - accuracy(b);
  });
}

/** Merge historical observations for one logical node across internal packs. */
export function mergeStatsByNodeId(
  stats: NodeStat[],
  preferredProvider: (nodeId: string) => ProviderId | undefined,
): NodeStat[] {
  const merged = new Map<string, NodeStat>();
  for (const stat of stats) {
    const current = merged.get(stat.nodeId);
    if (!current) {
      merged.set(stat.nodeId, {
        ...stat,
        providerId: preferredProvider(stat.nodeId) ?? stat.providerId,
      });
      continue;
    }
    merged.set(stat.nodeId, {
      providerId: preferredProvider(stat.nodeId) ?? current.providerId,
      nodeId: stat.nodeId,
      hands: current.hands + stat.hands,
      sumScore: current.sumScore + stat.sumScore,
      sumEvLoss: current.sumEvLoss + stat.sumEvLoss,
      evHands: current.evHands + stat.evHands,
      mistakes: current.mistakes + stat.mistakes,
    });
  }
  return [...merged.values()];
}
