#!/usr/bin/env node
// cap-electron sync — copy + update

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const marker = `${path.sep}node_modules${path.sep}`;
const markerIdx = __dirname.indexOf(marker);
const capacitorRoot = process.env['CAPACITOR_ROOT_DIR']
  ?? (markerIdx >= 0 ? __dirname.slice(0, markerIdx) : process.cwd());
const electronDir = path.join(capacitorRoot, 'electron');

if (!fs.existsSync(electronDir)) {
  console.error('[cap-electron] electron/ not found — run: cap-electron add');
  process.exit(1);
}

try {
  execFileSync(process.execPath, [path.join(__dirname, 'copy.js')], { stdio: 'inherit' });
} catch {
  console.warn('[cap-electron] copy step failed — continuing with update...');
}
execFileSync(process.execPath, [path.join(__dirname, 'update.js')], { stdio: 'inherit' });
