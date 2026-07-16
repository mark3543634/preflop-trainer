// =============================================================================
// progressStore — XP/level, daily streak, and per-lesson mastery. Persisted.
// =============================================================================
import { create } from 'zustand';
import { LegacyStorageKeys, readMigratedJSON, writeJSON, StorageKeys } from '../storage';
import { daysBetween, todayISO } from '../engine/dates';
import { levelFromXp, masteryForScore, type MasteryTier } from '../engine/progression';

export interface LessonProgress {
  completed: boolean;
  bestScore: number; // best checkpoint GTO score
  tier: MasteryTier;
}

interface Persisted {
  xp: number;
  currentStreak: number;
  lastPlayedDate: string | null;
  lessons: Record<string, LessonProgress>;
}

export interface ProgressState extends Persisted {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addXp: (amount: number) => void;
  recordPlayDay: () => void; // call once per completed drill to update streak
  recordLessonResult: (lessonId: string, checkpointScore: number, passed: boolean) => void;
  resetAll: () => void;
  // selectors
  level: () => ReturnType<typeof levelFromXp>;
  lessonProgress: (lessonId: string) => LessonProgress;
}

const DEFAULTS: Persisted = {
  xp: 0,
  currentStreak: 0,
  lastPlayedDate: null,
  lessons: {},
};

function persist(state: Persisted): void {
  void writeJSON<Persisted>(StorageKeys.progress, state);
}

const EMPTY_LESSON: LessonProgress = { completed: false, bestScore: 0, tier: 'none' };

export const useProgress = create<ProgressState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    const p = await readMigratedJSON<Persisted, Persisted>(
      StorageKeys.progress,
      LegacyStorageKeys.progress,
      DEFAULTS,
      (legacy) => legacy,
    );
    set({ ...p, hydrated: true });
  },

  addXp: (amount) => {
    const xp = get().xp + Math.max(0, Math.round(amount));
    set({ xp });
    persist(snapshot(get()));
  },

  recordPlayDay: () => {
    const today = todayISO();
    const { lastPlayedDate, currentStreak } = get();
    let streak = currentStreak;
    if (lastPlayedDate === today) {
      // already counted today
    } else if (lastPlayedDate && daysBetween(lastPlayedDate, today) === 1) {
      streak = currentStreak + 1; // consecutive day
    } else {
      streak = 1; // first play or a gap broke the streak
    }
    set({ currentStreak: streak, lastPlayedDate: today });
    persist(snapshot(get()));
  },

  recordLessonResult: (lessonId, checkpointScore, passed) => {
    const prev = get().lessons[lessonId] ?? EMPTY_LESSON;
    const bestScore = Math.max(prev.bestScore, checkpointScore);
    const next: LessonProgress = {
      completed: prev.completed || passed,
      bestScore,
      tier: masteryForScore(bestScore),
    };
    set({ lessons: { ...get().lessons, [lessonId]: next } });
    persist(snapshot(get()));
  },

  resetAll: () => {
    set({ ...DEFAULTS });
    persist(DEFAULTS);
  },

  level: () => levelFromXp(get().xp),
  lessonProgress: (lessonId) => get().lessons[lessonId] ?? EMPTY_LESSON,
}));

function snapshot(s: ProgressState): Persisted {
  return {
    xp: s.xp,
    currentStreak: s.currentStreak,
    lastPlayedDate: s.lastPlayedDate,
    lessons: s.lessons,
  };
}
