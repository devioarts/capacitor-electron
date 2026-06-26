#!/usr/bin/env node
// cap-electron sync — copy + update

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { syncElectronPackageMetadata } from './metadata.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const marker = `${path.sep}node_modules${path.sep}`;
const markerIdx = __dirname.indexOf(marker);
const capacitorRoot = process.env['CAPACITOR_ROOT_DIR']
  ?? (markerIdx >= 0 ? __dirname.slice(0, markerIdx) : process.cwd());
const electronDir = path.join(capacitorRoot, 'electron');
const includeAll = process.argv.includes('--all');

process.stdout.write('\n');
const start = performance.now();

if (!fs.existsSync(electronDir)) {
  console.error('\x1b[1;31m[cap-electron] electron/ not found — run: npx cap-electron add\x1b[0m');
  process.exit(1);
}

try {
  execFileSync(process.execPath, [path.join(__dirname, 'copy.js')], { stdio: 'inherit' });
} catch {
  console.warn('[cap-electron] copy step failed — continuing with update...');
}

try {
  execFileSync(process.execPath, [path.join(__dirname, 'update.js')], { stdio: 'inherit' });
} catch (e) {
  const elapsed = (performance.now() - start).toFixed(2);
  console.error(`\x1b[1;31m✖ sync electron failed in ${elapsed}ms: ${e instanceof Error ? e.message : String(e)}\x1b[0m`);
  process.exit(1);
}

if (includeAll) {
  const changed = syncElectronPackageMetadata(
    capacitorRoot,
    path.join(electronDir, 'package.json'),
    path.join(electronDir, 'package-lock.json'),
  );
  console.log(changed
    ? '[cap-electron] Synced Electron package metadata.'
    : '[cap-electron] Electron package metadata already up to date.');
}

const elapsed = (performance.now() - start).toFixed(2);
console.log(`\x1b[1;32m✔ sync electron in ${elapsed}ms\x1b[0m`);
