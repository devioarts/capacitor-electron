export interface ElectronConfig {
  /** URL of the dev server. cap-electron open reads this too. Default: http://localhost:5173 */
  devUrl?: string;

  /**
   * How the production build is served to the renderer.
   * - `'file'`   — `win.loadFile()` directly from the filesystem (default). Simple, no server needed.
   * - `'server'` — embedded HTTP server on 127.0.0.1 (random ephemeral port). Required when you
   *                use Web APIs that need an HTTP origin: WebUSB, WebBluetooth, Web Serial,
   *                getDisplayMedia with certain constraints, etc.
   * Default: 'file'
   */
  serveMode?: 'file' | 'server';

  // ── Window geometry ────────────────────────────────────────────────────────
  /** Initial window width in px. Default: 1200 */
  width?: number;
  /** Initial window height in px. Default: 800 */
  height?: number;
  /** Minimum window width — prevents resizing below this value */
  minWidth?: number;
  /** Minimum window height — prevents resizing below this value */
  minHeight?: number;
  /** Start in fullscreen mode. Default: false */
  fullscreen?: boolean;
  /** Allow the window to enter fullscreen (green button on macOS). Default: true */
  fullscreenable?: boolean;
  /** Center the window on screen on startup. Default: true */
  center?: boolean;
  /** Allow the user to resize the window. Default: true */
  resizable?: boolean;

  // ── Window behaviour ───────────────────────────────────────────────────────
  /** Keep the window on top of all other windows. Default: false */
  alwaysOnTop?: boolean;
  /** Kiosk mode — fullscreen, no system UI, ideal for POS/display apps. Default: false */
  kiosk?: boolean;
  /** Prevent launching more than one instance; second launch focuses the existing window. Default: true */
  singleInstance?: boolean;
  /** Remember window size and position between launches. Default: false */
  persistWindowState?: boolean;

  // ── Appearance ─────────────────────────────────────────────────────────────
  /** Show native window frame and title bar. false = frameless window. Default: true */
  frame?: boolean;
  /** macOS title bar style. 'hiddenInset' gives a modern look with traffic lights inset into the app. */
  titleBarStyle?: 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover';
  /** Auto-hide the menu bar (Windows/Linux). User can show it by pressing Alt. Default: false */
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
  /**
   * Filename of the **window icon** inside `electron/assets/` (e.g. `'icon.png'`).
   * Sets the icon shown in the title bar and taskbar (Windows / Linux) and the macOS Dock at runtime.
   *
   * This is separate from the **app bundle icon** (shown in the OS file explorer, installer,
   * Start Menu, or Finder). The bundle icon is configured in `electron-builder.js`:
   * place `assets/icon.png` (min 512×512, recommended 1024×1024) in `electron/assets/` and
   * electron-builder will auto-convert it to `.icns` for macOS and `.ico` for Windows.
   * Per-platform overrides: `assets/icon.icns` / `assets/icon.ico` take priority if present.
   */
  icon?: string;

  // ── Dev tools ──────────────────────────────────────────────────────────────
  /** Open DevTools on launch. Default: true in dev, false in production */
  openDevTools?: boolean;

  // ── Security ───────────────────────────────────────────────────────────────
  /** Renderer sandbox (webPreferences). Leave unset to use Electron's default (true).
   *  Set false only if a plugin requires full Node.js access in the preload. */
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
    /** Filename of the tray icon inside `electron/assets/` (e.g. `'tray.png'`). Fallback: window icon. */
    icon?: string;
    /** Tooltip text shown on hover. */
    tooltip?: string;
    /** Hide the window to tray on close instead of quitting. Default: false */
    minimizeToTray?: boolean;
  };

  /**
   * Splash screen shown while the main app window loads in the background.
   * The main window stays hidden until the splash closes, then both switch atomically.
   * Requires `image` — omitting it disables the splash screen entirely.
   */
  splashScreen?: {
    /**
     * Filename of the splash image inside `electron/assets/` (e.g. `'splash.png'`).
     * Supports PNG, JPEG, WebP, GIF, and SVG. Required — omitting disables the splash screen.
     *
     * The image is loaded directly from disk (no base64 encoding), so even large files
     * display instantly.
     */
    image?: string;
    /** Width of splash window in px. Default: 400 */
    width?: number;
    /** Height of splash window in px. Default: 300 */
    height?: number;
    /** Background color (any CSS color or 'transparent'). Default: '#ffffff' */
    backgroundColor?: string;
    /**
     * Minimum time the splash stays visible in ms, even if the app loads faster.
     * Prevents a flash when the page loads immediately. Default: 0
     */
    minDisplayTime?: number;
  };

  /** Auto-updater via electron-updater. Only active in production (app.isPackaged). */
  autoUpdater?: {
    enabled?: boolean;
    channel?: 'latest' | 'beta' | 'alpha';
    autoDownload?: boolean;
    autoInstallOnQuit?: boolean;
    allowPrerelease?: boolean;
    allowDowngrade?: boolean;
  };

  [key: string]: unknown;
}

export interface AppConfig {
  appId?: string;
  appName?: string;
  backgroundColor?: string;
  plugins?: { Electron?: ElectronConfig };
}

// ── Power Monitor ─────────────────────────────────────────────────────────────

export type PowerMonitorEventName =
  | 'suspend'
  | 'resume'
  | 'lock-screen'
  | 'unlock-screen'
  | 'on-battery'
  | 'on-ac'
  | 'shutdown';

export type IdleState = 'active' | 'idle' | 'locked' | 'unknown';

// ── Screen / Display ──────────────────────────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElectronDisplay {
  id: number;
  label: string;
  bounds: Rect;
  workArea: Rect;
  size: { width: number; height: number };
  workAreaSize: { width: number; height: number };
  scaleFactor: number;
  rotation: number;
  internal: boolean;
  touchSupport: 'available' | 'unavailable' | 'unknown';
  accelerometerSupport: 'available' | 'unavailable' | 'unknown';
  colorDepth: number;
  colorSpace: string;
  depthPerComponent: number;
  displayFrequency: number;
  detected: boolean;
  monochrome: boolean;
}

export type ScreenEventName = 'display-added' | 'display-removed' | 'display-metrics-changed';

export interface ScreenEventPayload {
  type: ScreenEventName;
  data: ElectronDisplay | { display: ElectronDisplay; changedMetrics: string[] };
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
  /** Subscribe to an updater event. Returns an unsubscribe function. */
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
  /** Auto-updater bridge. No-op handlers when autoUpdater.enabled is false. */
  updater?: UpdaterBridge;
  /**
   * Subscribe to incoming deep link URLs. Returns an unsubscribe function.
   * No-op handler when deepLinkingScheme is not set in capacitor.config.
   */
  onDeepLink?(callback: (data: { url: string }) => void): () => void;
  /**
   * Register a global shortcut from the renderer at runtime.
   * When triggered, the shortcut fires `onShortcut()` with the given `event` name.
   * Returns `true` if registration succeeded, `false` if the accelerator is already
   * taken by another application.
   *
   * The shortcut is automatically unregistered when the app quits.
   * Call `unregisterShortcut()` to remove it earlier.
   *
   * @param accelerator Electron accelerator string, e.g. `'CmdOrCtrl+Shift+K'`.
   * @param event       Arbitrary event name forwarded to `onShortcut()`.
   */
  registerShortcut(accelerator: string, event: string): Promise<boolean>;
  /**
   * Unregister a global shortcut that was previously registered via `registerShortcut()`.
   *
   * @param accelerator The accelerator string passed to `registerShortcut()`.
   */
  unregisterShortcut(accelerator: string): Promise<void>;
  /**
   * Subscribe to global shortcut events sent from the main process.
   * Returns an unsubscribe function — call it on component unmount to avoid memory leaks.
   *
   * @example
   * useEffect(() => {
   *   return window.Electron.onShortcut(({ event }) => {
   *     if (event === 'open-search') setSearchOpen(true);
   *   });
   * }, []);
   */
  onShortcut(callback: (data: { event: string }) => void): () => void;

  // ── Badge count ─────────────────────────────────────────────────────────────
  /** Set the dock/taskbar badge count. Returns false on unsupported platforms. */
  setBadgeCount(count: number): Promise<boolean>;
  getBadgeCount(): Promise<number>;

  // ── Power Monitor ───────────────────────────────────────────────────────────
  /** Subscribe to power monitor events (suspend/resume/lock-screen etc.). Returns unsubscribe fn. */
  onPowerMonitorEvent(callback: (data: { type: PowerMonitorEventName }) => void): () => void;
  /** Returns whether the system is active, idle, locked, or unknown. */
  getPowerMonitorIdleState(idleThreshold: number): Promise<IdleState>;
  /** Returns the time in seconds since the last user input. */
  getPowerMonitorIdleTime(): Promise<number>;

  // ── Screen / Display ────────────────────────────────────────────────────────
  getAllDisplays(): Promise<ElectronDisplay[]>;
  getPrimaryDisplay(): Promise<ElectronDisplay>;
  getCursorScreenPoint(): Promise<{ x: number; y: number }>;
  /** Returns the display under the current cursor position. */
  getCursorDisplay(): Promise<ElectronDisplay>;
  /** Subscribe to display change events (added/removed/metrics-changed). Returns unsubscribe fn. */
  onScreenEvent(callback: (data: ScreenEventPayload) => void): () => void;
}

