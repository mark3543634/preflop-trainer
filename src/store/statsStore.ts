import { create } from 'zustand';
import { LegacyStorageKeys, readMigratedJSON, StorageKeys, writeJSON } from '../storage';
import {
  migrateStatsV1,
  type LegacyStatsV1,
  type PersistedStatsV2,
} from '../storage/migrations';
import { rangeRefKey } from '../engine/rangeRef';
import { accumulate, emptyNodeStat, sortLeaks, type NodeStat } from '../engine/leaks';
import type { DecisionResult, SessionSummary } from '../types';

type Persisted = PersistedStatsV2;

export interface StatsState extends Persisted {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  ingestSession: (summary: SessionSummary) => void;
  resetAll: () => void;
  globalGtoScore: () => number;
  leaksSorted: () => NodeStat[];
}

const DEFAULTS: Persisted = { perNode: {}, gtoHistory: [], totalDecisions: 0, globalScoreSum: 0 };
const persist = (value: Persisted): void => { void writeJSON(StorageKeys.stats, value); };

export const useStats = create<StatsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  hydrate: async () => {
    const value = await readMigratedJSON<Persisted, LegacyStatsV1>(
      StorageKeys.stats,
      LegacyStorageKeys.stats,
      DEFAULTS,
      migrateStatsV1,
    );
    set({ ...value, hydrated: true });
  },
  ingestSession: (summary) => {
    const perNode = { ...get().perNode };
    let globalScoreSum = get().globalScoreSum;
    let totalDecisions = get().totalDecisions;
    for (const result of summary.results as DecisionResult[]) {
      const key = rangeRefKey(result.providerId, result.nodeId);
      const current = perNode[key] ?? emptyNodeStat(result.providerId, result.nodeId);
      perNode[key] = accumulate(current, result);
      globalScoreSum += result.grade.score;
      totalDecisions += 1;
    }
    const value: Persisted = {
      perNode,
      gtoHistory: [...get().gtoHistory, summary.gtoScore].slice(-50),
      totalDecisions,
      globalScoreSum,
    };
    set(value);
    persist(value);
  },
  resetAll: () => { set({ ...DEFAULTS }); persist(DEFAULTS); },
  globalGtoScore: () => get().totalDecisions === 0 ? 0 : Math.round(get().globalScoreSum / get().totalDecisions),
  leaksSorted: () => sortLeaks(Object.values(get().perNode)),
}));
