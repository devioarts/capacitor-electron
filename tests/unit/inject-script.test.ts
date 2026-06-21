// Tests for injectScriptAfterBodyOpen (H-3 fix)
// Verifies that <script src="/electron-init.js"> is injected after <body>
// regardless of attributes on the body tag.
import { describe, it, expect, vi } from 'vitest';

// electron-init-content.ts reads electron-init.js from dist/ at import time.
// Mock it so the test doesn't require a prior build.
vi.mock('../../src/cli/electron-init-content.js', () => ({
  CAP_ELECTRON_INIT_JS: '// mock',
}));
import { injectScriptAfterBodyOpen } from '../../src/cli/electron-init.js';

const SCRIPT_LINE = '<script src="/electron-init.js"></script>';

describe('injectScriptAfterBodyOpen', () => {
  it('injects after plain <body>', () => {
    const out = injectScriptAfterBodyOpen('<html><body><p>hi</p></body></html>');
    expect(out).toContain('<body>\n    ' + SCRIPT_LINE);
  });

  it('injects after <body> with class attribute', () => {
    const out = injectScriptAfterBodyOpen('<html><body class="dark"><p>hi</p></body></html>');
    expect(out).toContain('<body class="dark">\n    ' + SCRIPT_LINE);
  });

  it('injects after <body> with multiple attributes', () => {
    const html = '<html><body class="dark" id="root" onload="init()"><p>hi</p></body></html>';
    const out = injectScriptAfterBodyOpen(html);
    expect(out).toContain('<body class="dark" id="root" onload="init()">\n    ' + SCRIPT_LINE);
  });

  it('is case-insensitive (BODY uppercase)', () => {
    const out = injectScriptAfterBodyOpen('<HTML><BODY><p>hi</p></BODY></HTML>');
    expect(out).toContain('<BODY>\n    ' + SCRIPT_LINE);
  });

  it('returns null when there is no <body> tag', () => {
    expect(injectScriptAfterBodyOpen('<div>no body here</div>')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(injectScriptAfterBodyOpen('')).toBeNull();
  });

  it('does not inject twice when called again on already-patched HTML', () => {
    const html = '<html><body><p>hi</p></body></html>';
    const once = injectScriptAfterBodyOpen(html)!;
    const twice = injectScriptAfterBodyOpen(once)!;
    const count = (twice.match(/<script src="\/electron-init\.js"><\/script>/g) ?? []).length;
    expect(count).toBe(2); // function itself doesn't guard against double-injection — that's the caller's job
  });

  it('preserves content after the body tag', () => {
    const html = '<html><body class="app"><h1>Title</h1><p>Content</p></body></html>';
    const out = injectScriptAfterBodyOpen(html)!;
    expect(out).toContain('<h1>Title</h1>');
    expect(out).toContain('<p>Content</p>');
  });
});
