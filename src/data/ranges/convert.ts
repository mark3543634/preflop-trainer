// =============================================================================
// convert.ts — transforms vendored REAL provider charts (./source/*) into our
// RangeNode schema. No strategy is invented here: we only re-encode the source
// frequencies into our action vocabulary. See ./source/pekarstas.ts for origin.
//
// Source action semantics (contextual): raise = open/3bet/4bet, allin = jam/5bet,
// call = passive, fold = fold. Unlisted hands fold. We map these onto our typed
// Action set per scenario and fill all 169 hands.
// =============================================================================
import { allHands } from '../../engine/hands';
import { buildNodeId } from '../../engine/nodeId';
import type {
  Action,
  HandKey,
  HandStrategy,
  Position,
  ProviderId,
  RangeNode,
  ScenarioType,
} from '../../types';
import { charts as pekarstas, type RawAction, type RawCell, type RawChart } from './source/pekarstas';
import { charts as greenline } from './source/greenline';
import { RANGE_SOURCES } from './sources';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  description: string;
}

export const PROVIDERS: ProviderInfo[] = [
  { id: 'pekarstas', label: 'Pekarstas (GG)', description: 'Community-чарты MIT; не заявлены как точный solver output.' },
  { id: 'greenline', label: 'Greenline', description: 'Community-чарты MIT; не заявлены как точный solver output.' },
];

// Providers backed by raw "chart" files (pekarstas/greenline) vs the prebuilt
// node provider (texassolver).
type ChartProviderId = 'pekarstas' | 'greenline';

const PROVIDER_CHARTS: Record<ChartProviderId, Record<string, RawChart>> = {
  pekarstas,
  greenline,
};

const PROVIDER_ATTRIBUTION: Record<ChartProviderId, string> = {
  pekarstas: 'Real data: pekarstas (GGPoker) pack via github.com/AHTOOOXA/poker-charts (MIT).',
  greenline: 'Real data: greenline pack via github.com/AHTOOOXA/poker-charts (MIT).',
};

// Their positions use "MP" where we use "HJ"; everything else matches.
const POSITION_MAP: Record<string, Position> = {
  UTG: 'UTG',
  MP: 'HJ',
  CO: 'CO',
  BTN: 'BTN',
  SB: 'SB',
  BB: 'BB',
};

// Source scenario tokens, longest-first so we can strip them off the key.
const SRC_SCENARIOS = ['3bet-defense', 'vs-open', 'vs-3bet', 'vs-4bet', 'RFI'] as const;
type SrcScenario = (typeof SRC_SCENARIOS)[number];

interface ParsedKey {
  hero: Position;
  src: SrcScenario;
  villain?: Position;
}

/** Parse "BB-vs-4bet-BTN" -> { hero, src, villain }. */
function parseKey(key: string): ParsedKey | null {
  const firstDash = key.indexOf('-');
  if (firstDash < 0) return null;
  const heroToken = key.slice(0, firstDash);
  const hero = POSITION_MAP[heroToken];
  if (!hero) return null;
  const rest = key.slice(firstDash + 1);
  for (const src of SRC_SCENARIOS) {
    if (rest === src) return { hero, src };
    if (rest.startsWith(src + '-')) {
      const villainToken = rest.slice(src.length + 1);
      const villain = POSITION_MAP[villainToken];
      if (!villain) return null;
      return { hero, src, villain };
    }
  }
  return null;
}

// Which of OUR scenarios a source chart produces (a list, because an SB open-
// defense doubles as both vs_RFI and blind_defense in our UI surfacing).
function targetScenarios(hero: Position, src: SrcScenario): ScenarioType[] {
  switch (src) {
    case 'RFI':
      return ['RFI'];
    case 'vs-open':
      if (hero === 'BB') return ['blind_defense'];
      if (hero === 'SB') return ['vs_RFI', 'blind_defense'];
      return ['vs_RFI'];
    case 'vs-3bet':
      return ['vs_3bet'];
    case 'vs-4bet':
      return ['vs_4bet'];
    case '3bet-defense':
      return []; // no equivalent in our model — skipped
  }
}

// Legal action set + the aggressive action our scenario uses.
function actionsFor(scenario: ScenarioType): { actions: Action[]; aggressive: Action } {
  switch (scenario) {
    case 'RFI':
      return { actions: ['raise', 'fold'], aggressive: 'raise' };
    case 'vs_RFI':
    case 'blind_defense':
    case 'squeeze':
      return { actions: ['3bet', 'call', 'fold'], aggressive: '3bet' };
    case 'vs_3bet':
      return { actions: ['4bet', 'call', 'fold'], aggressive: '4bet' };
    case 'vs_4bet':
      return { actions: ['5bet', 'call', 'fold'], aggressive: '5bet' };
  }
}

// Normalize any source cell into a frequency map over source actions (sum 1).
function normalizeRaw(cell: RawCell): Partial<Record<RawAction, number>> {
  const out: Partial<Record<RawAction, number>> = {};
  const bump = (a: RawAction, f: number) => {
    out[a] = (out[a] ?? 0) + f;
  };
  if (typeof cell === 'string') {
    bump(cell, 1);
  } else if (Array.isArray(cell) && cell.length > 0) {
    const f = 1 / cell.length; // length 1 -> 1.0; length 2 -> 0.5 each
    for (const a of cell) bump(a, f);
  } else {
    bump('fold', 1);
  }
  return out;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Build our HandStrategy for one hand from a source cell + scenario mapping. */
function strategyFromCell(cell: RawCell, scenario: ScenarioType, aggressive: Action): HandStrategy {
  const raw = normalizeRaw(cell);
  // Accumulate into our action vocabulary.
  const acc: Partial<Record<Action, number>> = {};
  const add = (a: Action, f: number) => {
    acc[a] = (acc[a] ?? 0) + f;
  };
  for (const [srcAction, f] of Object.entries(raw) as [RawAction, number][]) {
    if (!f) continue;
    switch (srcAction) {
      case 'fold':
        add('fold', f);
        break;
      case 'call':
        // 'call' is illegal in RFI; route to fold there, else it's a call.
        add(scenario === 'RFI' ? 'fold' : 'call', f);
        break;
      case 'raise':
      case 'allin':
        add(aggressive, f);
        break;
    }
  }
  // Emit rounded, fold as remainder so frequencies sum to 1.
  const strat: HandStrategy = {};
  let nonFold = 0;
  for (const [a, f] of Object.entries(acc) as [Action, number][]) {
    if (a === 'fold') continue;
    const r = round2(f);
    if (r > 0) {
      strat[a] = { freq: r };
      nonFold += r;
    }
  }
  const fold = round2(Math.max(0, 1 - nonFold));
  if (fold > 0) strat.fold = { freq: fold };
  return strat;
}

/** Build all RangeNodes for one source chart key. */
function nodesFromChart(providerId: ProviderId, key: string, chart: RawChart, attribution: string): RangeNode[] {
  const parsed = parseKey(key);
  if (!parsed) return [];
  const scenarios = targetScenarios(parsed.hero, parsed.src);
  const hands169 = allHands();
  const out: RangeNode[] = [];

  for (const scenario of scenarios) {
    const { actions, aggressive } = actionsFor(scenario);
    // Every hand defaults to fold; listed hands get their mapped strategy.
    const hands: Record<HandKey, HandStrategy> = {};
    for (const h of hands169) hands[h] = { fold: { freq: 1 } };
    for (const [hand, cell] of Object.entries(chart)) {
      if (hands[hand] === undefined) continue; // ignore any non-canonical key
      hands[hand] = strategyFromCell(cell, scenario, aggressive);
    }
    const villainPosition = scenario === 'RFI' ? undefined : parsed.villain;
    out.push({
      id: buildNodeId({ format: 'cash_6max', stackBB: 100, hero: parsed.hero, scenario, villainPosition }),
      providerId,
      sourceId: providerId,
      format: 'cash_6max',
      stackBB: 100,
      hero: parsed.hero,
      scenario,
      villainPosition,
      actions,
      hands,
      sizing: { effectiveStackBB: 100 },
      note: attribution,
    });
  }
  return out;
}

/** Convert every vendored chart for a provider into RangeNodes. */
export function buildRealNodes(provider: ProviderId): RangeNode[] {
  const charts = PROVIDER_CHARTS[provider as ChartProviderId];
  const attribution = PROVIDER_ATTRIBUTION[provider as ChartProviderId];
  if (!RANGE_SOURCES[provider].publicDistributionAllowed) return [];
  const out: RangeNode[] = [];
  for (const [key, chart] of Object.entries(charts)) {
    out.push(...nodesFromChart(provider, key, chart, attribution));
  }
  return out;
}
