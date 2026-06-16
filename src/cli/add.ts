#!/usr/bin/env node
// capacitor:add — called by "npx cap add electron"
// Extracts the bundled template into <capacitorRoot>/electron/ and runs npm install.

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, execSync } from 'child_process';
import { extract } from 'tar';

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
try {
  fs.mkdirSync(electronDir, { recursive: true });
  await extract({ file: templatePath, cwd: electronDir, strip: 1 });
} catch (e) {
  console.error(`[cap-electron] Failed to extract template: ${e instanceof Error ? e.message : String(e)}`);
  fs.rmSync(electronDir, { recursive: true, force: true });
  process.exit(1);
}

const { appName, appId } = readAppMeta(capacitorRoot);
const packageName = toNpmPackageName(appName, appId);

for (const pkgFile of [
  path.join(electronDir, 'package.json'),
  path.join(electronDir, 'package-lock.json'),
]) {
  if (!fs.existsSync(pkgFile)) continue;
  try {
    fs.writeFileSync(pkgFile,
      fs.readFileSync(pkgFile, 'utf-8')
        .replace(/__APP_NAME__/g, packageName)
        .replace(/__APP_ID__/g, appId),
    );
  } catch (e) {
    console.error(`[cap-electron] Failed to patch ${path.relative(electronDir, pkgFile)}: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

console.log('[cap-electron] Installing dependencies...');
try {
  execSync('npm install', { cwd: electronDir, stdio: 'inherit' });
} catch {
  console.error('[cap-electron] npm install failed in electron/ — check the output above.');
  process.exit(1);
}

console.log('\n[cap-electron] Running update...');
try {
  execFileSync(process.execPath, [path.join(__dirname, 'update.js')], { stdio: 'inherit' });
} catch {
  process.exit(1); // update already printed its own error
}

console.log('\n[cap-electron] Running copy...');
try {
  execFileSync(process.execPath, [path.join(__dirname, 'copy.js')], { stdio: 'inherit' });
} catch {
  console.warn('[cap-electron] Copy skipped — run: cap-electron copy (after building the web app).');
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

function toNpmPackageName(name: string, fallback: string): string {
  for (const candidate of [name, fallback, 'app']) {
    const safe = candidate
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/[-._]{2,}/g, '-')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 214);

    if (safe) return safe;
  }

  return 'app';
}
