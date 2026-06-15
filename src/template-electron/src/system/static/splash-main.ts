import { BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { pathToFileURL } from 'url';
import type { ElectronConfig } from './types';

/**
 * Create a splash-screen window and return a callback that closes it.
 *
 * The splash is a frameless, always-on-top, centered window that displays `cfg.splashScreen.image`.
 * The image is served via a temp HTML file that references it as a file:// URL so Chromium loads
 * it directly from disk — no base64 encoding overhead for large images.
 *
 * Returns `null` when `cfg.splashScreen` is not configured or has no `image` path.
 *
 * @param cfg  Electron platform config read from `capacitor.config.json`.
 * @returns    A `hideSplash(onClosed?)` function, or `null` if the splash is disabled.
 */
export function setupSplash(cfg: ElectronConfig): ((onClosed?: () => void) => void) | null {
  if (!cfg.splashScreen) return null;

  const {
    width = 400,
    height = 300,
    backgroundColor = '#ffffff',
    image,
    minDisplayTime = 0,
  } = cfg.splashScreen;

  if (!image) return null;

  const abs = path.join(__dirname, '..', 'assets', image);
  if (!fs.existsSync(abs)) return null;

  const htmlPath = path.join(os.tmpdir(), `cap-electron-splash-${Date.now()}.html`);
  try {
    fs.writeFileSync(htmlPath, buildHTML(backgroundColor, pathToFileURL(abs).href), 'utf-8');
  } catch {
    return null;
  }

  const splash = new BrowserWindow({
    width,
    height,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    center: true,
    resizable: false,
    focusable: false,
    transparent: backgroundColor === 'transparent',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  splash.loadFile(htmlPath);

  const shownAt = Date.now();

  return function hideSplash(onClosed?: () => void): void {
    const remaining = minDisplayTime - (Date.now() - shownAt);
    const close = () => {
      if (!splash.isDestroyed()) splash.close();
      onClosed?.();
    };
    if (remaining > 0) setTimeout(close, remaining);
    else close();
  };
}

function buildHTML(bg: string, imageUrl: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;background:${bg};overflow:hidden"><img src="${imageUrl}" style="max-width:100%;max-height:100%;object-fit:contain"></body></html>`;
}
