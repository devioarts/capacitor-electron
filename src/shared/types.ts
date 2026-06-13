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
  /** Remember window size and position between launches. Default: false */
  persistWindowState?: boolean;
  /** Show native window frame and title bar. false = frameless. Default: true */
  frame?: boolean;
  /** macOS title bar style */
  titleBarStyle?: 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover';
  /** Auto-hide the menu bar (Windows/Linux). Default: false */
  autoHideMenuBar?: boolean;
  /**
   * Native application menu (menu bar).
   * - `false` — hide entirely (on macOS keeps a minimal App menu so Cmd+Q still works)
   * - object — build a menu from the options below
   * - omit — keep Electron's default menu
   */
  menu?: false | {
    /** Include standard Edit menu (Undo, Redo, Cut, Copy, Paste, Select All). Default: true */
    editMenu?: boolean;
    /** Include View menu (Reload, Toggle DevTools, Zoom). Default: true in dev, false in production */
    viewMenu?: boolean;
  };
  /** Path to window icon relative to electron/ (e.g. 'assets/icon.png') */
  icon?: string;
  /** Open DevTools on launch. Default: true in dev, false in production */
  openDevTools?: boolean;
  /** Renderer sandbox. Leave unset to use Electron's default. */
  sandbox?: boolean;
  /**
   * Content Security Policy injected via response headers.
   * - `string` — used verbatim as the `Content-Security-Policy` header value
   * - `object` — `{ directive: 'source source2' }` assembled into a CSP string
   * - `false` — disables CSP entirely (not recommended for production)
   * - omit — sensible defaults: loose in dev, strict in prod
   */
  csp?: string | Record<string, string | string[]> | false;

  /** Custom URL protocol scheme for deep linking (e.g. 'myapp' enables myapp:// links). Disabled by default. */
  deepLinkingScheme?: string;

  /** System tray icon and context menu. Disabled by default. */
  tray?: {
    /** Enable the tray icon. Default: false */
    enabled?: boolean;
    /** Path to tray icon relative to electron/ directory (e.g. 'assets/tray.png'). Fallback: window icon. */
    icon?: string;
    /** Tooltip text shown on hover. */
    tooltip?: string;
    /** Hide the window to tray on close instead of quitting. Default: false */
    minimizeToTray?: boolean;
  };

  /** Splash screen shown while the app window is loading. Disabled by default. */
  splashScreen?: {
    /** Path to splash image relative to electron/ directory (e.g. 'assets/splash.png'). Required — omitting it disables the splash screen entirely. */
    image?: string;
    /** Width of splash window in px. Default: 400 */
    width?: number;
    /** Height of splash window in px. Default: 300 */
    height?: number;
    /** Background color (any CSS color or 'transparent'). Default: '#ffffff' */
    backgroundColor?: string;
    /** Minimum display time in ms — prevents a flash when the app loads quickly. Default: 0 */
    minDisplayTime?: number;
  };

  /** Auto-updater via electron-updater. Only active in production (app.isPackaged). */
  autoUpdater?: {
    /** Enable the updater. Default: false */
    enabled?: boolean;
    /** Update channel. Default: 'latest' */
    channel?: 'latest' | 'beta' | 'alpha';
    /** Download update automatically when found. Default: false */
    autoDownload?: boolean;
    /** Install on next quit if update is downloaded. Default: true */
    autoInstallOnQuit?: boolean;
    /** Allow pre-release versions. Default: false */
    allowPrerelease?: boolean;
    /** Allow downgrading to an older version. Default: false */
    allowDowngrade?: boolean;
  };
}

export interface UpdateInfo {
  version: string;
  releaseNotes?: string | string[] | null;
  releaseDate?: string;
  [key: string]: unknown;
}

export interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export interface UpdaterEventMap {
  'checking-for-update':  void;
  'update-available':     UpdateInfo;
  'update-not-available': UpdateInfo;
  'download-progress':    DownloadProgress;
  'update-downloaded':    UpdateInfo;
  'error':                { message: string };
}

export type UpdaterEventName = keyof UpdaterEventMap;

export interface UpdaterBridge {
  checkForUpdate(): Promise<void>;
  downloadUpdate(): Promise<void>;
  quitAndInstall(): void;
  on<K extends UpdaterEventName>(event: K, callback: (data: UpdaterEventMap[K]) => void): () => void;
}

export interface ElectronBridge {
  quit():                       Promise<void>;
  minimize():                   Promise<void>;
  maximize():                   Promise<void>;
  unmaximize():                 Promise<void>;
  toggleMaximize():             Promise<void>;
  isMaximized():                Promise<boolean>;
  setFullscreen(flag: boolean): Promise<void>;
  isFullscreen():               Promise<boolean>;
  focus():                      Promise<void>;
  reload():                     Promise<void>;
  openDevTools():               Promise<void>;
  closeDevTools():              Promise<void>;
  getAppVersion():              Promise<string>;
  updater?: UpdaterBridge;
  onDeepLink?(callback: (data: { url: string }) => void): () => void;
  registerShortcut(accelerator: string, event: string): Promise<boolean>;
  unregisterShortcut(accelerator: string): Promise<void>;
  onShortcut(callback: (data: { event: string }) => void): () => void;
}

declare global {
  interface Window {
    Electron: ElectronBridge;
  }
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
