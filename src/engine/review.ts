// =============================================================================
// review.ts — pure spaced-repetition (Leitner) scheduling for the mistake queue.
// Intervals: 1d -> 3d -> 7d. Correct review promotes a box; a miss resets it.
// =============================================================================
import { addDays, daysBetween, todayISO } from './dates';
import type { Action, HandKey, ProviderId, Verdict } from '../types';

export const LEITNER_INTERVALS = [1, 3, 7] as const; // days per box

export interface ReviewItem {
  id: string; // `${providerId}::${nodeId}::${hand}`
  providerId: ProviderId;
  nodeId: string;
  hand: HandKey;
  box: number; // 0..LEITNER_INTERVALS.length-1
  dueDate: string; // ISO "YYYY-MM-DD"
  addedDate: string;
  lastVerdict: Verdict;
  lastChosen: Action;
}

export function reviewItemId(providerId: ProviderId, nodeId: string, hand: HandKey): string {
  return `${providerId}::${nodeId}::${hand}`;
}

/** A freshly-logged mistake: box 0, due after the first interval (1 day). */
export function newReviewItem(
  providerId: ProviderId,
  nodeId: string,
  hand: HandKey,
  verdict: Verdict,
  chosen: Action,
  today: string = todayISO(),
): ReviewItem {
  return {
    id: reviewItemId(providerId, nodeId, hand),
    providerId,
    nodeId,
    hand,
    box: 0,
    dueDate: addDays(today, LEITNER_INTERVALS[0]),
    addedDate: today,
    lastVerdict: verdict,
    lastChosen: chosen,
  };
}

/** Is the item due for review on `today`? */
export function isDue(item: ReviewItem, today: string = todayISO()): boolean {
  return daysBetween(item.dueDate, today) >= 0;
}

/**
 * Apply a review outcome. On success, promote to the next box and reschedule;
 * if it graduates past the last box, return null (remove from queue). On a miss,
 * reset to box 0 and reschedule from the first interval.
 */
export function applyReviewOutcome(
  item: ReviewItem,
  success: boolean,
  today: string = todayISO(),
): ReviewItem | null {
  if (!success) {
    return { ...item, box: 0, dueDate: addDays(today, LEITNER_INTERVALS[0]) };
  }
  const nextBox = item.box + 1;
  if (nextBox >= LEITNER_INTERVALS.length) {
    return null; // graduated out of the queue
  }
  return { ...item, box: nextBox, dueDate: addDays(today, LEITNER_INTERVALS[nextBox]) };
}

/** Items due now, soonest-added first. */
export function dueItems(items: ReviewItem[], today: string = todayISO()): ReviewItem[] {
  return items.filter((i) => isDue(i, today)).sort((a, b) => a.addedDate.localeCompare(b.addedDate));
}
