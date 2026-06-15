#!/usr/bin/env node
// capacitor:copy — copies the web build into electron/app/ (mirrors iOS/Android copy)

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { cp, rm } from 'fs/promises';
import { CAP_ELECTRON_INIT_JS } from './electron-init-content.js';

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

// ── electron-init.js ──────────────────────────────────────────────────────────

// 1. Always write fresh init file into electron/app/ (production build)
fs.writeFileSync(path.join(appDir, 'electron-init.js'), CAP_ELECTRON_INIT_JS, 'utf-8');

// 2. Inject <script> right after <body> in the copied index.html
const htmlPath = path.join(appDir, 'index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  if (!html.includes('electron-init.js')) {
    fs.writeFileSync(
      htmlPath,
      html.replace('<body>', '<body>\n    <script src="/electron-init.js"></script>'),
      'utf-8',
    );
  }
}

// 3. Ensure public/electron-init.js exists for the Vite dev server
const publicInit = path.join(capacitorRoot, 'public', 'electron-init.js');
if (!fs.existsSync(publicInit)) {
  fs.mkdirSync(path.dirname(publicInit), { recursive: true });
  fs.writeFileSync(publicInit, CAP_ELECTRON_INIT_JS, 'utf-8');
  console.log('[cap-electron] Created public/electron-init.js');
}

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

