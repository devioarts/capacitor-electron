import { app, BrowserWindow, ipcMain } from 'electron';

function win(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}

ipcMain.handle('system:quit',           ()                  => { app.quit(); });
ipcMain.handle('system:minimize',       ()                  => { win()?.minimize(); });
ipcMain.handle('system:maximize',       ()                  => { win()?.maximize(); });
ipcMain.handle('system:unmaximize',     ()                  => { win()?.unmaximize(); });
ipcMain.handle('system:toggleMaximize', ()                  => { const w = win(); w?.isMaximized() ? w.unmaximize() : w?.maximize(); });
ipcMain.handle('system:isMaximized',    ()                  => win()?.isMaximized() ?? false);
ipcMain.handle('system:setFullscreen',  (_e, flag: boolean) => { win()?.setFullScreen(flag); });
ipcMain.handle('system:isFullscreen',   ()                  => win()?.isFullScreen() ?? false);
ipcMain.handle('system:focus',          ()                  => { win()?.focus(); });
ipcMain.handle('system:reload',         ()                  => { win()?.reload(); });
ipcMain.handle('system:openDevTools',   ()                  => { win()?.webContents.openDevTools(); });
ipcMain.handle('system:closeDevTools',  ()                  => { win()?.webContents.closeDevTools(); });
ipcMain.handle('system:getAppVersion',  ()                  => app.getVersion());
