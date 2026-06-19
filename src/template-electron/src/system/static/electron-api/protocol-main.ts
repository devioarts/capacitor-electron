import { app, ipcMain, protocol, shell } from 'electron';
import { loadConfig } from '../../shared/functions';

const SCHEME_RE = /^[a-z][a-z0-9+.-]*$/i;

function cleanScheme(raw: string): string {
  const scheme = String(raw ?? '').trim().toLowerCase().replace(/:\/\/$/, '').replace(/:$/, '');
  if (!SCHEME_RE.test(scheme)) throw new Error(`Invalid protocol scheme: ${raw}`);
  return scheme;
}

function configuredSchemes(): string[] {
  const { cfg } = loadConfig();
  return [
    cfg.app?.deepLinkingScheme,
    ...(Array.isArray(cfg.app?.appLauncherSchemes) ? cfg.app.appLauncherSchemes : []),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map(cleanScheme);
}

ipcMain.handle('protocol:getConfiguredSchemes', () => [...new Set(configuredSchemes())]);
ipcMain.handle('protocol:isProtocolHandled', (_e, scheme: string) => protocol.isProtocolHandled(cleanScheme(scheme)));
ipcMain.handle('protocol:isDefaultProtocolClient', (_e, scheme: string) => app.isDefaultProtocolClient(cleanScheme(scheme)));

ipcMain.handle('protocol:setAsDefaultProtocolClient', (_e, scheme: string) => {
  const clean = cleanScheme(scheme);
  if (!configuredSchemes().includes(clean)) {
    throw new Error(`Refusing to register unconfigured protocol scheme: ${clean}`);
  }
  return app.setAsDefaultProtocolClient(clean);
});

ipcMain.handle('protocol:removeAsDefaultProtocolClient', (_e, scheme: string) =>
  app.removeAsDefaultProtocolClient(cleanScheme(scheme)));

ipcMain.handle('protocol:openExternal', async (_e, url: string) => {
  const parsed = new URL(url);
  if (!['http:', 'https:', 'mailto:', ...configuredSchemes().map((s) => `${s}:`)].includes(parsed.protocol)) {
    throw new Error(`Protocol is not allowed for openExternal: ${parsed.protocol}`);
  }
  await shell.openExternal(parsed.href);
});
