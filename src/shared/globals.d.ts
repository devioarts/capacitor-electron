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
}

interface Window {
  Electron: ElectronBridge;
}
