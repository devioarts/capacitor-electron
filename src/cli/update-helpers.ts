// Pure helpers for the cap-electron sync command.
// Extracted to a separate module so they can be unit-tested without triggering
// the CLI top-level side effects in update.ts (filesystem checks, process.exit).
import * as path from 'path';
import type { PluginSettings } from '../shared/plugin-settings.js';

export const JS_IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
export const NPM_PACKAGE_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
export const MAX_PLUGIN_STRING_LENGTH = 128;

export type MutableRecord = Record<string, unknown>;
export type RequiredPluginSettings = Pick<PluginSettings, 'pluginClass' | 'pluginMethods'>;

export interface PluginEntry extends PluginSettings {
  packageName: string;
}

export function assertJsIdentifier(value: unknown, field: string, packageName: string): string {
  if (typeof value !== 'string' || !JS_IDENTIFIER_RE.test(value)) {
    throw new Error(`${packageName}: ${field} must be a JavaScript identifier`);
  }
  return value;
}

export function assertSafeString(value: unknown, field: string, packageName: string): string {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > MAX_PLUGIN_STRING_LENGTH
    || /[\x00-\x1f\x7f]/.test(value)
  ) {
    throw new Error(`${packageName}: ${field} must be a non-empty string without control characters`);
  }
  return value;
}

export function assertStringArray(value: unknown, field: string, packageName: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${packageName}: ${field} must be an array`);
  return value.map((item, index) => assertSafeString(item, `${field}[${index}]`, packageName));
}

export function assertIdentifierArray(value: unknown, field: string, packageName: string): readonly string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${packageName}: ${field} must be an array`);
  return value.map((item, index) => assertJsIdentifier(item, `${field}[${index}]`, packageName));
}

export function assertPackageName(value: string): string {
  if (!NPM_PACKAGE_RE.test(value)) throw new Error(`${value}: invalid npm package name`);
  return value;
}

export function isRecord(value: unknown): value is MutableRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isInsideDir(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

export function validatePluginSettings(packageName: string, raw: unknown): PluginSettings & RequiredPluginSettings {
  if (!isRecord(raw)) throw new Error(`${packageName}: pluginSettings must be an object`);

  const pluginClass = assertJsIdentifier(raw['pluginClass'], 'pluginClass', packageName);
  const pluginMethods = assertIdentifierArray(raw['pluginMethods'], 'pluginMethods', packageName);
  if (pluginMethods.length === 0) throw new Error(`${packageName}: pluginMethods must not be empty`);

  const pluginEvents = raw['pluginEvents'] === undefined
    ? undefined
    : assertStringArray(raw['pluginEvents'], 'pluginEvents', packageName);
  const configSections = raw['configSections'] === undefined
    ? undefined
    : assertIdentifierArray(raw['configSections'], 'configSections', packageName);
  const autoRegister = raw['autoRegister'];
  if (autoRegister !== undefined && typeof autoRegister !== 'boolean') {
    throw new Error(`${packageName}: autoRegister must be a boolean`);
  }

  return {
    pluginClass,
    pluginMethods,
    ...(pluginEvents && pluginEvents.length > 0 ? { pluginEvents } : {}),
    ...(typeof autoRegister === 'boolean' ? { autoRegister } : {}),
    ...(configSections && configSections.length > 0 ? { configSections } : {}),
  };
}

export function generateElectronPluginsAuto(plugins: PluginEntry[]): string {
  const lines = [
    '// Auto-generated — do not edit.',
    '// Regenerate with: cap-electron sync',
    '',
    'export const pluginsAuto = {',
  ];

  for (const { pluginClass, pluginMethods, pluginEvents } of plugins) {
    lines.push(`  ${JSON.stringify(pluginClass)}: {`);
    lines.push(`    methods: ${JSON.stringify(pluginMethods)},`);
    if (pluginEvents?.length) {
      lines.push(`    events: ${JSON.stringify(pluginEvents)},`);
    }
    lines.push(`  },`);
  }

  if (plugins.length === 0) lines.push('  // no Capacitor Electron plugins found');

  lines.push('} as const;', '', 'export type PluginAutoRegistry = typeof pluginsAuto;');

  return lines.join('\n') + '\n';
}

export function generateElectronMainAuto(plugins: PluginEntry[]): string {
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

  for (const { packageName, pluginClass } of autoPlugins) {
    parts.push(`import { ${pluginClass} } from ${JSON.stringify(`${packageName}/electron`)};`);
  }

  parts.push('', 'void (async () => {', '  await app.whenReady();');

  for (const { pluginClass, pluginMethods } of autoPlugins) {
    parts.push(`  registerPlugin(${JSON.stringify(pluginClass)}, new ${pluginClass}() as unknown as AnyRecord, ${JSON.stringify(pluginMethods)});`);
  }

  parts.push('})();');

  return parts.join('\n') + '\n';
}
