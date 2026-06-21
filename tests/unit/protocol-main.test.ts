// Tests for protocol-main.ts — cleanScheme() validation (security-critical).
// cleanScheme() is the gatekeeper: every IPC handler passes its scheme argument
// through it, so an invalid/malicious scheme can never reach app.*ProtocolClient().
import { vi, describe, it, expect, beforeAll } from 'vitest';

// ── Electron mock ──────────────────────────────────────────────────────────────

const { mockIpcHandle } = vi.hoisted(() => ({
  mockIpcHandle: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/tmp',
    getName: () => 'TestApp',
    on: () => {},
    isDefaultProtocolClient: vi.fn(() => false),
    setAsDefaultProtocolClient: vi.fn(() => true),
    removeAsDefaultProtocolClient: vi.fn(() => true),
  },
  protocol: {
    isProtocolHandled: vi.fn(() => false),
  },
  shell: { openExternal: vi.fn(async () => {}) },
  ipcMain: { handle: mockIpcHandle, on: vi.fn() },
  BrowserWindow: class { static getAllWindows() { return []; } },
}));

// Mock loadConfig so configuredSchemes() can return controlled values.
const { mockLoadConfig } = vi.hoisted(() => ({
  mockLoadConfig: vi.fn(() => ({ cfg: { app: { deepLinkingScheme: 'myapp', appLauncherSchemes: ['helper'] } }, appCfg: {} })),
}));

vi.mock(
  '../../src/template-electron/src/system/shared/functions.js',
  async (importOriginal) => {
    const original = await importOriginal<typeof import('../../src/template-electron/src/system/shared/functions.js')>();
    return { ...original, loadConfig: mockLoadConfig };
  },
);

import { cleanScheme } from '../../src/template-electron/src/system/static/electron-api/protocol-main.js';

// protocol-main.ts has top-level trustedIpcHandle() calls → we need the module to
// already be imported by the time we read the mock calls.
beforeAll(async () => {
  await import('../../src/template-electron/src/system/static/electron-api/protocol-main.js');
});

// ── cleanScheme ────────────────────────────────────────────────────────────────

describe('cleanScheme — valid schemes', () => {
  it('lowercases the input', () => {
    expect(cleanScheme('MyApp')).toBe('myapp');
  });

  it('strips trailing "://"', () => {
    expect(cleanScheme('myapp://')).toBe('myapp');
  });

  it('strips trailing ":"', () => {
    expect(cleanScheme('myapp:')).toBe('myapp');
  });

  it('trims whitespace', () => {
    expect(cleanScheme('  myapp  ')).toBe('myapp');
  });

  it('accepts scheme with digits', () => {
    expect(cleanScheme('app2')).toBe('app2');
  });

  it('accepts scheme with hyphens and dots', () => {
    expect(cleanScheme('my-app.v2')).toBe('my-app.v2');
  });

  it('accepts single letter scheme', () => {
    expect(cleanScheme('x')).toBe('x');
  });
});

describe('cleanScheme — invalid schemes (must throw)', () => {
  it('throws for empty string (after trim)', () => {
    expect(() => cleanScheme('')).toThrow('Invalid protocol scheme');
  });

  it('throws when scheme starts with a digit', () => {
    expect(() => cleanScheme('1app')).toThrow('Invalid protocol scheme');
  });

  it('throws for scheme with spaces', () => {
    expect(() => cleanScheme('my app')).toThrow('Invalid protocol scheme');
  });

  it('throws for scheme with special chars (e.g. @)', () => {
    expect(() => cleanScheme('evil@scheme')).toThrow('Invalid protocol scheme');
  });

  it('throws for path-like input (e.g. ../../etc)', () => {
    expect(() => cleanScheme('../../etc')).toThrow('Invalid protocol scheme');
  });

  it('normalizes javascript: to a plain scheme name (security is in openExternal handler)', () => {
    // cleanScheme only validates format — 'javascript' is structurally valid.
    // The openExternal handler is what blocks javascript: URLs.
    expect(cleanScheme('javascript:')).toBe('javascript');
  });
});

// ── IPC handler: protocol:setAsDefaultProtocolClient ─────────────────────────

describe('protocol:setAsDefaultProtocolClient IPC handler', () => {
  it('registers the handler', () => {
    const channels = mockIpcHandle.mock.calls.map((c) => c[0] as string);
    expect(channels).toContain('protocol:setAsDefaultProtocolClient');
  });

  it('throws when scheme is not in the configured list', async () => {
    const handler = mockIpcHandle.mock.calls.find(
      (c) => c[0] === 'protocol:setAsDefaultProtocolClient',
    )?.[1] as (_e: unknown, scheme: string) => unknown;
    await expect(Promise.resolve().then(() => handler({}, 'evil')))
      .rejects.toThrow('Refusing to register unconfigured protocol scheme');
  });

  it('succeeds for a configured scheme', async () => {
    const handler = mockIpcHandle.mock.calls.find(
      (c) => c[0] === 'protocol:setAsDefaultProtocolClient',
    )?.[1] as (_e: unknown, scheme: string) => unknown;
    await expect(Promise.resolve().then(() => handler({}, 'myapp'))).resolves.not.toThrow();
  });
});

// ── IPC handler: protocol:openExternal ────────────────────────────────────────

describe('protocol:openExternal IPC handler', () => {
  it('registers the handler', () => {
    const channels = mockIpcHandle.mock.calls.map((c) => c[0] as string);
    expect(channels).toContain('protocol:openExternal');
  });

  it('allows http:// URLs', async () => {
    const handler = mockIpcHandle.mock.calls.find(
      (c) => c[0] === 'protocol:openExternal',
    )?.[1] as (_e: unknown, url: string) => unknown;
    await expect(handler({}, 'http://example.com')).resolves.not.toThrow();
  });

  it('allows mailto: URLs', async () => {
    const handler = mockIpcHandle.mock.calls.find(
      (c) => c[0] === 'protocol:openExternal',
    )?.[1] as (_e: unknown, url: string) => unknown;
    await expect(handler({}, 'mailto:user@example.com')).resolves.not.toThrow();
  });

  it('blocks file:// URLs', async () => {
    const handler = mockIpcHandle.mock.calls.find(
      (c) => c[0] === 'protocol:openExternal',
    )?.[1] as (_e: unknown, url: string) => unknown;
    await expect(handler({}, 'file:///etc/passwd')).rejects.toThrow('not allowed');
  });

  it('blocks javascript: URLs', async () => {
    const handler = mockIpcHandle.mock.calls.find(
      (c) => c[0] === 'protocol:openExternal',
    )?.[1] as (_e: unknown, url: string) => unknown;
    await expect(handler({}, 'javascript:alert(1)')).rejects.toThrow('not allowed');
  });
});
