import { BrowserWindow, ipcMain, shell, type BrowserWindowConstructorOptions, type IpcMainInvokeEvent } from 'electron';
import * as path from 'path';

const managed = new Map<number, BrowserWindow>();
type ManagedWindowOptions = Pick<BrowserWindowConstructorOptions,
  | 'width'
  | 'height'
  | 'x'
  | 'y'
  | 'minWidth'
  | 'minHeight'
  | 'title'
  | 'modal'
  | 'alwaysOnTop'
  | 'resizable'
  | 'minimizable'
  | 'maximizable'
  | 'fullscreenable'
  | 'backgroundColor'
  | 'show'
> & { url?: string };

function currentWindow(e: IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(e.sender);
}

function serialize(win: BrowserWindow): Record<string, unknown> {
  return {
    id: win.id,
    title: win.getTitle(),
    bounds: win.getBounds(),
    isVisible: win.isVisible(),
    isFocused: win.isFocused(),
    isMinimized: win.isMinimized(),
    isMaximized: win.isMaximized(),
    isFullScreen: win.isFullScreen(),
    isDestroyed: win.isDestroyed(),
  };
}

function getManaged(id: number): BrowserWindow {
  const win = managed.get(id);
  if (!win || win.isDestroyed()) throw new Error(`Managed window not found: ${id}`);
  return win;
}

function webUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Unsupported external URL protocol: ${url.protocol}`);
  }
  return url.href;
}

function windowOptions(raw: ManagedWindowOptions | undefined): ManagedWindowOptions {
  const opts = raw ?? {};
  const allowed: ManagedWindowOptions = {
    width: opts.width,
    height: opts.height,
    x: opts.x,
    y: opts.y,
    minWidth: opts.minWidth,
    minHeight: opts.minHeight,
    title: opts.title,
    modal: opts.modal,
    alwaysOnTop: opts.alwaysOnTop,
    resizable: opts.resizable,
    minimizable: opts.minimizable,
    maximizable: opts.maximizable,
    fullscreenable: opts.fullscreenable,
    backgroundColor: opts.backgroundColor,
    show: opts.show,
    url: opts.url,
  };

  for (const key of Object.keys(allowed) as Array<keyof ManagedWindowOptions>) {
    if (allowed[key] === undefined) delete allowed[key];
  }

  return allowed;
}

ipcMain.handle('windows:create', (e, rawOpts: ManagedWindowOptions | undefined) => {
  const opts = windowOptions(rawOpts);
  const parent = currentWindow(e) ?? undefined;
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    show: true,
    parent,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    ...opts,
  });
  managed.set(win.id, win);
  win.once('closed', () => managed.delete(win.id));

  if (opts?.url) {
    void win.loadURL(webUrl(opts.url));
  }

  return serialize(win);
});

ipcMain.handle('windows:list', () => BrowserWindow.getAllWindows().filter((win) => !win.isDestroyed()).map(serialize));
ipcMain.handle('windows:focus', (_e, id: number) => { getManaged(id).focus(); });
ipcMain.handle('windows:close', (_e, id: number) => { getManaged(id).close(); });
ipcMain.handle('windows:show', (_e, id: number) => { getManaged(id).show(); });
ipcMain.handle('windows:hide', (_e, id: number) => { getManaged(id).hide(); });
ipcMain.handle('windows:setBounds', (_e, opts: { id: number; bounds: Electron.Rectangle }) => { getManaged(opts.id).setBounds(opts.bounds); });
ipcMain.handle('windows:openExternal', async (_e, url: string) => { await shell.openExternal(webUrl(url)); });
