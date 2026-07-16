// =============================================================================
// import_pio3x.mjs — one-off importer for TexasSolver's bundled
// "qb_ranges/PioRanges_nlhe_100bb_3x_NL200" set (100bb cash 6-max, 3x opens).
//
// Encoding differs from the 2.5x set: the ACTION PATH is a DIRECTORY tree of
// "<POS><action>" folders (e.g. LJ2bets/HJfolds/CO2bets/...), and each leaf is
// "<POS>_raise.txt" / "<POS>_call.txt" giving that player's frequency for that
// branch (fold is the implicit remainder). Positions: LJ/HJ/CO/B/SB/BB.
//
// Output: .local/ranges/pio3x_100bb.ts (ignored private artifact; same compact shape
// as the 2.5x import). Run: node scripts/import_pio3x.mjs
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';

const SET_DIR =
  'C:/Users/Home/Desktop/TexasSolver-v0.2.0-Windows/ranges/qb_ranges/PioRanges_nlhe_100bb_3x_NL200';
const OUT = path.resolve('.local/ranges/pio3x_100bb.ts');

// This set's position labels -> our positions. LJ (lojack) = first to act.
const POS_MAP = { LJ: 'UTG', HJ: 'HJ', CO: 'CO', B: 'BTN', SB: 'SB', BB: 'BB' };
const POS_TOKENS = ['BB', 'SB', 'LJ', 'HJ', 'CO', 'B']; // longest-first for greedy match
const ourIndex = { UTG: 0, HJ: 1, CO: 2, BTN: 3, SB: 4, BB: 5 };

const SUFFIX_CAT = { folds: 'fold', calls: 'call', '2bets': 'open', '3bets': '3bet', '4bets': '4bet', '5bets': '5bet' };

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.txt')) out.push(full);
  }
  return out;
}

function parseRange(file) {
  const map = {};
  for (const part of fs.readFileSync(file, 'utf8').trim().split(',')) {
    const [hand, w] = part.split(':');
    if (!hand) continue;
    const f = parseFloat(w);
    if (!Number.isNaN(f)) map[hand.trim()] = f;
  }
  return map;
}

// "LJ2bets" -> { pos:'LJ', cat:'open' }, "BBfolds" -> { pos:'BB', cat:'fold' }
function parseSegment(seg) {
  for (const tok of POS_TOKENS) {
    if (seg.startsWith(tok)) {
      const rest = seg.slice(tok.length);
      if (SUFFIX_CAT[rest]) return { pos: tok, cat: SUFFIX_CAT[rest] };
    }
  }
  return null;
}

// Leaf "HJ_raise.txt" / "B_call(1).txt" -> { pos, branch:'raise'|'call' }
function parseLeaf(name) {
  const m = name.replace(/\.txt$/, '').match(/^([A-Z]+)_(raise|call)(\(\d+\))?$/);
  if (!m) return null;
  return { pos: m[1], branch: m[2] };
}

// Classify from the non-fold prior line + hero + branch.
function classify(priorLine, hero, branch) {
  // RFI: folded to hero, hero opens.
  if (priorLine.length === 0) {
    if (branch === 'raise') return { scenario: 'RFI', villain: null, action: 'raise' };
    return null; // limp/complete not modeled
  }
  // vs open.
  if (priorLine.length === 1 && priorLine[0].cat === 'open' && priorLine[0].pos !== hero) {
    const opener = priorLine[0].pos;
    return { scenario: 'vs_open', villain: opener, action: branch === 'raise' ? '3bet' : 'call' };
  }
  // squeeze: open + call, hero acts.
  if (
    priorLine.length === 2 &&
    priorLine[0].cat === 'open' &&
    priorLine[1].cat === 'call' &&
    priorLine[0].pos !== hero &&
    priorLine[1].pos !== hero
  ) {
    return { scenario: 'squeeze', villain: priorLine[0].pos, action: branch === 'raise' ? '3bet' : 'call' };
  }
  // vs 3bet: hero opened, villain 3bet.
  if (
    priorLine.length === 2 &&
    priorLine[0].pos === hero &&
    priorLine[0].cat === 'open' &&
    priorLine[1].cat === '3bet' &&
    priorLine[1].pos !== hero
  ) {
    return { scenario: 'vs_3bet', villain: priorLine[1].pos, action: branch === 'raise' ? '4bet' : 'call' };
  }
  // vs 4bet: opener open, hero 3bet, opener 4bet.
  if (
    priorLine.length === 3 &&
    priorLine[0].cat === 'open' &&
    priorLine[1].pos === hero &&
    priorLine[1].cat === '3bet' &&
    priorLine[2].cat === '4bet' &&
    priorLine[0].pos === priorLine[2].pos &&
    priorLine[0].pos !== hero
  ) {
    return { scenario: 'vs_4bet', villain: priorLine[0].pos, action: branch === 'raise' ? '5bet' : 'call' };
  }
  return null;
}

const ACTIONS_BY_SCENARIO = {
  RFI: ['raise', 'fold'],
  vs_open: ['3bet', 'call', 'fold'],
  squeeze: ['3bet', 'call', 'fold'],
  vs_3bet: ['4bet', 'call', 'fold'],
  vs_4bet: ['5bet', 'call', 'fold'],
};

function main() {
  if (!fs.existsSync(SET_DIR)) {
    console.error('Set dir not found:', SET_DIR);
    process.exit(1);
  }
  const files = walk(SET_DIR);
  // group by parent dir (= decision node); collect {action -> rangeMap}
  const nodes = new Map();
  let skipped = 0;

  for (const file of files) {
    const leaf = parseLeaf(path.basename(file));
    if (!leaf) {
      skipped++;
      continue;
    }
    const rel = path.relative(SET_DIR, path.dirname(file));
    const segs = rel === '' ? [] : rel.split(path.sep);
    const parsedSegs = segs.map(parseSegment);
    if (parsedSegs.some((s) => s === null)) {
      skipped++;
      continue;
    }
    const priorLine = parsedSegs.filter((s) => s.cat !== 'fold');
    const cls = classify(priorLine, leaf.pos, leaf.branch);
    if (!cls) {
      skipped++;
      continue;
    }
    const key = rel + '|' + leaf.pos + '|' + cls.scenario + '|' + (cls.villain ?? '');
    if (!nodes.has(key)) nodes.set(key, { hero: leaf.pos, cls, branches: {} });
    nodes.get(key).branches[cls.action] = parseRange(file);
  }

  const compact = [];
  const counts = {};
  const seen = new Set();

  for (const { hero, cls, branches } of nodes.values()) {
    const heroPos = POS_MAP[hero];
    const villain = cls.villain ? POS_MAP[cls.villain] : null;
    if (!heroPos) continue;
    if (cls.scenario === 'vs_open' && villain && ourIndex[villain] >= ourIndex[heroPos]) continue;

    let targets;
    if (cls.scenario === 'RFI') targets = ['RFI'];
    else if (cls.scenario === 'vs_open')
      targets = heroPos === 'BB' ? ['blind_defense'] : heroPos === 'SB' ? ['vs_RFI', 'blind_defense'] : ['vs_RFI'];
    else targets = [cls.scenario];

    const allHands = new Set();
    for (const r of Object.values(branches)) for (const h of Object.keys(r)) allHands.add(h);

    const hands = {};
    for (const hand of allHands) {
      const raw = {};
      let sum = 0;
      for (const [action, rng] of Object.entries(branches)) {
        const f = rng[hand] ?? 0;
        if (f > 0) {
          raw[action] = (raw[action] ?? 0) + f;
          sum += f;
        }
      }
      if (sum <= 0) continue;
      // Fold is the implicit remainder (branches never include fold here).
      const fold = Math.max(0, 1 - sum);
      const total = sum + fold;
      const strat = {};
      for (const [a, f] of Object.entries(raw)) {
        const v = Math.round((f / total) * 1000) / 1000;
        if (v > 0) strat[a] = v;
      }
      const foldR = Math.round((fold / total) * 1000) / 1000;
      const nonFold = Object.values(strat).reduce((s, v) => s + v, 0);
      if (nonFold > 0.001) {
        if (foldR > 0) strat.fold = foldR;
        hands[hand] = strat;
      }
    }

    for (const scenario of targets) {
      const actions = ACTIONS_BY_SCENARIO[cls.scenario];
      const id = `cash6max_100bb_${heroPos}_${scenario}` + (scenario === 'RFI' ? '' : `_${villain}`);
      if (seen.has(id)) continue;
      seen.add(id);
      compact.push({ id, hero: heroPos, scenario, villain: scenario === 'RFI' ? null : villain, actions, hands });
      counts[scenario] = (counts[scenario] ?? 0) + 1;
    }
  }

  const header = `// =============================================================================
// AUTO-GENERATED — do not edit by hand. Run scripts/import_pio3x.mjs.
// REAL preflop GTO ranges (fractional frequencies) from TexasSolver's bundled
// "qb_ranges/PioRanges_nlhe_100bb_3x_NL200" set (local resource). 100bb cash
// 6-max, 3x opens. Hands omitted from a node default to pure fold. LJ -> UTG.
// =============================================================================
import type { TSCompactNode } from './texassolver_100bb';
export const PIO_META = { source: 'TexasSolver bundled ranges', set: 'PioRanges_nlhe_100bb_3x_NL200' } as const;
export const PIO_NODES: TSCompactNode[] = ${JSON.stringify(compact)};
`;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, header);
  console.log(`Wrote ${compact.length} nodes -> ${OUT}`);
  console.log('By scenario:', counts);
  console.log('Skipped leaves (multiway/deeper):', skipped, 'of', files.length);
}

main();
