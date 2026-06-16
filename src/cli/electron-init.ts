import * as fs from 'fs';
import * as path from 'path';
import { CAP_ELECTRON_INIT_JS } from './electron-init-content.js';

const SCRIPT_TAG = '<script src="/electron-init.js"></script>';

export function ensurePublicInit(capacitorRoot: string): void {
  const dest = path.join(capacitorRoot, 'public', 'electron-init.js');
  if (fs.existsSync(dest)) return;
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, CAP_ELECTRON_INIT_JS, 'utf-8');
    console.log('[cap-electron] Created public/electron-init.js');
  } catch (e) {
    console.error(`[cap-electron] Failed to create public/electron-init.js: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function ensureRootScriptTag(capacitorRoot: string): void {
  const htmlPath = path.join(capacitorRoot, 'index.html');
  if (!fs.existsSync(htmlPath)) return;
  try {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    if (html.includes('electron-init.js')) return;
    fs.writeFileSync(htmlPath, html.replace('<body>', `<body>\n    ${SCRIPT_TAG}`), 'utf-8');
    console.log('[cap-electron] Injected electron-init.js into index.html');
  } catch (e) {
    console.error(`[cap-electron] Failed to patch index.html: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function ensureAppInit(appDir: string): void {
  const dest = path.join(appDir, 'electron-init.js');
  if (!fs.existsSync(dest)) {
    try {
      fs.writeFileSync(dest, CAP_ELECTRON_INIT_JS, 'utf-8');
      console.log('[cap-electron] Created electron/app/electron-init.js');
    } catch (e) {
      console.error(`[cap-electron] Failed to create electron/app/electron-init.js: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const htmlPath = path.join(appDir, 'index.html');
  if (!fs.existsSync(htmlPath)) return;
  try {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    if (html.includes('electron-init.js')) return;
    fs.writeFileSync(htmlPath, html.replace('<body>', `<body>\n    ${SCRIPT_TAG}`), 'utf-8');
    console.log('[cap-electron] Injected electron-init.js into electron/app/index.html');
  } catch (e) {
    console.error(`[cap-electron] Failed to patch electron/app/index.html: ${e instanceof Error ? e.message : String(e)}`);
  }
}
