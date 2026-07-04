// Tests for electron-init.js renderer bootstrap behaviour.
import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';
import { describe, expect, it } from 'vitest';

function loadCapacitor(fileSrcConfig: unknown): Record<string, unknown> {
  const source = readFileSync(join(process.cwd(), 'src/template-electron/src/system/js/electron-init.js'), 'utf-8');
  const context = {
    URL,
    window: {
      _CapElectron: {
        getBuiltinCapacitorConfig: () => ({}),
        getCapacitorFileSrcConfig: () => fileSrcConfig,
        getPluginHeaders: () => [],
        invoke: () => undefined,
        nativeCallback: () => undefined,
      },
    },
  };

  vm.runInNewContext(source, context);
  return context.window.Capacitor as Record<string, unknown>;
}

describe('electron-init convertFileSrc', () => {
  it('maps known file:// roots to the configured app protocol URL', () => {
    const capacitor = loadCapacitor({
      enabled: true,
      roots: [{
        name: 'data',
        fileUrlPrefix: 'file:///Users/example/AppData/',
        urlPrefix: 'capacitor-electron://localhost/_capacitor_file_/data/',
      }],
    });

    expect((capacitor.convertFileSrc as (value: string) => string)('file:///Users/example/AppData/images/a%20b.png'))
      .toBe('capacitor-electron://localhost/_capacitor_file_/data/images/a%20b.png');
  });

  it('keeps the previous no-op behaviour when file src mapping is disabled', () => {
    const capacitor = loadCapacitor({ enabled: false, roots: [] });

    expect((capacitor.convertFileSrc as (value: string) => string)('file:///Users/example/AppData/images/a.png'))
      .toBe('file:///Users/example/AppData/images/a.png');
  });
});
