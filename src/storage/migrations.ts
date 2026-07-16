import type { Action, HandKey, ProviderId, Verdict } from '../types';
import { rangeRefKey } from '../engine/rangeRef';
import { reviewItemId, type ReviewItem } from '../engine/review';
import type { NodeStat } from '../engine/leaks';

export const PUBLIC_DEFAULT_PROVIDER: ProviderId = 'pekarstas';

export function isPublicProvider(value: unknown): value is ProviderId {
  return value === 'pekarstas' || value === 'greenline';
}

export function migrateSettingsV1(value: {
  rngMode?: boolean;
  examMode?: boolean;
  provider?: unknown;
}): { rngMode: boolean; examMode: boolean; examMistakeCap: number; provider: ProviderId } {
  return {
    rngMode: value.rngMode === true,
    examMode: value.examMode === true,
    examMistakeCap: 3,
    provider: isPublicProvider(value.provider) ? value.provider : PUBLIC_DEFAULT_PROVIDER,
  };
}

/** Adds the public default provider to legacy provider-agnostic records. */
export function migrateProviderItemsV1<T extends object>(items: T[] | undefined): (T & {
  providerId: ProviderId;
})[] {
  return (items ?? []).map((item) => ({ ...item, providerId: PUBLIC_DEFAULT_PROVIDER }));
}

export interface LegacyReviewItemV1 {
  id: string;
  nodeId: string;
  hand: HandKey;
  box: number;
  dueDate: string;
  addedDate: string;
  lastVerdict: Verdict;
  lastChosen: Action;
}

export function migrateReviewItemsV1(items: LegacyReviewItemV1[] | undefined): ReviewItem[] {
  return (items ?? []).map((item) => ({
    ...item,
    providerId: PUBLIC_DEFAULT_PROVIDER,
    id: reviewItemId(PUBLIC_DEFAULT_PROVIDER, item.nodeId, item.hand),
  }));
}

export interface PersistedStatsV2 {
  perNode: Record<string, NodeStat>;
  gtoHistory: number[];
  totalDecisions: number;
  globalScoreSum: number;
}

export interface LegacyStatsV1 extends Omit<PersistedStatsV2, 'perNode'> {
  perNode: Record<string, Omit<NodeStat, 'providerId'>>;
}

export function migrateStatsV1(legacy: LegacyStatsV1): PersistedStatsV2 {
  const perNode: Record<string, NodeStat> = {};
  for (const stat of Object.values(legacy.perNode ?? {})) {
    const migrated: NodeStat = { ...stat, providerId: PUBLIC_DEFAULT_PROVIDER };
    perNode[rangeRefKey(migrated.providerId, migrated.nodeId)] = migrated;
  }
  return {
    perNode,
    gtoHistory: legacy.gtoHistory ?? [],
    totalDecisions: legacy.totalDecisions ?? 0,
    globalScoreSum: legacy.globalScoreSum ?? 0,
  };
}

export { rangeRefKey as rangeStatKey };
