import { app, ipcMain } from 'electron';

function isSupportedPlatform(): boolean {
  return process.platform === 'darwin' || process.platform === 'win32';
}

ipcMain.handle('autoLaunch:isEnabled', () => isSupportedPlatform() && app.getLoginItemSettings().openAtLogin);

ipcMain.handle('autoLaunch:setEnabled', (_e, enabled: boolean) => {
  if (!isSupportedPlatform()) return false;
  app.setLoginItemSettings({ openAtLogin: enabled === true });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('autoLaunch:getSettings', () => app.getLoginItemSettings());
