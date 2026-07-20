// =============================================================================
// import_pokerstudy.mjs — local-only Poker Study AI API importer.
//
// The API publishes solver decision nodes for 6-max NLHE. This script discovers
// exact action histories, downloads frequencies/EVs and converts them into the
// app's RangeNode-shaped JSON. It NEVER invents or hand-writes a strategy.
//
// Redistribution terms are not stated on the API page, so generated files stay
// under ignored .local/ and MUST NOT be included in a public APK/repository
// until the provider gives explicit permission.
//
// Run: node scripts/import_pokerstudy.mjs [20,40,100]
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://www.pokerstudy.ai/api/ranges/nl/v2';
const OUT_DIR = path.resolve('.local/ranges');
const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

function enumerateHands() {
  const hands = [];
  for (let row = 0; row < RANKS.length; row += 1) {
    for (let col = 0; col < RANKS.length; col += 1) {
      if (row === col) hands.push(`${RANKS[row]}${RANKS[col]}`);
      else if (row < col) hands.push(`${RANKS[row]}${RANKS[col]}s`);
      else hands.push(`${RANKS[col]}${RANKS[row]}o`);
    }
  }
  return hands;
}

const HANDS = enumerateHands();

const LEGAL = {
  UTG: [
    { scenario: 'RFI', villains: [] },
    { scenario: 'vs_3bet', villains: ['HJ', 'CO', 'BTN', 'SB', 'BB'] },
  ],
  HJ: [
    { scenario: 'RFI', villains: [] },
    { scenario: 'vs_RFI', villains: ['UTG'] },
    { scenario: 'vs_3bet', villains: ['CO', 'BTN', 'SB', 'BB'] },
    { scenario: 'vs_4bet', villains: ['UTG'] },
  ],
  CO: [
    { scenario: 'RFI', villains: [] },
    { scenario: 'vs_RFI', villains: ['UTG', 'HJ'] },
    { scenario: 'vs_3bet', villains: ['BTN', 'SB', 'BB'] },
    { scenario: 'vs_4bet', villains: ['UTG', 'HJ'] },
  ],
  BTN: [
    { scenario: 'RFI', villains: [] },
    { scenario: 'vs_RFI', villains: ['UTG', 'HJ', 'CO'] },
    { scenario: 'vs_3bet', villains: ['SB', 'BB'] },
    { scenario: 'vs_4bet', villains: ['UTG', 'HJ', 'CO'] },
    { scenario: 'squeeze', villains: ['UTG', 'HJ', 'CO'] },
  ],
  SB: [
    { scenario: 'RFI', villains: [] },
    { scenario: 'vs_RFI', villains: ['UTG', 'HJ', 'CO', 'BTN'] },
    { scenario: 'vs_3bet', villains: ['BB'] },
    { scenario: 'vs_4bet', villains: ['UTG', 'HJ', 'CO', 'BTN'] },
    { scenario: 'blind_defense', villains: ['UTG', 'HJ', 'CO', 'BTN'] },
  ],
  BB: [
    { scenario: 'blind_defense', villains: ['UTG', 'HJ', 'CO', 'BTN', 'SB'] },
    { scenario: 'squeeze', villains: ['UTG', 'HJ', 'CO', 'BTN', 'SB'] },
    { scenario: 'vs_4bet', villains: ['UTG', 'HJ', 'CO', 'BTN', 'SB'] },
  ],
};

function targetKeys() {
  const keys = [];
  for (const hero of POSITIONS) {
    for (const entry of LEGAL[hero]) {
      if (entry.villains.length === 0) keys.push(keyOf(hero, entry.scenario));
      else for (const villain of entry.villains) keys.push(keyOf(hero, entry.scenario, villain));
    }
  }
  return keys;
}

function keyOf(hero, scenario, villain) {
  return `${hero}|${scenario}|${villain ?? ''}`;
}

function parseHistory(history) {
  const tokens = history.split('_');
  if (tokens.length % 2 !== 1) return null;
  const actor = tokens[tokens.length - 1];
  if (!POSITIONS.includes(actor)) return null;
  const events = [];
  for (let i = 0; i < tokens.length - 1; i += 2) {
    if (!POSITIONS.includes(tokens[i])) return null;
    events.push({ position: tokens[i], action: tokens[i + 1] });
  }
  return { actor, events };
}

function isRaise(action) {
  return action !== 'Fold' && action !== 'Call';
}

function classify(history) {
  const parsed = parseHistory(history);
  if (!parsed) return [];
  const { actor: hero, events } = parsed;
  const active = events.filter((event) => event.action !== 'Fold');
  const out = [];

  if (active.length === 0) out.push({ hero, scenario: 'RFI' });

  if (active.length === 1 && isRaise(active[0].action)) {
    const villain = active[0].position;
    if (hero === 'BB') out.push({ hero, scenario: 'blind_defense', villain });
    else if (hero === 'SB') {
      out.push({ hero, scenario: 'vs_RFI', villain });
      out.push({ hero, scenario: 'blind_defense', villain });
    } else out.push({ hero, scenario: 'vs_RFI', villain });
  }

  if (
    active.length === 2 &&
    isRaise(active[0].action) &&
    active[1].action === 'Call' &&
    active[0].position !== hero &&
    active[1].position !== hero
  ) {
    out.push({
      hero,
      scenario: 'squeeze',
      villain: active[0].position,
      caller: active[1].position,
    });
  }

  if (
    active.length === 2 &&
    active[0].position === hero &&
    isRaise(active[0].action) &&
    active[1].position !== hero &&
    isRaise(active[1].action)
  ) {
    out.push({ hero, scenario: 'vs_3bet', villain: active[1].position });
  }

  if (
    active.length === 3 &&
    active[0].position !== hero &&
    isRaise(active[0].action) &&
    active[1].position === hero &&
    isRaise(active[1].action) &&
    active[2].position === active[0].position &&
    isRaise(active[2].action)
  ) {
    out.push({ hero, scenario: 'vs_4bet', villain: active[0].position });
  }

  return out;
}

function actionsFor(scenario, hero) {
  switch (scenario) {
    case 'RFI':
      // SB's first-in node includes a solver-defined complete branch.
      return hero === 'SB' ? ['raise', 'call', 'fold'] : ['raise', 'fold'];
    case 'vs_RFI':
    case 'blind_defense':
    case 'squeeze':
      return ['3bet', 'call', 'fold'];
    case 'vs_3bet':
      return ['4bet', 'call', 'fold'];
    case 'vs_4bet':
      return ['5bet', 'call', 'fold'];
    default:
      throw new Error(`Unsupported scenario: ${scenario}`);
  }
}

function appAction(scenario, apiAction) {
  if (apiAction.kind === 'fold') return 'fold';
  if (apiAction.kind === 'call') return 'call';
  if (apiAction.kind !== 'raise') return null;
  switch (scenario) {
    case 'RFI':
      return 'raise';
    case 'vs_RFI':
    case 'blind_defense':
    case 'squeeze':
      return '3bet';
    case 'vs_3bet':
      return '4bet';
    case 'vs_4bet':
      return '5bet';
    default:
      return null;
  }
}

function candidateRank(candidate) {
  const parsed = parseHistory(candidate.history);
  const active = parsed.events.filter((event) => event.action !== 'Fold');
  const allInPenalty = active.some((event) => event.action === 'AI') ? 1 : 0;
  const caller = candidate.caller ? POSITIONS.indexOf(candidate.caller) : -1;
  // Prefer a non-all-in baseline and, for squeeze, the latest legal caller.
  return [allInPenalty, -caller, candidate.history.length, candidate.history];
}

function compareCandidates(a, b) {
  const ar = candidateRank(a);
  const br = candidateRank(b);
  for (let i = 0; i < ar.length; i += 1) {
    if (ar[i] < br[i]) return -1;
    if (ar[i] > br[i]) return 1;
  }
  return 0;
}

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function convertNode(stackBB, candidate, apiNode) {
  const actions = actionsFor(candidate.scenario, candidate.hero);
  const hands = {};

  for (const hand of HANDS) {
    const buckets = {};
    for (const sourceAction of apiNode.actions) {
      const action = appAction(candidate.scenario, sourceAction);
      if (!action) continue;
      const freq = Number(sourceAction.weights?.[hand] ?? 0);
      if (!(freq > 0)) continue;
      const ev = sourceAction.evs?.[hand];
      const bucket = buckets[action] ?? { freq: 0, weightedEv: 0, evWeight: 0 };
      bucket.freq += freq;
      if (Number.isFinite(ev)) {
        bucket.weightedEv += Number(ev) * freq;
        bucket.evWeight += freq;
      }
      buckets[action] = bucket;
    }

    const nonFold = Object.entries(buckets)
      .filter(([action]) => action !== 'fold')
      .reduce((sum, [, bucket]) => sum + bucket.freq, 0);
    const explicitFold = buckets.fold?.freq ?? 0;
    const foldFreq = explicitFold > 0 ? explicitFold : Math.max(0, 1 - nonFold);
    buckets.fold = buckets.fold ?? { freq: foldFreq, weightedEv: 0, evWeight: 0 };
    buckets.fold.freq = foldFreq;

    const sum = Object.values(buckets).reduce((total, bucket) => total + bucket.freq, 0);
    if (!(sum > 0)) throw new Error(`No strategy for ${candidate.history} ${hand}`);
    const strategy = {};
    for (const action of actions) {
      const bucket = buckets[action] ?? { freq: 0, weightedEv: 0, evWeight: 0 };
      const freq = bucket.freq / sum;
      const value = { freq: Math.round(freq * 1_000_000) / 1_000_000 };
      if (bucket.evWeight > 0) value.ev = bucket.weightedEv / bucket.evWeight;
      else if (action === 'fold') value.ev = 0;
      strategy[action] = value;
    }
    hands[hand] = strategy;
  }

  const villainSuffix = candidate.scenario === 'RFI' ? '' : `_${candidate.villain}`;
  return {
    id: `cash6max_${stackBB}bb_${candidate.hero}_${candidate.scenario}${villainSuffix}`,
    providerId: 'local_pokerstudy',
    sourceId: 'local_pokerstudy',
    format: 'cash_6max',
    stackBB,
    hero: candidate.hero,
    scenario: candidate.scenario,
    ...(candidate.villain ? { villainPosition: candidate.villain } : {}),
    actions,
    hands,
    sizing: { effectiveStackBB: stackBB },
    strategyConfidence: 'solver_verified',
    frequencyBasis: 'solver_frequency',
    sourceNote: `Poker Study AI NL v2 history: ${candidate.history}`,
    note: 'Локальный solver-узел; несколько доступных raise-сайзингов объединены по частотам.',
    PLACEHOLDER: false,
  };
}

function validateNode(node) {
  if (Object.keys(node.hands).length !== 169) throw new Error(`${node.id}: expected 169 hands`);
  for (const hand of HANDS) {
    const strategy = node.hands[hand];
    const sum = node.actions.reduce((total, action) => total + strategy[action].freq, 0);
    if (!Number.isFinite(sum) || Math.abs(sum - 1) > 0.00001) {
      throw new Error(`${node.id} ${hand}: frequency sum ${sum}`);
    }
  }
}

async function mapLimit(items, limit, work) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await work(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function importStack(stackBB) {
  const discovery = await getJson(`${API}/spots?stack=${stackBB}`);
  const wanted = new Set(targetKeys());
  const candidates = new Map();

  for (const spot of discovery.spots) {
    for (const classified of classify(spot.history)) {
      const key = keyOf(classified.hero, classified.scenario, classified.villain);
      if (!wanted.has(key)) continue;
      const list = candidates.get(key) ?? [];
      list.push({ ...classified, history: spot.history });
      candidates.set(key, list);
    }
  }

  const selected = [];
  const missing = [];
  for (const key of targetKeys()) {
    const choices = (candidates.get(key) ?? []).sort(compareCandidates);
    if (choices.length === 0) missing.push(key);
    else selected.push({ ...choices[0], candidateCount: choices.length });
  }

  const nodes = await mapLimit(selected, 8, async (candidate) => {
    const url = `${API}/node?stack=${stackBB}&history=${encodeURIComponent(candidate.history)}`;
    const apiNode = await getJson(url);
    const node = convertNode(stackBB, candidate, apiNode);
    validateNode(node);
    return node;
  });

  const artifact = {
    schemaVersion: 1,
    source: {
      id: 'local_pokerstudy',
      title: 'Poker Study AI NL v2 (local import)',
      sourceUrl: API,
      generatedAt: discovery.generatedAt ?? null,
      apiVersion: discovery.version ?? 2,
      publicDistributionAllowed: false,
      distributionNote: 'API page has no explicit dataset redistribution license; local use only.',
      format: 'cash_6max',
      stackBB,
    },
    coverage: { legalNodes: targetKeys().length, importedNodes: nodes.length, missing },
    selections: selected.map(({ history, hero, scenario, villain, caller, candidateCount }) => ({
      history,
      hero,
      scenario,
      ...(villain ? { villain } : {}),
      ...(caller ? { caller } : {}),
      candidateCount,
    })),
    nodes,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const output = path.join(OUT_DIR, `pokerstudy_${stackBB}bb.json`);
  fs.writeFileSync(output, `${JSON.stringify(artifact)}\n`);
  console.log(`${stackBB}bb: ${nodes.length}/${targetKeys().length} nodes -> ${output}`);
  if (missing.length > 0) console.log(`${stackBB}bb missing: ${missing.join(', ')}`);
}

const stacks = (process.argv[2] ?? '20,40,100')
  .split(',')
  .map(Number)
  .filter((stack) => Number.isFinite(stack));

for (const stack of stacks) await importStack(stack);
