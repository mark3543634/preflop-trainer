// =============================================================================
// import_texassolver.mjs — one-off importer.
// Parses TexasSolver's bundled preflop range tree (100bb cash 6-max) into our
// RangeNode schema and writes an ignored local-development artifact.
//
// Each leaf .txt is a comma list "hand:freq" over the 169 hands (freq 0..1).
// The ACTION PATH is encoded in the filename as alternating Position_Action:
//   HERO_2.5bb.txt                          -> RFI (open) ; sibling HERO_FOLD.txt
//   OPENER_2.5bb_HERO_8.5bb|Call|FOLD.txt   -> hero faces an open (vs_RFI)
//   HERO_2.5bb_V_11.0bb_HERO_24.0bb|Call|FOLD.txt -> hero opened, faces 3bet
//   OPENER_2.5bb_HERO_8.5bb_OPENER_22.0bb_HERO_AllIn|Call|FOLD.txt -> vs 4bet
// Multiway / squeeze trees (extra actors) are skipped for now.
//
// Run: node scripts/import_texassolver.mjs
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';

const SET_DIR =
  'C:/Users/Home/Desktop/TexasSolver-v0.2.0-Windows/ranges/qb_ranges/100bb 2.5x 500rake';
const OUT = path.resolve('.local/ranges/texassolver_100bb.ts');

const POSITIONS = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
const POS_MAP = { UTG: 'UTG', MP: 'HJ', CO: 'CO', BTN: 'BTN', SB: 'SB', BB: 'BB' };
const isPos = (t) => POSITIONS.includes(t);
const isSize = (t) => /^[0-9]+(\.[0-9]+)?bb$/.test(t);

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.txt')) out.push(full);
  }
  return out;
}

// Parse "AA:1.0,AKs:0.5,..." -> { AA:1, AKs:0.5 }
function parseRange(file) {
  const txt = fs.readFileSync(file, 'utf8').trim();
  const map = {};
  for (const part of txt.split(',')) {
    const [hand, w] = part.split(':');
    if (!hand) continue;
    const f = parseFloat(w);
    if (!Number.isNaN(f)) map[hand.trim()] = f;
  }
  return map;
}

// Split a filename (no .txt) into [ [pos, action], ... ].
function pairsOf(base) {
  const toks = base.split('_');
  const pairs = [];
  for (let i = 0; i + 1 < toks.length; i += 2) {
    if (!isPos(toks[i])) return null; // unexpected layout
    pairs.push([toks[i], toks[i + 1]]);
  }
  if (toks.length % 2 !== 0) return null;
  return pairs;
}

// Classify a node from its pairs (last pair's action is THIS file's branch).
// Returns { hero, scenario, villain, branch } or null to skip.
function classify(pairs) {
  const n = pairs.length;
  const last = pairs[n - 1];
  const hero = last[0];
  const branch = last[1]; // size | Call | FOLD | AllIn

  if (n === 1) {
    return { hero, scenario: 'RFI', villain: null, branch };
  }
  if (n === 2 && pairs[0][0] !== hero) {
    const opener = pairs[0][0];
    if (POSITIONS.indexOf(opener) >= POSITIONS.indexOf(hero)) return null; // opener must be earlier
    return { hero, scenario: 'vs_open', villain: opener, branch };
  }
  if (n === 3 && pairs[0][0] === hero && pairs[2][0] === hero && pairs[1][0] !== hero) {
    return { hero, scenario: 'vs_3bet', villain: pairs[1][0], branch };
  }
  // Squeeze: opener raised, a later player CALLED, hero squeezes (3bets).
  //   OPENER_2.5bb_CALLER_Call_HERO_<size|Call|FOLD>
  if (
    n === 3 &&
    pairs[0][0] !== hero &&
    pairs[1][1] === 'Call' &&
    pairs[1][0] !== hero &&
    pairs[0][0] !== pairs[1][0]
  ) {
    const opener = pairs[0][0];
    if (POSITIONS.indexOf(opener) >= POSITIONS.indexOf(hero)) return null; // opener earlier
    return { hero, scenario: 'squeeze', villain: opener, branch };
  }
  if (
    n === 4 &&
    pairs[1][0] === hero &&
    pairs[3][0] === hero &&
    pairs[0][0] === pairs[2][0] &&
    pairs[0][0] !== hero
  ) {
    return { hero, scenario: 'vs_4bet', villain: pairs[0][0], branch };
  }
  return null; // multiway / deeper trees skipped
}

// Map a branch token to our Action given the scenario.
function branchToAction(scenario, branch) {
  if (branch === 'FOLD') return 'fold';
  if (branch === 'Call') return 'call';
  if (branch === 'AllIn') return '5bet';
  if (isSize(branch)) {
    switch (scenario) {
      case 'RFI':
        return 'raise';
      case 'vs_open':
      case 'squeeze':
        return '3bet';
      case 'vs_3bet':
        return '4bet';
      case 'vs_4bet':
        return '5bet';
    }
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

// node key groups sibling branch files together.
function nodeKey(pairs) {
  return pairs
    .slice(0, -1)
    .map((p) => p.join(':'))
    .concat(pairs[pairs.length - 1][0]) // include hero
    .join('|');
}

function main() {
  if (!fs.existsSync(SET_DIR)) {
    console.error('Set dir not found:', SET_DIR);
    process.exit(1);
  }
  const files = walk(SET_DIR);
  // group: key -> { meta, branches: { action: rangeMap } }
  const nodes = new Map();
  let skipped = 0;

  for (const file of files) {
    const base = path.basename(file, '.txt');
    const pairs = pairsOf(base);
    if (!pairs) {
      skipped++;
      continue;
    }
    const cls = classify(pairs);
    if (!cls) {
      skipped++;
      continue;
    }
    const action = branchToAction(cls.scenario, cls.branch);
    if (!action) {
      skipped++;
      continue;
    }
    const key = nodeKey(pairs);
    if (!nodes.has(key)) nodes.set(key, { cls, branches: {} });
    nodes.get(key).branches[action] = parseRange(file);
  }

  // Build our compact nodes (map positions, normalize per-hand freqs to sum 1).
  const compact = [];
  const counts = {};

  for (const { cls, branches } of nodes.values()) {
    const hero = POS_MAP[cls.hero];
    const villain = cls.villain ? POS_MAP[cls.villain] : null;

    // Target scenarios in OUR model (SB open-defense doubles as vs_RFI + blind_defense).
    let targets;
    if (cls.scenario === 'RFI') targets = ['RFI'];
    else if (cls.scenario === 'vs_open')
      targets = hero === 'BB' ? ['blind_defense'] : hero === 'SB' ? ['vs_RFI', 'blind_defense'] : ['vs_RFI'];
    else targets = [cls.scenario]; // vs_3bet | vs_4bet

    // Collect every hand mentioned.
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
      if (sum <= 0) continue; // pure fold -> omitted (loader defaults to fold)
      const strat = {};
      for (const [a, f] of Object.entries(raw)) {
        const v = Math.round((f / sum) * 1000) / 1000;
        if (v > 0) strat[a] = v;
      }
      // Drop hands that are effectively pure fold.
      const nonFold = Object.entries(strat).filter(([a]) => a !== 'fold').reduce((s, [, v]) => s + v, 0);
      if (nonFold > 0.001) hands[hand] = strat;
    }

    for (const scenario of targets) {
      const actions = ACTIONS_BY_SCENARIO[cls.scenario];
      const id =
        `cash6max_100bb_${hero}_${scenario}` + (scenario === 'RFI' ? '' : `_${villain}`);
      compact.push({ id, hero, scenario, villain: scenario === 'RFI' ? null : villain, actions, hands });
      counts[scenario] = (counts[scenario] ?? 0) + 1;
    }
  }

  // De-dup by id (keep first).
  const seen = new Set();
  const unique = compact.filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)));

  const header = `// =============================================================================
// AUTO-GENERATED — do not edit by hand. Run scripts/import_texassolver.mjs.
// REAL preflop GTO ranges (fractional frequencies) imported from TexasSolver's
// bundled "qb_ranges/100bb 2.5x 500rake" set (local resource). 100bb cash 6-max.
// Hands omitted from a node default to pure fold. Positions: MP -> HJ.
// =============================================================================
export interface TSCompactNode {
  id: string;
  hero: string;
  scenario: string;
  villain: string | null;
  actions: string[];
  hands: Record<string, Record<string, number>>;
}
export const TS_META = { source: 'TexasSolver bundled ranges', set: '100bb 2.5x 500rake' } as const;
export const TS_NODES: TSCompactNode[] = ${JSON.stringify(unique)};
`;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, header);
  console.log(`Wrote ${unique.length} nodes -> ${OUT}`);
  console.log('By scenario:', counts);
  console.log('Skipped files (multiway/deeper):', skipped, 'of', files.length);
}

main();
