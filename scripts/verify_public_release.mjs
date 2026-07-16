import fs from 'node:fs';
import path from 'node:path';

function fail(message) {
  throw new Error(`Public release check failed: ${message}`);
}

const root = process.cwd();
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/ranges/range-sources.json'), 'utf8'),
);

for (const source of manifest.sources ?? []) {
  if (source.publicDistributionAllowed !== true) fail(`${source.id}: redistribution is not allowed`);
  if (source.license !== 'MIT') fail(`${source.id}: public source is not MIT`);
  if (!/^[0-9a-f]{40}$/.test(source.revision ?? '')) fail(`${source.id}: revision is missing`);
  if (!/^community_/.test(source.strategyConfidence ?? '')) {
    fail(`${source.id}: public community data must declare its confidence`);
  }
  if (source.stackDepthVerified !== false) {
    fail(`${source.id}: undocumented stack depth must not be marked verified`);
  }
}

const losslessPekarstas = JSON.parse(
  fs.readFileSync(
    path.join(root, 'src/data/ranges/source/pekarstas-lossless.json'),
    'utf8',
  ),
);
if (losslessPekarstas.PLACEHOLDER !== false) fail('Pekarstas lossless data is marked placeholder');
const pekarstasManifest = manifest.sources.find((source) => source.id === 'pekarstas');
if (losslessPekarstas.sourceRevision !== pekarstasManifest?.revision) {
  fail('Pekarstas data revision does not match the source manifest');
}
if (losslessPekarstas.frequencyBasis !== 'source_visual_height') {
  fail('Pekarstas frequency basis is missing');
}
if (losslessPekarstas.charts?.length !== 41) fail('Pekarstas chart coverage changed');
let multiColorCells = 0;
let weightedCells = 0;
const allowedActions = new Set(['fold', 'call', 'raise', 'allin']);
for (const chart of losslessPekarstas.charts) {
  const usedColors = new Set();
  for (const colors of Object.values(chart.cells ?? {})) {
    const entries = Object.entries(colors);
    if (entries.length > 1) multiColorCells += 1;
    if (entries.some(([, frequency]) => frequency !== 1)) weightedCells += 1;
    let sum = 0;
    for (const [color, frequency] of entries) {
      usedColors.add(color);
      if (!Number.isFinite(frequency) || frequency <= 0 || frequency > 1) {
        fail(`Pekarstas chart ${chart.sourceChartId}: invalid frequency`);
      }
      sum += frequency;
    }
    if (sum > 1.000001) fail(`Pekarstas chart ${chart.sourceChartId}: cell exceeds 100%`);
  }
  for (const target of chart.targets ?? []) {
    for (const action of Object.values(target.colorActions ?? {})) {
      if (!allowedActions.has(action)) fail(`Pekarstas chart ${chart.sourceChartId}: bad action`);
    }
    if (!target.normalizeMapped) {
      for (const color of usedColors) {
        if (!target.colorActions?.[color]) {
          fail(`Pekarstas chart ${chart.sourceChartId}: unmapped color ${color}`);
        }
      }
    }
  }
}
if (multiColorCells !== 315 || weightedCells !== 391) {
  fail('Pekarstas lossless cell counts do not match the pinned raw source');
}
if (fs.existsSync(path.join(root, 'src/data/ranges/source/pekarstas.ts'))) {
  fail('stale simplified Pekarstas data is still present');
}

const publicRangeDir = path.join(root, 'src/data/ranges/source');
for (const name of fs.readdirSync(publicRangeDir)) {
  if (/texassolver|pio3x|pioranges/i.test(name)) fail(`private solver artifact found: ${name}`);
}

const blocked = new Set(app.expo?.android?.blockedPermissions ?? []);
for (const permission of [
  'android.permission.INTERNET',
  'android.permission.SYSTEM_ALERT_WINDOW',
]) {
  if (!blocked.has(permission)) fail(`Android permission must be blocked: ${permission}`);
}

console.log(`Public release manifest OK: ${manifest.sources.length} licensed providers.`);
