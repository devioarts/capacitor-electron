// Tests for windows-main.ts — exported validation helpers appPath() and webUrl().
// Both are security-relevant: appPath prevents arbitrary URL loading,
// webUrl blocks non-http(s) protocols (javascript:, file://, etc.).
import { vi, describe, it, expect } from 'vitest';

const { createdWindows, mockIpcHandle, mockOpenExternal } = vi.hoisted(() => ({
  createdWindows: [] as Array<{
    webContents: {
      setWindowOpenHandler: ReturnType<typeof vi.fn>;
      on: ReturnType<typeof vi.fn>;
    };
    loadURL: ReturnType<typeof vi.fn>;
  }>,
  mockIpcHandle: vi.fn(),
  mockOpenExternal: vi.fn(async () => {}),
}));

vi.mock('electron', () => ({
  BrowserWindow: class {
    static getAllWindows() { return []; }
    static fromWebContents() { return null; }
    id = createdWindows.length + 1;
    webContents = {
      setWindowOpenHandler: vi.fn(),
      on: vi.fn(),
    };
    getTitle() { return ''; }
    getBounds() { return { x: 0, y: 0, width: 900, height: 700 }; }
    isVisible() { return true; }
    isFocused() { return false; }
    isMinimized() { return false; }
    isMaximized() { return false; }
    isFullScreen() { return false; }
    isDestroyed() { return false; }
    on() { return this; }
    once() { return this; }
    loadURL = vi.fn(async () => {});
    loadFile = vi.fn(async () => {});
    contentView = { addChildView: () => {} };
    constructor() {
      createdWindows.push(this);
    }
  },
  shell: { openExternal: mockOpenExternal },
  ipcMain: { handle: mockIpcHandle, on: () => {} },
}));

// functions.ts imports ipcMain too — mock it consistently
vi.mock('../../src/template-electron/src/system/static/electron-api/electron-init-content.js', () => ({
  CAP_ELECTRON_INIT_JS: '// mock',
}));

import {
  appPath,
  canOpenExternalWindowUrl,
  isWebUrl,
  normalizeExternalWindowSchemes,
  webUrl,
} from '../../src/template-electron/src/system/static/electron-api/windows-main.js';

function ipcHandler(channel: string): (event: unknown, ...args: unknown[]) => unknown {
  const call = mockIpcHandle.mock.calls.find(([name]) => name === channel);
  if (!call) throw new Error(`Missing IPC handler: ${channel}`);
  return call[1] as (event: unknown, ...args: unknown[]) => unknown;
}

// ── appPath ───────────────────────────────────────────────────────────────────

describe('appPath — valid inputs', () => {
  it('undefined → undefined (no navigation)', () => {
    expect(appPath(undefined)).toBeUndefined();
  });

  it('root path "/" is valid', () => {
    expect(appPath('/')).toBe('/');
  });

  it('path starting with "/" is valid', () => {
    expect(appPath('/settings')).toBe('/settings');
  });

  it('path starting with "?" (query-only navigation) is valid', () => {
    expect(appPath('?tab=profile')).toBe('?tab=profile');
  });

  it('path starting with "#" (hash-only navigation) is valid', () => {
    expect(appPath('#section')).toBe('#section');
  });

  it('empty string is valid (empty path means no change)', () => {
    expect(appPath('')).toBe('');
  });

  it('path with nested segments is valid', () => {
    expect(appPath('/settings/account')).toBe('/settings/account');
  });
});

describe('appPath — invalid inputs that must throw', () => {
  it('throws for non-string values (number)', () => {
    expect(() => appPath(42)).toThrow('appPath must be a string');
  });

  it('throws for non-string values (object)', () => {
    expect(() => appPath({})).toThrow('appPath must be a string');
  });

  it('throws for non-string values (null)', () => {
    expect(() => appPath(null)).toThrow('appPath must be a string');
  });

  it('throws when appPath is too long (> 2048 chars)', () => {
    expect(() => appPath('/' + 'a'.repeat(2048))).toThrow('appPath is too long');
  });

  it('throws for a protocol URL (https://)', () => {
    expect(() => appPath('https://evil.com')).toThrow('app-relative');
  });

  it('throws for javascript: URL', () => {
    expect(() => appPath('javascript:alert(1)')).toThrow('app-relative');
  });

  it('throws for protocol-relative URL (//cdn.evil.com)', () => {
    expect(() => appPath('//cdn.evil.com/evil.js')).toThrow('app-relative');
  });

  it('throws for relative path without leading / ? #', () => {
    expect(() => appPath('relative/path')).toThrow('must start with');
  });

  it('throws for bare filename', () => {
    expect(() => appPath('index.html')).toThrow('must start with');
  });
});

// ── webUrl ────────────────────────────────────────────────────────────────────

describe('webUrl — valid protocols', () => {
  it('accepts http:// URL and normalises to href', () => {
    expect(webUrl('http://example.com')).toBe('http://example.com/');
  });

  it('accepts https:// URL', () => {
    expect(webUrl('https://example.com/path?q=1')).toBe('https://example.com/path?q=1');
  });

  it('preserves query string and fragment', () => {
    expect(webUrl('https://example.com/page?a=1#section')).toContain('?a=1');
  });
});

describe('webUrl — blocked protocols', () => {
  it('throws for file:// URL', () => {
    expect(() => webUrl('file:///etc/passwd')).toThrow('Unsupported external URL protocol');
  });

  it('throws for javascript: URL', () => {
    expect(() => webUrl('javascript:alert(1)')).toThrow('Unsupported external URL protocol');
  });

  it('throws for ftp:// URL', () => {
    expect(() => webUrl('ftp://files.example.com')).toThrow('Unsupported external URL protocol');
  });

  it('throws for data: URL', () => {
    expect(() => webUrl('data:text/html,<h1>x</h1>')).toThrow('Unsupported external URL protocol');
  });

  it('throws for invalid (unparseable) URL', () => {
    expect(() => webUrl('not a url at all')).toThrow();
  });
});

// ── isWebUrl ──────────────────────────────────────────────────────────────────

describe('isWebUrl', () => {
  it('returns true for http/https URLs', () => {
    expect(isWebUrl('http://example.com')).toBe(true);
    expect(isWebUrl('https://example.com/path')).toBe(true);
  });

  it('returns false for non-web or invalid URLs', () => {
    expect(isWebUrl('mailto:user@example.com')).toBe(false);
    expect(isWebUrl('file:///etc/passwd')).toBe(false);
    expect(isWebUrl('javascript:alert(1)')).toBe(false);
    expect(isWebUrl('not a url')).toBe(false);
  });
});

// ── external managed window URL allowlist ─────────────────────────────────────

describe('external managed window URL allowlist', () => {
  it('normalizes configured non-web schemes', () => {
    const schemes = normalizeExternalWindowSchemes(['mailto:', 'slack://', 'My-App', 'https', 'javascript']);
    expect([...schemes].sort()).toEqual(['mailto:', 'my-app:', 'slack:']);
  });

  it('allows web URLs by default', () => {
    expect(canOpenExternalWindowUrl('https://example.com')).toBe(true);
    expect(canOpenExternalWindowUrl('http://example.com')).toBe(true);
  });

  it('allows configured non-web schemes', () => {
    const schemes = normalizeExternalWindowSchemes(['mailto', 'slack']);
    expect(canOpenExternalWindowUrl('mailto:user@example.com', schemes)).toBe(true);
    expect(canOpenExternalWindowUrl('slack://channel?id=1', schemes)).toBe(true);
  });

  it('blocks unconfigured or dangerous schemes', () => {
    const schemes = normalizeExternalWindowSchemes(['javascript', 'data', 'vbscript']);
    expect(canOpenExternalWindowUrl('mailto:user@example.com', schemes)).toBe(false);
    expect(canOpenExternalWindowUrl('javascript:alert(1)', schemes)).toBe(false);
    expect(canOpenExternalWindowUrl('data:text/html,hi', schemes)).toBe(false);
    expect(canOpenExternalWindowUrl('not a url', schemes)).toBe(false);
  });
});

// ── windows:create external hardening ─────────────────────────────────────────

describe('windows:create — external URL hardening', () => {
  it('registers popup and navigation guards for external URL windows', () => {
    createdWindows.length = 0;
    const create = ipcHandler('windows:create');

    create({ sender: {}, senderFrame: { url: 'file:///app/index.html' } }, { url: 'https://example.com' });

    const win = createdWindows[0];
    expect(win.loadURL).toHaveBeenCalledWith('https://example.com/');
    expect(win.webContents.setWindowOpenHandler).toHaveBeenCalledTimes(1);
    expect(win.webContents.on).toHaveBeenCalledWith('will-navigate', expect.any(Function));
  });

  it('denies child Electron windows and opens web popups externally', () => {
    createdWindows.length = 0;
    mockOpenExternal.mockClear();
    const create = ipcHandler('windows:create');
    create({ sender: {}, senderFrame: { url: 'file:///app/index.html' } }, { url: 'https://example.com' });

    const handler = createdWindows[0].webContents.setWindowOpenHandler.mock.calls[0][0] as (details: { url: string }) => { action: string };
    expect(handler({ url: 'https://other.example' })).toEqual({ action: 'deny' });
    expect(mockOpenExternal).toHaveBeenCalledWith('https://other.example/');

    expect(handler({ url: 'javascript:alert(1)' })).toEqual({ action: 'deny' });
    expect(mockOpenExternal).toHaveBeenCalledTimes(1);
  });

  it('prevents non-web top-level navigations', () => {
    createdWindows.length = 0;
    mockOpenExternal.mockClear();
    const create = ipcHandler('windows:create');
    create({ sender: {}, senderFrame: { url: 'file:///app/index.html' } }, { url: 'https://example.com' });

    const navigate = createdWindows[0].webContents.on.mock.calls.find(([event]) => event === 'will-navigate')?.[1] as (
      event: { preventDefault: () => void },
      url: string,
    ) => void;
    const event = { preventDefault: vi.fn() };

    navigate(event, 'https://example.com/next');
    expect(event.preventDefault).not.toHaveBeenCalled();

    navigate(event, 'file:///etc/passwd');
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });
});
