// =============================================================================
// sessionStore — active training session that drives the Training screen.
// Wraps the PURE Session engine and, on completion, fans results out to the
// stats / review / progress stores. UI never touches the engine directly.
// =============================================================================
import { create } from 'zustand';
import { Session, planSession, shouldEndExam, type PlannedHand } from '../engine/session';
import type { Action, DecisionResult, ProviderId, RangeNode, SessionSummary } from '../types';
import { getNode } from '../data/ranges';
import { useSettings } from './settingsStore';
import { useStats } from './statsStore';
import { useReview } from './reviewStore';
import { useProgress } from './progressStore';
import { xpForResult } from '../engine/progression';
import { rangeRefKey } from '../engine/rangeRef';

export type SessionOrigin = 'sandbox' | 'lesson' | 'review';

export interface SessionMeta {
  title: string;
  origin: SessionOrigin;
  examMode: boolean;
  examMistakeCap?: number;
  awardProgress: boolean; // award XP/streak on finish (lessons handle their own too)
}

interface SessionStoreState {
  session: Session | null;
  meta: SessionMeta | null;
  currentRoll: number; // RNG roll for the current hand
  lastResult: DecisionResult | null; // for the feedback overlay
  showFeedback: boolean;
  finished: boolean;
  summary: SessionSummary | null;
  examMistakes: number;
  finishReason: 'complete' | 'mistake_cap' | null;

  // Remembered config for "Replay".
  lastNodes: RangeNode[];
  lastLength: number;
  lastMeta: SessionMeta | null;

  start: (nodes: RangeNode[], length: number, meta: SessionMeta) => void;
  startWithPlan: (nodes: RangeNode[], plan: PlannedHand[], meta: SessionMeta) => void;
  replay: () => boolean; // re-run last config with a fresh deal; false if none
  submit: (action: Action) => void;
  next: () => void;
  abort: () => void;
}

function rollDice(): number {
  return Math.random();
}

export const useSession = create<SessionStoreState>((set, get) => ({
  session: null,
  meta: null,
  currentRoll: rollDice(),
  lastResult: null,
  showFeedback: false,
  finished: false,
  summary: null,
  examMistakes: 0,
  finishReason: null,
  lastNodes: [],
  lastLength: 0,
  lastMeta: null,

  start: (nodes, length, meta) => {
    const plan = planSession(nodes, length);
    get().startWithPlan(nodes, plan, meta);
  },

  startWithPlan: (nodes, plan, meta) => {
    const rngMode = useSettings.getState().rngMode;
    const session = new Session(nodes, plan, { rngMode });
    set({
      session,
      meta,
      currentRoll: rollDice(),
      lastResult: null,
      showFeedback: false,
      finished: false,
      summary: null,
      examMistakes: 0,
      finishReason: null,
      lastNodes: nodes,
      lastLength: plan.length,
      lastMeta: meta,
    });
  },

  replay: () => {
    const { lastNodes, lastLength, lastMeta } = get();
    if (lastNodes.length === 0 || !lastMeta || lastLength === 0) return false;
    get().start(lastNodes, lastLength, lastMeta);
    return true;
  },

  submit: (action) => {
    const { session, currentRoll, showFeedback } = get();
    if (!session || showFeedback || session.isComplete()) return;
    const result = session.submit(action, currentRoll);
    const isMistake = result.grade.verdict === 'inaccuracy' || result.grade.verdict === 'blunder';
    const examMistakes = get().examMistakes + (isMistake ? 1 : 0);
    const cap = get().meta?.examMistakeCap ?? 3;
    const hitCap = shouldEndExam(get().meta?.examMode === true, examMistakes, cap);
    if (hitCap) session.terminate();
    set({
      lastResult: result,
      showFeedback: true,
      examMistakes,
      finishReason: hitCap ? 'mistake_cap' : get().finishReason,
    });
  },

  next: () => {
    const { session, meta } = get();
    if (!session || !meta) return;
    if (session.isComplete()) {
      finalize(session, meta);
      set({
        showFeedback: false,
        finished: true,
        summary: session.summary(),
        finishReason: get().finishReason ?? 'complete',
      });
      return;
    }
    set({ showFeedback: false, lastResult: null, currentRoll: rollDice() });
  },

  abort: () => {
    set({
      session: null,
      meta: null,
      lastResult: null,
      showFeedback: false,
      finished: false,
      summary: null,
      examMistakes: 0,
      finishReason: null,
    });
  },
}));

/** Fan a finished session's results out to the persistent stores. */
function finalize(session: Session, meta: SessionMeta): void {
  const summary = session.summary();

  // Global + per-node stats.
  useStats.getState().ingestSession(summary);

  // Mistakes -> spaced-repetition queue.
  for (const m of summary.mistakes) {
    useReview.getState().logMistake(m.providerId, m.nodeId, m.hand, m.grade.verdict, m.chosen);
  }

  // A correct review answer should also promote due items it covered.
  if (meta.origin === 'review') {
    for (const r of summary.results) {
      const passed = r.grade.verdict === 'best' || r.grade.verdict === 'correct';
      useReview.getState().reviewOutcome(`${r.providerId}::${r.nodeId}::${r.hand}`, passed);
    }
  }

  // XP + streak.
  if (meta.awardProgress) {
    useProgress.getState().addXp(xpForResult(summary.handsPlayed, summary.gtoScore));
    useProgress.getState().recordPlayDay();
  }
}

/** Helper: resolve a list of {nodeId, hand} into a plan + its unique nodes. */
export function planFromPairs(pairs: { providerId: ProviderId; nodeId: string; hand: string }[]): {
  nodes: RangeNode[];
  plan: PlannedHand[];
} {
  const nodeMap: Record<string, RangeNode> = {};
  const plan: PlannedHand[] = [];
  for (const p of pairs) {
    const node = getNode(p.providerId, p.nodeId);
    if (!node) continue; // skip missing nodes (won't crash)
    nodeMap[rangeRefKey(node.providerId, node.id)] = node;
    plan.push({ providerId: p.providerId, nodeId: p.nodeId, hand: p.hand });
  }
  return { nodes: Object.values(nodeMap), plan };
}
