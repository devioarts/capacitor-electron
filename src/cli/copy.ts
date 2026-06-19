#!/usr/bin/env node
// cap-electron copy — copies the web build into electron/app/ (mirrors iOS/Android copy)

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { cp, rm } from 'fs/promises';
import { ensureAppInit } from './electron-init.js';

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

const webDir = getWebDir();

if (!fs.existsSync(webDir)) {
  console.error(`[cap-electron] web dir not found: ${webDir}`);
  console.error('Build your web app first.');
  process.exit(1);
}

const appDir = path.join(electronDir, 'app');
console.log(`[cap-electron] Copying web assets: ${path.relative(capacitorRoot, webDir)} → electron/app`);

try {
  if (fs.existsSync(appDir)) await rm(appDir, { recursive: true, force: true });
  await cp(webDir, appDir, { recursive: true });
} catch (e) {
  console.error(`[cap-electron] Failed to copy web assets: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

ensureAppInit(appDir);

console.log('[cap-electron] Copy done.');

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
