/** Configuration for the Electron platform — set under plugins.Electron in capacitor.config.ts */
export interface ElectronConfig {
  /** URL of the dev server. cap-electron open reads this too. Default: http://localhost:5173 */
  devUrl?: string;
  /** Initial window width in px. Default: 1200 */
  width?: number;
  /** Initial window height in px. Default: 800 */
  height?: number;
  /** Minimum window width */
  minWidth?: number;
  /** Minimum window height */
  minHeight?: number;
  /** Start in fullscreen mode. Default: false */
  fullscreen?: boolean;
  /** Allow the window to enter fullscreen (green button on macOS). Default: true */
  fullscreenable?: boolean;
  /** Center the window on screen on startup. Default: true */
  center?: boolean;
  /** Allow the user to resize the window. Default: true */
  resizable?: boolean;
  /** Keep the window on top of all other windows. Default: false */
  alwaysOnTop?: boolean;
  /** Kiosk mode — fullscreen, no system UI, ideal for POS/display apps. Default: false */
  kiosk?: boolean;
  /** Prevent launching more than one instance. Default: true */
  singleInstance?: boolean;
  /** Show native window frame and title bar. false = frameless. Default: true */
  frame?: boolean;
  /** macOS title bar style */
  titleBarStyle?: 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover';
  /** Auto-hide the menu bar (Windows/Linux). Default: false */
  autoHideMenuBar?: boolean;
  /** Path to window icon relative to electron/ (e.g. 'assets/icon.png') */
  icon?: string;
  /** Open DevTools on launch. Default: true in dev, false in production */
  openDevTools?: boolean;
  /** Renderer sandbox. Leave unset to use Electron's default. */
  sandbox?: boolean;
}

/** Contract for a Capacitor plugin's Electron support descriptor.
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
}
