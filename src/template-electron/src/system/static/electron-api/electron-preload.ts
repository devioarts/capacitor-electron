import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { ElectronBridge, UpdaterBridge, UpdaterEventName, PowerMonitorEventName, PowerSaveBlockerType, ScreenEventPayload, DownloadState, NativeThemeSnapshot } from '../../shared/types';

ipcRenderer.send('downloads:ensureSession');

const bridge: ElectronBridge = {
  quit:           ()                  => ipcRenderer.invoke('system:quit'),
  minimize:       ()                  => ipcRenderer.invoke('system:minimize'),
  maximize:       ()                  => ipcRenderer.invoke('system:maximize'),
  unmaximize:     ()                  => ipcRenderer.invoke('system:unmaximize'),
  toggleMaximize: ()                  => ipcRenderer.invoke('system:toggleMaximize'),
  isMaximized:    ()                  => ipcRenderer.invoke('system:isMaximized'),
  setFullscreen:  (flag: boolean)     => ipcRenderer.invoke('system:setFullscreen', flag),
  isFullscreen:   ()                  => ipcRenderer.invoke('system:isFullscreen'),
  focus:          ()                  => ipcRenderer.invoke('system:focus'),
  reload:         ()                  => ipcRenderer.invoke('system:reload'),
  openDevTools:   ()                  => ipcRenderer.invoke('system:openDevTools'),
  closeDevTools:  ()                  => ipcRenderer.invoke('system:closeDevTools'),
  getAppVersion:  ()                  => ipcRenderer.invoke('system:getAppVersion'),

  updater: {
    checkForUpdate: () => ipcRenderer.invoke('updater:checkForUpdate'),
    downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
    on: (event: UpdaterEventName, callback: (data: unknown) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, payload: { type: string; data: unknown }) => {
        if (payload.type === event) callback(payload.data);
      };
      ipcRenderer.on('updater:event', listener);
      return () => ipcRenderer.removeListener('updater:event', listener);
    },
  } as UpdaterBridge,

  dialogs: {
    showOpenDialog: (options?: unknown) => ipcRenderer.invoke('dialogs:showOpenDialog', options),
    showSaveDialog: (options?: unknown) => ipcRenderer.invoke('dialogs:showSaveDialog', options),
    showMessageBox: (options: unknown) => ipcRenderer.invoke('dialogs:showMessageBox', options),
    showErrorBox: (options: { title?: string; content?: string }) => ipcRenderer.invoke('dialogs:showErrorBox', options),
  },

  secureStorage: {
    isEncryptionAvailable: () => ipcRenderer.invoke('secureStorage:isEncryptionAvailable'),
    getSelectedStorageBackend: () => ipcRenderer.invoke('secureStorage:getSelectedStorageBackend'),
    set: (key: string, value: string) => ipcRenderer.invoke('secureStorage:set', { key, value }),
    get: (key: string) => ipcRenderer.invoke('secureStorage:get', key),
    remove: (key: string) => ipcRenderer.invoke('secureStorage:remove', key),
    clear: () => ipcRenderer.invoke('secureStorage:clear'),
    keys: () => ipcRenderer.invoke('secureStorage:keys'),
    encryptString: (value: string) => ipcRenderer.invoke('secureStorage:encryptString', value),
    decryptString: (value: string) => ipcRenderer.invoke('secureStorage:decryptString', value),
  },

  protocols: {
    getConfiguredSchemes: () => ipcRenderer.invoke('protocol:getConfiguredSchemes'),
    isProtocolHandled: (scheme: string) => ipcRenderer.invoke('protocol:isProtocolHandled', scheme),
    isDefaultProtocolClient: (scheme: string) => ipcRenderer.invoke('protocol:isDefaultProtocolClient', scheme),
    setAsDefaultProtocolClient: (scheme: string) => ipcRenderer.invoke('protocol:setAsDefaultProtocolClient', scheme),
    removeAsDefaultProtocolClient: (scheme: string) => ipcRenderer.invoke('protocol:removeAsDefaultProtocolClient', scheme),
    openExternal: (url: string) => ipcRenderer.invoke('protocol:openExternal', url),
  },

  session: {
    clearCache: () => ipcRenderer.invoke('session:clearCache'),
    clearStorageData: (options?: unknown) => ipcRenderer.invoke('session:clearStorageData', options),
    getUserAgent: () => ipcRenderer.invoke('session:getUserAgent'),
    setUserAgent: (userAgent: string) => ipcRenderer.invoke('session:setUserAgent', userAgent),
    resolveProxy: (url: string) => ipcRenderer.invoke('session:resolveProxy', url),
    setProxy: (config: unknown) => ipcRenderer.invoke('session:setProxy', config),
    closeAllConnections: () => ipcRenderer.invoke('session:closeAllConnections'),
    getCookies: (filter?: unknown) => ipcRenderer.invoke('session:getCookies', filter),
    setCookie: (cookie: unknown) => ipcRenderer.invoke('session:setCookie', cookie),
    removeCookie: (options: { url: string; name: string }) => ipcRenderer.invoke('session:removeCookie', options),
  },

  downloads: {
    start: (options: { url: string; savePath?: string }) => ipcRenderer.invoke('downloads:start', options),
    pause: (id: string) => ipcRenderer.invoke('downloads:pause', id),
    resume: (id: string) => ipcRenderer.invoke('downloads:resume', id),
    cancel: (id: string) => ipcRenderer.invoke('downloads:cancel', id),
    getActive: () => ipcRenderer.invoke('downloads:getActive'),
    on: (callback: (event: { type: string; data: DownloadState }) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, event: { type: string; data: DownloadState }) => callback(event);
      ipcRenderer.on('downloads:event', listener);
      return () => ipcRenderer.removeListener('downloads:event', listener);
    },
  },

  print: {
    getPrinters: () => ipcRenderer.invoke('print:getPrinters'),
    print: (options?: unknown) => ipcRenderer.invoke('print:print', options),
    printToPDF: (options?: { options?: unknown; path?: string }) => ipcRenderer.invoke('print:printToPDF', options),
  },

  desktopCapture: {
    getSources: (options?: { types?: Array<'window' | 'screen'>; thumbnailSize?: { width: number; height: number }; fetchWindowIcons?: boolean }) =>
      ipcRenderer.invoke('desktopCapture:getSources', options),
  },

  autoLaunch: {
    isEnabled: () => ipcRenderer.invoke('autoLaunch:isEnabled'),
    setEnabled: (enabled: boolean) => ipcRenderer.invoke('autoLaunch:setEnabled', enabled),
    getSettings: () => ipcRenderer.invoke('autoLaunch:getSettings'),
  },

  nativeTheme: {
    get: () => ipcRenderer.invoke('nativeTheme:get'),
    setThemeSource: (source: NativeThemeSnapshot['themeSource']) => ipcRenderer.invoke('nativeTheme:setThemeSource', source),
    onUpdated: (callback: (data: NativeThemeSnapshot) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, data: NativeThemeSnapshot) => callback(data);
      ipcRenderer.on('nativeTheme:updated', listener);
      return () => ipcRenderer.removeListener('nativeTheme:updated', listener);
    },
  },

  windows: {
    create: (options?: unknown) => ipcRenderer.invoke('windows:create', options),
    list: () => ipcRenderer.invoke('windows:list'),
    focus: (id: number) => ipcRenderer.invoke('windows:focus', id),
    close: (id: number) => ipcRenderer.invoke('windows:close', id),
    show: (id: number) => ipcRenderer.invoke('windows:show', id),
    hide: (id: number) => ipcRenderer.invoke('windows:hide', id),
    setBounds: (id: number, bounds) => ipcRenderer.invoke('windows:setBounds', { id, bounds }),
    openExternal: (url: string) => ipcRenderer.invoke('windows:openExternal', url),
  },

  onDeepLink: (callback: (data: { url: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, data: { url: string }) => callback(data);
    ipcRenderer.on('deepLink', listener);
    return () => ipcRenderer.removeListener('deepLink', listener);
  },

  registerShortcut: (accelerator: string, event: string): Promise<boolean> =>
    ipcRenderer.invoke('shortcuts:register', { accelerator, event }),

  unregisterShortcut: (accelerator: string): Promise<void> =>
    ipcRenderer.invoke('shortcuts:unregister', accelerator),

  onShortcut: (callback: (data: { event: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, data: { event: string }) => callback(data);
    ipcRenderer.on('shortcut', listener);
    return () => ipcRenderer.removeListener('shortcut', listener);
  },

  // ── Badge count ─────────────────────────────────────────────────────────────
  setBadgeCount: (count: number): Promise<boolean> =>
    ipcRenderer.invoke('system:setBadgeCount', count),
  getBadgeCount: (): Promise<number> =>
    ipcRenderer.invoke('system:getBadgeCount'),

  // ── Power Monitor ───────────────────────────────────────────────────────────
  onPowerMonitorEvent: (callback: (data: { type: PowerMonitorEventName }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, data: { type: PowerMonitorEventName }) => callback(data);
    ipcRenderer.on('powerMonitor:event', listener);
    return () => ipcRenderer.removeListener('powerMonitor:event', listener);
  },
  getPowerMonitorIdleState: (idleThreshold: number) =>
    ipcRenderer.invoke('powerMonitor:getSystemIdleState', idleThreshold),
  getPowerMonitorIdleTime: () =>
    ipcRenderer.invoke('powerMonitor:getSystemIdleTime'),

  // ── Power Save Blocker ─────────────────────────────────────────────────────
  startPowerSaveBlocker: (type: PowerSaveBlockerType): Promise<number> =>
    ipcRenderer.invoke('powerSaveBlocker:start', type),
  stopPowerSaveBlocker: (id: number): Promise<boolean> =>
    ipcRenderer.invoke('powerSaveBlocker:stop', id),
  isPowerSaveBlockerStarted: (id: number): Promise<boolean> =>
    ipcRenderer.invoke('powerSaveBlocker:isStarted', id),

  // ── Screen / Display ────────────────────────────────────────────────────────
  getAllDisplays:      () => ipcRenderer.invoke('screen:getAllDisplays'),
  getPrimaryDisplay:   () => ipcRenderer.invoke('screen:getPrimaryDisplay'),
  getCursorScreenPoint:() => ipcRenderer.invoke('screen:getCursorScreenPoint'),
  getCursorDisplay:    () => ipcRenderer.invoke('screen:getCursorDisplay'),
  onScreenEvent: (callback: (data: ScreenEventPayload) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, data: ScreenEventPayload) => callback(data);
    ipcRenderer.on('screen:event', listener);
    return () => ipcRenderer.removeListener('screen:event', listener);
  },

  onElectronError: (callback: (data: { message: string; stack: string | undefined; type: 'exception' | 'rejection' }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, data: { message: string; stack: string | undefined; type: 'exception' | 'rejection' }) => callback(data);
    ipcRenderer.on('electronError', listener);
    return () => ipcRenderer.removeListener('electronError', listener);
  },
};

contextBridge.exposeInMainWorld('Electron', bridge);
