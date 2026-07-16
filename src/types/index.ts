// =============================================================================
// DOMAIN MODEL — the heart of the trainer.
// All poker STRATEGY lives in data (RangeNode); these are just the typed shapes.
// =============================================================================

// 13 ranks, strongest -> weakest. Used to build all 169 canonical hands.
export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export type Rank = (typeof RANKS)[number];

// A canonical Hold'em hand key, e.g. "AA" | "AKs" | "AKo" | "72o".
// Not every string is valid; enumerateHands() produces the 169 legal ones.
export type HandKey = string;

// 6-max positions in action order (UTG first preflop, BB last).
export const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
export type Position = (typeof POSITIONS)[number];

// Stack depths in big blinds. MVP ships 100 only; structure supports the rest.
export const STACK_DEPTHS = [100, 40, 20, 12] as const;
export type StackBB = (typeof STACK_DEPTHS)[number];

// Game format. MVP ships cash_6max only.
export type GameFormat = 'cash_6max' | 'mtt_8max';

// Publicly distributable range packs. Private/local solver exports are kept
// outside the application bundle until their redistribution rights are clear.
export type ProviderId = 'pekarstas' | 'greenline';

export interface RangeRef {
  providerId: ProviderId;
  nodeId: string;
}

export interface RangeSource {
  id: ProviderId;
  title: string;
  license: string;
  sourceUrl: string;
  sourceRevision: string;
  publicDistributionAllowed: boolean;
  format: GameFormat;
  stackBB: number;
  openSizeLabel: string;
  rakeLabel: string;
  importedAt: string;
  strategyConfidence: StrategyConfidence;
  frequencyBasis: FrequencyBasis;
  stackDepthVerified: boolean;
}

export interface SpotSizing {
  openBB?: number;
  raiseBB?: number;
  /** Source expresses a raise as a multiplier of the previous bet (for example 3x). */
  raiseMultiplier?: number;
  potBB?: number;
  effectiveStackBB: number;
}

/** How strongly the source supports calling the data an exact strategy. */
export type StrategyConfidence =
  | 'solver_verified'
  | 'community_chart'
  | 'community_transcription';

/** What a numeric split in HandStrategy actually represents. */
export type FrequencyBasis = 'solver_frequency' | 'source_visual_height' | 'source_category';

// The "story" the user trains.
export type ScenarioType =
  | 'RFI' // folded to hero: open or fold
  | 'vs_RFI' // hero faces a single raise: 3bet / call / fold (needs raiser)
  | 'vs_3bet' // hero opened, faces a 3bet: 4bet / call / fold (needs 3bettor)
  | 'vs_4bet' // hero faces a 4bet: 5bet(allin) / call / fold
  | 'squeeze' // open + >=1 caller before hero: squeeze / call / fold
  | 'blind_defense'; // BB or SB facing a steal (a surfaced subset of vs_RFI)

// Legal poker actions. Exhaustive switches must cover all of these.
export type Action = 'fold' | 'call' | 'raise' | '3bet' | '4bet' | '5bet';

// Per-hand strategy: frequencies (summing ~1.0) and optional EV per action.
export type HandStrategy = Partial<Record<Action, { freq: number; ev?: number }>>;

// The atomic trainable unit. 100% data-driven; the engine never branches on
// hardcoded hand names — it only reads these frequencies/EVs.
export interface RangeNode {
  id: string; // deterministic, e.g. "cash6max_100bb_BTN_vs_RFI_CO"
  providerId: ProviderId;
  sourceId: ProviderId;
  format: GameFormat;
  stackBB: number;
  hero: Position;
  scenario: ScenarioType;
  villainPosition?: Position; // raiser / 3bettor / 4bettor when relevant
  actions: Action[]; // legal actions in this node, in display order
  hands: Record<HandKey, HandStrategy>;
  sizing: SpotSizing;
  strategyConfidence: StrategyConfidence;
  frequencyBasis: FrequencyBasis;
  /** Upstream chart identifier for traceability. */
  sourceChartId?: number;
  /** Original source note. It may describe opponent-dependent exploit branches. */
  sourceNote?: string;
  containsConditionalAdvice?: boolean;
  /** Probability of reaching this node with each hand through the parent action. */
  reachWeights?: Partial<Record<HandKey, number>>;
  note?: string; // optional coaching line shown in feedback
  PLACEHOLDER?: boolean; // legacy/import validation flag; public nodes must be false
}

// What legalScenarios() returns: which scenarios a hero can be in, and against
// which villain positions (empty array => no villain needed, e.g. RFI).
export interface LegalScenario {
  scenario: ScenarioType;
  villainPositions: Position[];
}

// ---- Grading output (see engine/grade.ts) -----------------------------------
export type Verdict = 'best' | 'correct' | 'inaccuracy' | 'blunder';

export interface Grade {
  verdict: Verdict;
  score: number; // -100..100
  evLoss: number | null; // bb (null when EV data absent)
  bestActions: Action[];
  frequencies: Partial<Record<Action, number>>; // for the feedback bar
  rngExpected?: Action; // only when RNG mode is on
}

// ---- Session output (see engine/session.ts) ---------------------------------
export interface DecisionResult {
  providerId: ProviderId;
  nodeId: string;
  hand: HandKey;
  chosen: Action;
  grade: Grade;
}

export interface SessionSummary {
  results: DecisionResult[];
  gtoScore: number; // average decision score, -100..100
  totalEvLoss: number; // sum of evLoss (bb)
  avgEvLoss: number; // mean evLoss over decisions with EV
  evHands: number; // number of decisions where source EV was available
  mistakes: DecisionResult[]; // verdict inaccuracy | blunder
  handsPlayed: number;
}
