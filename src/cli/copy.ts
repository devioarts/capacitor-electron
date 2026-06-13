#!/usr/bin/env node
// capacitor:copy — copies the web build into electron/app/ (mirrors iOS/Android copy)

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { cp, rm } from 'fs/promises';

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

const webDir = getWebDir();

if (!fs.existsSync(webDir)) {
  console.error(`[cap-electron] web dir not found: ${webDir}`);
  console.error('Build your web app first.');
  process.exit(1);
}

const appDir = path.join(electronDir, 'app');
console.log(`[cap-electron] Copying web assets: ${path.relative(capacitorRoot, webDir)} → electron/app`);

if (fs.existsSync(appDir)) await rm(appDir, { recursive: true, force: true });
await cp(webDir, appDir, { recursive: true });

console.log('[cap-electron] Copy done.');

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWebDir(): string {
  // 1. Capacitor CLI env var
  if (process.env['CAPACITOR_WEB_DIR']) return process.env['CAPACITOR_WEB_DIR'];

  // 2. Already-processed electron/capacitor.config.json (written by sync)
  try {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(electronDir, 'capacitor.config.json'), 'utf-8')
    ) as { webDir?: string };
    if (cfg.webDir) return path.join(capacitorRoot, cfg.webDir);
  } catch { /* fall through */ }

  // 3. Fallback
  return path.join(capacitorRoot, 'dist');
}
