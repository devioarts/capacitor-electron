// Internal app protocol for production builds that need web-style absolute paths
// (`/assets/logo.png`) without running the embedded localhost server.
import { protocol } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { ElectronAppProtocolConfig } from '../../shared/types';

export interface ResolvedAppProtocolConfig {
  scheme: string;
  hostname: string;
}

const DEFAULT_PROTOCOL: ResolvedAppProtocolConfig = {
  scheme: 'capacitor-electron',
  hostname: 'localhost',
};

const SCHEME_RE = /^[a-z][a-z0-9+.-]*$/i;
const HOSTNAME_RE = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i;

const MIME: Record<string, string> = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.cjs':   'application/javascript',
  '.css':   'text/css',
  '.json':  'application/json',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.webp':  'image/webp',
  '.gif':   'image/gif',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.eot':   'application/vnd.ms-fontobject',
  '.mp4':   'video/mp4',
  '.webm':  'video/webm',
  '.mp3':   'audio/mpeg',
  '.wav':   'audio/wav',
  '.pdf':   'application/pdf',
  '.wasm':  'application/wasm',
};

export function resolveAppProtocolConfig(config?: ElectronAppProtocolConfig): ResolvedAppProtocolConfig {
  const scheme = String(config?.scheme ?? DEFAULT_PROTOCOL.scheme).trim().toLowerCase().replace(/:\/\/$/, '').replace(/:$/, '');
  if (!SCHEME_RE.test(scheme)) throw new Error(`Invalid app protocol scheme: ${config?.scheme ?? scheme}`);

  const hostname = String(config?.hostname ?? DEFAULT_PROTOCOL.hostname).trim().toLowerCase();
  if (!HOSTNAME_RE.test(hostname)) throw new Error(`Invalid app protocol hostname: ${config?.hostname ?? hostname}`);

  return { scheme, hostname };
}

export function appProtocolUrl(config: ResolvedAppProtocolConfig, appPath = '/index.html'): string {
  const pathname = appPath.startsWith('/') ? appPath : `/${appPath}`;
  return `${config.scheme}://${config.hostname}${pathname}`;
}

export function isAppProtocolUrl(rawUrl: string, config: ResolvedAppProtocolConfig): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === `${config.scheme}:` && url.hostname === config.hostname;
  } catch {
    return false;
  }
}

export function registerAppProtocolPrivileges(config: ResolvedAppProtocolConfig): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: config.scheme,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);
}

export function resolveAppProtocolFilePath(distDir: string, requestUrl: string, config: ResolvedAppProtocolConfig): string | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }

  if (url.protocol !== `${config.scheme}:` || url.hostname !== config.hostname) return null;

  const base = path.resolve(distDir);
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname).replace(/\\/g, '/');
  } catch {
    return null;
  }
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.resolve(base, `.${pathname}`);
  if (filePath !== base && !filePath.startsWith(base + path.sep)) return null;
  return filePath;
}

async function fileOrIndex(distDir: string, requestUrl: string, config: ResolvedAppProtocolConfig): Promise<string | null> {
  const requestedPath = resolveAppProtocolFilePath(distDir, requestUrl, config);
  if (!requestedPath) return null;

  try {
    const stat = await fs.promises.stat(requestedPath);
    if (stat.isFile()) return requestedPath;
  } catch { /* fall back to index.html */ }

  const indexPath = path.join(path.resolve(distDir), 'index.html');
  try {
    const stat = await fs.promises.stat(indexPath);
    return stat.isFile() ? indexPath : null;
  } catch {
    return null;
  }
}

export function setupAppProtocol(distDir: string, config: ResolvedAppProtocolConfig): void {
  protocol.handle(config.scheme, async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405 });
    }

    const filePath = await fileOrIndex(distDir, request.url, config);
    if (!filePath) {
      return new Response('Not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] ?? 'application/octet-stream' };
    if (request.method === 'HEAD') return new Response(null, { status: 200, headers });

    const data = await fs.promises.readFile(filePath);
    return new Response(new Uint8Array(data), { status: 200, headers });
  });
}
