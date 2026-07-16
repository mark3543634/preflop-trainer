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
