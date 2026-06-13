// Electron main-process implementation of __PLUGIN_CLASS__.
// Runs in the main process — full access to Node.js and Electron APIs.
// IPC wiring is generated automatically by `cap-electron sync`.

import { app } from 'electron';
import * as path from 'path';

// ── Option / result types ─────────────────────────────────────────────────────
// Copy from your plugin's src/definitions.ts or re-declare here.
// All values must be JSON-serialisable (no class instances, no functions).

export interface EchoOptions {
  value: string;
}

// ── Plugin class ──────────────────────────────────────────────────────────────

export class __PLUGIN_CLASS__ {
  async echo(opts: EchoOptions): Promise<{ value: string }> {
    return { value: opts.value };
  }

  // Example: return a platform-specific path using Electron's app module
  async getDataPath(): Promise<{ path: string }> {
    return { path: path.join(app.getPath('userData'), '__PLUGIN_CLASS__') };
  }
}
