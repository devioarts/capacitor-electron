// E2E smoke tests — launch the playground Electron app and verify the bridge.
//
// Prerequisites (run once before these tests):
//   npm run build
//   cd playground && npx cap-electron add && npm run build
//
// The playground must be running in dev mode (cap-electron run / cap-electron open)
// OR the web dist must be served another way — isDev=true so app loads from localhost:5173.
import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ELECTRON_MAIN = path.join(__dirname, '../../playground/electron/dist/main.cjs');
const ELECTRON_CWD  = path.join(__dirname, '../../playground/electron');

type CapElectronBridge = {
  invoke: (channel: string, options?: unknown) => Promise<unknown>;
};

type ManagedWindowInfo = {
  id: number;
  title: string;
  isVisible: boolean;
  isDestroyed: boolean;
};

type ElectronBridgeForE2E = {
  autoLaunch: {
    isEnabled: () => Promise<boolean>;
    getSettings: () => Promise<unknown>;
  };
  getAllDisplays: () => Promise<unknown[]>;
  getPowerMonitorIdleState: (idleThreshold: number) => Promise<string>;
  getPowerMonitorIdleTime: () => Promise<number>;
  session: {
    getUserAgent: () => Promise<string>;
    resolveProxy: (url: string) => Promise<string>;
  };
  windows: {
    create: (options?: unknown) => Promise<ManagedWindowInfo>;
    list: () => Promise<ManagedWindowInfo[]>;
    close: (id: number) => Promise<void>;
    hide: (id: number) => Promise<void>;
    show: (id: number) => Promise<void>;
    setBounds: (id: number, bounds: { x: number; y: number; width: number; height: number }) => Promise<void>;
    openExternal: (url: string) => Promise<void>;
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function launchApp(): Promise<ElectronApplication> {
  // Use a unique user-data-dir per test run so the single-instance lock
  // does not conflict with a developer's live `cap-electron run` session.
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-e2e-'));
  const app = await electron.launch({
    args: [ELECTRON_MAIN, `--user-data-dir=${userData}`],
    cwd: ELECTRON_CWD,
    env: { ...process.env, NODE_ENV: 'test' },
  });
  app.process().once('exit', () => {
    try { fs.rmSync(userData, { recursive: true, force: true }); } catch { /* ignore */ }
  });
  return app;
}

/**
 * Find the main app window (the one that has the `window.Electron` bridge).
 * Skips the splash window which is created first and has no preload.
 */
async function getMainPage(app: ElectronApplication): Promise<Page> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    for (const win of app.windows()) {
      try {
        await win.waitForLoadState('domcontentloaded', { timeout: 3_000 });
        const ok = await win.evaluate(() => typeof (window as unknown as { Electron: unknown }).Electron !== 'undefined').catch(() => false);
        if (ok) return win;
      } catch { /* try next window */ }
    }
    await new Promise<void>((r) => setTimeout(r, 300));
  }
  throw new Error('Timed out waiting for window with Electron bridge (is the Vite dev server running?)');
}

// ── Bridge availability ───────────────────────────────────────────────────────

test('app launches and window.Electron bridge is available', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const hasElectronBridge = await page.evaluate(
      () => typeof (window as unknown as { Electron: unknown }).Electron !== 'undefined',
    );
    expect(hasElectronBridge).toBe(true);
  } finally {
    await app.close();
  }
});

test('window.Electron exposes all expected top-level namespaces', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const keys = await page.evaluate(
      () => Object.keys((window as unknown as { Electron: Record<string, unknown> }).Electron ?? {}),
    );
    const required = [
      'minimize', 'maximize', 'quit', 'reload', 'getAppVersion',
      'dialogs', 'secureStorage', 'session', 'downloads',
      'nativeTheme', 'windows', 'autoLaunch',
    ];
    for (const key of required) {
      expect(keys).toContain(key);
    }
  } finally {
    await app.close();
  }
});

// ── Preferences bridge ────────────────────────────────────────────────────────

test('Capacitor Preferences: set and get round-trips a value', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);

    // Use _CapElectron IPC bridge directly — bare ESM specifiers can't be
    // dynamically imported inside page.evaluate without the Vite bundler.
    const result = await page.evaluate(async () => {
      const api = (window as unknown as { _CapElectron: { invoke: (ch: string, opts: unknown) => Promise<unknown> } })._CapElectron;
      await api.invoke('Preferences-set', { key: 'e2e-test', value: 'hello-playwright' });
      const res = await api.invoke('Preferences-get', { key: 'e2e-test' }) as { value: string | null };
      await api.invoke('Preferences-remove', { key: 'e2e-test' });
      return res.value;
    });
    expect(result).toBe('hello-playwright');
  } finally {
    await app.close();
  }
});

// ── IPC security ──────────────────────────────────────────────────────────────

test('window.Electron.getAppVersion() returns a semver string', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const version = await page.evaluate(
      async () => (window as unknown as { Electron: { getAppVersion: () => Promise<string> } }).Electron.getAppVersion(),
    );
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  } finally {
    await app.close();
  }
});

test('window.Electron.nativeTheme.get() returns a theme object', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const theme = await page.evaluate(
      async () => (window as unknown as { Electron: { nativeTheme: { get: () => Promise<{ themeSource: string; shouldUseDarkColors: boolean }> } } }).Electron.nativeTheme.get(),
    );
    expect(theme).toHaveProperty('themeSource');
    expect(theme).toHaveProperty('shouldUseDarkColors');
  } finally {
    await app.close();
  }
});

// ── Window controls ───────────────────────────────────────────────────────────

test('isMaximized() returns false on a normal launch', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const maximized = await page.evaluate(
      async () => (window as unknown as { Electron: { isMaximized: () => Promise<boolean> } }).Electron.isMaximized(),
    );
    expect(maximized).toBe(false);
  } finally {
    await app.close();
  }
});

test('isFullscreen() returns false on a normal launch', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const fullscreen = await page.evaluate(
      async () => (window as unknown as { Electron: { isFullscreen: () => Promise<boolean> } }).Electron.isFullscreen(),
    );
    expect(fullscreen).toBe(false);
  } finally {
    await app.close();
  }
});

// ── Secure storage ────────────────────────────────────────────────────────────

test('isEncryptionAvailable() returns a boolean', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const available = await page.evaluate(
      async () => (window as unknown as { Electron: { secureStorage: { isEncryptionAvailable: () => Promise<boolean> } } }).Electron.secureStorage.isEncryptionAvailable(),
    );
    expect(typeof available).toBe('boolean');
  } finally {
    await app.close();
  }
});

// ── Managed windows ───────────────────────────────────────────────────────────

test('managed internal app window can be created, listed, resized, hidden, shown, and closed', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async () => {
      const Electron = (window as unknown as { Electron: ElectronBridgeForE2E }).Electron;
      const created = await Electron.windows.create({
        appPath: '#/',
        title: 'E2E internal managed window',
        width: 640,
        height: 480,
      });
      await Electron.windows.setBounds(created.id, { x: 40, y: 40, width: 640, height: 480 });
      await Electron.windows.hide(created.id);
      const hidden = (await Electron.windows.list()).find((win) => win.id === created.id);
      await Electron.windows.show(created.id);
      const shown = (await Electron.windows.list()).find((win) => win.id === created.id);
      await Electron.windows.close(created.id);
      const remaining = await Electron.windows.list();
      return {
        created,
        hidden,
        shown,
        stillListedAfterClose: remaining.some((win) => win.id === created.id),
      };
    });

    expect(result.created.id).toBeGreaterThan(0);
    expect(result.hidden?.isVisible).toBe(false);
    expect(result.shown?.isVisible).toBe(true);
    expect(result.stillListedAfterClose).toBe(false);
  } finally {
    await app.close();
  }
});

test('managed external URL windows reject unsafe URL schemes', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const errors = await page.evaluate(async () => {
      const Electron = (window as unknown as { Electron: ElectronBridgeForE2E }).Electron;
      const attempts = [
        Electron.windows.create({ url: 'file:///etc/passwd' }),
        Electron.windows.create({ url: 'javascript:alert(1)' }),
        Electron.windows.openExternal('javascript:alert(1)'),
      ];
      return Promise.all(attempts.map((attempt) => attempt.then(
        () => 'resolved',
        (error) => String((error as Error).message ?? error),
      )));
    });

    for (const message of errors) {
      expect(message).toContain('Unsupported external URL protocol');
    }
  } finally {
    await app.close();
  }
});

// ── Capacitor URL policy bridges ──────────────────────────────────────────────

test('Browser bridge rejects unsafe URLs', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async () => {
      const api = (window as unknown as { _CapElectron: CapElectronBridge })._CapElectron;
      const rejected = await api.invoke('Browser-open', { url: 'javascript:alert(1)' }).then(
        () => 'resolved',
        (error) => String((error as Error).message ?? error),
      );
      return { rejected };
    });

    expect(result.rejected).toContain('Browser.open only supports http/https URLs');
  } finally {
    await app.close();
  }
});

test('AppLauncher bridge allows declared schemes and blocks dangerous schemes', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async () => {
      const api = (window as unknown as { _CapElectron: CapElectronBridge })._CapElectron;
      const http = await api.invoke('AppLauncher-canOpenUrl', { url: 'https://example.com/' }) as { value: boolean };
      const declared = await api.invoke('AppLauncher-canOpenUrl', { url: 'capelectron://test' }) as { value: boolean };
      const blocked = await api.invoke('AppLauncher-canOpenUrl', { url: 'javascript:alert(1)' }) as { value: boolean };
      const blockedOpen = await api.invoke('AppLauncher-openUrl', { url: 'javascript:alert(1)' }) as { completed: boolean };
      return { http, declared, blocked, blockedOpen };
    });

    expect(result.http.value).toBe(true);
    expect(result.declared.value).toBe(true);
    expect(result.blocked.value).toBe(false);
    expect(result.blockedOpen.completed).toBe(false);
  } finally {
    await app.close();
  }
});

// ── Stable desktop bridge smoke tests ─────────────────────────────────────────

test('session bridge exposes user agent and proxy resolution', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async () => {
      const Electron = (window as unknown as { Electron: ElectronBridgeForE2E }).Electron;
      return {
        userAgent: await Electron.session.getUserAgent(),
        proxy: await Electron.session.resolveProxy('https://example.com/'),
      };
    });

    expect(result.userAgent).toContain('Electron');
    expect(typeof result.proxy).toBe('string');
  } finally {
    await app.close();
  }
});

test('autoLaunch, screen, and power monitor bridges return stable value shapes', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async () => {
      const Electron = (window as unknown as { Electron: ElectronBridgeForE2E }).Electron;
      return {
        autoLaunchEnabled: await Electron.autoLaunch.isEnabled(),
        autoLaunchSettings: await Electron.autoLaunch.getSettings(),
        displays: await Electron.getAllDisplays(),
        idleState: await Electron.getPowerMonitorIdleState(1),
        idleTime: await Electron.getPowerMonitorIdleTime(),
      };
    });

    expect(typeof result.autoLaunchEnabled).toBe('boolean');
    expect(typeof result.autoLaunchSettings).toBe('object');
    expect(Array.isArray(result.displays)).toBe(true);
    expect(result.displays.length).toBeGreaterThan(0);
    expect(['active', 'idle', 'locked', 'unknown']).toContain(result.idleState);
    expect(Number.isInteger(result.idleTime)).toBe(true);
    expect(result.idleTime).toBeGreaterThanOrEqual(0);
  } finally {
    await app.close();
  }
});
