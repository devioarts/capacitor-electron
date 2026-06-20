#!/usr/bin/env node
// cap-electron run — full dev workflow with hot-reload:
//   • reads dev URL from electron/capacitor.config.json → plugins.Electron.dev.url (fallback localhost:5173)
//   • starts npm run dev in project root if dev server isn't running yet
//   • builds + watches electron sources via esbuild
//   • waits for dev server, then launches Electron
//   • auto-restarts Electron when main.cjs changes (main process rebuild)
//   • signals renderer reload when preload.cjs changes (via dist/.dev-reload)

import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn, ChildProcess } from 'child_process';

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

if (!fs.existsSync(path.join(electronDir, 'package.json'))) {
  console.error('[cap-electron] electron/package.json not found — electron/ is incomplete. Recreate it with: npx cap-electron add');
  process.exit(1);
}

const { url: devUrl, host, port } = readDevUrl();

const children: ChildProcess[] = [];
const watchers: fs.FSWatcher[] = [];
let devServerOurs = false; // true = we started it, false = it was already running
let cleaningUp = false;

// Kill entire process group (pid < 0) so grandchildren (esbuild, vite) die too.
// Falls back to child.kill() on platforms where process groups aren't supported.
function killGroup(child: ChildProcess, signal: NodeJS.Signals = 'SIGTERM'): void {
  if (child.pid == null) return;
  try { process.kill(-child.pid, signal); } catch { try { child.kill(signal); } catch { /* ignore */ } }
}

function isAlive(child: ChildProcess): boolean {
  if (child.pid == null) return false;
  try { process.kill(child.pid, 0); return true; } catch { return false; }
}

async function cleanup(): Promise<void> {
  if (cleaningUp) return;
  cleaningUp = true;

  for (const w of watchers) try { w.close(); } catch { /* ignore */ }

  if (children.length === 0) return;

  if (devServerOurs) {
    console.log('[cap-electron] Stopping dev server (started by this session)...');
  }

  // Phase 1: graceful SIGTERM to all spawned process groups
  for (const child of children) killGroup(child, 'SIGTERM');

  // Phase 2: wait up to 3 s for graceful shutdown
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline && children.some(isAlive)) {
    await new Promise<void>(r => setTimeout(r, 100));
  }

  // Phase 3: SIGKILL survivors + any grandchildren still in the process group
  for (const child of children) killGroup(child, 'SIGKILL');
}

async function exitCleanly(code: number): Promise<never> {
  await cleanup();
  process.exit(code);
}

process.on('SIGINT',  () => { void exitCleanly(0); });
process.on('SIGTERM', () => { void exitCleanly(0); });

// Spawn in its own process group so we can kill the whole tree later.
function spawnGroup(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): ChildProcess {
  const child = spawn(cmd, args, { cwd, stdio: 'inherit', detached: true, env });
  child.on('error', (err) => {
    console.error(`[cap-electron] Failed to start "${cmd}": ${err.message}`);
    void exitCleanly(1);
  });
  children.push(child);
  return child;
}

// ── 1. Dev server ─────────────────────────────────────────────────────────────

const pm = detectPackageManager(capacitorRoot);
const devRunning = await isPortOpen(host, port);

if (!devRunning) {
  console.log(`[cap-electron] Starting dev server (${devUrl})...`);
  devServerOurs = true;
  spawnGroup(pm, ['run', 'dev'], capacitorRoot, { ...process.env, APP_PLATFORM: 'electron' });
} else {
  console.log(`[cap-electron] Dev server already running on ${devUrl} — will not stop it on exit.`);
}

// ── 2. Electron initial build + watch ─────────────────────────────────────────

try {
  execSync('npm run build', { cwd: electronDir, stdio: 'inherit' });
} catch {
  console.error('[cap-electron] Electron source compilation failed.');
  await exitCleanly(1);
}
spawnGroup('npm', ['run', 'watch'], electronDir);

// ── 3. Wait for dev server ────────────────────────────────────────────────────

if (!devRunning) {
  console.log(`[cap-electron] Waiting for dev server on ${devUrl}...`);
  await waitForPort(host, port, 60_000);
}

// ── 4. Launch Electron ────────────────────────────────────────────────────────

const electronCli = findElectronCli(electronDir, capacitorRoot);

// Create the reload-signal file before Electron starts so main.ts can watch it immediately.
const reloadSignal = path.join(electronDir, 'dist', '.dev-reload');
try {
  fs.writeFileSync(reloadSignal, '0');
} catch (e) {
  console.error(`[cap-electron] Failed to create reload signal file: ${e instanceof Error ? e.message : String(e)}`);
  await exitCleanly(1);
}

let electronProc: ChildProcess | null = null;
let intentionalRestart = false;

function launchElectron(restart = false): void {
  console.log(restart
    ? '[cap-electron] Restarting Electron...'
    : '[cap-electron] Launching Electron...'
  );
  electronProc = spawnGroup(process.execPath, [electronCli, 'dist/main.cjs'], electronDir);
  electronProc.on('exit', (code) => {
    if (intentionalRestart) {
      intentionalRestart = false;
      launchElectron(true);
    } else {
      void exitCleanly(code ?? 0);
    }
  });
}

launchElectron();

// ── 5. Hot-reload watchers ────────────────────────────────────────────────────

let restartTimer: ReturnType<typeof setTimeout> | null = null;
let reloadTimer:  ReturnType<typeof setTimeout> | null = null;

function scheduleRestart(): void {
  if (intentionalRestart) return;
  if (restartTimer) clearTimeout(restartTimer);
  // A restart covers any pending preload reload too.
  if (reloadTimer) { clearTimeout(reloadTimer); reloadTimer = null; }
  restartTimer = setTimeout(() => {
    restartTimer = null;
    console.log('[cap-electron] main.cjs changed — restarting Electron...');
    intentionalRestart = true;
    if (electronProc) killGroup(electronProc);
  }, 400);
}

function scheduleReload(): void {
  // Skip if a restart is already queued — restart picks up preload changes too.
  if (intentionalRestart || restartTimer) return;
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    if (intentionalRestart || restartTimer) return;
    console.log('[cap-electron] preload.cjs changed — reloading renderer...');
    try {
      fs.writeFileSync(reloadSignal, Date.now().toString());
    } catch (e) {
      console.error(`[cap-electron] Failed to write reload signal: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, 400);
}

const mainCjs    = path.join(electronDir, 'dist', 'main.cjs');
const preloadCjs = path.join(electronDir, 'dist', 'preload.cjs');

// dist/ was just built — both files exist. Watch them for hot-reload.
try {
  watchers.push(fs.watch(mainCjs,    scheduleRestart));
  watchers.push(fs.watch(preloadCjs, scheduleReload));
} catch (e) {
  console.error(`[cap-electron] Failed to watch build output files: ${e instanceof Error ? e.message : String(e)}`);
  await exitCleanly(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectPackageManager(root: string): string {
  if (fs.existsSync(path.join(root, 'bun.lockb')))      return 'bun';
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(root, 'yarn.lock')))      return 'yarn';
  return 'npm';
}

function findElectronCli(electronDir: string, capacitorRoot: string): string {
  const local   = path.join(electronDir,    'node_modules', 'electron', 'cli.js');
  const hoisted = path.join(capacitorRoot,  'node_modules', 'electron', 'cli.js');
  if (fs.existsSync(local))   return local;
  if (fs.existsSync(hoisted)) return hoisted;
  console.error('[cap-electron] electron binary not found — run npm install in electron/');
  process.exit(1);
}

function readDevUrl(): { url: string; host: string; port: number } {
  try {
    const cfgPath = path.join(electronDir, 'capacitor.config.json');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as Record<string, unknown>;
    const electronPlugin = (cfg['plugins'] as Record<string, unknown> | undefined)?.['Electron'] as Record<string, unknown> | undefined;
    const dev = electronPlugin?.['dev'] as Record<string, unknown> | undefined;
    const url = dev?.['url'] as string | undefined;
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
  await exitCleanly(1);
}
