import type { ProviderId, RangeRef } from '../types';

export function rangeRefKey(providerId: ProviderId, nodeId: string): string {
  return `${providerId}::${nodeId}`;
}

export function makeRangeRef(providerId: ProviderId, nodeId: string): RangeRef {
  return { providerId, nodeId };
}
