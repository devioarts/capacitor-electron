import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { ElectronBridge, UpdaterBridge, UpdaterEventName, PowerMonitorEventName, ScreenEventPayload } from '../../shared/types';

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
