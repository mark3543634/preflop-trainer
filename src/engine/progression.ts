// =============================================================================
// progression.ts — pure XP / level curve + mastery tiers.
// =============================================================================
import type { Verdict } from '../types';

// XP needed to *reach* level n (n starts at 1). Quadratic curve: gentle early.
// reach(1)=0, reach(2)=200, reach(3)=500, reach(4)=900, ...
export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return 100 * n + 100 * (n * (n - 1)) / 2; // 100n + 100*C(n,2)
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number; // span of the current level
  progress: number; // 0..1 toward next level
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  while (xp >= xpToReachLevel(level + 1)) level++;
  const base = xpToReachLevel(level);
  const next = xpToReachLevel(level + 1);
  const span = next - base;
  return {
    level,
    xpIntoLevel: xp - base,
    xpForNextLevel: span,
    progress: span === 0 ? 0 : (xp - base) / span,
  };
}

// Mastery tiers for lessons, unlocked by replaying for higher checkpoint scores.
export type MasteryTier = 'none' | 'learned' | 'practiced' | 'mastered';

export const MASTERY_THRESHOLDS: Record<Exclude<MasteryTier, 'none'>, number> = {
  learned: 80, // also the checkpoint pass threshold
  practiced: 90,
  mastered: 97,
};

/** Highest mastery tier earned for a given checkpoint GTO score. */
export function masteryForScore(score: number): MasteryTier {
  if (score >= MASTERY_THRESHOLDS.mastered) return 'mastered';
  if (score >= MASTERY_THRESHOLDS.practiced) return 'practiced';
  if (score >= MASTERY_THRESHOLDS.learned) return 'learned';
  return 'none';
}

/** XP awarded for a completed drill/lesson given its average GTO score. */
export function xpForResult(handsPlayed: number, gtoScore: number): number {
  const base = handsPlayed * 5; // 5 XP per hand played
  const bonus = Math.max(0, Math.round((gtoScore / 100) * handsPlayed * 3)); // accuracy bonus
  return base + bonus;
}

/** Verdict -> XP weight (used if we ever award per-decision; kept for clarity). */
export const verdictXp: Record<Verdict, number> = {
  best: 8,
  correct: 5,
  inaccuracy: 2,
  blunder: 0,
};
