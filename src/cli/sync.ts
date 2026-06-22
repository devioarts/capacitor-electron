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

if (!fs.existsSync(electronDir)) {
  console.error('[cap-electron] electron/ not found — run: npx cap-electron add');
  process.exit(1);
}

try {
  execFileSync(process.execPath, [path.join(__dirname, 'copy.js')], { stdio: 'inherit' });
} catch {
  console.warn('[cap-electron] copy step failed — continuing with update...');
}
execFileSync(process.execPath, [path.join(__dirname, 'update.js')], { stdio: 'inherit' });

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
