// Tests for file-trust.ts — production file-mode IPC trust boundary.
// The preload bridge is trusted only for packaged app files, not arbitrary file:// URLs.
import { describe, expect, it } from 'vitest';
import { pathToFileURL } from 'url';

import {
  createFileAppSenderCheck,
  isTrustedFileUrl,
} from '../../src/template-electron/src/system/static/electron-api/file-trust.js';

const appRoot = '/Applications/MyApp.app/Contents/Resources/app';

function fileUrl(path: string): string {
  return pathToFileURL(path).href;
}

describe('isTrustedFileUrl', () => {
  it('allows files inside the packaged app root', () => {
    expect(isTrustedFileUrl(fileUrl(`${appRoot}/index.html`), appRoot)).toBe(true);
    expect(isTrustedFileUrl(fileUrl(`${appRoot}/assets/app.js`), appRoot)).toBe(true);
  });

  it('allows the app root directory itself', () => {
    expect(isTrustedFileUrl(fileUrl(`${appRoot}/`), appRoot)).toBe(true);
  });

  it('rejects file URLs outside the packaged app root', () => {
    expect(isTrustedFileUrl(fileUrl('/tmp/preview.html'), appRoot)).toBe(false);
    expect(isTrustedFileUrl(fileUrl('/Applications/MyApp.app/Contents/Resources/other.html'), appRoot)).toBe(false);
  });

  it('rejects sibling paths that only share the same string prefix', () => {
    expect(isTrustedFileUrl(fileUrl(`${appRoot}-evil/index.html`), appRoot)).toBe(false);
  });

  it('rejects encoded traversal outside the app root', () => {
    const escaped = `${fileUrl(`${appRoot}/assets/`)}%2e%2e/%2e%2e/secret.html`;
    expect(isTrustedFileUrl(escaped, appRoot)).toBe(false);
  });

  it('rejects non-file and invalid URLs', () => {
    expect(isTrustedFileUrl('https://example.com', appRoot)).toBe(false);
    expect(isTrustedFileUrl('not a url', appRoot)).toBe(false);
  });
});

describe('createFileAppSenderCheck', () => {
  it('creates an IPC sender check for packaged app files only', () => {
    const check = createFileAppSenderCheck(appRoot);
    expect(check(fileUrl(`${appRoot}/index.html`))).toBe(true);
    expect(check(fileUrl('/tmp/preview.html'))).toBe(false);
  });
});
