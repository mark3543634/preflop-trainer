import { create } from 'zustand';
import { LegacyStorageKeys, readMigratedJSON, StorageKeys, writeJSON } from '../storage';
import { migrateReviewItemsV1, type LegacyReviewItemV1 } from '../storage/migrations';
import {
  applyReviewOutcome,
  dueItems,
  newReviewItem,
  reviewItemId,
  type ReviewItem,
} from '../engine/review';
import { todayISO } from '../engine/dates';
import type { Action, HandKey, ProviderId, Verdict } from '../types';

interface Persisted { items: ReviewItem[] }

export interface ReviewState extends Persisted {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  logMistake: (providerId: ProviderId, nodeId: string, hand: HandKey, verdict: Verdict, chosen: Action) => void;
  reviewOutcome: (id: string, success: boolean) => void;
  resetAll: () => void;
  due: () => ReviewItem[];
  dueCount: () => number;
}

const DEFAULTS: Persisted = { items: [] };
const persist = (value: Persisted): void => { void writeJSON(StorageKeys.review, value); };

export const useReview = create<ReviewState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  hydrate: async () => {
    const value = await readMigratedJSON<Persisted, { items?: LegacyReviewItemV1[] }>(
      StorageKeys.review,
      LegacyStorageKeys.review,
      DEFAULTS,
      (legacy) => ({ items: migrateReviewItemsV1(legacy.items) }),
    );
    set({ ...value, hydrated: true });
  },
  logMistake: (providerId, nodeId, hand, verdict, chosen) => {
    const id = reviewItemId(providerId, nodeId, hand);
    const existing = get().items.find((item) => item.id === id);
    const item = existing
      ? { ...existing, box: 0, dueDate: todayISO(), lastVerdict: verdict, lastChosen: chosen }
      : newReviewItem(providerId, nodeId, hand, verdict, chosen);
    const items = [...get().items.filter((candidate) => candidate.id !== id), item];
    set({ items });
    persist({ items });
  },
  reviewOutcome: (id, success) => {
    const item = get().items.find((candidate) => candidate.id === id);
    if (!item) return;
    const updated = applyReviewOutcome(item, success);
    const rest = get().items.filter((candidate) => candidate.id !== id);
    const items = updated ? [...rest, updated] : rest;
    set({ items });
    persist({ items });
  },
  resetAll: () => { set({ ...DEFAULTS }); persist(DEFAULTS); },
  due: () => dueItems(get().items),
  dueCount: () => dueItems(get().items).length,
}));
