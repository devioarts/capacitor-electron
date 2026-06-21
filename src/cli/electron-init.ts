import * as fs from 'fs';
import * as path from 'path';
import { CAP_ELECTRON_INIT_JS } from './electron-init-content.js';

const SCRIPT_TAG = '<script src="/electron-init.js"></script>';
const BODY_OPEN_RE = /<body\b[^>]*>/i;

function injectScriptAfterBodyOpen(html: string): string | null {
  if (!BODY_OPEN_RE.test(html)) return null;
  return html.replace(BODY_OPEN_RE, (bodyTag) => `${bodyTag}\n    ${SCRIPT_TAG}`);
}

export function ensurePublicInit(capacitorRoot: string): void {
  const dest = path.join(capacitorRoot, 'public', 'electron-init.js');
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, CAP_ELECTRON_INIT_JS, 'utf-8');
  } catch (e) {
    console.error(`[cap-electron] Failed to write public/electron-init.js: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function ensureRootScriptTag(capacitorRoot: string): void {
  const htmlPath = path.join(capacitorRoot, 'index.html');
  if (!fs.existsSync(htmlPath)) return;
  try {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    if (html.includes('electron-init.js')) return;
    const patched = injectScriptAfterBodyOpen(html);
    if (!patched) return;
    fs.writeFileSync(htmlPath, patched, 'utf-8');
    console.log('[cap-electron] Injected electron-init.js into index.html');
  } catch (e) {
    console.error(`[cap-electron] Failed to patch index.html: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function ensureAppInit(appDir: string): void {
  const dest = path.join(appDir, 'electron-init.js');
  try {
    fs.writeFileSync(dest, CAP_ELECTRON_INIT_JS, 'utf-8');
  } catch (e) {
    console.error(`[cap-electron] Failed to write electron/app/electron-init.js: ${e instanceof Error ? e.message : String(e)}`);
  }

  const htmlPath = path.join(appDir, 'index.html');
  if (!fs.existsSync(htmlPath)) return;
  try {
    let html = fs.readFileSync(htmlPath, 'utf-8');
    // Strip any electron-init script Vite may have kept, hashed, or moved from the
    // root index.html (via ensureRootScriptTag). Re-inject from scratch so position
    // and filename are authoritative for the production app.
    html = html.replace(/<script\b[^>]*\bsrc=["'][^"']*electron-init[^"']*["'][^>]*>\s*<\/script>/gi, '');
    const patched = injectScriptAfterBodyOpen(html);
    if (!patched) return;
    fs.writeFileSync(htmlPath, patched, 'utf-8');
    console.log('[cap-electron] Injected electron-init.js into electron/app/index.html');
  } catch (e) {
    console.error(`[cap-electron] Failed to patch electron/app/index.html: ${e instanceof Error ? e.message : String(e)}`);
  }
}
