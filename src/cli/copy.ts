#!/usr/bin/env node
// cap-electron copy — copies the web build into electron/app/ (mirrors iOS/Android copy)

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { cp, rm } from 'fs/promises';
import { ensureAppInit } from './electron-init.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.stdout.write('\n');
const start = performance.now();

const marker = `${path.sep}node_modules${path.sep}`;
const markerIdx = __dirname.indexOf(marker);
const capacitorRoot = process.env['CAPACITOR_ROOT_DIR']
  ?? (markerIdx >= 0 ? __dirname.slice(0, markerIdx) : process.cwd());
const electronDir = path.join(capacitorRoot, 'electron');

if (!fs.existsSync(electronDir)) {
  console.error('\x1b[1;31m[cap-electron] electron/ not found — run: npx cap-electron add\x1b[0m');
  process.exit(1);
}

const webDir = getWebDir();

if (!fs.existsSync(webDir)) {
  console.error(`\x1b[1;31m[cap-electron] web dir not found: ${webDir}\x1b[0m`);
  console.error('Build your web app first.');
  process.exit(1);
}

const appDir = path.join(electronDir, 'app');
console.log(`[cap-electron] Copying web assets: ${path.relative(capacitorRoot, webDir)} → electron/app`);

try {
  if (fs.existsSync(appDir)) await rm(appDir, { recursive: true, force: true });
  await cp(webDir, appDir, { recursive: true });
} catch (e) {
  const elapsed = (performance.now() - start).toFixed(2);
  console.error(`\x1b[1;31m✖ copy electron failed in ${elapsed}ms: ${e instanceof Error ? e.message : String(e)}\x1b[0m`);
  process.exit(1);
}

ensureAppInit(appDir);

const elapsed = (performance.now() - start).toFixed(2);
console.log(`\x1b[1;32m✔ copy electron in ${elapsed}ms\x1b[0m`);

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWebDir(): string {
  if (process.env['CAPACITOR_WEB_DIR']) return process.env['CAPACITOR_WEB_DIR'];

  try {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(electronDir, 'capacitor.config.json'), 'utf-8')
    ) as { webDir?: string };
    if (cfg.webDir) return path.join(capacitorRoot, cfg.webDir);
  } catch { /* fall through */ }

  return path.join(capacitorRoot, 'dist');
}
