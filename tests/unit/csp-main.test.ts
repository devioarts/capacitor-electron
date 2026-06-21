// Tests for csp-main.ts — buildCsp() and setupCSP().
// Security-relevant: the CSP header prevents XSS / script injection in the renderer.
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Electron mock ──────────────────────────────────────────────────────────────

type HeadersReceivedCallback = (
  details: { responseHeaders?: Record<string, string[]> },
  cb: (r: { responseHeaders: Record<string, string[]> }) => void,
) => void;

const { mockOnHeadersReceived } = vi.hoisted(() => ({
  mockOnHeadersReceived: vi.fn(),
}));

vi.mock('electron', () => ({
  session: {
    defaultSession: {
      webRequest: {
        onHeadersReceived: mockOnHeadersReceived,
      },
    },
  },
  app: { getPath: () => '/tmp', getName: () => 'TestApp', on: () => {} },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  BrowserWindow: class { static getAllWindows() { return []; } },
}));

import {
  buildCsp,
  setupCSP,
} from '../../src/template-electron/src/system/static/electron-api/csp-main.js';

// ── buildCsp ───────────────────────────────────────────────────────────────────

describe('buildCsp', () => {
  it('formats a single directive with string value', () => {
    expect(buildCsp({ 'default-src': "'self'" })).toBe("default-src 'self'");
  });

  it('formats a directive with array value (joined with spaces)', () => {
    expect(buildCsp({ 'script-src': ["'self'", "'unsafe-inline'"] }))
      .toBe("script-src 'self' 'unsafe-inline'");
  });

  it('joins multiple directives with "; "', () => {
    const result = buildCsp({
      'default-src': "'self'",
      'img-src': ['self', 'data:'],
    });
    expect(result).toContain("default-src 'self'");
    expect(result).toContain('img-src self data:');
    expect(result.split('; ')).toHaveLength(2);
  });

  it('returns empty string for empty directives object', () => {
    expect(buildCsp({})).toBe('');
  });

  it('preserves the exact key name in output', () => {
    expect(buildCsp({ 'connect-src': "'self'" })).toContain('connect-src');
  });
});

// ── setupCSP — header value selection ─────────────────────────────────────────

function capturedHeaderValue(): string {
  const calls = mockOnHeadersReceived.mock.calls;
  if (calls.length === 0) throw new Error('onHeadersReceived was not called');
  const listener = calls[calls.length - 1][0] as HeadersReceivedCallback;
  let captured = '';
  listener(
    { responseHeaders: {} },
    (r) => { captured = r.responseHeaders['Content-Security-Policy'][0]; },
  );
  return captured;
}

beforeEach(() => { mockOnHeadersReceived.mockReset(); });

describe('setupCSP — disabled', () => {
  it('does NOT call onHeadersReceived when csp is false', () => {
    setupCSP({ security: { csp: false } }, false);
    expect(mockOnHeadersReceived).not.toHaveBeenCalled();
  });
});

describe('setupCSP — custom string', () => {
  it('uses the string verbatim as the CSP header value', () => {
    setupCSP({ security: { csp: "default-src 'self'" } }, false);
    expect(capturedHeaderValue()).toBe("default-src 'self'");
  });
});

describe('setupCSP — custom object', () => {
  it('builds CSP from directive object', () => {
    setupCSP({ security: { csp: { 'default-src': "'self'", 'connect-src': "'self' https://api.example.com" } } }, false);
    const header = capturedHeaderValue();
    expect(header).toContain("default-src 'self'");
    expect(header).toContain("connect-src 'self' https://api.example.com");
  });
});

describe('setupCSP — dev mode defaults', () => {
  it('uses dev CSP (allows localhost and unsafe-eval) when isDev=true and no custom csp', () => {
    setupCSP({}, true);
    const header = capturedHeaderValue();
    expect(header).toContain('unsafe-eval');
    expect(header).toContain('localhost');
  });

  it('dev CSP allows WebSocket (ws://)', () => {
    setupCSP({}, true);
    expect(capturedHeaderValue()).toContain('ws://');
  });
});

describe('setupCSP — prod mode defaults', () => {
  it('uses restrictive prod CSP when isDev=false and no custom csp', () => {
    setupCSP({}, false);
    const header = capturedHeaderValue();
    expect(header).not.toContain('unsafe-eval');
    expect(header).not.toContain('localhost');
    expect(header).toContain("default-src 'self'");
  });

  it('prod CSP contains style-src and img-src directives', () => {
    setupCSP({}, false);
    const header = capturedHeaderValue();
    expect(header).toContain('style-src');
    expect(header).toContain('img-src');
  });
});

describe('setupCSP — response headers passthrough', () => {
  it('merges CSP into existing response headers without removing them', () => {
    setupCSP({}, false);
    const listener = mockOnHeadersReceived.mock.calls[0][0] as HeadersReceivedCallback;
    let result: Record<string, string[]> = {};
    listener(
      { responseHeaders: { 'X-Custom': ['value'] } },
      (r) => { result = r.responseHeaders; },
    );
    expect(result['X-Custom']).toEqual(['value']);
    expect(result['Content-Security-Policy']).toBeDefined();
  });
});
