import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { clipboard as ElectronClipboard, ipcMain as ElectronIpcMain } from 'electron';

const sampleImage =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';

type PluginHandler = (event: unknown, opts?: Record<string, unknown>) => Promise<unknown>;
type MockElectron = {
  clipboard: typeof ElectronClipboard & { __reset: () => void };
  ipcMain: typeof ElectronIpcMain & {
    __handlers: Map<string, PluginHandler>;
    __reset: () => void;
  };
};

let electron: MockElectron;

async function loadClipboardHandlers(): Promise<{ write: PluginHandler; read: PluginHandler }> {
  electron = await import('electron') as unknown as MockElectron;
  await import('../../src/template-electron/src/system/static/capacitor-api/clipboard-main.js');
  const handlers = electron.ipcMain.__handlers;
  const write = handlers.get('Clipboard-write');
  const read = handlers.get('Clipboard-read');
  if (!write || !read) throw new Error('Clipboard handlers were not registered');
  return { write, read };
}

beforeEach(() => {
  vi.resetModules();
});

describe('Clipboard plugin', () => {
  it('write({ image }) replaces existing text clipboard contents with an image', async () => {
    const { write, read } = await loadClipboardHandlers();

    await write({}, { string: 'old clipboard text' });
    expect(await read({}, {})).toEqual({ value: 'old clipboard text', type: 'text/plain' });

    await write({}, { image: sampleImage });

    expect(await read({}, {})).toEqual({ value: sampleImage, type: 'image/png' });
    expect(electron.clipboard.readText()).toBe('');
  });

  it('rejects invalid image data URLs without changing the clipboard', async () => {
    const { write, read } = await loadClipboardHandlers();

    await write({}, { string: 'keep me' });
    const result = await write({}, { image: 'not an image' });

    expect(result).toMatchObject({
      success: false,
      error: { message: 'Clipboard image must be a valid data URL' },
    });
    expect(await read({}, {})).toEqual({ value: 'keep me', type: 'text/plain' });
  });
});
