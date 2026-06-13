import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import './src/system/generated/electron-main-auto';
import './src/user/electron-main-user';
import { loadConfig } from './src/system/functions';

const isDev = !app.isPackaged;

const { appCfg, cfg } = loadConfig();

// Single instance lock — default on, opt-out with singleInstance: false
if (cfg.singleInstance !== false && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  setup();
}

function setup(): void {
  let win: BrowserWindow | null = null;

  function createWindow(): void {
    const iconPath = cfg.icon
      ? path.join(__dirname, '..', cfg.icon)
      : undefined;

    win = new BrowserWindow({
      width:          cfg.width          ?? 1200,
      height:         cfg.height         ?? 800,
      minWidth:       cfg.minWidth,
      minHeight:      cfg.minHeight,
      fullscreen:     cfg.fullscreen     ?? cfg.FullScreen ?? false,
      resizable:      cfg.resizable      !== false,
      center:         cfg.center         !== false,
      alwaysOnTop:    cfg.alwaysOnTop    ?? false,
      kiosk:          cfg.kiosk          ?? false,
      frame:            cfg.frame          !== false,
      titleBarStyle:    cfg.titleBarStyle,
      autoHideMenuBar:  cfg.autoHideMenuBar ?? false,
      backgroundColor:  appCfg.backgroundColor,
      title:            appCfg.appName,
      icon:             iconPath && fs.existsSync(iconPath) ? iconPath : undefined,
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
    } else {
      win.loadFile(path.join(process.resourcesPath, 'app', 'index.html'));
      if (cfg.openDevTools === true) win.webContents.openDevTools();
    }

    win.on('closed', () => { win = null; });
  }

  app.whenReady().then(() => {
    createWindow();

    // macOS: reopen window when clicking dock icon
    app.on('activate', () => {
      if (win === null) createWindow();
    });

    // Bring window to front when second instance is launched
    app.on('second-instance', () => {
      if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

