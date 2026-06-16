#!/usr/bin/env node
// cap-electron open — alias for cap-electron run

import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath, [join(__dirname, 'run.js'), ...process.argv.slice(2)], { stdio: 'inherit' });
