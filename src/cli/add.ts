#!/usr/bin/env node
// capacitor:add — called by "npx cap add electron"
// Extracts the bundled template into <capacitorRoot>/electron/ and runs npm install.

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, execSync } from 'child_process';
import { extract } from 'tar';
import { CAP_ELECTRON_INIT_JS } from './electron-init-content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prefer env var set by Capacitor CLI, fall back to __dirname-based detection
const capacitorRoot = process.env['CAPACITOR_ROOT_DIR'] ?? (() => {
  const marker = `${path.sep}node_modules${path.sep}`;
  const idx = __dirname.indexOf(marker);
  return idx >= 0 ? __dirname.slice(0, idx) : process.cwd();
})();

const electronDir = path.join(capacitorRoot, 'electron');

if (fs.existsSync(electronDir)) {
  console.log('[cap-electron] Electron platform already exists, skipping.');
  process.exit(0);
}

const templatePath = path.join(__dirname, '..', '..', 'template-electron.tar.gz');

if (!fs.existsSync(templatePath)) {
  console.error(`[cap-electron] template.tar.gz not found: ${templatePath}`);
  process.exit(1);
}

console.log('[cap-electron] Adding Electron platform...');
fs.mkdirSync(electronDir, { recursive: true });

await extract({ file: templatePath, cwd: electronDir, strip: 1 });

// Ensure public/electron-init.js exists so the Vite dev server can serve it.
// cap-electron copy will also write/update it on every build.
const publicInit = path.join(capacitorRoot, 'public', 'electron-init.js');
if (!fs.existsSync(publicInit)) {
  fs.mkdirSync(path.dirname(publicInit), { recursive: true });
  fs.writeFileSync(publicInit, CAP_ELECTRON_INIT_JS, 'utf-8');
  console.log('[cap-electron] Created public/electron-init.js');
}

const { appName, appId } = readAppMeta(capacitorRoot);

const pkgFile = path.join(electronDir, 'package.json');
if (fs.existsSync(pkgFile)) {
  fs.writeFileSync(pkgFile,
    fs.readFileSync(pkgFile, 'utf-8')
      .replace(/__APP_NAME__/g, appName)
      .replace(/__APP_ID__/g, appId),
  );
}

console.log('[cap-electron] Installing dependencies...');
execSync('npm install', { cwd: electronDir, stdio: 'inherit' });

console.log('\n[cap-electron] Running sync...');
execFileSync(process.execPath, [path.join(__dirname, 'update.js')], { stdio: 'inherit' });

console.log('\n[cap-electron] Running copy...');
try {
  execFileSync(process.execPath, [path.join(__dirname, 'copy.js')], { stdio: 'inherit' });
} catch {
  console.warn('[cap-electron] Copy skipped — build your web app first, then run cap-electron copy.');
}

console.log('\n[cap-electron] Done — electron/ added.');

// ---------------------------------------------------------------------------

function readAppMeta(root: string): { appName: string; appId: string } {
  // 1. Capacitor CLI sets this env var to the processed config JSON when running hooks
  if (process.env['CAPACITOR_CONFIG']) {
    try {
      const cfg = JSON.parse(process.env['CAPACITOR_CONFIG']) as { appName?: string; appId?: string };
      if (cfg.appId && cfg.appName) return { appName: cfg.appName, appId: cfg.appId };
    } catch { /* fall through */ }
  }

  // 2. capacitor.config.json
  const jsonCfg = path.join(root, 'capacitor.config.json');
  if (fs.existsSync(jsonCfg)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(jsonCfg, 'utf-8')) as { appName?: string; appId?: string };
      if (cfg.appId || cfg.appName) {
        return { appName: cfg.appName ?? 'app', appId: cfg.appId ?? 'com.example.app' };
      }
    } catch { /* fall through */ }
  }

  // 3. capacitor.config.ts / .js — regex extract (can't dynamically import .ts at runtime)
  for (const ext of ['ts', 'js']) {
    const cfgFile = path.join(root, `capacitor.config.${ext}`);
    if (!fs.existsSync(cfgFile)) continue;
    try {
      const src = fs.readFileSync(cfgFile, 'utf-8');
      const appId   = src.match(/appId\s*:\s*['"`]([^'"`]+)['"`]/)?.[1];
      const appName = src.match(/appName\s*:\s*['"`]([^'"`]+)['"`]/)?.[1];
      if (appId || appName) {
        return { appName: appName ?? 'app', appId: appId ?? 'com.example.app' };
      }
    } catch { /* fall through */ }
  }

  // 4. package.json name as last resort
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')) as { name?: string };
    return { appName: pkg.name ?? 'app', appId: 'com.example.app' };
  } catch { /* fall through */ }

  return { appName: 'app', appId: 'com.example.app' };
}
