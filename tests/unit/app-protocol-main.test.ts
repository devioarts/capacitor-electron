// Tests for app-protocol-main.ts — production protocol serving maps web-style
// absolute app paths to packaged files without exposing arbitrary filesystem paths.
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockProtocolHandle } = vi.hoisted(() => ({
  mockProtocolHandle: vi.fn(),
}));

vi.mock('electron', () => ({
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    registerBufferProtocol: vi.fn((_scheme, handler) => {
      mockProtocolHandle(_scheme, handler);
      return true;
    }),
  },
}));

import {
  appProtocolUrl,
  injectAppProtocolBase,
  isAppProtocolUrl,
  resolveAppProtocolConfig,
  resolveAppProtocolFilePath,
  setupAppProtocol,
} from '../../src/template-electron/src/system/static/electron-api/app-protocol-main.js';

let tempDirs: string[] = [];

afterEach(async () => {
  mockProtocolHandle.mockClear();
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

async function createDist(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cap-electron-protocol-'));
  tempDirs.push(dir);
  await mkdir(join(dir, 'assets'));
  await writeFile(join(dir, 'index.html'), '<html><head><title>x</title></head><body></body></html>');
  await writeFile(join(dir, 'assets', 'index.css'), 'body{}');
  return dir;
}

type BufferProtocolResponse = { statusCode?: number; data?: Buffer | string; headers?: Record<string, string | string[]> };
type BufferProtocolHandler = (
  request: { method: string; url: string },
  callback: (response: Buffer | BufferProtocolResponse) => void,
) => void;

function registeredHandler(): BufferProtocolHandler {
  const handler = mockProtocolHandle.mock.calls[0]?.[1] as BufferProtocolHandler | undefined;
  if (!handler) throw new Error('protocol handler was not registered');
  return handler;
}

function invokeHandler(url: string, method = 'GET'): Promise<BufferProtocolResponse> {
  return new Promise((resolve) => {
    registeredHandler()({ method, url }, (response) => {
      resolve(Buffer.isBuffer(response) ? { data: response } : response);
    });
  });
}

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

  it('builds the protocol root URL', () => {
    expect(appProtocolUrl(resolveAppProtocolConfig(), '/')).toBe('capacitor-electron://localhost/');
  });
});

describe('injectAppProtocolBase', () => {
  const config = resolveAppProtocolConfig();

  it('injects base href into html without an existing base tag', () => {
    expect(injectAppProtocolBase('<html><head><title>x</title></head><body></body></html>', config))
      .toContain('<head><base href="capacitor-electron://localhost/">');
  });

  it('preserves an existing base tag', () => {
    const html = '<html><head><base href="/custom/"><title>x</title></head></html>';
    expect(injectAppProtocolBase(html, config)).toBe(html);
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

describe('setupAppProtocol', () => {
  it('serves assets with the correct content type', async () => {
    const config = resolveAppProtocolConfig();
    const distDir = await createDist();
    setupAppProtocol(distDir, config);

    const response = await invokeHandler('capacitor-electron://localhost/assets/index.css');

    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Content-Type']).toBe('text/css');
    expect(response.data?.toString()).toBe('body{}');
  });

  it('returns 404 for missing asset-like paths instead of index.html', async () => {
    const config = resolveAppProtocolConfig();
    const distDir = await createDist();
    setupAppProtocol(distDir, config);

    const response = await invokeHandler('capacitor-electron://localhost/assets/missing.css');

    expect(response.statusCode).toBe(404);
  });

  it('falls back to index.html with protocol base for route-like paths', async () => {
    const config = resolveAppProtocolConfig();
    const distDir = await createDist();
    setupAppProtocol(distDir, config);

    const response = await invokeHandler('capacitor-electron://localhost/orders/123');

    expect(response.statusCode).toBe(200);
    expect(response.data?.toString()).toContain('<base href="capacitor-electron://localhost/">');
  });
});
