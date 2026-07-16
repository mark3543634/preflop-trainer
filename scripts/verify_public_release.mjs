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
