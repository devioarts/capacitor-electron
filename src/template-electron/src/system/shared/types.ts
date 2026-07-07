// Shared configuration types for the Electron template and the published package API.
export type CspConfig = string | Record<string, string | string[]> | false;

export interface AppMenuConfig {
  /** Enable the application menu from `src/user/menu/app.ts`. Default: false */
  enabled?: boolean;
  /** Hide the application menu. On macOS a minimal Quit menu is kept. Default: false */
  hide?: boolean;
  /** Include standard Edit menu (Undo, Redo, Cut, Copy, Paste, Select All). Default: true */
  editMenu?: boolean;
  /** Include View menu (Reload, Toggle DevTools, Zoom). Default: true in dev, false in production */
  viewMenu?: boolean;
}

export interface ContextMenuConfig {
  /** Enable renderer context menus from `src/user/menu/context.ts`. Default: false */
  enabled?: boolean;
}

export interface TrayMenuConfig {
  /** Enable the tray icon. Default: false */
  enabled?: boolean;
  /**
   * Filename of the tray icon inside `electron/assets/` (e.g. `'tray.png'`).
   * A leading slash is resolved from the project root and copied into `electron/assets/`
   * during `cap-electron sync`. Fallback: browserWindow.icon.
   */
  icon?: string;
  /** Tooltip text shown on hover. */
  tooltip?: string;
  /** Hide the window to tray on close instead of quitting. Default: false */
  minimizeToTray?: boolean;
}

export interface SplashScreenConfig {
  /**
   * Filename of the splash image inside `electron/assets/` (e.g. `'splash.png'`).
   * A leading slash is resolved from the project root and copied into `electron/assets/`
   * during `cap-electron sync` (e.g. `'/public/assets/splash.png'` → `'splash.png'`).
   * Supports PNG, JPEG, WebP, GIF, and SVG. Required — omitting disables the splash screen.
   */
  image?: string;
  /** Width of splash window in px. Default: 400 */
  width?: number;
  /** Height of splash window in px. Default: 300 */
  height?: number;
  /** Background color (any CSS color or 'transparent'). Default: '#ffffff' */
  backgroundColor?: string;
  /** Minimum time the splash stays visible in ms. Default: 0 */
  minDisplayTime?: number;
}

export interface DockConfig {
  /** Enable the macOS Dock menu from `src/user/menu/dock.ts`. macOS only. */
  enabled?: boolean;
  /** Hide the macOS Dock icon. Useful for pure menu-bar/tray apps. macOS only. */
  hideIcon?: boolean;
}

export interface AutoUpdaterConfig {
  enabled?: boolean;
  channel?: 'latest' | 'beta' | 'alpha';
  autoDownload?: boolean;
  autoInstallOnQuit?: boolean;
  allowPrerelease?: boolean;
  allowDowngrade?: boolean;
}

export interface ElectronAppSecurityConfig {
  /**
   * How `window.Electron.secureStorage` stores JSON object keys on disk.
   * - `'plain'` keeps original key names. Values are still encrypted with Electron safeStorage.
   * - `'hashed'` stores deterministic SHA-256 key hashes. Original key names are
   *   not stored, so secureStorage.keys() rejects instead of returning unusable hashes.
   * Existing data is not migrated automatically.
   * Default: 'plain'
   */
  secureStorageKeys?: 'plain' | 'hashed';
}

export type ExternalCommandResolveMode = 'app' | 'path' | 'absolute';
export type ExternalCommandPlatform =
  | 'aix'
  | 'android'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'cygwin'
  | 'netbsd';

export interface ExternalCommandConfig {
  /**
   * Executable name or path. Renderer code can only reference the surrounding
   * config key as an alias; it cannot choose an arbitrary command at runtime.
   */
  command: string;
  /**
   * How `command` is resolved.
   * - `'app'` resolves from the bundled web app bin directory: resources/app/bin.
   * - `'path'` resolves through the host PATH. `command` must be a bare executable name.
   * - `'absolute'` uses an absolute command path from this config.
   * Default: 'app'
   */
  resolve?: ExternalCommandResolveMode;
  /** Optional working directory. Relative paths are resolved from the app base for `resolve: 'app'`. */
  cwd?: string;
  /** Optional OS allowlist using Node.js process.platform values, e.g. ['win32']. */
  platforms?: ExternalCommandPlatform[];
  /** Optional exact argument allowlist. When present, every runtime arg must match one entry. */
  allowedArgs?: string[];
  /** Default timeout for this command in milliseconds. Use 0 to disable. Timed-out commands receive SIGTERM, then SIGKILL after a short grace period. Default: 30000. */
  timeoutMs?: number;
  /** Maximum captured stdout/stderr bytes per stream. Use 0 to disable result capture while still streaming output events. Default: 1048576. */
  maxOutputBytes?: number;
}

export interface ElectronAppProtocolConfig {
  /** Internal renderer protocol scheme used by serveMode: 'protocol'. Default: 'capacitor-electron' */
  scheme?: string;
  /** Internal renderer protocol hostname used by serveMode: 'protocol'. Default: 'localhost' */
  hostname?: string;
  /** Protocol handler implementation. Default: 'buffer'. Use 'handle' to try Electron's current protocol.handle API. */
  handler?: 'handle' | 'buffer';
  /** Expose protocol diagnostics at /__cap_electron_protocol_debug and detailed error responses. Default: false */
  debug?: boolean;
  /**
   * Which user-writable Capacitor file-route assets may be served by `Capacitor.convertFileSrc()`.
   * - `'passive'` serves only common image, media, and font extensions. Default.
   * - `'all'` serves any file under the mapped roots. Use only if those files never receive privileged IPC trust.
   * - `{ extensions: ['.pdf', '.svg'] }` serves only the listed extensions.
   */
  capacitorFileAccess?: 'passive' | 'all' | { extensions: string[] };
}

export interface ElectronDevConfig {
  /** URL of the dev server. cap-electron run reads this too. Default: http://localhost:5173 */
  url?: string;
  /** Open DevTools on launch. Default: true in dev, false in production */
  openDevTools?: boolean;
}

export interface ElectronAppConfig {
  /**
   * How the production build is served to the renderer.
   * - `'file'`   — `win.loadFile()` directly from the filesystem (default).
   * - `'protocol'` — custom in-app protocol with a real app root, so `/assets/...` works without a server.
   *   Registration failures are fatal because falling back would change the renderer origin/security model.
   * - `'server'` — embedded HTTP server on 127.0.0.1 (random ephemeral port).
   * Default: 'file'
   */
  serveMode?: 'file' | 'protocol' | 'server';
  /** Custom in-app protocol settings for `serveMode: 'protocol'`. */
  protocol?: ElectronAppProtocolConfig;
  /** Prevent launching more than one instance; second launch focuses the existing window. Default: true */
  singleInstance?: boolean;
  /** Remember window size and position between launches. Default: false */
  persistWindowState?: boolean;
  /** Custom URL protocol scheme for deep linking (e.g. 'myapp' enables myapp:// links). Disabled by default. */
  deepLinkingScheme?: string;
  /** Additional URL schemes allowed for `@capacitor/app-launcher`. */
  appLauncherSchemes?: string[];
  /**
   * Additional non-web URL schemes external managed windows may hand off to
   * `shell.openExternal`. These schemes are not loaded inside Electron; they are
   * delegated to the OS after the external window blocks the navigation/popup.
   * Dangerous script/data schemes are ignored. Default: [].
   */
  externalWindowAllowedSchemes?: string[];
  /**
   * Allowlisted native commands callable from `window.Electron.externalCommands`.
   * Keys are renderer-visible aliases; command paths stay in trusted config.
   */
  externalCommands?: Record<string, ExternalCommandConfig>;
  /** Auto-updater via electron-updater. Only active in production (app.isPackaged). */
  autoUpdater?: AutoUpdaterConfig;
  /** App-level security/privacy options. */
  security?: ElectronAppSecurityConfig;
}

export interface SafeWebPreferences {
  /**
   * Renderer sandbox (webPreferences). Leave unset to use Electron's default (true).
   * Set false only if a plugin requires full Node.js access in the preload.
   */
  sandbox?: boolean;

  /** Managed by Capacitor Electron and intentionally not configurable. */
  preload?: never;
  /** Managed by Capacitor Electron and intentionally not configurable. */
  contextIsolation?: never;
  /** Managed by Capacitor Electron and intentionally not configurable. */
  nodeIntegration?: never;

  [key: string]: unknown;
}

export interface BrowserWindowConfig {
  /** Initial window width in px. Default: 1200 */
  width?: number;
  /** Initial window height in px. Default: 800 */
  height?: number;
  /** Minimum window width. */
  minWidth?: number;
  /** Minimum window height. */
  minHeight?: number;
  /**
   * Filename of the window icon inside `electron/assets/` (e.g. `'icon.png'`).
   * A leading slash is resolved from the project root and copied into `electron/assets/`
   * during `cap-electron sync` (e.g. `'/public/assets/icon.png'` → `'icon.png'`).
   */
  icon?: string;
  webPreferences?: SafeWebPreferences;

  /**
   * Pass-through for Electron BrowserWindowConstructorOptions.
   * `preload`, `contextIsolation`, and `nodeIntegration` inside webPreferences are ignored
   * at runtime and typed as unavailable above because the platform bridge depends on them.
   */
  [key: string]: unknown;
}

export interface ElectronSecurityConfig {
  /**
   * Content Security Policy injected via response headers.
   * - `string` — used verbatim as the `Content-Security-Policy` header value
   * - `object` — `{ directive: 'source source2' }` assembled into a CSP string
   * - `false` — disables CSP entirely (not recommended for production)
   * - omit — sensible defaults: loose in dev, strict in prod
   */
  csp?: CspConfig;
}

export interface ElectronUiConfig {
  /** Native application menu (menu bar). */
  appMenu?: AppMenuConfig;
  /** Renderer context menu. Disabled by default. */
  contextMenu?: ContextMenuConfig;
  /** System tray icon and context menu. Disabled by default. */
  trayMenu?: TrayMenuConfig;
  /** Splash screen shown while the main app window loads in the background. */
  splashScreen?: SplashScreenConfig;
  /** macOS Dock behavior. */
  dockMenu?: DockConfig;
}

export interface CapacitorPluginsConfig {
  /** Native @capacitor/preferences implementation. Set false to use its web/localStorage fallback. */
  preferences?: boolean;
}

export interface ElectronInAppBrowserWindowOptions {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  x?: number;
  y?: number;
  center?: boolean;
  title?: string;
  alwaysOnTop?: boolean;
  resizable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  fullscreenable?: boolean;
  closable?: boolean;
  movable?: boolean;
  show?: boolean;
  frame?: boolean;
  autoHideMenuBar?: boolean;
  /** Creates an Electron modal child window. A focused app window is used as parent when available. */
  modal?: boolean;
  backgroundColor?: string;
  opacity?: number;
  titleBarStyle?: 'default' | 'hidden' | 'hiddenInset';
  /** Security-sensitive BrowserWindow options such as webPreferences are intentionally ignored at runtime. */
  [key: string]: unknown;
}

export interface ElectronInAppBrowserOptions {
  /** Sanitized subset of Electron BrowserWindowConstructorOptions. */
  window?: ElectronInAppBrowserWindowOptions;
  /** Controlled session settings for the embedded browser view. */
  session?: {
    partition?: string;
    clearCache?: boolean;
    clearStorage?: boolean;
  };
  /** Navigation policy for links opened by the embedded page. */
  navigation?: {
    openExternalLinksInSystemBrowser?: boolean;
  };
  /**
   * Electron permission names allowed for the embedded web content, e.g. ['media']
   * for camera/microphone. The policy is installed on the selected session every
   * time openInWebView() runs, including custom partitions. Omit or leave empty
   * to deny all permission requests.
   */
  permissions?: {
    allowed?: string[];
  };
}

export interface ElectronConfig {
  /** Development workflow settings. */
  dev?: ElectronDevConfig;
  /** Application lifecycle, serving, protocols, and updater settings. */
  app?: ElectronAppConfig;
  /** Pass-through options for `new BrowserWindow(...)`. */
  browserWindow?: BrowserWindowConfig;
  /** Security policy settings controlled by the platform. */
  security?: ElectronSecurityConfig;
  /** Native UI features provided by the platform wrapper. */
  ui?: ElectronUiConfig;
  /** Switches for built-in Capacitor plugin implementations. */
  capacitorPlugins?: CapacitorPluginsConfig;
  /** Deep-merged into the default electron-builder configuration. */
  builder?: Record<string, unknown>;
}

export interface AppConfig {
  appId?: string;
  appName?: string;
  backgroundColor?: string;
  plugins?: { Electron?: ElectronConfig };
}

export * from './bridge-types';
