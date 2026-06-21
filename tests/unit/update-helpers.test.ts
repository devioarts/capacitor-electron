// Tests for update-helpers.ts — K-1 security fix: validation of plugin-settings
// loaded from third-party packages before they are used for code generation.
//
// Key invariants:
//  - assertJsIdentifier blocks prototype pollution, path-traversal-like names, code injection
//  - assertSafeString blocks control characters and oversized values
//  - assertPackageName blocks packages with unsafe names
//  - validatePluginSettings rejects every malicious permutation
//  - isInsideDir blocks path traversal
//  - Code generators produce structurally correct TypeScript output
import { describe, it, expect } from 'vitest';
import {
  assertJsIdentifier,
  assertSafeString,
  assertStringArray,
  assertIdentifierArray,
  assertPackageName,
  validatePluginSettings,
  isInsideDir,
  generateElectronPluginsAuto,
  generateElectronMainAuto,
} from '../../src/cli/update-helpers.js';

const PKG = '@scope/my-plugin';

// ── assertJsIdentifier ─────────────────────────────────────────────────────────

describe('assertJsIdentifier — valid identifiers', () => {
  it('accepts simple camelCase identifier', () => {
    expect(assertJsIdentifier('MyPlugin', 'pluginClass', PKG)).toBe('MyPlugin');
  });

  it('accepts identifier starting with underscore', () => {
    expect(assertJsIdentifier('_Private', 'f', PKG)).toBe('_Private');
  });

  it('accepts identifier starting with dollar sign', () => {
    expect(assertJsIdentifier('$Plugin', 'f', PKG)).toBe('$Plugin');
  });

  it('accepts identifier with digits (not first char)', () => {
    expect(assertJsIdentifier('Plugin2', 'f', PKG)).toBe('Plugin2');
  });
});

describe('assertJsIdentifier — invalid identifiers (must throw)', () => {
  it('throws for non-string (null)', () => {
    expect(() => assertJsIdentifier(null, 'pluginClass', PKG)).toThrow('must be a JavaScript identifier');
  });

  it('throws for non-string (number)', () => {
    expect(() => assertJsIdentifier(42, 'pluginClass', PKG)).toThrow('must be a JavaScript identifier');
  });

  it('throws for name starting with a digit', () => {
    expect(() => assertJsIdentifier('1Plugin', 'pluginClass', PKG)).toThrow('must be a JavaScript identifier');
  });

  it('throws for name with hyphen', () => {
    expect(() => assertJsIdentifier('My-Plugin', 'pluginClass', PKG)).toThrow('must be a JavaScript identifier');
  });

  it('throws for empty string', () => {
    expect(() => assertJsIdentifier('', 'pluginClass', PKG)).toThrow('must be a JavaScript identifier');
  });

  it('throws for name with space', () => {
    expect(() => assertJsIdentifier('My Plugin', 'pluginClass', PKG)).toThrow('must be a JavaScript identifier');
  });

  it('throws for name with backtick (template literal injection)', () => {
    expect(() => assertJsIdentifier('Plugin`injection`', 'pluginClass', PKG)).toThrow('must be a JavaScript identifier');
  });
});

// ── assertSafeString ───────────────────────────────────────────────────────────

describe('assertSafeString — valid strings', () => {
  it('accepts a plain event name', () => {
    expect(assertSafeString('myEvent', 'field', PKG)).toBe('myEvent');
  });

  it('accepts string up to MAX_PLUGIN_STRING_LENGTH (128)', () => {
    const s = 'a'.repeat(128);
    expect(assertSafeString(s, 'field', PKG)).toBe(s);
  });
});

describe('assertSafeString — invalid strings (must throw)', () => {
  it('throws for empty string', () => {
    expect(() => assertSafeString('', 'field', PKG)).toThrow('non-empty string');
  });

  it('throws for string longer than 128 chars', () => {
    expect(() => assertSafeString('a'.repeat(129), 'field', PKG)).toThrow('non-empty string');
  });

  it('throws for string with null byte', () => {
    expect(() => assertSafeString('event\x00name', 'field', PKG)).toThrow('non-empty string');
  });

  it('throws for string with newline (control char)', () => {
    expect(() => assertSafeString('event\nname', 'field', PKG)).toThrow('non-empty string');
  });

  it('throws for non-string value', () => {
    expect(() => assertSafeString(42, 'field', PKG)).toThrow('non-empty string');
  });
});

// ── assertStringArray ──────────────────────────────────────────────────────────

describe('assertStringArray', () => {
  it('accepts a valid array of strings', () => {
    expect(assertStringArray(['onChange', 'onError'], 'pluginEvents', PKG))
      .toEqual(['onChange', 'onError']);
  });

  it('throws when value is not an array', () => {
    expect(() => assertStringArray('notAnArray', 'pluginEvents', PKG)).toThrow('must be an array');
  });

  it('throws when array contains an invalid element', () => {
    expect(() => assertStringArray(['valid', 42], 'pluginEvents', PKG)).toThrow('non-empty string');
  });
});

// ── assertIdentifierArray ──────────────────────────────────────────────────────

describe('assertIdentifierArray', () => {
  it('returns empty array for undefined', () => {
    expect(assertIdentifierArray(undefined, 'pluginMethods', PKG)).toEqual([]);
  });

  it('accepts valid identifier array', () => {
    expect(assertIdentifierArray(['getInfo', 'doSomething'], 'pluginMethods', PKG))
      .toEqual(['getInfo', 'doSomething']);
  });

  it('throws for non-array value', () => {
    expect(() => assertIdentifierArray('getInfo', 'pluginMethods', PKG)).toThrow('must be an array');
  });

  it('throws when array contains invalid identifier', () => {
    expect(() => assertIdentifierArray(['valid', '1bad'], 'pluginMethods', PKG))
      .toThrow('must be a JavaScript identifier');
  });
});

// ── assertPackageName ──────────────────────────────────────────────────────────

describe('assertPackageName — valid names', () => {
  it('accepts simple package name', () => {
    expect(assertPackageName('my-plugin')).toBe('my-plugin');
  });

  it('accepts scoped package name', () => {
    expect(assertPackageName('@scope/my-plugin')).toBe('@scope/my-plugin');
  });
});

describe('assertPackageName — invalid names (must throw)', () => {
  it('throws for name with path traversal (../)', () => {
    expect(() => assertPackageName('../evil')).toThrow('invalid npm package name');
  });

  it('throws for name with capital letters in scope', () => {
    expect(() => assertPackageName('@SCOPE/plugin')).toThrow('invalid npm package name');
  });

  it('throws for name with spaces', () => {
    expect(() => assertPackageName('my plugin')).toThrow('invalid npm package name');
  });

  it('throws for empty string', () => {
    expect(() => assertPackageName('')).toThrow('invalid npm package name');
  });
});

// ── validatePluginSettings ────────────────────────────────────────────────────

describe('validatePluginSettings — valid settings', () => {
  it('accepts minimal valid settings (pluginClass + pluginMethods)', () => {
    const result = validatePluginSettings(PKG, {
      pluginClass: 'MyPlugin',
      pluginMethods: ['getInfo', 'doWork'],
    });
    expect(result.pluginClass).toBe('MyPlugin');
    expect(result.pluginMethods).toEqual(['getInfo', 'doWork']);
  });

  it('accepts full settings with optional fields', () => {
    const result = validatePluginSettings(PKG, {
      pluginClass: 'FullPlugin',
      pluginMethods: ['run'],
      pluginEvents: ['onChange'],
      autoRegister: true,
      configSections: ['FullPlugin'],
    });
    expect(result.pluginEvents).toEqual(['onChange']);
    expect(result.autoRegister).toBe(true);
    expect(result.configSections).toEqual(['FullPlugin']);
  });

  it('omits undefined optional fields from result', () => {
    const result = validatePluginSettings(PKG, {
      pluginClass: 'Minimal',
      pluginMethods: ['run'],
    });
    expect('pluginEvents' in result).toBe(false);
    expect('autoRegister' in result).toBe(false);
    expect('configSections' in result).toBe(false);
  });
});

describe('validatePluginSettings — invalid settings (must throw)', () => {
  it('throws when raw is null', () => {
    expect(() => validatePluginSettings(PKG, null)).toThrow('pluginSettings must be an object');
  });

  it('throws when raw is a string (not an object)', () => {
    expect(() => validatePluginSettings(PKG, 'evil')).toThrow('pluginSettings must be an object');
  });

  it('throws when pluginClass is missing', () => {
    expect(() => validatePluginSettings(PKG, { pluginMethods: ['run'] }))
      .toThrow('must be a JavaScript identifier');
  });

  it('throws when pluginClass is not a valid identifier', () => {
    expect(() => validatePluginSettings(PKG, { pluginClass: '1BadClass', pluginMethods: ['run'] }))
      .toThrow('must be a JavaScript identifier');
  });

  it('throws when pluginMethods is empty array', () => {
    expect(() => validatePluginSettings(PKG, { pluginClass: 'MyPlugin', pluginMethods: [] }))
      .toThrow('pluginMethods must not be empty');
  });

  it('throws when pluginMethods contains an invalid identifier', () => {
    expect(() => validatePluginSettings(PKG, { pluginClass: 'MyPlugin', pluginMethods: ['valid', 'bad-method'] }))
      .toThrow('must be a JavaScript identifier');
  });

  it('throws when autoRegister is not a boolean', () => {
    expect(() => validatePluginSettings(PKG, { pluginClass: 'MyPlugin', pluginMethods: ['run'], autoRegister: 'yes' }))
      .toThrow('autoRegister must be a boolean');
  });

  it('throws when pluginEvents contains a string with control chars', () => {
    expect(() => validatePluginSettings(PKG, {
      pluginClass: 'MyPlugin',
      pluginMethods: ['run'],
      pluginEvents: ['event\x00inject'],
    })).toThrow('non-empty string');
  });
});

// ── isInsideDir ────────────────────────────────────────────────────────────────

describe('isInsideDir', () => {
  it('returns true when child is directly inside parent', () => {
    expect(isInsideDir('/root/pkg', '/root/pkg/dist/plugin-settings.js')).toBe(true);
  });

  it('returns true when child equals parent (empty relative)', () => {
    expect(isInsideDir('/root/pkg', '/root/pkg')).toBe(true);
  });

  it('returns false for path traversal escape (../)', () => {
    expect(isInsideDir('/root/pkg', '/root/evil.js')).toBe(false);
  });

  it('returns false for absolute path outside parent', () => {
    expect(isInsideDir('/root/pkg', '/etc/passwd')).toBe(false);
  });

  it('returns false when child path starts with ..', () => {
    expect(isInsideDir('/root/pkg', '/root/pkg/../other/file.js')).toBe(false);
  });
});

// ── generateElectronPluginsAuto ────────────────────────────────────────────────

describe('generateElectronPluginsAuto', () => {
  it('produces valid TypeScript with pluginsAuto export', () => {
    const output = generateElectronPluginsAuto([
      { packageName: 'my-plugin', pluginClass: 'MyPlugin', pluginMethods: ['getInfo', 'doWork'] },
    ]);
    expect(output).toContain('export const pluginsAuto = {');
    expect(output).toContain('"MyPlugin"');
    expect(output).toContain('"getInfo"');
    expect(output).toContain('export type PluginAutoRegistry = typeof pluginsAuto;');
  });

  it('includes events when pluginEvents is present', () => {
    const output = generateElectronPluginsAuto([
      { packageName: 'my-plugin', pluginClass: 'MyPlugin', pluginMethods: ['run'], pluginEvents: ['onChange'] },
    ]);
    expect(output).toContain('"onChange"');
    expect(output).toContain('events:');
  });

  it('omits events block when no pluginEvents', () => {
    const output = generateElectronPluginsAuto([
      { packageName: 'my-plugin', pluginClass: 'MyPlugin', pluginMethods: ['run'] },
    ]);
    expect(output).not.toContain('events:');
  });

  it('emits a comment when no plugins found', () => {
    const output = generateElectronPluginsAuto([]);
    expect(output).toContain('no Capacitor Electron plugins found');
  });

  it('contains auto-generated header', () => {
    const output = generateElectronPluginsAuto([]);
    expect(output).toContain('// Auto-generated');
  });
});

// ── generateElectronMainAuto ───────────────────────────────────────────────────

describe('generateElectronMainAuto', () => {
  it('produces import statements for each auto plugin', () => {
    const output = generateElectronMainAuto([
      { packageName: 'my-plugin', pluginClass: 'MyPlugin', pluginMethods: ['run'] },
    ]);
    expect(output).toContain("import { MyPlugin } from \"my-plugin/electron\"");
  });

  it('produces registerPlugin call for each plugin', () => {
    const output = generateElectronMainAuto([
      { packageName: 'my-plugin', pluginClass: 'MyPlugin', pluginMethods: ['run', 'stop'] },
    ]);
    expect(output).toContain('registerPlugin("MyPlugin"');
    expect(output).toContain('"run"');
    expect(output).toContain('"stop"');
  });

  it('skips plugin with autoRegister=false', () => {
    const output = generateElectronMainAuto([
      { packageName: 'manual-plugin', pluginClass: 'ManualPlugin', pluginMethods: ['run'], autoRegister: false },
      { packageName: 'auto-plugin',   pluginClass: 'AutoPlugin',   pluginMethods: ['run'] },
    ]);
    expect(output).not.toContain('ManualPlugin');
    expect(output).toContain('AutoPlugin');
  });

  it('emits a comment when all plugins are skipped', () => {
    const output = generateElectronMainAuto([
      { packageName: 'p', pluginClass: 'P', pluginMethods: ['run'], autoRegister: false },
    ]);
    expect(output).toContain('no Capacitor Electron plugins found');
  });

  it('wraps registration in async IIFE awaiting app.whenReady()', () => {
    const output = generateElectronMainAuto([
      { packageName: 'my-plugin', pluginClass: 'MyPlugin', pluginMethods: ['run'] },
    ]);
    expect(output).toContain('await app.whenReady()');
    expect(output).toContain('void (async () => {');
  });
});
