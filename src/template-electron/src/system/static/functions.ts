import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { AppConfig, ElectronConfig } from './types';

export type AnyRecord = Record<string, unknown>;

function isPlainObject(v: unknown): v is AnyRecord {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function registerPlugin(pluginClass: string, instance: AnyRecord, methods: readonly string[]): void {
  for (const method of methods) {
    ipcMain.handle(`${pluginClass}-${method}`, async (_event, opts: unknown) => {
      if (!isPlainObject(opts) && opts !== undefined) {
        return { success: false, error: { code: 'INVALID_PARAMS', message: 'Options must be a plain object', platform: 'electron', method, details: {} } };
      }
      try {
        return await (instance[method] as (opts: AnyRecord) => Promise<unknown>)((opts ?? {}) as AnyRecord);
      } catch (err) {
        return { success: false, error: { code: 'UNKNOWN', message: err instanceof Error ? err.message : String(err), platform: 'electron', method, details: {} } };
      }
    });
  }
}

export function loadConfig(): { appCfg: AppConfig; cfg: ElectronConfig } {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'capacitor.config.json'), 'utf-8')
    ) as AppConfig;
    return { appCfg: raw, cfg: raw.plugins?.Electron ?? {} };
  } catch {
    return { appCfg: {}, cfg: {} };
  }
}
