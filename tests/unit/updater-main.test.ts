// Tests for updater-main.ts — setupUpdater (M-6 fix: dev guard).
// Key invariant: autoUpdater is NEVER configured when app.isPackaged === false
// or when cfg.app.autoUpdater.enabled !== true.  No-op IPC handlers must be
// registered in all inactive cases so renderer calls don't throw.
import { vi, describe, it, expect, beforeEach } from 'vitest';

// electron-updater is resolved via vitest.config alias → tests/__mocks__/electron-updater.ts
// Both this test file AND updater-main.ts see the same object.
import { autoUpdater } from '../../tests/__mocks__/electron-updater.js';

// ── electron mock ─────────────────────────────────────────────────────────────

const { mockIsPackaged, mockIpcHandle } = vi.hoisted(() => ({
  mockIsPackaged: { value: false },
  mockIpcHandle: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    get isPackaged() { return mockIsPackaged.value; },
    getPath: () => '/tmp/updater-test',
    getName: () => 'TestApp',
    on: () => {},
  },
  BrowserWindow: class {
    static getAllWindows() { return []; }
    isDestroyed() { return false; }
    get webContents() { return { send: () => {} }; }
  },
  ipcMain: { handle: mockIpcHandle, on: vi.fn() },
}));

import { setupUpdater } from '../../src/template-electron/src/system/static/electron-api/updater-main.js';
import type { ElectronConfig } from '../../src/template-electron/src/system/shared/types.js';

beforeEach(() => {
  mockIsPackaged.value = false;
  mockIpcHandle.mockReset();
  // Reset autoUpdater state to initial values
  autoUpdater.channel = 'latest';
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  vi.spyOn(autoUpdater, 'on').mockReset();
});

// ── inactive path (no-op handlers) ───────────────────────────────────────────

describe('setupUpdater — inactive (dev guard, M-6 fix)', () => {
  it('registers no-op handlers when app.isPackaged is false', () => {
    setupUpdater({ app: { autoUpdater: { enabled: true } } });
    const channels = mockIpcHandle.mock.calls.map((c) => c[0] as string);
    expect(channels).toContain('updater:checkForUpdate');
    expect(channels).toContain('updater:downloadUpdate');
    expect(channels).toContain('updater:quitAndInstall');
  });

  it('does NOT configure autoUpdater properties when inactive', () => {
    setupUpdater({ app: { autoUpdater: { enabled: true, channel: 'beta' } } });
    // channel must remain untouched since the active branch was skipped
    expect(autoUpdater.channel).toBe('latest');
  });

  it('does NOT attach autoUpdater event listeners when inactive', () => {
    const onSpy = vi.spyOn(autoUpdater, 'on');
    setupUpdater({ app: { autoUpdater: { enabled: true } } });
    expect(onSpy).not.toHaveBeenCalled();
  });

  it('no-op handlers are registered even when enabled is absent', () => {
    setupUpdater({});
    const channels = mockIpcHandle.mock.calls.map((c) => c[0] as string);
    expect(channels).toContain('updater:checkForUpdate');
  });

  it('no-op handlers are registered when enabled is false', () => {
    setupUpdater({ app: { autoUpdater: { enabled: false } } });
    const channels = mockIpcHandle.mock.calls.map((c) => c[0] as string);
    expect(channels).toContain('updater:checkForUpdate');
  });

  it('no-op checkForUpdate handler resolves without throwing', async () => {
    setupUpdater({});
    const handler = mockIpcHandle.mock.calls.find((c) => c[0] === 'updater:checkForUpdate')?.[1] as () => unknown;
    await expect(Promise.resolve(handler())).resolves.not.toThrow();
  });

  it('no-op downloadUpdate handler resolves without throwing', async () => {
    setupUpdater({});
    const handler = mockIpcHandle.mock.calls.find((c) => c[0] === 'updater:downloadUpdate')?.[1] as () => unknown;
    await expect(Promise.resolve(handler())).resolves.not.toThrow();
  });
});

// ── active path (packaged) ────────────────────────────────────────────────────

describe('setupUpdater — active (app.isPackaged=true, enabled=true)', () => {
  const activeCfg: ElectronConfig = {
    app: {
      autoUpdater: {
        enabled: true,
        channel: 'beta',
        autoDownload: true,
        autoInstallOnQuit: false,
        allowPrerelease: true,
        allowDowngrade: false,
      },
    },
  };

  beforeEach(() => { mockIsPackaged.value = true; });

  it('applies channel from config', () => {
    setupUpdater(activeCfg);
    expect(autoUpdater.channel).toBe('beta');
  });

  it('applies autoDownload from config', () => {
    setupUpdater(activeCfg);
    expect(autoUpdater.autoDownload).toBe(true);
  });

  it('applies allowPrerelease from config', () => {
    setupUpdater(activeCfg);
    expect(autoUpdater.allowPrerelease).toBe(true);
  });

  it('registers real (non-no-op) IPC handlers', () => {
    setupUpdater(activeCfg);
    const channels = mockIpcHandle.mock.calls.map((c) => c[0] as string);
    expect(channels).toContain('updater:checkForUpdate');
    expect(channels).toContain('updater:downloadUpdate');
    expect(channels).toContain('updater:quitAndInstall');
  });

  it('attaches autoUpdater event listeners for progress broadcasts', () => {
    const onSpy = vi.spyOn(autoUpdater, 'on');
    setupUpdater(activeCfg);
    const events = onSpy.mock.calls.map((c) => c[0] as string);
    expect(events).toContain('update-available');
    expect(events).toContain('download-progress');
    expect(events).toContain('update-downloaded');
    expect(events).toContain('error');
  });

  it('uses "latest" channel when none specified', () => {
    setupUpdater({ app: { autoUpdater: { enabled: true } } });
    expect(autoUpdater.channel).toBe('latest');
  });
});
