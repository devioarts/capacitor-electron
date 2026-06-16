#!/usr/bin/env node
// cap-electron sync — copy + update

import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  execFileSync(process.execPath, [join(__dirname, 'copy.js')], { stdio: 'inherit' });
} catch {
  console.warn('[cap-electron] copy step failed — continuing with update...');
}
execFileSync(process.execPath, [join(__dirname, 'update.js')], { stdio: 'inherit' });
