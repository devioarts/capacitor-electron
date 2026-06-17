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
   * A leading slash is resolved from the project root and copied into `electron/assets/`
   * during `cap-electron sync` (e.g. `'/public/assets/icon.png'` → `'icon.png'`).
   * Sets the icon shown in the title bar and taskbar (Windows / Linux) and the macOS Dock at runtime.
   *
   * This is separate from the **app bundle icon** (shown in the OS file explorer, installer,
   * Start Menu, or Finder). The bundle icon is configured in `electron-builder.js`:
   * place `assets/icon.png` in `electron/assets/`, with optional platform overrides
   * `assets/icon.ico` for Windows and `assets/icon.icns` for macOS.
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

  /**
   * Additional URL schemes allowed for `@capacitor/app-launcher`.
   *
   * `Browser.open()` always stays limited to `http://` and `https://`. AppLauncher
   * follows Capacitor's platform declaration model: it also allows those web
   * schemes, and may open custom app deep links listed here (for example
   * `['slack', 'myapp']`). Values can be written with or without `:` / `://`;
   * unsafe script schemes are ignored.
   */
  appLauncherSchemes?: string[];

  /** System tray icon and context menu. Disabled by default. */
  tray?: {
    /** Enable the tray icon. Default: false */
    enabled?: boolean;
    /**
     * Filename of the tray icon inside `electron/assets/` (e.g. `'tray.png'`).
     * A leading slash is resolved from the project root and copied into `electron/assets/`
     * during `cap-electron sync`. Fallback: window icon.
     */
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
     * A leading slash is resolved from the project root and copied into `electron/assets/`
     * during `cap-electron sync` (e.g. `'/public/assets/splash.png'` → `'splash.png'`).
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

  /** Built-in Capacitor plugin switches. Omitted entries default to true. */
  capacitor?: {
    /** Native @capacitor/preferences implementation. Set false to use its web/localStorage fallback. */
    preferences?: boolean;
  };

  [key: string]: unknown;
}

export interface AppConfig {
  appId?: string;
  appName?: string;
  backgroundColor?: string;
  plugins?: { Electron?: ElectronConfig };
}

export * from './bridge-types';
