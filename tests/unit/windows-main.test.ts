// Tests for windows-main.ts — exported validation helpers appPath() and webUrl().
// Both are security-relevant: appPath prevents arbitrary URL loading,
// webUrl blocks non-http(s) protocols (javascript:, file://, etc.).
import { vi, describe, it, expect } from 'vitest';

vi.mock('electron', () => ({
  BrowserWindow: class {
    static getAllWindows() { return []; }
    static fromWebContents() { return null; }
    isDestroyed() { return false; }
    on() { return this; }
    once() { return this; }
    loadURL() { return Promise.resolve(); }
    loadFile() { return Promise.resolve(); }
    contentView = { addChildView: () => {} };
  },
  shell: { openExternal: async () => {} },
  ipcMain: { handle: () => {}, on: () => {} },
}));

// functions.ts imports ipcMain too — mock it consistently
vi.mock('../../src/template-electron/src/system/static/electron-api/electron-init-content.js', () => ({
  CAP_ELECTRON_INIT_JS: '// mock',
}));

import {
  appPath,
  webUrl,
} from '../../src/template-electron/src/system/static/electron-api/windows-main.js';

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
