// Tests for normalizeDeepLinkUrl (H-2 fix)
// Verifies length limit, scheme validation, and URL normalisation.
import { describe, it, expect } from 'vitest';
import { normalizeDeepLinkUrl } from '../../src/template-electron/src/system/static/electron-api/deep-link-main.js';

const SCHEME = 'myapp';

describe('normalizeDeepLinkUrl', () => {
  it('accepts a valid deep link URL', () => {
    expect(normalizeDeepLinkUrl('myapp://open/page', SCHEME)).toBe('myapp://open/page');
  });

  it('accepts URL with query and hash', () => {
    const url = 'myapp://path?foo=bar#section';
    expect(normalizeDeepLinkUrl(url, SCHEME)).toBe(url);
  });

  it('returns null for URL exceeding 8192 characters', () => {
    const long = `${SCHEME}://` + 'x'.repeat(8200);
    expect(normalizeDeepLinkUrl(long, SCHEME)).toBeNull();
  });

  it('accepts URL exactly at the limit (8192 chars — limit is exclusive)', () => {
    const atLimit = `${SCHEME}://` + 'x'.repeat(8192 - SCHEME.length - 3);
    expect(atLimit.length).toBe(8192);
    expect(normalizeDeepLinkUrl(atLimit, SCHEME)).not.toBeNull();
  });

  it('returns null for URL one character over the limit (8193 chars)', () => {
    const overLimit = `${SCHEME}://` + 'x'.repeat(8193 - SCHEME.length - 3);
    expect(overLimit.length).toBe(8193);
    expect(normalizeDeepLinkUrl(overLimit, SCHEME)).toBeNull();
  });

  it('returns null when scheme does not match', () => {
    expect(normalizeDeepLinkUrl('otherapp://open/page', SCHEME)).toBeNull();
  });

  it('returns null for http:// URL (wrong scheme)', () => {
    expect(normalizeDeepLinkUrl('http://example.com', SCHEME)).toBeNull();
  });

  it('returns null for javascript: URL', () => {
    expect(normalizeDeepLinkUrl('javascript:alert(1)', SCHEME)).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(normalizeDeepLinkUrl(null as unknown as string, SCHEME)).toBeNull();
    expect(normalizeDeepLinkUrl(undefined as unknown as string, SCHEME)).toBeNull();
    expect(normalizeDeepLinkUrl(42 as unknown as string, SCHEME)).toBeNull();
  });

  it('returns null for completely invalid URL', () => {
    expect(normalizeDeepLinkUrl('not a url at all', SCHEME)).toBeNull();
  });

  it('returns the canonical href from new URL()', () => {
    // Custom schemes are opaque to the URL parser — hostname case is preserved
    // (only http/https normalise hostname to lowercase).
    const result = normalizeDeepLinkUrl('myapp://Host/Path', SCHEME);
    expect(result).toBe('myapp://Host/Path');
  });
});
