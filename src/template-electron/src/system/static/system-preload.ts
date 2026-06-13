import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronBridge } from './types';

contextBridge.exposeInMainWorld('Electron', {
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
} satisfies ElectronBridge);
