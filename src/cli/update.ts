#!/usr/bin/env node
// capacitor:sync — mirrors what "cap sync" does for other platforms:
//   1. Processes capacitor.config → writes electron/capacitor.config.json
//   2. Scans for Capacitor Electron plugins, generates:
//        src/system/generated/plugins-preload-auto.ts  — preload plugin registry
//        src/system/generated/plugins-main-auto.ts     — main-process plugin registration

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import type { PluginSettings } from '../shared/plugin-settings.js';
import { ensurePublicInit, ensureRootScriptTag } from './electron-init.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Normal npm install: find project root via node_modules boundary in __dirname.
// file:/symlink install: __dirname is outside node_modules, fall back to cwd.
// Capacitor CLI sets CAPACITOR_ROOT_DIR when calling this as a hook.
const marker = `${path.sep}node_modules${path.sep}`;
const markerIdx = __dirname.indexOf(marker);
const capacitorRoot = process.env['CAPACITOR_ROOT_DIR']
  ?? (markerIdx >= 0 ? __dirname.slice(0, markerIdx) : process.cwd());
const electronDir = path.join(capacitorRoot, 'electron');

if (!fs.existsSync(electronDir)) {
  console.error('[cap-electron] electron/ not found — run: cap-electron add');
  process.exit(1);
}

const depRequire = createRequire(import.meta.url);

interface PluginEntry extends PluginSettings {
  packageName: string;
}

type MutableRecord = Record<string, unknown>;

function findPlugins(): PluginEntry[] {
  const pkgPath = path.join(capacitorRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
  const deps = {
    ...(pkg.dependencies as Record<string, string> ?? {}),
    ...(pkg.devDependencies as Record<string, string> ?? {}),
  };

  const found: PluginEntry[] = [];

  for (const name of Object.keys(deps)) {
    const depPkgPath = path.join(capacitorRoot, 'node_modules', name, 'package.json');
    if (!fs.existsSync(depPkgPath)) continue;

    const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf-8')) as Record<string, unknown>;
    const electronSrc = (depPkg.capacitor as Record<string, unknown> | undefined)
      ?.electron as Record<string, unknown> | undefined;

    if (!electronSrc?.src) continue;

    const settingsPath = path.join(capacitorRoot, 'node_modules', name, electronSrc.src as string, 'dist', 'plugin-settings.js');
    if (!fs.existsSync(settingsPath)) continue;

    let settings: PluginSettings;
    try {
      ({ pluginSettings: settings } = depRequire(settingsPath) as { pluginSettings: PluginSettings });
    } catch {
      console.warn(`  ⚠  ${name}: failed to load plugin-settings.js, skipping`);
      continue;
    }

    if (!settings.pluginClass || !settings.pluginMethods?.length) continue;

    found.push({ packageName: name, ...settings });
  }

  return found;
}

function generateElectronPluginsAuto(plugins: PluginEntry[]): string {
  const lines = [
    '// Auto-generated — do not edit.',
    '// Regenerate with: cap-electron sync',
    '',
    'export const pluginsAuto = {',
  ];

  for (const { pluginClass, pluginMethods, pluginEvents } of plugins) {
    lines.push(`  ${pluginClass}: {`);
    lines.push(`    methods: [${pluginMethods.map((m) => `'${m}'`).join(', ')}],`);
    if (pluginEvents?.length) {
      lines.push(`    events: [${pluginEvents.map((e) => `'${e}'`).join(', ')}],`);
    }
    lines.push(`  },`);
  }

  if (plugins.length === 0) lines.push('  // no Capacitor Electron plugins found');

  lines.push('} as const;', '', 'export type PluginAutoRegistry = typeof pluginsAuto;');

  return lines.join('\n') + '\n';
}

function isRecord(value: unknown): value is MutableRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJsonObject(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function isInsideDir(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function copyProjectAssetToElectronAssets(rawValue: string, configPath: string): string {
  if (!rawValue.startsWith('/')) return rawValue;

  const projectRoot = path.resolve(capacitorRoot);
  const relativeFromRoot = rawValue.replace(/^\/+/, '');
  const src = path.resolve(projectRoot, relativeFromRoot);

  if (!isInsideDir(projectRoot, src)) {
    throw new Error(`${configPath} must point inside the project root: ${rawValue}`);
  }

  if (!fs.existsSync(src)) {
    throw new Error(`${configPath} points to a missing asset: ${rawValue}`);
  }

  const stat = fs.statSync(src);
  if (!stat.isFile()) {
    throw new Error(`${configPath} must point to a file: ${rawValue}`);
  }

  const destName = path.basename(src);
  if (!destName) {
    throw new Error(`${configPath} must include a filename: ${rawValue}`);
  }

  const assetsDir = path.join(electronDir, 'assets');
  const dest = path.join(assetsDir, destName);
  fs.mkdirSync(assetsDir, { recursive: true });

  if (path.resolve(src) !== path.resolve(dest)) {
    fs.copyFileSync(src, dest);
  }

  console.log(`  Asset copied: ${configPath} ${rawValue} → electron/assets/${destName}`);
  return destName;
}

function normalizeElectronAssetPaths(electronPlugin: unknown): unknown {
  const normalized = cloneJsonObject(electronPlugin);
  if (!isRecord(normalized)) return normalized;

  if (typeof normalized['icon'] === 'string') {
    normalized['icon'] = copyProjectAssetToElectronAssets(normalized['icon'], 'plugins.Electron.icon');
  }

  const tray = normalized['tray'];
  if (isRecord(tray) && typeof tray['icon'] === 'string') {
    tray['icon'] = copyProjectAssetToElectronAssets(tray['icon'], 'plugins.Electron.tray.icon');
  }

  const splashScreen = normalized['splashScreen'];
  if (isRecord(splashScreen) && typeof splashScreen['image'] === 'string') {
    splashScreen['image'] = copyProjectAssetToElectronAssets(splashScreen['image'], 'plugins.Electron.splashScreen.image');
  }

  return normalized;
}


function generateElectronMainAuto(plugins: PluginEntry[]): string {
  const parts: string[] = [
    '// Auto-generated — do not edit.',
    '// Regenerate with: cap-electron sync',
  ];

  const autoPlugins = plugins.filter((p) => p.autoRegister !== false);

  if (autoPlugins.length === 0) {
    parts.push('', '// no Capacitor Electron plugins found');
    return parts.join('\n') + '\n';
  }

  parts.push(
    '',
    "import { app } from 'electron';",
    "import { registerPlugin, AnyRecord } from '../shared/functions';",
  );

  const extraImports = new Set<string>();
  for (const { imports } of autoPlugins) {
    for (const imp of imports ?? []) extraImports.add(imp);
  }
  for (const imp of extraImports) parts.push(`${imp};`);

  parts.push('');

  const seen = new Set<string>();
  const beforeRegisterLines: string[] = [];
  for (const { beforeRegister } of autoPlugins) {
    for (const line of beforeRegister ?? []) {
      if (!seen.has(line)) { seen.add(line); beforeRegisterLines.push(line); }
    }
  }

  const needsAsync = beforeRegisterLines.some((l) => l.includes('await'));
  const i = needsAsync ? '  ' : '';

  if (needsAsync) parts.push('void (async () => {');

  for (const line of beforeRegisterLines) parts.push(`${i}${line};`);

  for (const { pluginClass, pluginMethods } of autoPlugins) {
    const methods = pluginMethods.map((m) => `'${m}'`).join(', ');
    parts.push(`${i}registerPlugin('${pluginClass}', new ${pluginClass}() as unknown as AnyRecord, [${methods}]);`);
  }

  if (needsAsync) parts.push('})();');

  return parts.join('\n') + '\n';
}

const GLOBALS_REFERENCE = '/// <reference types="@devioarts/capacitor-electron/globals" />';

function injectGlobalsReference(projectRoot: string): void {
  // Candidate files where Vite/Capacitor/Nuxt/SvelteKit projects keep ambient references.
  const candidates = [
    path.join(projectRoot, 'src', 'vite-env.d.ts'),
    path.join(projectRoot, 'src', 'env.d.ts'),
    path.join(projectRoot, 'src', 'app.d.ts'),
    path.join(projectRoot, 'vite-env.d.ts'),
    path.join(projectRoot, 'env.d.ts'),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const content = fs.readFileSync(candidate, 'utf-8');
    if (content.includes(GLOBALS_REFERENCE)) {
      console.log(`\nGlobals reference already present in ${path.relative(projectRoot, candidate)}`);
      return;
    }
    fs.writeFileSync(candidate, GLOBALS_REFERENCE + '\n' + content);
    console.log(`\nInjected globals reference into ${path.relative(projectRoot, candidate)}`);
    return;
  }

  // No existing ambient file found — create a minimal one in src/.
  const target = path.join(projectRoot, 'src', 'capacitor-electron.d.ts');
  if (!fs.existsSync(target)) {
    fs.mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
    fs.writeFileSync(target, GLOBALS_REFERENCE + '\n');
    console.log(`\nCreated src/capacitor-electron.d.ts with globals reference`);
  }
}

async function main(): Promise<void> {
  ensurePublicInit(capacitorRoot);
  ensureRootScriptTag(capacitorRoot);

  const generatedDir = path.join(electronDir, 'src', 'system', 'generated');
  fs.mkdirSync(generatedDir, { recursive: true });

  console.log('Scanning for Capacitor Electron plugins...\n');
  const plugins = findPlugins();

  if (plugins.length === 0) {
    console.log('  No plugins found (looking for capacitor.electron.src + plugin-settings.js).');
  } else {
    for (const { packageName, pluginClass, pluginEvents } of plugins) {
      const eventsNote = pluginEvents?.length ? `  [${pluginEvents.length} event(s)]` : '';
      console.log(`  ✓  ${packageName}  →  ${pluginClass}${eventsNote}`);
    }
  }

  fs.writeFileSync(path.join(generatedDir, 'plugins-preload-auto.ts'), generateElectronPluginsAuto(plugins));
  console.log(`\nWritten: src/system/generated/plugins-preload-auto.ts`);

  fs.writeFileSync(path.join(generatedDir, 'plugins-main-auto.ts'), generateElectronMainAuto(plugins));
  console.log(`Written: src/system/generated/plugins-main-auto.ts`);

  // ── 2. Inject /// <reference types="@devioarts/capacitor-electron/globals" /> ──

  injectGlobalsReference(capacitorRoot);

  // ── 3. Capacitor config → electron/capacitor.config.json ─────────────────

  console.log('\nProcessing capacitor config...');
  const cfg = await readCapacitorConfig();
  if (cfg) {
    const filtered: Record<string, unknown> = {};
    if (cfg['appId'])            filtered['appId']            = cfg['appId'];
    if (cfg['appName'])          filtered['appName']          = cfg['appName'];
    if (cfg['webDir'])           filtered['webDir']           = cfg['webDir'];
    if (cfg['backgroundColor'])  filtered['backgroundColor']  = cfg['backgroundColor'];

    const allPluginsCfg = cfg['plugins'] as Record<string, unknown> | undefined;
    const electronPlugin = allPluginsCfg?.['Electron'];

    // Collect config section names declared by installed plugins via configSections.
    const extraSections = new Set<string>();
    for (const p of plugins) {
      for (const s of p.configSections ?? []) extraSections.add(s);
    }

    const pluginsOut: Record<string, unknown> = {};
    if (electronPlugin) pluginsOut['Electron'] = normalizeElectronAssetPaths(electronPlugin);
    for (const section of extraSections) {
      if (allPluginsCfg?.[section] !== undefined) pluginsOut[section] = allPluginsCfg[section];
    }
    if (Object.keys(pluginsOut).length > 0) filtered['plugins'] = pluginsOut;

    const dest = path.join(electronDir, 'capacitor.config.json');
    fs.writeFileSync(dest, JSON.stringify(filtered, null, 2) + '\n');
    console.log('Written: electron/capacitor.config.json');

    if (extraSections.size > 0) {
      const present = [...extraSections].filter((s) => allPluginsCfg?.[s] !== undefined);
      const missing = [...extraSections].filter((s) => allPluginsCfg?.[s] === undefined);
      if (present.length > 0) console.log(`  Plugin config sections included: ${present.join(', ')}`);
      if (missing.length > 0) console.warn(`  ⚠  Config sections declared but not found in capacitor.config: ${missing.join(', ')}`);
    }
  } else {
    console.warn('[cap-electron] Could not read capacitor config — skipping.');
  }
}

main().catch((e) => {
  console.error(`[cap-electron] Update failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});

// ── Config helpers ────────────────────────────────────────────────────────────

async function readCapacitorConfig(): Promise<Record<string, unknown> | null> {
  if (process.env['CAPACITOR_CONFIG']) {
    try { return JSON.parse(process.env['CAPACITOR_CONFIG']) as Record<string, unknown>; } catch { /* fall through */ }
  }

  try {
    const { loadConfig } = depRequire('@capacitor/cli/dist/config.js') as {
      loadConfig: () => Promise<{ app?: { extConfig?: Record<string, unknown> } }>;
    };
    const originalCwd = process.cwd();
    try {
      process.chdir(capacitorRoot);
      const loaded = await loadConfig();
      return loaded.app?.extConfig ?? null;
    } finally {
      process.chdir(originalCwd);
    }
  } catch (err) {
    console.warn(`[cap-electron] Failed to load capacitor config with @capacitor/cli: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
