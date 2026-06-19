#!/usr/bin/env node
// cap-electron build [mac|win|linux] — compile Electron sources + package with electron-builder

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

const PLATFORM_FLAGS: Record<string, string[]> = {
  mac:   ['--mac', '--x64', '--arm64'],
  win:   ['--win', '--x64', '--arm64'],
  linux: ['--linux', '--x64'],
};

const AUTO_PLATFORM: Partial<Record<string, string>> = {
  darwin: 'mac',
  win32:  'win',
  linux:  'linux',
};

const platformArg = process.argv[2];
const platform = platformArg ?? AUTO_PLATFORM[process.platform];

if (!platform || !PLATFORM_FLAGS[platform]) {
  console.error(`[cap-electron] Unknown platform: "${platformArg ?? process.platform}"`);
  console.error('Usage: npx cap-electron build [mac|win|linux]');
  process.exit(1);
}

const flags = PLATFORM_FLAGS[platform];

const appDir = path.join(electronDir, 'app');
if (!fs.existsSync(appDir)) {
  console.warn('[cap-electron] electron/app/ not found — run: npx cap-electron copy first (packaging may fail).');
}

const eb = path.join('node_modules', '.bin', 'electron-builder');
if (!fs.existsSync(path.join(electronDir, 'node_modules', '.bin', 'electron-builder'))) {
  console.error('[cap-electron] electron-builder not found — run npm install in electron/');
  process.exit(1);
}

console.log('[cap-electron] Compiling Electron sources...');
try {
  execSync('npm run build', { cwd: electronDir, stdio: 'inherit' });
} catch {
  console.error('[cap-electron] Electron source compilation failed.');
  process.exit(1);
}

console.log(`[cap-electron] Packaging (${platform})...`);
try {
  execSync(`${eb} ${flags.join(' ')}`, { cwd: electronDir, stdio: 'inherit', shell: true });
} catch {
  console.error('[cap-electron] electron-builder packaging failed.');
  process.exit(1);
}

console.log('[cap-electron] Build done.');
