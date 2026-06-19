#!/usr/bin/env node
// cap-electron kill — terminates all Node/Electron processes tied to this project root

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

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

const selfPid = process.pid;

if (os.platform() === 'win32') {
  killWindows();
} else {
  killUnix();
}

function killUnix(): void {
  let raw = '';
  try {
    raw = execSync(`pgrep -f ${JSON.stringify(capacitorRoot)}`, { encoding: 'utf-8' });
  } catch {
    // pgrep exits with code 1 when no matches — that's fine
  }

  const pids = raw
    .trim()
    .split('\n')
    .map(Number)
    .filter((pid) => pid > 0 && pid !== selfPid && !isNaN(pid));

  if (pids.length === 0) {
    console.log('[cap-electron] No matching processes found.');
    return;
  }

  let killed = 0;
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`  ✓  killed pid ${pid}`);
      killed++;
    } catch {
      // already gone
    }
  }

  console.log(`[cap-electron] Sent SIGTERM to ${killed} process(es).`);
}

function killWindows(): void {
  let raw = '';
  try {
    raw = execSync(
      `wmic process where "CommandLine like '%${capacitorRoot.replace(/\\/g, '\\\\')}%'" get ProcessId /format:value`,
      { encoding: 'utf-8' }
    );
  } catch { /* ignore */ }

  const pids = raw
    .split('\n')
    .filter((l) => l.startsWith('ProcessId='))
    .map((l) => parseInt(l.split('=')[1] ?? ''))
    .filter((pid) => pid > 0 && pid !== selfPid && !isNaN(pid));

  if (pids.length === 0) {
    console.log('[cap-electron] No matching processes found.');
    return;
  }

  let killed = 0;
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`);
      console.log(`  ✓  killed pid ${pid}`);
      killed++;
    } catch { /* already gone */ }
  }

  console.log(`[cap-electron] Terminated ${killed} process(es).`);
}
