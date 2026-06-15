import { app, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { loadConfig, setupUpdater, setupDeepLinking, flushDeepLink, setupCSP, setupMenu, setupSplash, loadWindowState, trackWindowState, setupShortcuts, setupTray, startLocalServer } from './src';
import { shortcuts } from './src/user/shortcuts';
import { trayMenu } from './src/user/tray';
import { onReady } from './src/user/main-user';

const isDev = !app.isPackaged;

const { appCfg, cfg } = loadConfig();

// Set app identity before app.ready so Windows Action Center and macOS dock
// show the correct name. On Windows, AUMID must also be set before ready.
if (appCfg.appName) app.setName(appCfg.appName);
if (process.platform === 'win32' && appCfg.appId) app.setAppUserModelId(appCfg.appId);

const iconImage = (() => {
  if (!cfg.icon) return undefined;
  const p = path.join(__dirname, '..', 'assets', cfg.icon);
  if (!fs.existsSync(p)) return undefined;
  const img = nativeImage.createFromPath(p);
  return img.isEmpty() ? undefined : img;
})();

// Single instance lock — default on, opt-out with singleInstance: false
if (cfg.singleInstance !== false && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  setup();
}

function setup(): void {
  let win: BrowserWindow | null = null;
  const getWin = () => win;

  if (cfg.deepLinkingScheme) {
    setupDeepLinking(cfg.deepLinkingScheme, getWin);
  }

  /**
   * Create the main BrowserWindow and load the web app.
   *
   * @param hideSplash     Callback that closes the splash screen once the renderer
   *                       finishes or fails loading. Pass `null` when reopening on macOS.
   * @param hookTrayWindow Callback from `setupTray` that wires up close-to-tray
   *                       behaviour. `null` when `minimizeToTray` is disabled.
   */
  function createWindow(hideSplash?: ((onClosed?: () => void) => void) | null, hookTrayWindow?: ((win: BrowserWindow) => void) | null): void {
    const windowState = loadWindowState(cfg);

    win = new BrowserWindow({
      width:          windowState.width,
      height:         windowState.height,
      x:              windowState.x,
      y:              windowState.y,
      minWidth:       cfg.minWidth,
      minHeight:      cfg.minHeight,
      fullscreen:     cfg.fullscreen      ?? false,
      fullscreenable: cfg.fullscreenable  !== false,
      resizable:      cfg.resizable       !== false,
      center:         windowState.x == null && cfg.center !== false,
      alwaysOnTop:    cfg.alwaysOnTop    ?? false,
      kiosk:          cfg.kiosk          ?? false,
      frame:            cfg.frame          !== false,
      titleBarStyle:    cfg.titleBarStyle,
      autoHideMenuBar:  cfg.autoHideMenuBar ?? false,
      backgroundColor:  appCfg.backgroundColor,
      title:            appCfg.appName,
      icon:             iconImage,
      show:             !hideSplash,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration:  false,
        sandbox:          cfg.sandbox,
        preload:          path.join(__dirname, 'preload.cjs'),
      },
    });

    if (isDev) {
      win.loadURL(cfg.devUrl ?? 'http://localhost:5173');
      if (cfg.openDevTools !== false) win.webContents.openDevTools();
      watchPreloadSignal(win);
    } else if (cfg.serveMode === 'server') {
      const w = win;
      startLocalServer(path.join(process.resourcesPath, 'app')).then((port) => {
        if (!w.isDestroyed()) w.loadURL(`http://127.0.0.1:${port}/index.html`);
      });
      if (cfg.openDevTools === true) win.webContents.openDevTools();
    } else {
      win.loadFile(path.join(process.resourcesPath, 'app', 'index.html'));
      if (cfg.openDevTools === true) win.webContents.openDevTools();
    }

    if (windowState.isMaximized) win.maximize();
    if (cfg.persistWindowState) trackWindowState(win);

    if (hideSplash) {
      const hide = hideSplash;
      const w = win;
      const onLoad = () => {
        w.webContents.off('did-finish-load', onLoad);
        w.webContents.off('did-fail-load', onLoad);
        hide(() => { if (!w.isDestroyed()) w.show(); });
      };
      w.webContents.once('did-finish-load', onLoad);
      w.webContents.once('did-fail-load', onLoad);
    }
    if (hookTrayWindow) hookTrayWindow(win);

    win.on('closed', () => { win = null; });
  }

  app.whenReady().then(() => {
    setupCSP(cfg, isDev);
    setupMenu(cfg, isDev);
    if (iconImage && process.platform === 'darwin') app.dock?.setIcon(iconImage);
    setupShortcuts(shortcuts, getWin);
    const hookTrayWindow = setupTray(cfg, getWin, trayMenu);
    const hideSplash = setupSplash(cfg);
    createWindow(hideSplash, hookTrayWindow);
    onReady(getWin);
    if (cfg.deepLinkingScheme) flushDeepLink(cfg.deepLinkingScheme, getWin);
    setupUpdater(cfg);

    // macOS: reopen window when clicking dock icon
    app.on('activate', () => {
      if (win === null) createWindow(null, hookTrayWindow);
      else { win.show(); win.focus(); }
    });

    // Bring window to front when second instance is launched
    // (skipped when deep linking is active — deep-link-main.ts handles focus there)
    if (!cfg.deepLinkingScheme) {
      app.on('second-instance', () => {
        if (win) {
          if (win.isMinimized()) win.restore();
          win.focus();
        }
      });
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

/**
 * Watch the `.dev-reload` signal file written by `cap-electron open` whenever
 * `preload.cjs` is rebuilt, then reload the renderer so the fresh preload
 * script takes effect without restarting the whole Electron process.
 *
 * Only active in development (`isDev === true`).
 */
function watchPreloadSignal(win: BrowserWindow): void {
  const signalFile = path.join(__dirname, '.dev-reload');
  let debounce: ReturnType<typeof setTimeout> | null = null;
  let watcher: fs.FSWatcher | null = null;
  try {
    watcher = fs.watch(signalFile, () => {
      if (debounce) return;
      debounce = setTimeout(() => {
        debounce = null;
        if (!win.isDestroyed()) win.webContents.reload();
      }, 100);
    });
    win.on('closed', () => { watcher?.close(); });
  } catch {
    // Signal file absent means we're not running under cap-electron open — fine.
  }
}

