#!/usr/bin/env node
// cap-electron prepare — compiles Electron sources (npm run build inside electron/)

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const marker = `${path.sep}node_modules${path.sep}`;
const markerIdx = __dirname.indexOf(marker);
const capacitorRoot = process.env['CAPACITOR_ROOT_DIR']
  ?? (markerIdx >= 0 ? __dirname.slice(0, markerIdx) : process.cwd());
const electronDir = path.join(capacitorRoot, 'electron');

if (!fs.existsSync(electronDir)) {
  console.error('[cap-electron] electron/ not found — run: npx cap-electron add');
  process.exit(1);
}

console.log('[cap-electron] Building Electron sources...');
try {
  execSync('npm run build', { cwd: electronDir, stdio: 'inherit' });
} catch {
  console.error('[cap-electron] Build failed.');
  process.exit(1);
}

console.log('[cap-electron] Prepare done.');
