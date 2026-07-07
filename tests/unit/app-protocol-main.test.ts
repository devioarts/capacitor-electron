// Tests for app-protocol-main.ts — production protocol serving maps web-style
// absolute app paths to packaged files without exposing arbitrary filesystem paths.
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockHandle, mockRegisterBufferProtocol } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockRegisterBufferProtocol: vi.fn((_scheme, _handler) => true),
}));

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => `/mock-${name}`,
  },
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    handle: mockHandle,
    registerBufferProtocol: mockRegisterBufferProtocol,
  },
}));

import {
  appProtocolUrl,
  createCapacitorFileSrcMappings,
  injectAppProtocolBase,
  isAllowedCapacitorFilePath,
  isAppProtocolUrl,
  isCapacitorFileProtocolUrl,
  isPassiveCapacitorFilePath,
  isTrustedAppProtocolUrl,
  resolveAppProtocolConfig,
  resolveAppProtocolFilePath,
  resolveCapacitorFileProtocolPath,
  setupAppProtocol,
} from '../../src/template-electron/src/system/static/electron-api/app-protocol-main.js';

let tempDirs: string[] = [];

afterEach(async () => {
  mockHandle.mockClear();
  mockRegisterBufferProtocol.mockClear();
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

function registeredHandleHandler(): (request: Request) => Promise<Response> {
  const handler = mockHandle.mock.calls[0]?.[1] as ((request: Request) => Promise<Response>) | undefined;
  if (!handler) throw new Error('protocol handler was not registered');
  return handler;
}

function registeredBufferHandler(): BufferProtocolHandler {
  const handler = mockRegisterBufferProtocol.mock.calls[0]?.[1] as BufferProtocolHandler | undefined;
  if (!handler) throw new Error('buffer protocol handler was not registered');
  return handler;
}

function invokeHandle(url: string, method = 'GET'): Promise<Response> {
  return registeredHandleHandler()(new Request(url, { method }));
}

function invokeBuffer(url: string, method = 'GET'): Promise<BufferProtocolResponse> {
  return new Promise((resolve) => {
    registeredBufferHandler()({ method, url }, (response) => {
      resolve(Buffer.isBuffer(response) ? { data: response } : response);
    });
  });
}

describe('resolveAppProtocolConfig', () => {
  it('uses the default scheme and host when omitted', () => {
    expect(resolveAppProtocolConfig()).toEqual({
      scheme: 'capacitor-electron',
      hostname: 'localhost',
      handler: 'buffer',
      debug: false,
      capacitorFileAccess: 'passive',
    });
  });

  it('normalizes custom scheme and hostname', () => {
    expect(resolveAppProtocolConfig({ scheme: 'My-App:', hostname: 'LOCALHOST' })).toMatchObject({
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

  it('accepts handle mode', () => {
    expect(resolveAppProtocolConfig({ handler: 'handle' })).toMatchObject({ handler: 'handle' });
  });

  it('normalizes custom Capacitor file route extension access', () => {
    expect(resolveAppProtocolConfig({ capacitorFileAccess: { extensions: ['PDF', '.Svg'] } }))
      .toMatchObject({ capacitorFileAccess: { extensions: ['.pdf', '.svg'] } });
  });

  it('rejects invalid Capacitor file route extension access', () => {
    expect(() => resolveAppProtocolConfig({ capacitorFileAccess: { extensions: ['../html'] } }))
      .toThrow('Invalid app protocol file extension');
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

  it('distinguishes trusted app URLs from virtual file route URLs', () => {
    const fileUrl = 'capacitor-electron://localhost/_capacitor_file_/data/evil.html';

    expect(isAppProtocolUrl(fileUrl, config)).toBe(true);
    expect(isCapacitorFileProtocolUrl(fileUrl, config)).toBe(true);
    expect(isTrustedAppProtocolUrl(fileUrl, config)).toBe(false);
    expect(isTrustedAppProtocolUrl('capacitor-electron://localhost/settings', config)).toBe(true);
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
      .toBe(resolve('/app/dist/index.html'));
  });

  it('maps absolute asset paths inside distDir', () => {
    expect(resolveAppProtocolFilePath(distDir, 'capacitor-electron://localhost/assets/logo.png', config))
      .toBe(resolve('/app/dist/assets/logo.png'));
  });

  it('decodes URL-escaped file paths', () => {
    expect(resolveAppProtocolFilePath(distDir, 'capacitor-electron://localhost/assets/my%20logo.png', config))
      .toBe(resolve('/app/dist/assets/my logo.png'));
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

describe('Capacitor file protocol paths', () => {
  const config = resolveAppProtocolConfig();
  const roots = [{ name: 'data', fileSystemPath: '/app/user-data' }];

  it('maps /_capacitor_file_/data paths inside the configured root', () => {
    expect(resolveCapacitorFileProtocolPath(roots, 'capacitor-electron://localhost/_capacitor_file_/data/images/a.png', config))
      .toBe(resolve('/app/user-data/images/a.png'));
  });

  it('blocks traversal outside the configured root', () => {
    expect(resolveCapacitorFileProtocolPath(roots, 'capacitor-electron://localhost/_capacitor_file_/data/%2e%2e%2fsecret.png', config))
      .toBeNull();
  });

  it('builds convertFileSrc mappings for renderer use', () => {
    expect(createCapacitorFileSrcMappings(config, roots)).toEqual([{
      name: 'data',
      fileUrlPrefix: pathToFileURL('/app/user-data/').href,
      urlPrefix: 'capacitor-electron://localhost/_capacitor_file_/data/',
    }]);
  });

  it('only treats passive media and font extensions as servable file route assets', () => {
    const config = resolveAppProtocolConfig();
    const pdfConfig = resolveAppProtocolConfig({ capacitorFileAccess: { extensions: ['pdf'] } });
    const allConfig = resolveAppProtocolConfig({ capacitorFileAccess: 'all' });

    expect(isPassiveCapacitorFilePath('/app/user-data/images/a.png')).toBe(true);
    expect(isPassiveCapacitorFilePath('/app/user-data/video/a.mp4')).toBe(true);
    expect(isPassiveCapacitorFilePath('/app/user-data/fonts/a.woff2')).toBe(true);
    expect(isPassiveCapacitorFilePath('/app/user-data/evil.html')).toBe(false);
    expect(isPassiveCapacitorFilePath('/app/user-data/evil.svg')).toBe(false);
    expect(isPassiveCapacitorFilePath('/app/user-data/evil.js')).toBe(false);
    expect(isAllowedCapacitorFilePath('/app/user-data/file.pdf', config)).toBe(false);
    expect(isAllowedCapacitorFilePath('/app/user-data/file.pdf', pdfConfig)).toBe(true);
    expect(isAllowedCapacitorFilePath('/app/user-data/evil.html', allConfig)).toBe(true);
  });
});

describe('setupAppProtocol', () => {
  it('uses the buffer protocol by default', async () => {
    const config = resolveAppProtocolConfig();
    const distDir = await createDist();
    setupAppProtocol(distDir, config);

    expect(mockRegisterBufferProtocol).toHaveBeenCalledWith('capacitor-electron', expect.any(Function));
    expect(mockHandle).not.toHaveBeenCalled();
  });

  it('serves assets with the correct content type through the buffer protocol', async () => {
    const config = resolveAppProtocolConfig();
    const distDir = await createDist();
    setupAppProtocol(distDir, config);

    const response = await invokeBuffer('capacitor-electron://localhost/assets/index.css');

    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Content-Type']).toBe('text/css');
    expect(response.data?.toString()).toBe('body{}');
  });

  it('adds CSP directly to buffer protocol responses when configured', async () => {
    const config = resolveAppProtocolConfig();
    const distDir = await createDist();
    setupAppProtocol(distDir, config, [], "default-src 'self'");

    const response = await invokeBuffer('capacitor-electron://localhost/index.html');

    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Content-Security-Policy']).toBe("default-src 'self'");
  });

  it('adds CSP directly to buffer protocol error responses when configured', async () => {
    const config = resolveAppProtocolConfig();
    const distDir = await createDist();
    setupAppProtocol(distDir, config, [], "default-src 'self'");

    const response = await invokeBuffer('capacitor-electron://localhost/assets/missing.css');

    expect(response.statusCode).toBe(404);
    expect(response.headers?.['Content-Security-Policy']).toBe("default-src 'self'");
  });

  it('returns 404 for missing asset-like paths instead of index.html', async () => {
    const config = resolveAppProtocolConfig();
    const distDir = await createDist();
    setupAppProtocol(distDir, config);

    const response = await invokeBuffer('capacitor-electron://localhost/assets/missing.css');

    expect(response.statusCode).toBe(404);
  });

  it('falls back to index.html with protocol base for route-like paths', async () => {
    const config = resolveAppProtocolConfig();
    const distDir = await createDist();
    setupAppProtocol(distDir, config);

    const response = await invokeBuffer('capacitor-electron://localhost/orders/123');

    expect(response.statusCode).toBe(200);
    expect(response.data?.toString()).toContain('<base href="capacitor-electron://localhost/">');
  });

  it('serves Capacitor data files from the virtual file route', async () => {
    const config = resolveAppProtocolConfig();
    const distDir = await createDist();
    const dataDir = await mkdtemp(join(tmpdir(), 'cap-electron-data-'));
    tempDirs.push(dataDir);
    await mkdir(join(dataDir, 'images'));
    await writeFile(join(dataDir, 'images', 'avatar.png'), 'png-data');
    setupAppProtocol(distDir, config, [{ name: 'data', fileSystemPath: dataDir }]);

    const response = await invokeBuffer('capacitor-electron://localhost/_capacitor_file_/data/images/avatar.png');

    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Content-Type']).toBe('image/png');
    expect(response.data?.toString()).toBe('png-data');
  });

  it('blocks active content from the virtual file route', async () => {
    const config = resolveAppProtocolConfig();
    const distDir = await createDist();
    const dataDir = await mkdtemp(join(tmpdir(), 'cap-electron-data-'));
    tempDirs.push(dataDir);
    await writeFile(join(dataDir, 'evil.html'), '<script>window.Electron.quit()</script>');
    await writeFile(join(dataDir, 'evil.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    setupAppProtocol(distDir, config, [{ name: 'data', fileSystemPath: dataDir }]);

    const htmlResponse = await invokeBuffer('capacitor-electron://localhost/_capacitor_file_/data/evil.html');
    const svgResponse = await invokeBuffer('capacitor-electron://localhost/_capacitor_file_/data/evil.svg');

    expect(htmlResponse.statusCode).toBe(404);
    expect(svgResponse.statusCode).toBe(404);
  });

  it('serves configured virtual file route extensions', async () => {
    const config = resolveAppProtocolConfig({ capacitorFileAccess: { extensions: ['pdf'] } });
    const distDir = await createDist();
    const dataDir = await mkdtemp(join(tmpdir(), 'cap-electron-data-'));
    tempDirs.push(dataDir);
    await writeFile(join(dataDir, 'report.pdf'), 'pdf-data');
    setupAppProtocol(distDir, config, [{ name: 'data', fileSystemPath: dataDir }]);

    const response = await invokeBuffer('capacitor-electron://localhost/_capacitor_file_/data/report.pdf');

    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Content-Type']).toBe('application/pdf');
    expect(response.data?.toString()).toBe('pdf-data');
  });

  it('can explicitly serve all virtual file route extensions', async () => {
    const config = resolveAppProtocolConfig({ capacitorFileAccess: 'all' });
    const distDir = await createDist();
    const dataDir = await mkdtemp(join(tmpdir(), 'cap-electron-data-'));
    tempDirs.push(dataDir);
    await writeFile(join(dataDir, 'doc.html'), '<h1>doc</h1>');
    setupAppProtocol(distDir, config, [{ name: 'data', fileSystemPath: dataDir }]);

    const response = await invokeBuffer('capacitor-electron://localhost/_capacitor_file_/data/doc.html');

    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Content-Type']).toBe('text/html; charset=utf-8');
    expect(response.data?.toString()).toBe('<h1>doc</h1>');
  });

  it('returns 404 for missing Capacitor file routes instead of falling back to index.html', async () => {
    const config = resolveAppProtocolConfig();
    const distDir = await createDist();
    const dataDir = await mkdtemp(join(tmpdir(), 'cap-electron-data-'));
    tempDirs.push(dataDir);
    setupAppProtocol(distDir, config, [{ name: 'data', fileSystemPath: dataDir }]);

    const response = await invokeBuffer('capacitor-electron://localhost/_capacitor_file_/data/images/missing.png');

    expect(response.statusCode).toBe(404);
  });

  it('exposes visible diagnostics when debug is enabled', async () => {
    const config = resolveAppProtocolConfig({ debug: true });
    const distDir = await createDist();
    setupAppProtocol(distDir, config);

    const response = await invokeBuffer('capacitor-electron://localhost/__cap_electron_protocol_debug');
    const body = JSON.parse(response.data?.toString() ?? '{}') as { mode: string; indexExists: boolean };

    expect(response.statusCode).toBe(200);
    expect(body.mode).toBe('buffer');
    expect(body.indexExists).toBe(true);
  });

  it('can use protocol.handle when explicitly requested', async () => {
    const config = resolveAppProtocolConfig({ handler: 'handle' });
    const distDir = await createDist();
    setupAppProtocol(distDir, config);

    const response = await invokeHandle('capacitor-electron://localhost/assets/index.css');

    expect(mockRegisterBufferProtocol).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/css');
    expect(await response.text()).toBe('body{}');
  });

  it('adds CSP directly to protocol.handle responses when configured', async () => {
    const config = resolveAppProtocolConfig({ handler: 'handle' });
    const distDir = await createDist();
    setupAppProtocol(distDir, config, [], "default-src 'self'");

    const response = await invokeHandle('capacitor-electron://localhost/assets/index.css');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
  });
});
