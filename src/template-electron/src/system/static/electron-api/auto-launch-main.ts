import { app, ipcMain } from 'electron';

ipcMain.handle('autoLaunch:isEnabled', () => app.getLoginItemSettings().openAtLogin);

ipcMain.handle('autoLaunch:setEnabled', (_e, enabled: boolean) => {
  app.setLoginItemSettings({ openAtLogin: enabled === true });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('autoLaunch:getSettings', () => app.getLoginItemSettings());
