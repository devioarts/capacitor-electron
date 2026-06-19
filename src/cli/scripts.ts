#!/usr/bin/env node
// cap-electron scripts — adds electron:* npm scripts to the root package.json (if missing).

import * as fs from 'fs';
import * as path from 'path';
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

const SCRIPTS: Record<string, string> = {
  'electron:sync': 'cap-electron sync',
  'electron:copy': 'cap-electron copy',
  'electron:open': 'cap-electron open',
};

const pkgPath = path.join(capacitorRoot, 'package.json');

if (!fs.existsSync(pkgPath)) {
  console.error(`[cap-electron] package.json not found at: ${pkgPath}`);
  process.exit(1);
}

let pkg: { scripts?: Record<string, string> };
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { scripts?: Record<string, string> };
} catch (e) {
  console.error(`[cap-electron] Failed to read package.json: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

pkg.scripts ??= {};

const added: string[] = [];
const skipped: string[] = [];

for (const [name, command] of Object.entries(SCRIPTS)) {
  if (pkg.scripts[name] !== undefined) {
    skipped.push(name);
  } else {
    pkg.scripts[name] = command;
    added.push(name);
  }
}

try {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
} catch (e) {
  console.error(`[cap-electron] Failed to write package.json: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

if (added.length) {
  console.log('[cap-electron] Added scripts:');
  for (const name of added) console.log(`  + ${name}`);
}
if (skipped.length) {
  console.log('[cap-electron] Already present (skipped):');
  for (const name of skipped) console.log(`  · ${name}`);
}
