// =============================================================================
// convert.ts — transforms vendored REAL provider charts (./source/*) into our
// RangeNode schema. No strategy is invented here: we only re-encode the source
// frequencies into our action vocabulary. Pekarstas is read from the lossless
// raw-chart JSON export; Greenline remains a typed upstream transcription.
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
import { type RawAction, type RawCell, type RawChart } from './source/rawTypes';
import { charts as greenline } from './source/greenline';
import {
  pekarstasLossless,
  type LosslessChart,
  type LosslessTarget,
} from './source/pekarstasLossless';
import { RANGE_SOURCES } from './sources';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  description: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'pekarstas',
    label: 'Pekarstas (GG)',
    description: 'Community-чарты MIT; не заявлены как точный solver output.',
  },
  {
    id: 'greenline',
    label: 'Greenline',
    description: 'Community-чарты MIT; не заявлены как точный solver output.',
  },
];

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

/**
 * Convert exact visual color heights from a Pekarstas raw chart.
 *
 * Unpainted height is fold. For the BB-vs-4bet derivative, colors that represent
 * hands which only called the open are excluded and the remaining 3bet branch is
 * normalized conditional on actually reaching the 4bet decision.
 */
function strategyFromWeightedColors(
  colors: Record<string, number>,
  target: LosslessTarget,
  scenario: ScenarioType,
  aggressive: Action,
): HandStrategy {
  const raw: Partial<Record<RawAction, number>> = {};
  let mappedTotal = 0;
  for (const [color, frequency] of Object.entries(colors)) {
    const sourceAction = target.colorActions[color];
    if (!sourceAction || !Number.isFinite(frequency) || frequency <= 0) continue;
    raw[sourceAction] = (raw[sourceAction] ?? 0) + frequency;
    mappedTotal += frequency;
  }

  if (target.normalizeMapped) {
    if (mappedTotal <= 0) return { fold: { freq: 1 } };
    for (const action of Object.keys(raw) as RawAction[]) {
      raw[action] = (raw[action] ?? 0) / mappedTotal;
    }
  }

  const acc: Partial<Record<Action, number>> = {};
  const add = (action: Action, frequency: number) => {
    acc[action] = (acc[action] ?? 0) + frequency;
  };
  for (const [sourceAction, frequency] of Object.entries(raw) as [RawAction, number][]) {
    switch (sourceAction) {
      case 'fold':
        add('fold', frequency);
        break;
      case 'call':
        add(scenario === 'RFI' ? 'fold' : 'call', frequency);
        break;
      case 'raise':
      case 'allin':
        add(aggressive, frequency);
        break;
    }
  }

  const strategy: HandStrategy = {};
  let nonFold = 0;
  for (const action of Object.keys(acc) as Action[]) {
    if (action === 'fold') continue;
    const frequency = round2(acc[action] ?? 0);
    if (frequency > 0) {
      strategy[action] = { freq: frequency };
      nonFold += frequency;
    }
  }
  const fold = round2(Math.max(0, 1 - nonFold));
  if (fold > 0) strategy.fold = { freq: fold };
  return strategy;
}

/** Build all RangeNodes for one source chart key. */
function nodesFromChart(providerId: ProviderId, key: string, chart: RawChart): RangeNode[] {
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
      id: buildNodeId({
        format: 'cash_6max',
        stackBB: 100,
        hero: parsed.hero,
        scenario,
        villainPosition,
      }),
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
      strategyConfidence: 'community_transcription',
      frequencyBasis: 'source_category',
      // No coaching note is fabricated here. Feedback falls back to a generic
      // frequency-based explanation until an imported source provides notes.
    });
  }
  return out;
}

/** Build RangeNodes from one lossless Pekarstas raw chart. */
function nodesFromLosslessChart(chart: LosslessChart): RangeNode[] {
  const nodes: RangeNode[] = [];
  for (const target of chart.targets) {
    const parsed = parseKey(target.key);
    if (!parsed) continue;
    for (const scenario of targetScenarios(parsed.hero, parsed.src)) {
      const { actions, aggressive } = actionsFor(scenario);
      const hands: Record<HandKey, HandStrategy> = {};
      for (const hand of allHands()) hands[hand] = { fold: { freq: 1 } };
      for (const [hand, colors] of Object.entries(chart.cells)) {
        if (hands[hand] === undefined) continue;
        hands[hand] = strategyFromWeightedColors(colors, target, scenario, aggressive);
      }
      const villainPosition = scenario === 'RFI' ? undefined : parsed.villain;
      nodes.push({
        id: buildNodeId({
          format: 'cash_6max',
          stackBB: 100,
          hero: parsed.hero,
          scenario,
          villainPosition,
        }),
        providerId: 'pekarstas',
        sourceId: 'pekarstas',
        format: 'cash_6max',
        stackBB: 100,
        hero: parsed.hero,
        scenario,
        villainPosition,
        actions,
        hands,
        sizing: { effectiveStackBB: 100, ...chart.sizing },
        strategyConfidence: 'community_chart',
        frequencyBasis: 'source_visual_height',
        sourceChartId: chart.sourceChartId,
        sourceNote: chart.note || undefined,
        containsConditionalAdvice: chart.containsConditionalAdvice,
      });
    }
  }
  return nodes;
}

function parentFor(node: RangeNode, nodesById: Record<string, RangeNode>): {
  node: RangeNode;
  action: Action;
} | null {
  if (node.scenario === 'vs_3bet') {
    const id = buildNodeId({
      format: node.format,
      stackBB: node.stackBB,
      hero: node.hero,
      scenario: 'RFI',
    });
    const parent = nodesById[id];
    return parent ? { node: parent, action: 'raise' } : null;
  }
  if (node.scenario === 'vs_4bet' && node.villainPosition) {
    const parentScenario: ScenarioType = node.hero === 'BB' ? 'blind_defense' : 'vs_RFI';
    const id = buildNodeId({
      format: node.format,
      stackBB: node.stackBB,
      hero: node.hero,
      scenario: parentScenario,
      villainPosition: node.villainPosition,
    });
    const parent = nodesById[id];
    return parent ? { node: parent, action: '3bet' } : null;
  }
  return null;
}

/**
 * Reuse sizing already present in related source nodes. This derives numbers
 * from chart data only: no table amount is guessed when a parent lacks sizing.
 */
function attachSourceSizing(nodes: RangeNode[]): RangeNode[] {
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const withOpenSizes = nodes.map((node) => {
    let sizing = node.sizing;
    if (
      (node.scenario === 'vs_RFI' || node.scenario === 'blind_defense') &&
      node.villainPosition &&
      sizing.openBB === undefined
    ) {
      const openerId = buildNodeId({
        format: node.format,
        stackBB: node.stackBB,
        hero: node.villainPosition,
        scenario: 'RFI',
      });
      const openBB = byId[openerId]?.sizing.openBB;
      if (openBB !== undefined) sizing = { ...sizing, openBB };
    }
    if (
      sizing.raiseBB === undefined &&
      sizing.openBB !== undefined &&
      sizing.raiseMultiplier !== undefined
    ) {
      sizing = { ...sizing, raiseBB: round2(sizing.openBB * sizing.raiseMultiplier) };
    }
    return sizing === node.sizing ? node : { ...node, sizing };
  });

  const sizedById = Object.fromEntries(withOpenSizes.map((node) => [node.id, node]));
  return withOpenSizes.map((node) => {
    const parent = parentFor(node, sizedById);
    if (!parent) return node;
    const inherited = parent.node.sizing;
    const sizing = {
      ...node.sizing,
      openBB: node.sizing.openBB ?? inherited.openBB,
      raiseBB: node.sizing.raiseBB ?? inherited.raiseBB,
    };
    return { ...node, sizing };
  });
}

/** Attach data-derived reach probabilities without branching on hand names. */
function attachReachWeights(nodes: RangeNode[]): RangeNode[] {
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  return nodes.map((node) => {
    const parent = parentFor(node, byId);
    if (!parent) return node;
    const reachWeights: Partial<Record<HandKey, number>> = {};
    for (const hand of allHands()) {
      reachWeights[hand] = parent.node.hands[hand]?.[parent.action]?.freq ?? 0;
    }
    return { ...node, reachWeights };
  });
}

/** Convert every vendored chart for a provider into RangeNodes. */
export function buildRealNodes(provider: ProviderId): RangeNode[] {
  if (!RANGE_SOURCES[provider].publicDistributionAllowed) return [];
  const out: RangeNode[] = [];
  if (provider === 'pekarstas') {
    for (const chart of pekarstasLossless.charts) out.push(...nodesFromLosslessChart(chart));
  } else {
    for (const [key, chart] of Object.entries(greenline)) {
      out.push(...nodesFromChart(provider, key, chart));
    }
  }
  return attachReachWeights(attachSourceSizing(out));
}
