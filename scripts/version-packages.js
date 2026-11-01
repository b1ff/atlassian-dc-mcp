import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { version } = JSON.parse(readFileSync(new URL('../lerna.json', import.meta.url), 'utf8'));
// Lerna maps breaking changes before 1.0 to minor bumps. Promote this migration to 1.0.
const bump = version.startsWith('0.') ? ['major'] : [];
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL('../node_modules/lerna/dist/cli.js', import.meta.url)),
  'version',
  ...bump,
  '--conventional-commits',
  '--yes',
  '--no-push',
], { stdio: 'inherit' });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
