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
import type { PluginSettings } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Normal npm install: find project root via node_modules boundary in __dirname.
// file:/symlink install: __dirname is outside node_modules, fall back to cwd.
const marker = `${path.sep}node_modules${path.sep}`;
const markerIdx = __dirname.indexOf(marker);
const capacitorRoot = markerIdx >= 0 ? __dirname.slice(0, markerIdx) : process.cwd();
const electronDir = path.join(capacitorRoot, 'electron');

const depRequire = createRequire(import.meta.url);

interface PluginEntry extends PluginSettings {
  packageName: string;
}

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
    "import { registerPlugin, AnyRecord } from '../static/functions';",
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
  // Candidate files where a Vite/Capacitor project keeps ambient references.
  const candidates = [
    path.join(projectRoot, 'src', 'vite-env.d.ts'),
    path.join(projectRoot, 'src', 'env.d.ts'),
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

function main(): void {
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
  const cfg = readCapacitorConfig();
  if (cfg) {
    const filtered: Record<string, unknown> = {};
    if (cfg['appId'])            filtered['appId']            = cfg['appId'];
    if (cfg['appName'])          filtered['appName']          = cfg['appName'];
    if (cfg['webDir'])           filtered['webDir']           = cfg['webDir'];
    if (cfg['backgroundColor'])  filtered['backgroundColor']  = cfg['backgroundColor'];
    const electronPlugin = (cfg['plugins'] as Record<string, unknown> | undefined)?.['Electron'];
    if (electronPlugin) filtered['plugins'] = { Electron: electronPlugin };

    const dest = path.join(electronDir, 'capacitor.config.json');
    fs.writeFileSync(dest, JSON.stringify(filtered, null, 2) + '\n');
    console.log('Written: electron/capacitor.config.json');
  } else {
    console.warn('[cap-electron] Could not read capacitor config — skipping.');
  }
}

main();

// ── Config helpers ────────────────────────────────────────────────────────────

function readCapacitorConfig(): Record<string, unknown> | null {
  if (process.env['CAPACITOR_CONFIG']) {
    try { return JSON.parse(process.env['CAPACITOR_CONFIG']) as Record<string, unknown>; } catch { /* fall through */ }
  }

  const jsonPath = path.join(capacitorRoot, 'capacitor.config.json');
  if (fs.existsSync(jsonPath)) {
    try { return JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Record<string, unknown>; } catch { /* fall through */ }
  }

  for (const ext of ['ts', 'js']) {
    const cfgPath = path.join(capacitorRoot, `capacitor.config.${ext}`);
    if (!fs.existsSync(cfgPath)) continue;
    try {
      const result = tsObjectToJson(fs.readFileSync(cfgPath, 'utf-8'));
      if (result) return result;
      console.warn(`[cap-electron] Could not parse ${path.basename(cfgPath)} — unexpected format.`);
    } catch (err) {
      console.warn(`[cap-electron] Failed to parse ${path.basename(cfgPath)}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return null;
}

function tsObjectToJson(src: string): Record<string, unknown> | null {
  src = src
    // block comments first — may span lines containing import keywords
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // all import statements (regular + type, single-line + multi-line)
    .replace(/import\s+.*?;/gs, '')
    // line comments — negative lookbehind preserves URLs (http://)
    .replace(/(?<!:)\/\/[^\n]*/g, '')
    // type annotation on variable before `=`: `: CapacitorConfig`, `: Partial<Foo>`, `: A & B`
    .replace(/:\s*[\w<>, [\]|&.]+(?=\s*=)/g, '')
    // `as const` and `as TypeName<...>` — type assertions
    .replace(/\bas\s+(?:const|[\w<>, [\]|&.]+)/g, '')
    // `satisfies TypeName<...>`
    .replace(/\bsatisfies\s+[\w<>, [\]|&.]+/g, '')
    // `export default identifier;` — re-exported variable
    .replace(/\bexport\s+default\s+\w+\s*;?/g, '')
    // `export default` keyword before object literal
    .replace(/\bexport\s+default\b/g, '')
    // remaining `export` keyword (export const, export let, export var)
    .replace(/\bexport\b\s*/g, '')
    // variable declaration: `const/let/var name =`
    .replace(/\b(?:const|let|var)\s+\w+\s*=\s*/g, '')
    .trim()
    .replace(/;$/, '');

  const start = src.indexOf('{');
  if (start === -1) return null;
  let depth = 0, end = -1;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;

  let obj = src.slice(start, end + 1);
  obj = obj
    .replace(/'/g, '"')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');

  try {
    return JSON.parse(obj) as Record<string, unknown>;
  } catch {
    return null;
  }
}
