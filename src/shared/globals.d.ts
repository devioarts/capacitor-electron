// Auto-generated ambient declarations for window.Electron.
// Reference this file once in your project:
//   /// <reference types="@devioarts/capacitor-electron/globals" />
// cap-electron sync writes that line automatically.

interface UpdateInfo {
  version: string;
  releaseNotes?: string | string[] | null;
  releaseDate?: string;
  [key: string]: unknown;
}

interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

interface UpdaterEventMap {
  'checking-for-update':  void;
  'update-available':     UpdateInfo;
  'update-not-available': UpdateInfo;
  'download-progress':    DownloadProgress;
  'update-downloaded':    UpdateInfo;
  'error':                { message: string };
}

type UpdaterEventName = keyof UpdaterEventMap;

interface UpdaterBridge {
  checkForUpdate(): Promise<void>;
  downloadUpdate(): Promise<void>;
  quitAndInstall(): void;
  on<K extends UpdaterEventName>(event: K, callback: (data: UpdaterEventMap[K]) => void): () => void;
}

interface ElectronBridge {
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

  // ── Badge count ─────────────────────────────────────────────────────────────
  setBadgeCount(count: number): Promise<boolean>;
  getBadgeCount(): Promise<number>;

  // ── Power Monitor ───────────────────────────────────────────────────────────
  onPowerMonitorEvent(callback: (data: { type: PowerMonitorEventName }) => void): () => void;
  getPowerMonitorIdleState(idleThreshold: number): Promise<IdleState>;
  getPowerMonitorIdleTime(): Promise<number>;

  // ── Screen / Display ────────────────────────────────────────────────────────
  getAllDisplays(): Promise<ElectronDisplay[]>;
  getPrimaryDisplay(): Promise<ElectronDisplay>;
  getCursorScreenPoint(): Promise<{ x: number; y: number }>;
  getCursorDisplay(): Promise<ElectronDisplay>;
  onScreenEvent(callback: (data: ScreenEventPayload) => void): () => void;

  // ── Process guardian ────────────────────────────────────────────────────────
  onElectronError(callback: (data: { message: string; stack: string | undefined; type: 'exception' | 'rejection' }) => void): () => void;
}

type PowerMonitorEventName =
  | 'suspend'
  | 'resume'
  | 'lock-screen'
  | 'unlock-screen'
  | 'on-battery'
  | 'on-ac'
  | 'shutdown';

type IdleState = 'active' | 'idle' | 'locked' | 'unknown';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ElectronDisplay {
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

type ScreenEventName = 'display-added' | 'display-removed' | 'display-metrics-changed';

interface ScreenEventPayload {
  type: ScreenEventName;
  data: ElectronDisplay | { display: ElectronDisplay; changedMetrics: string[] };
}

interface Window {
  Electron: ElectronBridge;
}
