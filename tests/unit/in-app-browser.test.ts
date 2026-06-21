// Tests for in-app-browser-main.ts — exported pure utility functions.
// These are security-relevant: parseWebUrl / canOpenExternal block dangerous
// schemes; normalizeCssColor / sanitizeWindowOptions / extraHeaders prevent
// injection through user-supplied options.
import { vi, describe, it, expect } from 'vitest';

vi.mock('electron', () => ({
  BrowserWindow: class {
    static getAllWindows() { return []; }
    static getFocusedWindow() { return null; }
    isDestroyed() { return false; }
    on() { return this; }
    once() { return this; }
    loadURL() { return Promise.resolve(); }
    contentView = { addChildView: () => {} };
  },
  WebContentsView: class {
    webContents = {
      loadURL: async () => {},
      getURL: () => '',
      canGoBack: () => false,
      canGoForward: () => false,
      on: () => {},
      once: () => {},
      setWindowOpenHandler: () => {},
      setUserAgent: () => {},
      executeJavaScript: async () => {},
    };
    setBounds() {}
  },
  shell: { openExternal: async () => {} },
  session: {
    defaultSession: {
      clearCache: async () => {},
      clearData: async () => {},
      fromPartition: (_: string) => ({ clearCache: async () => {}, clearData: async () => {} }),
    },
    fromPartition: (_: string) => ({
      clearCache: async () => {},
      clearData: async () => {},
    }),
  },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import {
  parseWebUrl,
  canOpenExternal,
  normalizeCssColor,
  sanitizeWindowOptions,
  extraHeaders,
} from '../../src/template-electron/src/system/static/capacitor-api/in-app-browser-main.js';

// ── parseWebUrl ───────────────────────────────────────────────────────────────

describe('parseWebUrl — accepted schemes', () => {
  it('accepts http:// and returns the normalised href', () => {
    expect(parseWebUrl('http://example.com')).toBe('http://example.com/');
  });

  it('accepts https://', () => {
    expect(parseWebUrl('https://example.com/path')).toBe('https://example.com/path');
  });

  it('preserves query string', () => {
    expect(parseWebUrl('https://example.com/?q=hello')).toContain('q=hello');
  });

  it('preserves fragment', () => {
    expect(parseWebUrl('https://example.com/#anchor')).toContain('#anchor');
  });
});

describe('parseWebUrl — blocked schemes', () => {
  it('throws for javascript:', () => {
    expect(() => parseWebUrl('javascript:alert(1)')).toThrow('http/https');
  });

  it('throws for data: URL', () => {
    expect(() => parseWebUrl('data:text/html,<script>alert(1)</script>')).toThrow('http/https');
  });

  it('throws for file://', () => {
    expect(() => parseWebUrl('file:///etc/passwd')).toThrow('http/https');
  });

  it('throws for ftp://', () => {
    expect(() => parseWebUrl('ftp://files.example.com')).toThrow('http/https');
  });

  it('throws for empty string', () => {
    expect(() => parseWebUrl('')).toThrow();
  });

  it('throws for non-URL string', () => {
    expect(() => parseWebUrl('not a url')).toThrow();
  });

  it('handles null input without crashing (coerced to "null")', () => {
    expect(() => parseWebUrl(null)).toThrow();
  });
});

// ── canOpenExternal ───────────────────────────────────────────────────────────

describe('canOpenExternal', () => {
  it('allows http:// URL', () => {
    expect(canOpenExternal('http://example.com')).toBe(true);
  });

  it('allows https:// URL', () => {
    expect(canOpenExternal('https://example.com')).toBe(true);
  });

  it('allows mailto: URL (not in block list)', () => {
    expect(canOpenExternal('mailto:user@example.com')).toBe(true);
  });

  it('blocks javascript: URL', () => {
    expect(canOpenExternal('javascript:alert(1)')).toBe(false);
  });

  it('blocks data: URL', () => {
    expect(canOpenExternal('data:text/html,hi')).toBe(false);
  });

  it('blocks vbscript: URL', () => {
    expect(canOpenExternal('vbscript:MsgBox(1)')).toBe(false);
  });

  it('returns false for invalid (unparseable) URL', () => {
    expect(canOpenExternal('not a url')).toBe(false);
  });
});

// ── normalizeCssColor ─────────────────────────────────────────────────────────

describe('normalizeCssColor — accepted formats', () => {
  it('accepts 3-digit hex (#fff)', () => {
    expect(normalizeCssColor('#fff')).toBe('#fff');
  });

  it('accepts 6-digit hex (#ffffff)', () => {
    expect(normalizeCssColor('#ffffff')).toBe('#ffffff');
  });

  it('accepts 8-digit hex with alpha (#ffffffff)', () => {
    expect(normalizeCssColor('#ffffffff')).toBe('#ffffffff');
  });

  it('accepts named color (red)', () => {
    expect(normalizeCssColor('red')).toBe('red');
  });

  it('accepts rgb(...)', () => {
    expect(normalizeCssColor('rgb(255,255,255)')).toBe('rgb(255,255,255)');
  });

  it('accepts rgba(...) with decimal alpha', () => {
    expect(normalizeCssColor('rgba(0,0,0,0.5)')).toBe('rgba(0,0,0,0.5)');
  });

  it('accepts hsl(...)', () => {
    expect(normalizeCssColor('hsl(0,100%,50%)')).toBe('hsl(0,100%,50%)');
  });
});

describe('normalizeCssColor — rejected (would allow injection)', () => {
  it('rejects arbitrary strings with spaces', () => {
    expect(normalizeCssColor('red; background: url(evil)')).toBeUndefined();
  });

  it('rejects empty string', () => {
    expect(normalizeCssColor('')).toBeUndefined();
  });

  it('rejects non-string values', () => {
    expect(normalizeCssColor(42)).toBeUndefined();
    expect(normalizeCssColor(null)).toBeUndefined();
  });

  it('rejects string that starts with # but has invalid chars', () => {
    expect(normalizeCssColor('#xyz')).toBeUndefined();
  });
});

// ── sanitizeWindowOptions ─────────────────────────────────────────────────────

describe('sanitizeWindowOptions', () => {
  it('returns empty object for non-object input', () => {
    expect(sanitizeWindowOptions('malicious')).toEqual({});
    expect(sanitizeWindowOptions(null)).toEqual({});
    expect(sanitizeWindowOptions(42)).toEqual({});
  });

  it('passes through valid numeric keys (width, height)', () => {
    const opts = sanitizeWindowOptions({ width: 800, height: 600 });
    expect(opts.width).toBe(800);
    expect(opts.height).toBe(600);
  });

  it('clamps width to min 1', () => {
    const opts = sanitizeWindowOptions({ width: 0 });
    expect(opts.width).toBe(1);
  });

  it('clamps width to max 100000', () => {
    const opts = sanitizeWindowOptions({ width: 999999 });
    expect(opts.width).toBe(100_000);
  });

  it('passes through valid boolean keys (alwaysOnTop)', () => {
    const opts = sanitizeWindowOptions({ alwaysOnTop: true });
    expect(opts.alwaysOnTop).toBe(true);
  });

  it('strips unknown / non-whitelisted keys', () => {
    const opts = sanitizeWindowOptions({ evil: 'payload', injected: 'bad' }) as Record<string, unknown>;
    expect(opts['evil']).toBeUndefined();
    expect(opts['injected']).toBeUndefined();
  });

  it('passes through valid title string', () => {
    const opts = sanitizeWindowOptions({ title: 'My Window' });
    expect(opts.title).toBe('My Window');
  });

  it('clamps opacity to range [0.1, 1]', () => {
    expect(sanitizeWindowOptions({ opacity: 2 }).opacity).toBe(1);
    expect(sanitizeWindowOptions({ opacity: 0 }).opacity).toBe(0.1);
    expect(sanitizeWindowOptions({ opacity: 0.5 }).opacity).toBe(0.5);
  });

  it('accepts known titleBarStyle values', () => {
    expect(sanitizeWindowOptions({ titleBarStyle: 'hidden' }).titleBarStyle).toBe('hidden');
    expect(sanitizeWindowOptions({ titleBarStyle: 'default' }).titleBarStyle).toBe('default');
  });

  it('rejects unknown titleBarStyle', () => {
    const opts = sanitizeWindowOptions({ titleBarStyle: 'malicious' });
    expect(opts.titleBarStyle).toBeUndefined();
  });
});

// ── extraHeaders ──────────────────────────────────────────────────────────────

describe('extraHeaders', () => {
  it('returns undefined for empty object', () => {
    expect(extraHeaders({})).toBeUndefined();
  });

  it('returns undefined for non-object input', () => {
    expect(extraHeaders('string')).toBeUndefined();
    expect(extraHeaders(null)).toBeUndefined();
  });

  it('formats a single header as "Key: Value"', () => {
    expect(extraHeaders({ 'X-Custom': 'abc' })).toBe('X-Custom: abc');
  });

  it('joins multiple headers with newline', () => {
    const result = extraHeaders({ 'X-A': '1', 'X-B': '2' })!;
    expect(result).toContain('X-A: 1');
    expect(result).toContain('X-B: 2');
    expect(result.split('\n')).toHaveLength(2);
  });

  it('filters out non-string values', () => {
    const result = extraHeaders({ 'X-Good': 'ok', 'X-Bad': 123 });
    expect(result).toBe('X-Good: ok');
  });

  it('returns undefined when all values are non-string', () => {
    expect(extraHeaders({ 'X-Num': 42 })).toBeUndefined();
  });
});
