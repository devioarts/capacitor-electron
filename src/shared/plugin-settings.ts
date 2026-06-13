/**
 * Contract for a Capacitor plugin's Electron support descriptor.
 *
 * Plugin authors publish this as `plugin-settings.js` in their package:
 *   export const pluginSettings: PluginSettings = { ... }
 *
 * The `npm run update` script in the electron/ folder reads this file
 * and auto-generates the IPC bridge and main-process registrations.
 */
export interface PluginSettings {
  /** Name of the class that implements the plugin in the Electron main process. */
  pluginClass: string;
  /** Public async methods exposed to the renderer via IPC. */
  pluginMethods: readonly string[];
  /** Events the plugin can emit to the renderer (optional). */
  pluginEvents?: readonly string[];
  /**
   * Set to false to skip automatic ipcMain registration.
   * Use when you need custom setup — wire it manually in main.ts.
   * Default: true
   */
  autoRegister?: boolean;
  /**
   * ESM import statements added at the top of the generated electron-main.ts.
   * Example: ["import { MyPlugin } from '@org/my-plugin/electron'"]
   */
  imports?: readonly string[];
  /**
   * Statements executed once before plugin registration (inside app.whenReady).
   * Example: ["await MyPlugin.initialize()"]
   */
  beforeRegister?: readonly string[];
  /**
   * Names of `capacitor.config` plugin sections that this plugin reads at runtime.
   *
   * `cap-electron sync` copies only a small fixed set of top-level keys (appId, appName,
   * webDir, backgroundColor) plus `plugins.Electron` into `electron/capacitor.config.json`.
   * If your plugin reads its own section from that file (e.g. `plugins.CapacitorSQLite`),
   * list it here so the sync script includes it automatically.
   *
   * Example:
   * ```ts
   * configSections: ['CapacitorSQLite']
   * ```
   * The app developer does not need to configure anything — the sync script picks up
   * the declaration from every installed plugin and merges all sections.
   */
  configSections?: readonly string[];
}
