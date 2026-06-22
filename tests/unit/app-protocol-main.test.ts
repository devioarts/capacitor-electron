// Tests for app-protocol-main.ts — production protocol serving maps web-style
// absolute app paths to packaged files without exposing arbitrary filesystem paths.
import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    handle: vi.fn(),
  },
}));

import {
  appProtocolUrl,
  isAppProtocolUrl,
  resolveAppProtocolConfig,
  resolveAppProtocolFilePath,
} from '../../src/template-electron/src/system/static/electron-api/app-protocol-main.js';

describe('resolveAppProtocolConfig', () => {
  it('uses the default scheme and host when omitted', () => {
    expect(resolveAppProtocolConfig()).toEqual({
      scheme: 'capacitor-electron',
      hostname: 'localhost',
    });
  });

  it('normalizes custom scheme and hostname', () => {
    expect(resolveAppProtocolConfig({ scheme: 'My-App:', hostname: 'LOCALHOST' })).toEqual({
      scheme: 'my-app',
      hostname: 'localhost',
    });
  });

  it('rejects invalid schemes', () => {
    expect(() => resolveAppProtocolConfig({ scheme: '1-app' })).toThrow('Invalid app protocol scheme');
  });

  it('rejects invalid hostnames', () => {
    expect(() => resolveAppProtocolConfig({ hostname: 'local/host' })).toThrow('Invalid app protocol hostname');
  });
});

describe('appProtocolUrl', () => {
  it('builds a root index URL by default', () => {
    expect(appProtocolUrl(resolveAppProtocolConfig())).toBe('capacitor-electron://localhost/index.html');
  });

  it('adds a leading slash when needed', () => {
    expect(appProtocolUrl(resolveAppProtocolConfig(), 'assets/logo.png'))
      .toBe('capacitor-electron://localhost/assets/logo.png');
  });
});

describe('isAppProtocolUrl', () => {
  const config = resolveAppProtocolConfig();

  it('accepts URLs on the configured protocol and host', () => {
    expect(isAppProtocolUrl('capacitor-electron://localhost/settings', config)).toBe(true);
  });

  it('rejects other hosts', () => {
    expect(isAppProtocolUrl('capacitor-electron://example.com/settings', config)).toBe(false);
  });
});

describe('resolveAppProtocolFilePath', () => {
  const config = resolveAppProtocolConfig();
  const distDir = '/app/dist';

  it('maps / to index.html', () => {
    expect(resolveAppProtocolFilePath(distDir, 'capacitor-electron://localhost/', config))
      .toBe('/app/dist/index.html');
  });

  it('maps absolute asset paths inside distDir', () => {
    expect(resolveAppProtocolFilePath(distDir, 'capacitor-electron://localhost/assets/logo.png', config))
      .toBe('/app/dist/assets/logo.png');
  });

  it('decodes URL-escaped file paths', () => {
    expect(resolveAppProtocolFilePath(distDir, 'capacitor-electron://localhost/assets/my%20logo.png', config))
      .toBe('/app/dist/assets/my logo.png');
  });

  it('blocks encoded slash path traversal', () => {
    expect(resolveAppProtocolFilePath(distDir, 'capacitor-electron://localhost/%2e%2e%2fsecret.txt', config))
      .toBeNull();
  });

  it('blocks encoded backslash path traversal', () => {
    expect(resolveAppProtocolFilePath(distDir, 'capacitor-electron://localhost/%5C..%5Csecret.txt', config))
      .toBeNull();
  });
});
