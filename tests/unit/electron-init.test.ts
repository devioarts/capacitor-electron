// Tests for electron-init.js renderer bootstrap behaviour.
import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';
import { describe, expect, it } from 'vitest';

function loadCapacitor(
  fileSrcConfig: unknown,
  invoke: (channel: string, opts: unknown) => unknown = () => undefined,
): Record<string, unknown> {
  const source = readFileSync(join(process.cwd(), 'src/template-electron/src/system/js/electron-init.js'), 'utf-8');
  const context = {
    URL,
    window: {
      _CapElectron: {
        getBuiltinCapacitorConfig: () => ({}),
        getCapacitorFileSrcConfig: () => fileSrcConfig,
        getPluginHeaders: () => [],
        invoke,
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

describe('electron-init nativePromise', () => {
  it('rejects structured plugin failures as Error objects with metadata', async () => {
    const capacitor = loadCapacitor({ enabled: false, roots: [] }, () => Promise.resolve({
      success: false,
      error: {
        code: 'INVALID_PARAMS',
        message: 'Options must be a plain object',
        platform: 'electron',
        method: 'doThing',
        details: { field: 'options' },
      },
    }));

    await expect((capacitor.nativePromise as (plugin: string, method: string, opts: unknown) => Promise<unknown>)(
      'MyPlugin',
      'doThing',
      null,
    )).rejects.toMatchObject({
      message: 'Options must be a plain object',
      code: 'INVALID_PARAMS',
      platform: 'electron',
      method: 'doThing',
      details: { field: 'options' },
    });
  });
});
