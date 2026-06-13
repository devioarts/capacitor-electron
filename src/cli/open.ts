#!/usr/bin/env node
// capacitor:open — starts the full dev workflow:
//   • reads devUrl from electron/capacitor.config.json → plugins.Electron.devUrl (fallback localhost:5173)
//   • starts npm run dev in project root if dev server isn't running yet
//   • builds + watches electron sources
//   • waits for dev server, then launches Electron

import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn, ChildProcess } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const marker = `${path.sep}node_modules${path.sep}`;
const markerIdx = __dirname.indexOf(marker);
const capacitorRoot = markerIdx >= 0 ? __dirname.slice(0, markerIdx) : process.cwd();
const electronDir = path.join(capacitorRoot, 'electron');

if (!fs.existsSync(electronDir)) {
  console.error('[cap-electron] electron/ not found — run: cap-electron add');
  process.exit(1);
}

const { url: devUrl, host, port } = readDevUrl();

const children: ChildProcess[] = [];

// Kill entire process group (pid < 0) so grandchildren (esbuild, vite) die too.
// Falls back to child.kill() on platforms where process groups aren't supported.
function killGroup(child: ChildProcess): void {
  if (child.pid == null) return;
  try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill(); } catch { /* ignore */ } }
}

function cleanup(): void {
  for (const child of children) killGroup(child);
}

process.on('SIGINT',  () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });

// Spawn in its own process group so we can kill the whole tree later.
function spawnGroup(cmd: string, args: string[], cwd: string): ChildProcess {
  const child = spawn(cmd, args, { cwd, stdio: 'inherit', detached: true });
  children.push(child);
  return child;
}

// ── 1. Dev server ─────────────────────────────────────────────────────────────

const devRunning = await isPortOpen(host, port);

if (!devRunning) {
  console.log(`[cap-electron] Starting dev server (${devUrl})...`);
  spawnGroup('npm', ['run', 'dev'], capacitorRoot);
} else {
  console.log(`[cap-electron] Dev server already running on ${devUrl}.`);
}

// ── 2. Electron initial build + watch ─────────────────────────────────────────

execSync('npm run build', { cwd: electronDir, stdio: 'inherit' });
spawnGroup('npm', ['run', 'watch'], electronDir);

// ── 3. Wait for dev server ────────────────────────────────────────────────────

if (!devRunning) {
  console.log(`[cap-electron] Waiting for dev server on ${devUrl}...`);
  await waitForPort(host, port, 60_000);
}

// ── 4. Launch Electron ────────────────────────────────────────────────────────

console.log('[cap-electron] Launching Electron...');
const electronCli = path.join(electronDir, 'node_modules', 'electron', 'cli.js');
const electronProcess = spawnGroup(process.execPath, [electronCli, 'dist/main.cjs'], electronDir);

electronProcess.on('exit', () => {
  cleanup();
  process.exit(0);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function readDevUrl(): { url: string; host: string; port: number } {
  try {
    const cfgPath = path.join(electronDir, 'capacitor.config.json');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as Record<string, unknown>;
    const electronPlugin = (cfg['plugins'] as Record<string, unknown> | undefined)?.['Electron'] as Record<string, unknown> | undefined;
    const url = electronPlugin?.['devUrl'] as string | undefined;
    if (url) {
      const parsed = new URL(url);
      const port = parseInt(parsed.port) || (parsed.protocol === 'https:' ? 443 : 80);
      return { url, host: parsed.hostname, port };
    }
  } catch { /* fall through */ }
  return { url: 'http://localhost:5173', host: 'localhost', port: 5173 };
}

function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(1500);
    socket.on('connect',  () => { socket.destroy(); resolve(true); });
    socket.on('error',    () => resolve(false));
    socket.on('timeout',  () => { socket.destroy(); resolve(false); });
  });
}

async function waitForPort(host: string, port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen(host, port)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error(`[cap-electron] Timed out waiting for dev server on port ${port}.`);
  cleanup();
  process.exit(1);
}
