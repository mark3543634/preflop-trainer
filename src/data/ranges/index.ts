import type { ProviderId, RangeNode } from '../../types';
import { buildRealNodes, PROVIDERS } from './convert';
import { RANGE_SOURCES, rangeSource } from './sources';

export { PROVIDERS, RANGE_SOURCES, rangeSource };
export type { ProviderId } from '../../types';

const CACHE = new Map<ProviderId, { nodes: RangeNode[]; byId: Record<string, RangeNode> }>();

function pack(providerId: ProviderId): { nodes: RangeNode[]; byId: Record<string, RangeNode> } {
  const cached = CACHE.get(providerId);
  if (cached) return cached;
  const nodes = buildRealNodes(providerId);
  const built = { nodes, byId: Object.fromEntries(nodes.map((node) => [node.id, node])) };
  CACHE.set(providerId, built);
  return built;
}

export function hasNode(providerId: ProviderId, nodeId: string): boolean {
  return nodeId in pack(providerId).byId;
}

export function getNode(providerId: ProviderId, nodeId: string): RangeNode | undefined {
  return pack(providerId).byId[nodeId];
}

export function allNodeIds(providerId: ProviderId): string[] {
  return Object.keys(pack(providerId).byId);
}

export function allNodes(providerId: ProviderId): RangeNode[] {
  return pack(providerId).nodes;
}

/**
 * One user-facing range library. Nodes are never averaged: Pekarstas is the
 * preferred complete transcription and Greenline only fills an absent node.
 * Each selected node keeps its internal providerId for audit and persistence.
 */
export function allCombinedNodes(): RangeNode[] {
  const byId = new Map<string, RangeNode>();
  for (const node of allNodes('greenline')) byId.set(node.id, node);
  for (const node of allNodes('pekarstas')) byId.set(node.id, node);
  return [...byId.values()];
}

export function getCombinedNode(nodeId: string): RangeNode | undefined {
  return getNode('pekarstas', nodeId) ?? getNode('greenline', nodeId);
}

export function hasCombinedNode(nodeId: string): boolean {
  return getCombinedNode(nodeId) !== undefined;
}
