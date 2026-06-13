export interface ElectronConfig {
  /** URL of the dev server. cap-electron open reads this too. Default: http://localhost:5173 */
  devUrl?: string;

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
  /** @deprecated Use fullscreen */
  FullScreen?: boolean;
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

  // ── Appearance ─────────────────────────────────────────────────────────────
  /** Show native window frame and title bar. false = frameless window. Default: true */
  frame?: boolean;
  /** macOS title bar style. 'hiddenInset' gives a modern look with traffic lights inset into the app. */
  titleBarStyle?: 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover';
  /** Auto-hide the menu bar (Windows/Linux). User can show it by pressing Alt. Default: false */
  autoHideMenuBar?: boolean;
  /** Path to window icon relative to electron/ directory (e.g. 'assets/icon.png') */
  icon?: string;

  // ── Dev tools ──────────────────────────────────────────────────────────────
  /** Open DevTools on launch. Default: true in dev, false in production */
  openDevTools?: boolean;

  // ── Security ───────────────────────────────────────────────────────────────
  /** Renderer sandbox (webPreferences). Leave unset to use Electron's default (true).
   *  Set false only if a plugin requires full Node.js access in the preload. */
  sandbox?: boolean;

  [key: string]: unknown;
}

export interface AppConfig {
  appName?: string;
  backgroundColor?: string;
  plugins?: { Electron?: ElectronConfig };
}
