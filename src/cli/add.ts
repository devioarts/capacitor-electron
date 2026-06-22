#!/usr/bin/env node
// capacitor:add — called by "npx cap add electron"
// Extracts the bundled template into <capacitorRoot>/electron/ and runs npm install.

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, execSync } from 'child_process';
import { extract } from 'tar';
import {
  collectElectronPackageMetadata,
  mergePackageLockMetadata,
  mergePackageMetadata,
} from './metadata.js';

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

const metadata = collectElectronPackageMetadata(capacitorRoot);

for (const pkgFile of [
  path.join(electronDir, 'package.json'),
  path.join(electronDir, 'package-lock.json'),
]) {
  if (!fs.existsSync(pkgFile)) continue;
  try {
    fs.writeFileSync(pkgFile,
      fs.readFileSync(pkgFile, 'utf-8')
        .replace(/__APP_NAME__/g, metadata.packageName)
        .replace(/__APP_ID__/g, metadata.appMeta.appId),
    );
  } catch (e) {
    console.error(`[cap-electron] Failed to patch ${path.relative(electronDir, pkgFile)}: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

mergePackageMetadata(path.join(electronDir, 'package.json'), metadata.packageJson);
mergePackageLockMetadata(path.join(electronDir, 'package-lock.json'), metadata.packageJson);

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
  console.warn('[cap-electron] Copy skipped — run: npx cap-electron copy (after building the web app).');
}

console.log('\n[cap-electron] Done — electron/ added.');
