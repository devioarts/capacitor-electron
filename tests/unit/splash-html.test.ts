// Tests for escapeHtmlAttr (M-8 fix)
// Verifies that & and " in image URLs are escaped so the generated HTML
// attribute stays well-formed.
import { describe, it, expect } from 'vitest';
import { escapeHtmlAttr } from '../../src/template-electron/src/system/static/electron-api/splash-main.js';

describe('escapeHtmlAttr', () => {
  it('leaves a clean file:// URL unchanged', () => {
    const url = 'file:///Users/mosin/app/assets/splash.png';
    expect(escapeHtmlAttr(url)).toBe(url);
  });

  it('escapes double quotes', () => {
    expect(escapeHtmlAttr('file:///path/with"quote/splash.png')).toBe(
      'file:///path/with&quot;quote/splash.png',
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtmlAttr('file:///path?a=1&b=2')).toBe(
      'file:///path?a=1&amp;b=2',
    );
  });

  it('escapes both & and " in the same string', () => {
    expect(escapeHtmlAttr('file:///a&b"c')).toBe('file:///a&amp;b&quot;c');
  });

  it('handles empty string', () => {
    expect(escapeHtmlAttr('')).toBe('');
  });

  it('handles string with no special characters', () => {
    expect(escapeHtmlAttr('file:///clean/path/image.png')).toBe('file:///clean/path/image.png');
  });

  it('escapes multiple consecutive ampersands', () => {
    expect(escapeHtmlAttr('a&&b')).toBe('a&amp;&amp;b');
  });
});
