// E2E smoke tests — launch the playground Electron app and verify the bridge.
// `npm run test:e2e` prepares the playground and starts the Vite dev server.
import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { createServer, type Server } from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ELECTRON_MAIN = path.join(__dirname, '../../playground/electron/dist/main.cjs');
const ELECTRON_CWD  = path.join(__dirname, '../../playground/electron');
const DEV_SERVER_URL = 'http://localhost:5173';

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
  nativeTheme: {
    get: () => Promise<{ themeSource: string; shouldUseDarkColors: boolean }>;
    setThemeSource: (source: 'system' | 'light' | 'dark') => Promise<void>;
  };
  print: {
    printToPDF: (options?: { options?: unknown; path?: string }) => Promise<{ data?: string; path?: string }>;
  };
  downloads: {
    start: (options: { url: string; savePath?: string }) => Promise<{ id: string; url: string; savePath?: string }>;
    getActive: () => Promise<Array<{ id: string; state: string }>>;
    on: (callback: (event: { type: string; data: { id: string; state: string; savePath?: string; receivedBytes: number; totalBytes: number } }) => void) => () => void;
  };
  getAllDisplays: () => Promise<unknown[]>;
  getPowerMonitorIdleState: (idleThreshold: number) => Promise<string>;
  getPowerMonitorIdleTime: () => Promise<number>;
  startPowerSaveBlocker: (type: 'prevent-app-suspension' | 'prevent-display-sleep') => Promise<number>;
  stopPowerSaveBlocker: (id: number) => Promise<boolean | undefined>;
  isPowerSaveBlockerStarted: (id: number) => Promise<boolean>;
  session: {
    getUserAgent: () => Promise<string>;
    setUserAgent: (userAgent: string) => Promise<void>;
    resolveProxy: (url: string) => Promise<string>;
    setCookie: (cookie: unknown) => Promise<void>;
    getCookies: (filter?: unknown) => Promise<Array<{ name: string; value: string }>>;
    removeCookie: (options: { url: string; name: string }) => Promise<void>;
    clearStorageData: (options?: unknown) => Promise<void>;
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

type FixtureServer = {
  origin: string;
  close: () => Promise<void>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function launchApp(): Promise<ElectronApplication> {
  await waitForDevServer();
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
  await ensureRendererLoadStarted(app);
  return app;
}

async function waitForDevServer(): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(DEV_SERVER_URL);
      if (response.ok) return;
    } catch { /* server not ready yet */ }
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for Vite dev server at ${DEV_SERVER_URL}`);
}

async function ensureRendererLoadStarted(app: ElectronApplication): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const didStart = await app.evaluate(async (electronApi, devUrl) => {
      const win = electronApi.BrowserWindow.getAllWindows()
        .find((candidate) => !candidate.isDestroyed() && !candidate.webContents.getURL());
      if (!win) return false;
      await win.loadURL(devUrl);
      return true;
    }, DEV_SERVER_URL).catch(() => false);
    if (didStart || app.windows().length > 0) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
  }
}

/**
 * Find the main app window (the one that has the `window.Electron` bridge).
 * Skips the splash window which is created first and has no preload.
 */
async function getMainPage(app: ElectronApplication): Promise<Page> {
  const deadline = Date.now() + 20_000;
  const seen = new Set<string>();
  while (Date.now() < deadline) {
    for (const win of app.windows()) {
      try {
        const url = win.url();
        if (url.startsWith('devtools://') || url.endsWith('/splash.html')) continue;
        seen.add(url || '<empty-url>');
        await win.waitForLoadState('domcontentloaded', { timeout: 3_000 });
        const ok = await win.evaluate(() => typeof (window as unknown as { Electron: unknown }).Electron !== 'undefined').catch(() => false);
        if (ok) return win;
      } catch { /* try next window */ }
    }
    await new Promise<void>((r) => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for window with Electron bridge. Seen windows: ${[...seen].join(', ') || 'none'}`);
}

async function startFixtureServer(): Promise<FixtureServer> {
  const server = createServer((req, res) => {
    const requestPath = req.url?.split('?')[0] ?? '/';
    if (requestPath === '/download.txt') {
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="download.txt"',
      });
      res.end('download fixture from local server\n');
      return;
    }
    if (requestPath === '/download.bin') {
      const body = Buffer.alloc(128 * 1024, 'x');
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(body.length),
        'Content-Disposition': 'attachment; filename="download.bin"',
      });
      res.end(body);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture server did not bind to a TCP port');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => closeServer(server),
  };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
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
      'nativeTheme', 'windows', 'autoLaunch', 'externalCommands',
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

test('Capacitor Filesystem performs CRUD, copy, rename, and traversal protection', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async () => {
      const api = (window as unknown as { _CapElectron: CapElectronBridge })._CapElectron;
      const root = `e2e-fs-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await api.invoke('Filesystem-mkdir', { path: root, directory: 'DATA', recursive: true });
      await api.invoke('Filesystem-writeFile', { path: `${root}/hello.txt`, directory: 'DATA', data: 'hello', encoding: 'utf8' });
      await api.invoke('Filesystem-appendFile', { path: `${root}/hello.txt`, directory: 'DATA', data: ' world', encoding: 'utf8' });
      const read = await api.invoke('Filesystem-readFile', { path: `${root}/hello.txt`, directory: 'DATA', encoding: 'utf8' }) as { data: string };
      const stat = await api.invoke('Filesystem-stat', { path: `${root}/hello.txt`, directory: 'DATA' }) as { type: string; size: number; uri: string };
      await api.invoke('Filesystem-copy', { from: `${root}/hello.txt`, to: `${root}/copy.txt`, directory: 'DATA' });
      await api.invoke('Filesystem-rename', { from: `${root}/copy.txt`, to: `${root}/renamed.txt`, directory: 'DATA' });
      const listing = await api.invoke('Filesystem-readdir', { path: root, directory: 'DATA' }) as { files: Array<{ name: string; type: string }> };
      const traversal = await api.invoke('Filesystem-readFile', { path: '../outside.txt', directory: 'DATA', encoding: 'utf8' }).then(
        () => 'resolved',
        (error) => String((error as Error).message ?? error),
      );
      await api.invoke('Filesystem-deleteFile', { path: `${root}/hello.txt`, directory: 'DATA' });
      await api.invoke('Filesystem-deleteFile', { path: `${root}/renamed.txt`, directory: 'DATA' });
      await api.invoke('Filesystem-rmdir', { path: root, directory: 'DATA' });
      return { read, stat, names: listing.files.map((file) => file.name).sort(), traversal };
    });

    expect(result.read.data).toBe('hello world');
    expect(result.stat).toMatchObject({ type: 'file', size: 11 });
    expect(result.stat.uri).toMatch(/^file:\/\//);
    expect(result.names).toEqual(['hello.txt', 'renamed.txt']);
    expect(result.traversal).toContain('Path traversal');
  } finally {
    await app.close();
  }
});

test('Capacitor Clipboard round-trips text through the native clipboard', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const text = `clipboard-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const result = await page.evaluate(async (value) => {
      const api = (window as unknown as { _CapElectron: CapElectronBridge })._CapElectron;
      await api.invoke('Clipboard-write', { string: value });
      return await api.invoke('Clipboard-read') as { value: string; type: string };
    }, text);

    expect(result).toEqual({ value: text, type: 'text/plain' });
  } finally {
    await app.close();
  }
});

test('Capacitor Device and Network return stable desktop value shapes', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async () => {
      const api = (window as unknown as { _CapElectron: CapElectronBridge })._CapElectron;
      const firstId = await api.invoke('Device-getId') as { identifier: string };
      const secondId = await api.invoke('Device-getId') as { identifier: string };
      const info = await api.invoke('Device-getInfo') as { platform: string; operatingSystem: string; webViewVersion: string; memUsed: number };
      const battery = await api.invoke('Device-getBatteryInfo') as Record<string, unknown>;
      const languageCode = await api.invoke('Device-getLanguageCode') as { value: string };
      const languageTag = await api.invoke('Device-getLanguageTag') as { value: string };
      const network = await api.invoke('Network-getStatus') as { connected: boolean; connectionType: string };
      return { firstId, secondId, info, battery, languageCode, languageTag, network };
    });

    expect(result.firstId.identifier).toMatch(/[0-9a-f-]{16,}/i);
    expect(result.secondId.identifier).toBe(result.firstId.identifier);
    expect(result.info.platform).toBe('electron');
    expect(['mac', 'windows', 'unknown']).toContain(result.info.operatingSystem);
    expect(result.info.webViewVersion).toMatch(/^\d+/);
    expect(result.info.memUsed).toBeGreaterThan(0);
    expect(result.battery).toEqual({});
    expect(result.languageCode.value).toMatch(/^[a-z]{2,3}$/i);
    expect(result.languageTag.value.length).toBeGreaterThan(0);
    expect(typeof result.network.connected).toBe('boolean');
    expect(['unknown', 'none']).toContain(result.network.connectionType);
  } finally {
    await app.close();
  }
});

test('Capacitor Filesystem.downloadFile downloads from a local HTTP server', async () => {
  const server = await startFixtureServer();
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async (origin) => {
      const api = (window as unknown as { _CapElectron: CapElectronBridge })._CapElectron;
      const target = `e2e-download-${Date.now()}.txt`;
      const downloaded = await api.invoke('Filesystem-downloadFile', {
        url: `${origin}/download.txt`,
        path: target,
        directory: 'DATA',
      }) as { path: string; uri: string };
      const read = await api.invoke('Filesystem-readFile', { path: target, directory: 'DATA', encoding: 'utf8' }) as { data: string };
      await api.invoke('Filesystem-deleteFile', { path: target, directory: 'DATA' });
      const rejected = await api.invoke('Filesystem-downloadFile', { url: 'file:///etc/passwd', path: target, directory: 'DATA' }).then(
        () => 'resolved',
        (error) => String((error as Error).message ?? error),
      );
      return { downloaded, read, rejected };
    }, server.origin);

    expect(result.downloaded.uri).toMatch(/^file:\/\//);
    expect(result.read.data).toBe('download fixture from local server\n');
    expect(result.rejected).toContain('Download URL must use http: or https:');
  } finally {
    await app.close();
    await server.close();
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

test('window.Electron.nativeTheme can force light, dark, and system modes', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async () => {
      const Electron = (window as unknown as { Electron: ElectronBridgeForE2E }).Electron;
      const initial = await Electron.nativeTheme.get();
      await Electron.nativeTheme.setThemeSource('light');
      const light = await Electron.nativeTheme.get();
      await Electron.nativeTheme.setThemeSource('dark');
      const dark = await Electron.nativeTheme.get();
      await Electron.nativeTheme.setThemeSource('system');
      const system = await Electron.nativeTheme.get();
      await Electron.nativeTheme.setThemeSource(initial.themeSource as 'system' | 'light' | 'dark');
      return { light, dark, system };
    });

    expect(result.light.themeSource).toBe('light');
    expect(result.light.shouldUseDarkColors).toBe(false);
    expect(result.dark.themeSource).toBe('dark');
    expect(result.dark.shouldUseDarkColors).toBe(true);
    expect(result.system.themeSource).toBe('system');
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

test('session bridge sets user agent and manages cookies', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async () => {
      const Electron = (window as unknown as { Electron: ElectronBridgeForE2E }).Electron;
      const originalUserAgent = await Electron.session.getUserAgent();
      const customUserAgent = `${originalUserAgent} CapElectronE2E`;
      const url = 'https://e2e-cookie.example/';
      await Electron.session.setUserAgent(customUserAgent);
      const updatedUserAgent = await Electron.session.getUserAgent();
      await Electron.session.setCookie({ url, name: 'cap-e2e', value: 'cookie-value' });
      const cookiesAfterSet = await Electron.session.getCookies({ url });
      await Electron.session.removeCookie({ url, name: 'cap-e2e' });
      const cookiesAfterRemove = await Electron.session.getCookies({ url });
      await Electron.session.clearStorageData({ origin: url });
      await Electron.session.setUserAgent(originalUserAgent);
      return { updatedUserAgent, cookiesAfterSet, cookiesAfterRemove };
    });

    expect(result.updatedUserAgent).toContain('CapElectronE2E');
    expect(result.cookiesAfterSet).toContainEqual(expect.objectContaining({ name: 'cap-e2e', value: 'cookie-value' }));
    expect(result.cookiesAfterRemove.find((cookie) => cookie.name === 'cap-e2e')).toBeUndefined();
  } finally {
    await app.close();
  }
});

test('print bridge writes PDF data and PDF files', async () => {
  const pdfPath = path.join(os.tmpdir(), `cap-electron-print-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async (targetPath) => {
      const Electron = (window as unknown as { Electron: ElectronBridgeForE2E }).Electron;
      const inline = await Electron.print.printToPDF({ options: { printBackground: true, pageSize: 'A4' } });
      const file = await Electron.print.printToPDF({ path: targetPath, options: { landscape: true, printBackground: true } });
      const inlineHeader = inline.data ? Array.from(Uint8Array.from(atob(inline.data), (char) => char.charCodeAt(0)).slice(0, 4)) : [];
      return { inlineHeader, file };
    }, pdfPath);

    expect(Buffer.from(result.inlineHeader).toString()).toBe('%PDF');
    expect(result.file.path).toBe(pdfPath);
    expect(fs.readFileSync(pdfPath).subarray(0, 4).toString()).toBe('%PDF');
  } finally {
    await app.close();
    fs.rmSync(pdfPath, { force: true });
  }
});

test('downloads bridge saves a local HTTP download and emits completion', async () => {
  const server = await startFixtureServer();
  const savePath = path.join(os.tmpdir(), `cap-electron-download-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async ({ origin, targetPath }) => {
      const Electron = (window as unknown as { Electron: ElectronBridgeForE2E }).Electron;
      let startedId = '';
      const completed = new Promise<{ id: string; state: string; savePath?: string; receivedBytes: number; totalBytes: number }>((resolve, reject) => {
        let unsubscribe = () => {};
        const timeout = window.setTimeout(() => {
          unsubscribe();
          reject(new Error('Timed out waiting for download completion'));
        }, 15_000);
        unsubscribe = Electron.downloads.on((event) => {
          if (event.type === 'completed' && (event.data.id === startedId || event.data.savePath === targetPath)) {
            window.clearTimeout(timeout);
            unsubscribe();
            resolve(event.data);
          }
        });
      });
      const started = await Electron.downloads.start({ url: `${origin}/download.bin`, savePath: targetPath });
      startedId = started.id;
      const done = await completed;
      const active = await Electron.downloads.getActive();
      return { started, done, activeCount: active.length };
    }, { origin: server.origin, targetPath: savePath });

    expect(result.started.id).toBeTruthy();
    expect(result.done).toMatchObject({ id: result.started.id, state: 'completed', savePath });
    expect(result.done.receivedBytes).toBe(128 * 1024);
    expect(result.done.totalBytes).toBe(128 * 1024);
    expect(result.activeCount).toBe(0);
    expect(fs.statSync(savePath).size).toBe(128 * 1024);
  } finally {
    await app.close();
    await server.close();
    fs.rmSync(savePath, { force: true });
  }
});

test('power save blocker bridge starts, reports, and stops blockers', async () => {
  const app = await launchApp();
  try {
    const page = await getMainPage(app);
    const result = await page.evaluate(async () => {
      const Electron = (window as unknown as { Electron: ElectronBridgeForE2E }).Electron;
      const id = await Electron.startPowerSaveBlocker('prevent-app-suspension');
      const started = await Electron.isPowerSaveBlockerStarted(id);
      await Electron.stopPowerSaveBlocker(id);
      const stopped = await Electron.isPowerSaveBlockerStarted(id);
      return { id, started, stopped };
    });

    expect(Number.isInteger(result.id)).toBe(true);
    expect(result.started).toBe(true);
    expect(result.stopped).toBe(false);
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
