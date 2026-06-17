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

// ── Power Save Blocker ───────────────────────────────────────────────────────

export type PowerSaveBlockerType = 'prevent-app-suspension' | 'prevent-display-sleep';

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

  // ── Power Save Blocker ─────────────────────────────────────────────────────
  /** Prevent the app or display from entering lower-power mode. Returns the blocker id. */
  startPowerSaveBlocker(type: PowerSaveBlockerType): Promise<number>;
  /** Stop a previously started power save blocker. Returns false when the id is not active. */
  stopPowerSaveBlocker(id: number): Promise<boolean>;
  /** Returns whether the given power save blocker id is currently active. */
  isPowerSaveBlockerStarted(id: number): Promise<boolean>;

  // ── Screen / Display ────────────────────────────────────────────────────────
  getAllDisplays(): Promise<ElectronDisplay[]>;
  getPrimaryDisplay(): Promise<ElectronDisplay>;
  getCursorScreenPoint(): Promise<{ x: number; y: number }>;
  /** Returns the display under the current cursor position. */
  getCursorDisplay(): Promise<ElectronDisplay>;
  /** Subscribe to display change events (added/removed/metrics-changed). Returns unsubscribe fn. */
  onScreenEvent(callback: (data: ScreenEventPayload) => void): () => void;

  // ── Process guardian ────────────────────────────────────────────────────────
  /** Subscribe to uncaught main-process errors (uncaughtException / unhandledRejection). Returns unsubscribe fn. */
  onElectronError(callback: (data: { message: string; stack: string | undefined; type: 'exception' | 'rejection' }) => void): () => void;
}
