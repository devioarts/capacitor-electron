import { BrowserWindow, ipcMain, session, type IpcMainInvokeEvent } from 'electron';

function ses(e: IpcMainInvokeEvent): Electron.Session {
  return BrowserWindow.fromWebContents(e.sender)?.webContents.session ?? session.defaultSession;
}

ipcMain.handle('session:clearCache', (e) => ses(e).clearCache());
ipcMain.handle('session:clearStorageData', (e, opts: Electron.ClearStorageDataOptions) => ses(e).clearStorageData(opts ?? {}));
ipcMain.handle('session:getUserAgent', (e) => ses(e).getUserAgent());
ipcMain.handle('session:setUserAgent', (e, userAgent: string) => { ses(e).setUserAgent(userAgent); });
ipcMain.handle('session:resolveProxy', (e, url: string) => ses(e).resolveProxy(url));
ipcMain.handle('session:setProxy', (e, config: Electron.ProxyConfig) => ses(e).setProxy(config ?? {}));
ipcMain.handle('session:closeAllConnections', (e) => ses(e).closeAllConnections());

ipcMain.handle('session:getCookies', (e, filter: Electron.CookiesGetFilter) => ses(e).cookies.get(filter ?? {}));
ipcMain.handle('session:setCookie', (e, cookie: Electron.CookiesSetDetails) => ses(e).cookies.set(cookie));
ipcMain.handle('session:removeCookie', (e, opts: { url: string; name: string }) => ses(e).cookies.remove(opts.url, opts.name));
